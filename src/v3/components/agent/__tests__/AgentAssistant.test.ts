import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, createSSRApp, nextTick, ref, ssrContextKey, type App } from "vue";
import { renderToString } from "vue/server-renderer";
import type { AgentAction, AgentConversation, AgentRun } from "@/types/agent";
import type { AgentChatMessage } from "../agentPresentation";
import AgentAssistant from "../AgentAssistant.vue";
import AgentConversationHistory from "../AgentConversationHistory.vue";

const mocks = vi.hoisted(() => ({
    open: vi.fn(), close: vi.fn(), cancel: vi.fn(), send: vi.fn(), decide: vi.fn(),
    reconnect: vi.fn(), newConversation: vi.fn(), loadHistory: vi.fn(), selectConversation: vi.fn(),
}));

const chatState = {
    conversation: ref<AgentConversation | null>(null), loading: ref(false), sending: ref(false),
    responding: ref(false), streamConnected: ref(false), error: ref(""), actionBusyId: ref(""),
    stopping: ref(false), currentStep: ref(""),
    history: ref<{ id: string; title: string; created_at: string }[]>([]), historyLoading: ref(false),
    historyError: ref(""), historyHasMore: ref(false),
};

vi.mock("@/v3/composables/useAgentChat", () => ({
    useAgentChat: () => ({ ...chatState, ...mocks }),
}));
vi.mock("element-plus", async () => {
    const { defineComponent } = await import("vue");
    return {
        ElDrawer: defineComponent({
            setup(_, { slots }) {
                return () => [slots.header?.(), slots.default?.()];
            },
        }),
    };
});
vi.mock("element-plus/es/components/base/style/css", () => ({}));
vi.mock("element-plus/es/components/drawer/style/css", () => ({}));

interface AssistantState {
    visible: boolean;
    historyVisible: boolean;
    draft: string;
    messages: AgentChatMessage[];
    starters: { label: string; prompt: string }[];
    sendMessage(prompt?: string): Promise<void>;
    canConfirm(action: AgentAction): boolean;
    actionLabel(action: AgentAction): string;
    handleActionDecision(action: AgentAction, decision: "confirm" | "reject"): Promise<void>;
    canSwitchConversation: boolean;
    openHistory(): Promise<void>;
    closeHistory(): void;
    selectConversation(id: string): Promise<void>;
    startNewConversation(): Promise<void>;
    inputRef?: HTMLTextAreaElement;
    conversationRef?: HTMLElement;
    followLatest: boolean;
    hasUnreadReply: boolean;
    handleScroll(): void;
    jumpToLatest(): Promise<void>;
    handleInputKeydown(event: KeyboardEvent): void;
}

// Exercise the real component setup, lifecycle and click handlers without a browser drawer.
const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {}, createElement: () => ({}),
    createText: () => ({}), createComment: () => ({}), setText: () => {}, setElementText: () => {},
    parentNode: () => null, nextSibling: () => null,
});

let app: App | undefined;

function mountAssistant(canWrite = true): AssistantState {
    app = renderer.createApp({ ...AgentAssistant, render: () => null }, {
        userId: "teacher", classId: 7, semesterId: 70, canWrite,
    });
    app.provide(ssrContextKey, { modules: new Set() });
    const vm = app.mount({});
    return (vm.$ as unknown as { setupState: AssistantState }).setupState;
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((finish) => { resolve = finish; });
    return { promise, resolve };
}

function pendingAction(expired = false): AgentAction {
    return {
        id: "server-action", run_id: "run", kind: "points", status: "pending",
        title: "确认积分操作", description: "确认后执行", details: [], rows: [],
        expires_at: expired ? "2026-11-03T09:59:59+08:00" : "2026-11-03T10:15:00+08:00",
    };
}

function setAction(action: AgentAction): void {
    chatState.conversation.value = {
        id: "conversation", class_id: 7, semester_id: 70, messages: [], results: [], actions: [action],
        runs: [{ id: "run", status: "completed", last_event_id: 1, created_at: "2026-11-03T10:00:00+08:00" }],
    };
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T10:00:00+08:00"));
    chatState.conversation.value = null;
    chatState.loading.value = false;
    chatState.sending.value = false;
    chatState.responding.value = false;
    chatState.streamConnected.value = false;
    chatState.error.value = "";
    chatState.actionBusyId.value = "";
    chatState.stopping.value = false;
    chatState.currentStep.value = "";
    chatState.history.value = [];
    chatState.historyLoading.value = false;
    chatState.historyError.value = "";
    chatState.historyHasMore.value = false;
    vi.stubGlobal("window", {
        clearInterval: globalThis.clearInterval, setInterval: globalThis.setInterval,
    });
});

afterEach(() => {
    app?.unmount();
    app = undefined;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("AgentAssistant server interaction", () => {
    it("grows the draft input to its content, caps it and restores its height after clearing", async () => {
        const state = mountAssistant();
        let measuredHeight = 96;
        const input = { style: { height: "51px" }, get scrollHeight() { return measuredHeight; } };
        state.inputRef = input as unknown as HTMLTextAreaElement;
        state.draft = "第一行\n第二行\n第三行";
        await nextTick();
        expect(input.style.height).toBe("96px");
        measuredHeight = 320;
        state.draft += "\n更多内容";
        await nextTick();
        expect(input.style.height).toBe("160px");
        measuredHeight = 51;
        state.draft = "";
        await nextTick();
        expect(input.style.height).toBe("51px");
    });

    it("restores the input height when changing context or returning from history", async () => {
        const state = mountAssistant();
        const input = { style: { height: "160px" }, scrollHeight: 51 };
        state.inputRef = input as unknown as HTMLTextAreaElement;
        state.draft = "旧班级的长草稿";
        app!._instance!.props.classId = 99;
        await nextTick();
        expect(state.draft).toBe("");
        expect(input.style.height).toBe("51px");
        await state.openHistory();
        input.style.height = "160px";
        state.closeHistory();
        await nextTick();
        expect(input.style.height).toBe("51px");
    });

    it("shrinks the input after a successful send without changing the send contract", async () => {
        const state = mountAssistant();
        const input = { style: { height: "51px" }, get scrollHeight() { return state.draft ? 240 : 51; } };
        state.inputRef = input as unknown as HTMLTextAreaElement;
        state.draft = "多行长指令";
        await nextTick();
        expect(input.style.height).toBe("160px");
        mocks.send.mockResolvedValueOnce(true);
        await state.sendMessage();
        await nextTick();
        expect(mocks.send).toHaveBeenCalledExactlyOnceWith("多行长指令");
        expect(input.style.height).toBe("51px");
    });

    it("keeps the reader's scroll position and offers an explicit return when a reply grows", async () => {
        setAction(pendingAction());
        const state = mountAssistant();
        await nextTick();
        const container = { scrollHeight: 1000, scrollTop: 100, clientHeight: 300 };
        state.conversationRef = container as unknown as HTMLElement;
        state.handleScroll();
        expect(state.followLatest).toBe(false);
        expect(state.hasUnreadReply).toBe(false);
        chatState.conversation.value!.messages.push({
            id: "assistant", run_id: "run", role: "assistant", content: "新回复内容",
            created_at: "2026-11-03T10:00:00+08:00",
        });
        await nextTick();
        await nextTick();
        expect(container.scrollTop).toBe(100);
        expect(state.hasUnreadReply).toBe(true);
        const html = await renderToString(createSSRApp({ ...AgentAssistant, setup: () => state }, {
            userId: "teacher", classId: 7, semesterId: 70,
        }));
        expect(html).toContain('aria-label="回到最新回复"');
        expect(html).toContain("有新回复");
        await state.jumpToLatest();
        expect(container.scrollTop).toBe(1000);
        expect(state.followLatest).toBe(true);
        expect(state.hasUnreadReply).toBe(false);
    });

    it("clears the unread indicator when the reader scrolls back to the bottom", async () => {
        const state = mountAssistant();
        state.hasUnreadReply = true;
        state.conversationRef = { scrollHeight: 1000, scrollTop: 700, clientHeight: 300 } as HTMLElement;
        state.handleScroll();
        expect(state.followLatest).toBe(true);
        expect(state.hasUnreadReply).toBe(false);
    });

    it("does not mark timing metadata as a new reply", async () => {
        setAction(pendingAction());
        const state = mountAssistant();
        await nextTick();
        state.conversationRef = { scrollHeight: 1000, scrollTop: 100, clientHeight: 300 } as HTMLElement;
        state.handleScroll();
        chatState.conversation.value!.runs[0]!.duration_ms = 1000;
        await nextTick();
        expect(state.hasUnreadReply).toBe(false);
    });

    it("marks an updated action preview as new content while the reader is away", async () => {
        setAction(pendingAction());
        const state = mountAssistant();
        await nextTick();
        state.conversationRef = { scrollHeight: 1000, scrollTop: 100, clientHeight: 300 } as HTMLElement;
        state.handleScroll();
        chatState.conversation.value!.actions[0]!.description = "新增的操作说明";
        await nextTick();
        expect(state.hasUnreadReply).toBe(true);
    });

    it.each([{ shiftKey: true }, { isComposing: true }, { keyCode: 229 }])("keeps Enter for text editing or IME composition (%o)", async (fields) => {
        const state = mountAssistant();
        state.draft = "输入中的消息";
        const event = { key: "Enter", shiftKey: false, isComposing: false, keyCode: 13, preventDefault: vi.fn(), ...fields };
        state.handleInputKeydown(event as unknown as KeyboardEvent);
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(mocks.send).not.toHaveBeenCalled();
    });

    it("opens history inside the assistant and returns without cancelling a running reply", async () => {
        const state = mountAssistant();
        chatState.responding.value = true;
        state.draft = "未发送的内容";
        await state.openHistory();
        expect(state.historyVisible).toBe(true);
        expect(mocks.loadHistory).toHaveBeenCalledExactlyOnceWith();
        state.closeHistory();
        expect(state.historyVisible).toBe(false);
        expect(state.draft).toBe("未发送的内容");
        expect(mocks.cancel).not.toHaveBeenCalled();
    });

    it.each([false, true])("only leaves history and clears the draft after a successful selection (%s)", async (success) => {
        const state = mountAssistant();
        state.draft = "未发送的内容";
        await state.openHistory();
        mocks.selectConversation.mockResolvedValueOnce(success);
        await state.selectConversation("earlier-conversation");
        expect(mocks.selectConversation).toHaveBeenCalledExactlyOnceWith("earlier-conversation");
        expect(state.historyVisible).toBe(!success);
        expect(state.draft).toBe(success ? "" : "未发送的内容");
        expect(mocks.cancel).not.toHaveBeenCalled();
    });

    it.each(["loading", "sending", "stopping", "actionBusyId"] as const)("blocks conversation switching during %s", async (busy) => {
        const state = mountAssistant();
        if (busy === "actionBusyId") chatState.actionBusyId.value = "action";
        else chatState[busy].value = true;
        expect(state.canSwitchConversation).toBe(false);
        await state.openHistory();
        await state.selectConversation("earlier-conversation");
        await state.startNewConversation();
        expect(mocks.loadHistory).not.toHaveBeenCalled();
        expect(mocks.selectConversation).not.toHaveBeenCalled();
        expect(mocks.newConversation).not.toHaveBeenCalled();
    });

    it("returns to the conversation after creating a new conversation", async () => {
        const state = mountAssistant();
        await state.openHistory();
        state.draft = "未发送的内容";
        await state.startNewConversation();
        expect(state.historyVisible).toBe(false);
        expect(state.draft).toBe("");
        expect(mocks.newConversation).toHaveBeenCalledOnce();
    });

    it("renders history in place of the conversation and composer while retaining class context", async () => {
        const state = mountAssistant();
        function renderState() {
            return renderToString(createSSRApp({ ...AgentAssistant, setup: () => state }, {
                userId: "teacher", classId: 7, semesterId: 70,
            }));
        }
        expect(await renderState()).toContain('class="agent-composer"');
        await state.openHistory();
        expect(state.historyVisible).toBe(true);
        const history = await renderState();
        expect(history).not.toContain('class="agent-composer"');
        expect(history).not.toContain('class="agent-conversation"');
        expect(history).toContain('class="agent-context"');
        expect(history).toContain('aria-label="历史对话" aria-busy="false"');
        state.closeHistory();
        expect(await renderState()).toContain('class="agent-composer"');
    });

    it.each(["userId", "classId", "semesterId"])("closes history when %s changes", async (key) => {
        const state = mountAssistant();
        await state.openHistory();
        state.draft = "旧上下文的草稿";
        app!._instance!.props[key] = key === "userId" ? "other-teacher" : 99;
        await nextTick();
        expect(state.historyVisible).toBe(false);
        expect(state.draft).toBe("");
    });

    it("sends the progress starter without choosing a group or rule for the teacher", async () => {
        const state = mountAssistant();
        mocks.send.mockResolvedValueOnce(true);
        const starter = state.starters.find((item) => item.label === "为学生的进步加分");
        expect(starter).toBeDefined();

        await state.sendMessage(starter!.prompt);

        expect(mocks.send).toHaveBeenCalledExactlyOnceWith("为学生的进步加分");
    });

    it("closes the panel subscription without cancelling the server run", async () => {
        const state = mountAssistant();
        chatState.responding.value = true;
        state.visible = true;
        await nextTick();
        expect(mocks.open).toHaveBeenCalledOnce();
        state.visible = false;
        await nextTick();
        expect(mocks.close).toHaveBeenCalledOnce();
        expect(mocks.cancel).not.toHaveBeenCalled();
    });

    it.each([false, true])("clears the draft only after a successful send (%s)", async (success) => {
        const state = mountAssistant();
        const request = deferred<boolean>();
        mocks.send.mockReturnValueOnce(request.promise);
        state.draft = "总结本周积分";
        const pending = state.sendMessage();
        expect(mocks.send).toHaveBeenCalledWith("总结本周积分");
        expect(state.draft).toBe("总结本周积分");
        request.resolve(success);
        await pending;
        expect(state.draft).toBe(success ? "" : "总结本周积分");
    });

    it("keeps a newly edited draft when the earlier send succeeds", async () => {
        const state = mountAssistant();
        const request = deferred<boolean>();
        mocks.send.mockReturnValueOnce(request.promise);
        state.draft = "查询奖品";
        const pending = state.sendMessage();
        state.draft = "接着查看学生";
        request.resolve(true);
        await pending;
        expect(state.draft).toBe("接着查看学生");
    });

    it("requires the confirmation handler and server action state before showing completion", async () => {
        const action = pendingAction();
        setAction(action);
        const state = mountAssistant();
        await nextTick();
        expect(mocks.decide).not.toHaveBeenCalled();
        expect(state.actionLabel(action)).toBe("待确认");
        const request = deferred<void>();
        mocks.decide.mockReturnValueOnce(request.promise);
        const pending = state.handleActionDecision(action, "confirm");
        expect(mocks.decide).toHaveBeenCalledWith("server-action", "confirm");
        expect(state.messages[0]?.actions[0]?.status).toBe("pending");
        expect(state.actionLabel(action)).toBe("待确认");
        request.resolve();
        await pending;
        expect(state.messages[0]?.actions[0]?.status).toBe("pending");
        const succeeded: AgentAction = { ...action, status: "succeeded", result: { summary: "接口确认操作已完成" } };
        setAction(succeeded);
        await nextTick();
        expect(state.actionLabel(succeeded)).toBe("已完成");
        expect(state.messages[0]?.actions[0]?.result?.summary).toBe("接口确认操作已完成");
    });

    it.each([
        { name: "read-only", canWrite: false, expired: false },
        { name: "expired", canWrite: true, expired: true },
    ])("blocks confirmation for a $name action even if its handler is invoked directly", async ({ canWrite, expired }) => {
        const action = pendingAction(expired);
        setAction(action);
        const state = mountAssistant(canWrite);
        expect(state.canConfirm(action)).toBe(false);
        await state.handleActionDecision(action, "confirm");
        expect(mocks.decide).not.toHaveBeenCalled();
        expect(state.messages[0]?.actions[0]?.status).toBe("pending");
    });
});

describe("AgentAssistant history display", () => {
    function renderHistory(props: Partial<InstanceType<typeof AgentConversationHistory>["$props"]> = {}) {
        return renderToString(createSSRApp(AgentConversationHistory, {
            items: [], loading: false, error: "", hasMore: false, disabled: false, ...props,
        }));
    }

    it("shows an accessible history button in the assistant header", async () => {
        const html = await renderToString(createSSRApp(AgentAssistant, {
            userId: "teacher", classId: 7, semesterId: 70,
        }));
        expect(html).toContain('aria-label="历史对话"');
        expect(html).toContain('title="历史对话"');
        expect(html).toContain('aria-pressed="false"');
    });

    it("distinguishes empty history from initial loading and errors", async () => {
        expect(await renderHistory()).toContain("还没有历史对话");
        const loading = await renderHistory({ loading: true });
        expect(loading).toContain("正在加载历史对话…");
        expect(loading).not.toContain("还没有历史对话");
        const failed = await renderHistory({ error: "历史对话加载失败" });
        expect(failed).toContain("历史对话加载失败");
        expect(failed).toContain("重新加载");
        expect(failed).not.toContain("还没有历史对话");
    });

    it("shows titles, timestamps, the current conversation and a load-more entry", async () => {
        const html = await renderHistory({
            currentId: "current", hasMore: true,
            items: [
                { id: "current", title: "总结本周班级积分", created_at: "2026-11-03T10:00:00+08:00" },
                { id: "old", title: "查看可以兑换的奖品", created_at: "2026-11-02T09:00:00+08:00" },
            ],
        });
        expect(html).toContain("总结本周班级积分");
        expect(html).toContain("查看可以兑换的奖品");
        expect(html).toContain('datetime="2026-11-03T10:00:00+08:00"');
        expect(html).toContain('aria-current="true"');
        expect(html.match(/当前对话<\/span>/g)).toHaveLength(1);
        expect(html).toContain("加载更多");
        expect(html).toContain("返回当前对话");
    });

    it("retains loaded conversations and offers retry when another page fails", async () => {
        const html = await renderHistory({
            items: [{ id: "old", title: "之前的对话", created_at: "2026-11-02T09:00:00+08:00" }],
            hasMore: true, error: "加载更多失败",
        });
        expect(html).toContain("之前的对话");
        expect(html).toContain("加载更多失败");
        expect(html).toContain("重新加载");
    });
});

describe("AgentAssistant result display", () => {
    function setReply(text: string, action?: AgentAction, runFields: Partial<AgentRun> = {}) {
        chatState.conversation.value = {
            id: "conversation", class_id: 7, semester_id: 70,
            messages: text ? [{ id: "assistant", run_id: "run", role: "assistant", content: text,
                created_at: "2026-11-03T10:00:00+08:00" }] : [],
            runs: [{ id: "run", status: "completed", last_event_id: 1,
                created_at: "2026-11-03T10:00:00+08:00", ...runFields }],
            results: [{ run_id: "run", data: { tool: "query_points_summary", result: {
                awarded: 10, deducted: 0, net_change: 10, records: 2, participating_students: 2,
            } } }],
            actions: action ? [action] : [],
        };
    }

    function renderAssistant() {
        return renderToString(createSSRApp(AgentAssistant, {
            userId: "teacher", classId: 7, semesterId: 70, canWrite: true,
        }));
    }

    it("renders assistant Markdown and keeps the duplicate source data collapsed", async () => {
        setReply("## 本周积分\n\n**加分合计**：+10 分\n\n| 学生 | 积分 |\n| --- | --- |\n| 张三 | +5 |");
        const html = await renderAssistant();
        expect(html).toContain("<h2>本周积分</h2>");
        expect(html).toContain("<strong>加分合计</strong>");
        expect(html).toContain("<table>");
        expect(html).toContain("查询详情");
        expect(html.match(/<details\b[^>]*>/)?.[0]).not.toMatch(/\bopen(?:[\s=>])/);
    });

    it("shows the completed reply duration beneath the collapsed query details", async () => {
        setReply("查询完成。", undefined, { duration_ms: 12340 });
        const html = await renderAssistant();
        expect(html).toContain("耗时 12.3 秒");
        expect(html.match(/耗时 /g)).toHaveLength(1);
        expect(html.indexOf("耗时 12.3 秒")).toBeGreaterThan(html.indexOf("</details>"));
    });

    it.each(["query", "action"])("shows duration for a completed %s card without reply text", async (kind) => {
        setReply("", kind === "action" ? pendingAction() : undefined, { duration_ms: 68000 });
        const html = await renderAssistant();
        expect(html).toContain("耗时 1 分 8 秒");
        expect(html.match(/耗时 /g)).toHaveLength(1);
    });

    it("keeps old replies without a recorded duration free of a duration label", async () => {
        setReply("历史回复。");
        expect(await renderAssistant()).not.toContain("耗时");
    });

    it.each(["running", "failed", "cancelled"] as const)("does not show duration for a %s reply", async (status) => {
        setReply("回复内容。", undefined, { status, duration_ms: 12340 });
        expect(await renderAssistant()).not.toContain("耗时");
    });

    it("keeps the confirmation card visible outside collapsed query details", async () => {
        setReply("已生成预览，请核对下方操作卡片。", pendingAction());
        const html = await renderAssistant();
        expect(html.indexOf('class="agent-action ')).toBeGreaterThan(html.indexOf("</details>"));
        expect(html).toContain("确认执行");
        expect(html).toContain("待确认");
        expect(html.match(/<details\b[^>]*>/)?.[0]).not.toMatch(/\bopen(?:[\s=>])/);
        expect(mocks.decide).not.toHaveBeenCalled();
    });

    it("shows query data by default when no assistant answer was produced", async () => {
        setReply("");
        const html = await renderAssistant();
        expect(html.match(/<details\b[^>]*>/)?.[0]).toMatch(/\bopen(?:[\s=>])/);
        expect(html).toContain("班级积分汇总");
    });
});
