import { computed, nextTick, onScopeDispose, ref, watch } from "vue";
import { agentApi } from "@/api/agent";
import { isApiRequestError } from "@/types/api";
import type { AgentAction, AgentConversation, AgentResult, AgentRun, AgentStreamEvent } from "@/types/agent";

interface AgentScope {
    userId?: string;
    classId?: number | null;
    semesterId?: number | null;
}

interface PendingSend {
    message: string;
    requestId: string;
    knownMessageIds: Set<string>;
}

const active = (run: AgentRun) => run.status === "queued" || run.status === "running";
const messageOf = (cause: unknown) => cause instanceof Error ? cause.message : "请求失败，请重试";

function resultSignature(data: AgentResult["data"]) {
    function ordered(value: unknown): unknown {
        if (Array.isArray(value)) return value.map(ordered);
        if (value !== null && typeof value === "object") {
            return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
                .map(([key, child]) => [key, ordered(child)]));
        }
        return value;
    }
    return JSON.stringify(ordered(data));
}

/** 管理当前老师、班级及学期下的服务端会话和事件订阅。 */
export function useAgentChat(scope: () => AgentScope, onActionSucceeded: (action: AgentAction) => void) {
    const conversation = ref<AgentConversation | null>(null);
    const loading = ref(false);
    const sending = ref(false);
    const streamConnected = ref(false);
    const error = ref("");
    const actionBusyId = ref("");
    const currentStep = ref("");
    const stopping = ref(false);
    const activeRun = computed(() => conversation.value?.runs.find(active));
    const responding = computed(() => !!activeRun.value);
    const scopeKey = computed(() => {
        const current = scope();
        return current.userId && current.classId && current.semesterId
            ? `teacher-assistant:agent:${encodeURIComponent(current.userId)}:${current.classId}:${current.semesterId}`
            : "";
    });

    let revision = 0;
    let snapshotSequence = 0;
    let opened = false;
    let subscription: AbortController | null = null;
    let pendingSend: PendingSend | null = null;
    const cursors = new Map<string, number>();
    const partials = new Map<string, string>();
    const notifiedActions = new Set<string>();
    const observedPendingActions = new Set<string>();
    const current = (version: number) => version === revision;

    function stopSubscription() {
        subscription?.abort();
        subscription = null;
        streamConnected.value = false;
    }

    function reset() {
        revision++;
        snapshotSequence++;
        stopSubscription();
        conversation.value = null;
        loading.value = false;
        sending.value = false;
        stopping.value = false;
        actionBusyId.value = "";
        currentStep.value = "";
        error.value = "";
        pendingSend = null;
        cursors.clear();
        partials.clear();
        notifiedActions.clear();
        observedPendingActions.clear();
    }

    function savedConversationId() {
        try {
            return window.sessionStorage.getItem(scopeKey.value);
        } catch (cause) {
            console.warn("读取 AI 会话标识失败", cause);
            return null;
        }
    }

    function saveConversationId(id: string) {
        try {
            window.sessionStorage.setItem(scopeKey.value, id);
        } catch (cause) {
            console.warn("保存 AI 会话标识失败", cause);
        }
    }

    function mergeAction(action: AgentAction) {
        const actions = conversation.value?.actions;
        if (!actions) return;
        const index = actions.findIndex((item) => item.id === action.id);
        if (index < 0) actions.push(action);
        else if (actions[index]?.status === "pending" || action.status !== "pending") actions[index] = action;
        observeAction(action);
    }

    function observeAction(action: AgentAction) {
        if (action.status === "pending") observedPendingActions.add(action.id);
        if (action.status === "succeeded" && observedPendingActions.has(action.id) && !notifiedActions.has(action.id)) {
            notifiedActions.add(action.id);
            onActionSucceeded(action);
        }
    }

    function applySnapshot(snapshot: AgentConversation, replay: boolean) {
        const selected = scope();
        if (snapshot.class_id !== selected.classId || snapshot.semester_id !== selected.semesterId) {
            throw new Error("会话与当前班级或学期不一致，请新建对话");
        }
        const previous = conversation.value;
        const sameConversation = previous?.id === snapshot.id;
        if (sameConversation) {
            for (const action of previous.actions) {
                const index = snapshot.actions.findIndex((item) => item.id === action.id);
                if (index < 0) snapshot.actions.push(action);
                else if (action.status !== "pending" && snapshot.actions[index]?.status === "pending") snapshot.actions[index] = action;
            }
            for (const result of previous.results) {
                if (!snapshot.results.some((item) => item.run_id === result.run_id && resultSignature(item.data) === resultSignature(result.data))) {
                    snapshot.results.push(result);
                }
            }
        }
        for (const run of snapshot.runs) {
            const old = sameConversation ? previous.runs.find((item) => item.id === run.id) : undefined;
            const message = snapshot.messages.find((item) => item.id === `stream:${run.id}`);
            const localCursor = cursors.get(run.id) ?? 0;
            const retainLocal = old && active(run) && (!active(old) || localCursor > run.last_event_id ||
                (!replay && !message && partials.has(run.id)));
            if (retainLocal) {
                Object.assign(run, old);
                const reply = previous?.messages.find((item) => item.run_id === run.id && item.role === "assistant");
                snapshot.messages = snapshot.messages.filter((item) => item.run_id !== run.id || item.role !== "assistant");
                if (reply) snapshot.messages.push(reply);
            } else if (!active(run)) {
                partials.delete(run.id);
                cursors.set(run.id, run.last_event_id);
            } else if (message) {
                partials.set(run.id, message.content);
                cursors.set(run.id, run.last_event_id);
            } else {
                partials.set(run.id, "");
                cursors.set(run.id, run.status === "queued" ? run.last_event_id : 0);
            }
        }
        if (pendingSend && sameConversation) {
            const request = pendingSend;
            const optimistic = previous.messages.find((item) => item.id === `request:${request.requestId}`);
            const visibleOnServer = snapshot.messages.some((item) => item.role === "user" && item.content === request.message && !request.knownMessageIds.has(item.id));
            if (optimistic && !visibleOnServer) snapshot.messages.push(optimistic);
        }
        conversation.value = snapshot;
        snapshot.actions.forEach(observeAction);
        const running = snapshot.runs.find(active);
        const latest = snapshot.runs.reduce<AgentRun | undefined>((newest, run) =>
            !newest || Date.parse(run.created_at) > Date.parse(newest.created_at) ? run : newest, undefined);
        if (!running && latest?.status === "failed") error.value = latest.error || "本次回复未完成，请重试";
    }

    async function refreshSnapshot(version: number, replay = false) {
        const id = conversation.value?.id;
        if (!id) return;
        const sequence = ++snapshotSequence;
        const response = await agentApi.getConversation(id);
        if (current(version) && sequence === snapshotSequence) applySnapshot(response.data, replay);
    }

    function updateRun(run: AgentRun) {
        const runs = conversation.value?.runs;
        if (!runs) return;
        const index = runs.findIndex((item) => item.id === run.id);
        if (index < 0) runs.push(run);
        else runs[index] = run;
    }

    function receive(event: AgentStreamEvent, runId: string) {
        if (!conversation.value) return;
        if (event.type === "run.snapshot") {
            const run = conversation.value.runs.find((item) => item.id === runId);
            if (event.data.id === runId && (!run || active(run) || !active(event.data))) updateRun(event.data);
            return;
        }
        if (event.run_id !== runId || event.event_id <= (cursors.get(runId) ?? 0)) return;
        const run = conversation.value.runs.find((item) => item.id === runId);
        if (!run || !active(run)) return;
        cursors.set(runId, event.event_id);
        run.last_event_id = Math.max(run.last_event_id, event.event_id);
        switch (event.type) {
            case "message.delta": {
                if (!active(run)) break;
                let message = conversation.value.messages.find((item) => item.run_id === runId && item.role === "assistant");
                if (message && message.id !== `stream:${runId}`) break;
                const text = (partials.get(runId) ?? "") + event.data.text;
                partials.set(runId, text);
                if (!message) {
                    message = { id: `stream:${runId}`, run_id: runId, role: "assistant", content: "", created_at: new Date().toISOString() };
                    conversation.value.messages.push(message);
                }
                message.content = text;
                break;
            }
            case "data.result":
                if (!conversation.value.results.some((item) => item.run_id === runId && resultSignature(item.data) === resultSignature(event.data))) {
                    conversation.value.results.push({ run_id: runId, data: event.data });
                }
                break;
            case "action.proposed":
                mergeAction(event.data);
                break;
            case "tool.status":
                currentStep.value = event.data.status === "running" ? "正在查询或准备操作" : "正在整理回复";
                break;
            case "run.started":
                if (active(run)) run.status = "running";
                currentStep.value = "正在理解你的问题";
                break;
            case "run.completed":
                if (active(run)) run.status = "completed";
                currentStep.value = "";
                break;
            case "run.cancelled":
                if (active(run)) run.status = "cancelled";
                currentStep.value = "";
                break;
            case "run.failed":
                if (active(run)) run.status = "failed";
                run.error = event.data.message;
                error.value = event.data.message;
                currentStep.value = "";
                break;
        }
    }

    function connect(run: AgentRun, version: number) {
        if (!opened || !current(version) || !active(run)) return;
        stopSubscription();
        const controller = new AbortController();
        subscription = controller;
        streamConnected.value = true;
        currentStep.value = run.status === "queued" ? "正在等待回复" : "正在生成回复";
        void (async () => {
            let failure = "";
            try {
                await agentApi.subscribe(run.id, cursors.get(run.id) ?? 0, {
                    signal: controller.signal,
                    onEvent: (event) => {
                        if (current(version) && !controller.signal.aborted) receive(event, run.id);
                    }
                });
            } catch (cause) {
                failure = messageOf(cause);
            }
            if (!current(version) || controller.signal.aborted || subscription !== controller) return;
            streamConnected.value = false;
            let refreshed = false;
            try {
                await refreshSnapshot(version);
                refreshed = true;
            } catch (cause) {
                failure = failure || messageOf(cause);
            }
            if (!current(version) || controller.signal.aborted || subscription !== controller) return;
            currentStep.value = "";
            const restored = conversation.value?.runs.find((item) => item.id === run.id);
            const storedReply = conversation.value?.messages.some((item) => item.run_id === run.id && item.role === "assistant" && !item.id.startsWith("stream:"));
            if (restored?.status === "failed") error.value = restored.error || "本次回复未完成，请重试";
            else if (refreshed && restored?.status === "completed" && storedReply) error.value = "";
            else if (activeRun.value?.id === run.id) error.value = failure || "连接已中断，请点击重新连接继续查看回复";
            else if (failure) error.value = failure;
        })();
    }

    async function open(): Promise<void> {
        opened = true;
        if (loading.value) return;
        const { userId, classId, semesterId } = scope();
        if (!userId || !classId || !semesterId) {
            error.value = "请先选择班级和学期";
            return;
        }
        const version = revision;
        loading.value = true;
        error.value = "";
        stopSubscription();
        try {
            const id = conversation.value?.id || savedConversationId();
            if (id) {
                const sequence = ++snapshotSequence;
                const response = await agentApi.getConversation(id);
                if (!current(version) || sequence !== snapshotSequence) return;
                applySnapshot(response.data, true);
            } else {
                const response = await agentApi.createConversation({ class_id: classId, semester_id: semesterId });
                if (!current(version)) return;
                applySnapshot(response.data, true);
                saveConversationId(response.data.id);
            }
            if (activeRun.value) connect(activeRun.value, version);
        } catch (cause) {
            if (current(version)) error.value = messageOf(cause);
        } finally {
            if (current(version)) loading.value = false;
        }
    }

    function close() {
        opened = false;
        stopSubscription();
    }

    async function send(text: string): Promise<boolean> {
        const message = text.trim();
        if (!message || sending.value || loading.value || responding.value || actionBusyId.value || stopping.value) return false;
        const version = revision;
        sending.value = true;
        error.value = "";
        try {
            if (!conversation.value) await open();
            if (!current(version) || !conversation.value || responding.value) return false;
            if (pendingSend && pendingSend.message !== message) {
                error.value = "上一条消息的发送结果尚未确认，请先重试该消息";
                return false;
            }
            if (!pendingSend) {
                pendingSend = { message, requestId: crypto.randomUUID(), knownMessageIds: new Set(conversation.value.messages.map((item) => item.id)) };
                conversation.value.messages.push({
                    id: `request:${pendingSend.requestId}`, run_id: "", role: "user", content: message, created_at: new Date().toISOString()
                });
            }
            const request = pendingSend;
            const response = await agentApi.createRun(conversation.value.id, { client_request_id: request.requestId, message });
            if (!current(version)) return false;
            const optimistic = conversation.value.messages.find((item) => item.id === `request:${request.requestId}`);
            if (optimistic) optimistic.run_id = response.data.id;
            pendingSend = null;
            updateRun(response.data);
            cursors.set(response.data.id, 0);
            try {
                await refreshSnapshot(version);
            } catch (cause) {
                if (current(version)) error.value = `消息已发送，刷新会话失败：${messageOf(cause)}`;
            }
            if (current(version) && activeRun.value) connect(activeRun.value, version);
            return current(version);
        } catch (cause) {
            if (current(version)) {
                error.value = messageOf(cause);
                if (isApiRequestError(cause) && cause.code !== undefined &&
                    ((cause.code >= 100400 && cause.code < 100500) || [200402, 200403, 200404].includes(cause.code))) {
                    const optimisticId = `request:${pendingSend?.requestId}`;
                    if (conversation.value) conversation.value.messages = conversation.value.messages.filter((item) => item.id !== optimisticId);
                    pendingSend = null;
                }
            }
            return false;
        } finally {
            if (current(version)) sending.value = false;
        }
    }

    async function cancel(): Promise<void> {
        if (!activeRun.value || stopping.value || sending.value || loading.value || actionBusyId.value) return;
        const version = revision;
        const runId = activeRun.value.id;
        stopping.value = true;
        error.value = "";
        try {
            const response = await agentApi.cancelRun(runId);
            if (!current(version)) return;
            updateRun(response.data);
            if (!active(response.data)) {
                stopSubscription();
                currentStep.value = "";
            }
            await refreshSnapshot(version);
        } catch (cause) {
            if (current(version)) error.value = messageOf(cause);
        } finally {
            if (current(version)) stopping.value = false;
        }
    }

    async function newConversation(): Promise<void> {
        if (!scopeKey.value || loading.value || sending.value || actionBusyId.value || stopping.value) return;
        const version = revision;
        const { classId, semesterId } = scope();
        if (!classId || !semesterId) return;
        loading.value = true;
        error.value = "";
        try {
            const response = await agentApi.createConversation({ class_id: classId, semester_id: semesterId });
            if (!current(version)) return;
            if (response.data.class_id !== classId || response.data.semester_id !== semesterId) {
                throw new Error("会话与当前班级或学期不一致，请重新创建");
            }
            reset();
            applySnapshot(response.data, true);
            saveConversationId(response.data.id);
        } catch (cause) {
            if (current(version)) error.value = messageOf(cause);
        } finally {
            if (current(version)) loading.value = false;
        }
    }

    async function decide(actionId: string, decision: "confirm" | "reject"): Promise<void> {
        if (loading.value || sending.value || stopping.value || actionBusyId.value) return;
        const action = conversation.value?.actions.find((item) => item.id === actionId);
        if (!action || action.status !== "pending") return;
        if (decision === "confirm" && Date.parse(action.expires_at) <= Date.now()) {
            error.value = "操作预览已过期，请重新生成";
            return;
        }
        const version = revision;
        actionBusyId.value = actionId;
        error.value = "";
        try {
            const response = await agentApi.decideAction(actionId, decision);
            if (!current(version)) return;
            snapshotSequence++;
            mergeAction(response.data);
        } catch (cause) {
            if (!current(version)) return;
            const message = messageOf(cause);
            error.value = message;
            if (isApiRequestError(cause) && (cause.code === 100409 || cause.code === 100410)) {
                try {
                    await refreshSnapshot(version);
                } catch (refreshError) {
                    if (current(version)) error.value = `${message}；刷新失败：${messageOf(refreshError)}`;
                    return;
                }
                if (current(version)) error.value = message;
            }
        } finally {
            if (current(version)) actionBusyId.value = "";
        }
    }

    async function reconnect(): Promise<void> {
        if (!opened || loading.value || streamConnected.value) return;
        if (!conversation.value) {
            await open();
            return;
        }
        const version = revision;
        error.value = "";
        try {
            await refreshSnapshot(version);
            if (current(version) && activeRun.value) connect(activeRun.value, version);
        } catch (cause) {
            if (current(version)) error.value = messageOf(cause);
        }
    }

    watch(scopeKey, async () => {
        reset();
        const version = revision;
        await nextTick();
        if (opened && current(version)) await open();
    }, { flush: "sync" });

    onScopeDispose(() => {
        opened = false;
        reset();
    });

    return { conversation, loading, sending, responding, streamConnected, error, actionBusyId, currentStep, stopping,
        open, close, send, cancel, newConversation, decide, reconnect };
}
