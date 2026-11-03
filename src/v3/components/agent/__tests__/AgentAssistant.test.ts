import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, createSSRApp, nextTick, ref, ssrContextKey, type App } from "vue";
import { renderToString } from "vue/server-renderer";
import type { AgentAction, AgentConversation } from "@/types/agent";
import type { AgentChatMessage } from "../agentPresentation";
import AgentAssistant from "../AgentAssistant.vue";

const mocks = vi.hoisted(() => ({
    open: vi.fn(), close: vi.fn(), cancel: vi.fn(), send: vi.fn(), decide: vi.fn(),
    reconnect: vi.fn(), newConversation: vi.fn(),
}));

const chatState = {
    conversation: ref<AgentConversation | null>(null), loading: ref(false), sending: ref(false),
    responding: ref(false), streamConnected: ref(false), error: ref(""), actionBusyId: ref(""),
    stopping: ref(false), currentStep: ref(""),
};

vi.mock("@/v3/composables/useAgentChat", () => ({
    useAgentChat: () => ({ ...chatState, ...mocks }),
}));
vi.mock("element-plus", async () => {
    const { defineComponent } = await import("vue");
    return {
        ElDrawer: defineComponent({
            setup(_, { slots }) {
                return () => slots.default?.();
            },
        }),
    };
});
vi.mock("element-plus/es/components/base/style/css", () => ({}));
vi.mock("element-plus/es/components/drawer/style/css", () => ({}));

interface AssistantState {
    visible: boolean;
    draft: string;
    messages: AgentChatMessage[];
    sendMessage(prompt?: string): Promise<void>;
    canConfirm(action: AgentAction): boolean;
    actionLabel(action: AgentAction): string;
    handleActionDecision(action: AgentAction, decision: "confirm" | "reject"): Promise<void>;
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

describe("AgentAssistant result display", () => {
    function setReply(text: string, action?: AgentAction) {
        chatState.conversation.value = {
            id: "conversation", class_id: 7, semester_id: 70,
            messages: text ? [{ id: "assistant", run_id: "run", role: "assistant", content: text,
                created_at: "2026-11-03T10:00:00+08:00" }] : [],
            runs: [{ id: "run", status: "completed", last_event_id: 1, created_at: "2026-11-03T10:00:00+08:00" }],
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
