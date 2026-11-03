import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, reactive, type EffectScope } from "vue";
import { ApiRequestError } from "@/types/api";
import type { AgentAction, AgentConversation, AgentRun, AgentStreamEvent } from "@/types/agent";
import { useAgentChat } from "../useAgentChat";

const api = vi.hoisted(() => ({
    createConversation: vi.fn(), getConversation: vi.fn(), createRun: vi.fn(),
    cancelRun: vi.fn(), decideAction: vi.fn(), subscribe: vi.fn()
}));
vi.mock("@/api/agent", () => ({ agentApi: api }));

interface TestStream {
    runId: string;
    after: number;
    signal: AbortSignal;
    onEvent: (event: AgentStreamEvent) => void;
    end: () => void;
    fail: (cause: unknown) => void;
}

let streams: TestStream[];
let storage: Map<string, string>;
let server: AgentConversation;
let lifetimes: EffectScope[];
const response = <T>(data: T) => ({ code: 0, message: "", data });
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const run = (status: AgentRun["status"] = "running", lastEventId = 0): AgentRun => ({
    id: "run", status, last_event_id: lastEventId, created_at: "2026-11-03T08:00:00Z"
});
const action = (status: AgentAction["status"] = "pending"): AgentAction => ({
    id: "action", run_id: "run", kind: "points", status, title: "确认加分", description: "给第三组加分",
    details: [], rows: [], expires_at: "2099-01-01T00:00:00Z",
    ...(status === "succeeded" ? { result: { summary: "已加分" } } : {})
});
const snapshot = (id = "chat", classId = 7): AgentConversation => ({
    id, class_id: classId, semester_id: 9, messages: [], runs: [], actions: [], results: []
});
const streamMessage = (content: string) => ({
    id: "stream:run", run_id: "run", role: "assistant" as const, content, created_at: "2026-11-03T08:00:00Z"
});
const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};

async function settle() {
    for (let index = 0; index < 10; index++) await Promise.resolve();
}

function createChat() {
    const selected = reactive({ userId: "teacher", classId: 7, semesterId: 9 });
    const succeeded = vi.fn();
    const lifetime = effectScope();
    lifetimes.push(lifetime);
    const chat = lifetime.run(() => useAgentChat(() => selected, succeeded))!;
    return { chat, selected, succeeded };
}

beforeEach(() => {
    vi.resetAllMocks();
    streams = [];
    storage = new Map();
    lifetimes = [];
    server = snapshot();
    vi.stubGlobal("window", { sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value)
    } });
    api.createConversation.mockImplementation(async ({ class_id }) => response({ ...copy(server), class_id }));
    api.getConversation.mockImplementation(async () => response(copy(server)));
    api.subscribe.mockImplementation((runId, after, options) => new Promise<void>((resolve, reject) => {
        streams.push({ runId, after, ...options, end: resolve, fail: reject });
        options.signal.addEventListener("abort", resolve, { once: true });
    }));
});

afterEach(async () => {
    lifetimes.forEach((lifetime) => lifetime.stop());
    await settle();
    vi.unstubAllGlobals();
});

describe("real Agent conversation orchestration", () => {
    it("restores accumulated stream text and resumes after the matching snapshot cursor on opening and reopening", async () => {
        server.runs = [run("running", 5)];
        server.messages = [streamMessage("前半")];
        const { chat } = createChat();
        await chat.open();
        expect(streams[0]!.after).toBe(5);
        streams[0]!.onEvent({ type: "message.delta", run_id: "run", event_id: 6, data: { text: "后半" } });
        expect(chat.conversation.value?.messages[0]?.content).toBe("前半后半");

        chat.close();
        server.runs = [run("running", 7)];
        server.messages = [streamMessage("前半后半，")];
        await chat.open();
        expect(streams[1]!.after).toBe(7);
        streams[1]!.onEvent({ type: "message.delta", run_id: "run", event_id: 8, data: { text: "继续" } });
        expect(chat.conversation.value?.messages.map((message) => message.content)).toEqual(["前半后半，继续"]);
        expect(api.createRun).not.toHaveBeenCalled();
    });

    it("keeps newer streamed text when an in-flight running snapshot has an older cursor", async () => {
        server.runs = [run("running", 5)];
        server.messages = [streamMessage("前半")];
        server.actions = [action()];
        const { chat } = createChat();
        await chat.open();
        const older = deferred<ReturnType<typeof response<AgentConversation>>>();
        api.getConversation.mockReturnValueOnce(older.promise);
        api.decideAction.mockRejectedValueOnce(new ApiRequestError("预览发生变化", 100409));
        const deciding = chat.decide("action", "confirm");
        await settle();
        streams[0]!.onEvent({ type: "message.delta", run_id: "run", event_id: 6, data: { text: "后半" } });
        older.resolve(response(copy(server)));
        await deciding;
        expect(chat.conversation.value?.runs[0]?.last_event_id).toBe(6);
        expect(chat.conversation.value?.messages[0]?.content).toBe("前半后半");
        streams[0]!.onEvent({ type: "message.delta", run_id: "run", event_id: 7, data: { text: "继续" } });
        expect(chat.conversation.value?.messages[0]?.content).toBe("前半后半继续");
    });

    it("uses terminal database text even when a late streamed chunk has a larger cursor", async () => {
        server.runs = [run("running", 5)];
        server.messages = [streamMessage("取消时正文")];
        server.actions = [action()];
        const { chat } = createChat();
        await chat.open();
        const terminal = deferred<ReturnType<typeof response<AgentConversation>>>();
        api.getConversation.mockReturnValueOnce(terminal.promise);
        api.decideAction.mockRejectedValueOnce(new ApiRequestError("预览发生变化", 100409));
        const deciding = chat.decide("action", "confirm");
        await settle();
        streams[0]!.onEvent({ type: "message.delta", run_id: "run", event_id: 7, data: { text: "取消后晚到内容" } });
        terminal.resolve(response({ ...copy(server), runs: [run("cancelled", 6)], messages: [{ ...streamMessage("取消时正文"), id: "stored-reply" }] }));
        await deciding;
        expect(chat.responding.value).toBe(false);
        expect(chat.conversation.value?.runs[0]).toMatchObject({ status: "cancelled", last_event_id: 6 });
        expect(chat.conversation.value?.messages.map((message) => message.content)).toEqual(["取消时正文"]);
        streams[0]!.onEvent({ type: "message.delta", run_id: "run", event_id: 8, data: { text: "再次晚到" } });
        expect(chat.conversation.value?.messages.map((message) => message.content)).toEqual(["取消时正文"]);
        streams[0]!.onEvent({ type: "run.snapshot", data: run("running", 9) });
        expect(chat.conversation.value?.runs[0]).toMatchObject({ status: "cancelled", last_event_id: 6 });
        chat.close();
        server.runs = [run("running", 9)];
        server.messages = [streamMessage("旧的运行中快照")];
        await chat.open();
        expect(chat.responding.value).toBe(false);
        expect(chat.conversation.value?.messages[0]?.content).toBe("取消时正文");
        expect(api.subscribe).toHaveBeenCalledTimes(1);
    });

    it("starts queued subscriptions at their snapshot cursor when no text has been generated", async () => {
        server.runs = [run("queued", 1)];
        const { chat } = createChat();
        await chat.open();
        expect(streams[0]!.after).toBe(1);
        streams[0]!.onEvent({ type: "message.delta", run_id: "run", event_id: 2, data: { text: "开始回复" } });
        expect(chat.conversation.value?.messages[0]?.content).toBe("开始回复");
    });

    it("replays from zero for an older running snapshot without accumulated stream text", async () => {
        server.runs = [run("running", 5)];
        const { chat } = createChat();
        await chat.open();
        expect(streams[0]!.after).toBe(0);
        streams[0]!.onEvent({ type: "message.delta", run_id: "run", event_id: 2, data: { text: "已有回复" } });
        expect(chat.conversation.value?.messages[0]?.content).toBe("已有回复");
    });

    it("sends once, deduplicates SSE events and replaces partial text with the stored reply", async () => {
        const { chat } = createChat();
        await chat.open();
        api.createRun.mockImplementation(async () => {
            server.runs = [run("queued")];
            server.messages = [{ id: "user", run_id: "run", role: "user", content: "查积分", created_at: "2026-11-03T08:00:00Z" }];
            return response(run("queued"));
        });
        expect(await chat.send("查积分")).toBe(true);
        expect(api.createRun).toHaveBeenCalledTimes(1);
        const stream = streams[0]!;
        stream.onEvent({ type: "run.started", run_id: "run", event_id: 1, data: { status: "running" } });
        stream.onEvent({ type: "message.delta", run_id: "run", event_id: 2, data: { text: "本周" } });
        stream.onEvent({ type: "message.delta", run_id: "run", event_id: 2, data: { text: "重复" } });
        stream.onEvent({ type: "message.delta", run_id: "run", event_id: 3, data: { text: "净增 18 分" } });
        expect(chat.conversation.value?.messages.map((message) => message.content)).toEqual(["查积分", "本周净增 18 分"]);
        server.runs = [run("completed", 4)];
        server.messages.push({ id: "stored-assistant", run_id: "run", role: "assistant", content: "本周净增 18 分", created_at: "2026-11-03T08:01:00Z" });
        stream.onEvent({ type: "run.completed", run_id: "run", event_id: 4, data: { status: "completed" } });
        stream.end();
        await settle();
        expect(chat.responding.value).toBe(false);
        expect(chat.conversation.value?.messages.filter((message) => message.role === "assistant")).toEqual([server.messages[1]]);
        expect([...storage.values()]).toEqual(["chat"]);
    });

    it("closes only the subscription and resumes active text without duplicating cards or reverting confirmed actions", async () => {
        server.runs = [run()];
        server.results = [{ run_id: "run", data: { tool: "query_points_summary", result: { total: 18 } } }];
        server.actions = [action("succeeded")];
        const { chat, succeeded } = createChat();
        await chat.open();
        streams[0]!.onEvent({ type: "message.delta", run_id: "run", event_id: 1, data: { text: "前半" } });
        chat.close();
        expect(streams[0]!.signal.aborted).toBe(true);
        expect(api.cancelRun).not.toHaveBeenCalled();
        expect(chat.responding.value).toBe(true);
        await chat.open();
        const stream = streams[1]!;
        expect(stream.after).toBe(1);
        stream.onEvent({ type: "message.delta", run_id: "run", event_id: 1, data: { text: "前半" } });
        stream.onEvent({ type: "data.result", run_id: "run", event_id: 2, data: server.results[0]!.data });
        stream.onEvent({ type: "action.proposed", run_id: "run", event_id: 3, data: action() });
        stream.onEvent({ type: "message.delta", run_id: "run", event_id: 4, data: { text: "后半" } });
        expect(chat.conversation.value?.messages[0]?.content).toBe("前半后半");
        expect(chat.conversation.value?.results).toHaveLength(1);
        expect(chat.conversation.value?.actions[0]?.status).toBe("succeeded");
        expect(succeeded).not.toHaveBeenCalled();
    });

    it("deduplicates result values across SSE and snapshots regardless of nested object key order", async () => {
        server.runs = [run()];
        server.results = [{ run_id: "run", data: {
            tool: "query_points_summary", result: { totals: { add: 18, sub: 3 }, students: [{ id: 7, points: { total: 20, available: 10 } }] }
        } }];
        const { chat } = createChat();
        await chat.open();
        const reordered = {
            result: { students: [{ points: { available: 10, total: 20 }, id: 7 }], totals: { sub: 3, add: 18 } },
            tool: "query_points_summary"
        };
        streams[0]!.onEvent({ type: "data.result", run_id: "run", event_id: 1, data: reordered });
        expect(chat.conversation.value?.results).toHaveLength(1);
        streams[0]!.onEvent({ type: "data.result", run_id: "run", event_id: 2, data: {
            tool: "query_points_summary", result: { students: [{ id: 7, points: { total: 21, available: 10 } }], totals: { sub: 3, add: 18 } }
        } });
        expect(chat.conversation.value?.results).toHaveLength(2);
        server.results = [
            { run_id: "run", data: reordered },
            { run_id: "run", data: {
                result: { totals: { add: 18, sub: 3 }, students: [{ points: { available: 10, total: 21 }, id: 7 }] },
                tool: "query_points_summary"
            } }
        ];
        server.runs = [run("completed", 3)];
        streams[0]!.onEvent({ type: "run.completed", run_id: "run", event_id: 3, data: { status: "completed" } });
        streams[0]!.end();
        await settle();
        expect(chat.conversation.value?.results).toHaveLength(2);
    });

    it("refreshes after an interrupted stream and reconnects from its cursor without creating another run", async () => {
        server.runs = [run()];
        const { chat } = createChat();
        await chat.open();
        streams[0]!.onEvent({ type: "message.delta", run_id: "run", event_id: 5, data: { text: "前半" } });
        streams[0]!.end();
        await settle();
        expect(chat.error.value).toContain("重新连接");
        expect(chat.responding.value).toBe(true);
        expect(api.subscribe).toHaveBeenCalledTimes(1);
        await chat.reconnect();
        expect(streams[1]!.after).toBe(5);
        streams[1]!.onEvent({ type: "message.delta", run_id: "run", event_id: 6, data: { text: "后半" } });
        expect(chat.conversation.value?.messages[0]?.content).toBe("前半后半");
        expect(api.createRun).not.toHaveBeenCalled();
    });

    it("retains the same request ID and one optimistic message when a send response is uncertain", async () => {
        const { chat } = createChat();
        await chat.open();
        api.createRun.mockRejectedValueOnce(new Error("网络连接中断"));
        expect(await chat.send("查积分")).toBe(false);
        expect(chat.conversation.value?.messages).toHaveLength(1);
        expect(await chat.send("改查库存")).toBe(false);
        expect(api.createRun).toHaveBeenCalledTimes(1);
        api.createRun.mockImplementationOnce(async () => {
            server.runs = [run("queued")];
            server.messages = [{ id: "user", run_id: "run", role: "user", content: "查积分", created_at: "2026-11-03T08:00:00Z" }];
            return response(run("queued"));
        });
        expect(await chat.send("查积分")).toBe(true);
        expect(api.createRun.mock.calls[0]?.[1]).toEqual(api.createRun.mock.calls[1]?.[1]);
        expect(chat.conversation.value?.messages).toHaveLength(1);
    });

    it.each([100400, 100403, 200402, 100429])("allows a revised question after a definite business rejection (%s)", async (code) => {
        const { chat } = createChat();
        await chat.open();
        api.createRun.mockRejectedValueOnce(new ApiRequestError("请求未被接受", code));
        expect(await chat.send("原问题")).toBe(false);
        expect(chat.conversation.value?.messages).toEqual([]);
        api.createRun.mockImplementationOnce(async () => {
            server.runs = [run("queued")];
            server.messages = [{ id: "revised-user", run_id: "run", role: "user", content: "修正后的问题", created_at: "2026-11-03T08:00:00Z" }];
            return response(run("queued"));
        });
        expect(await chat.send("修正后的问题")).toBe(true);
        expect(api.createRun.mock.calls[0]?.[1].client_request_id).not.toBe(api.createRun.mock.calls[1]?.[1].client_request_id);
        expect(chat.conversation.value?.messages).toHaveLength(1);
    });

    it("retains an uncertain request ID when an older identical message belongs to a run outside the run snapshot", async () => {
        server.runs = [{ ...run("completed"), id: "recent" }];
        server.messages = [{ id: "historical-user", run_id: "older-than-twenty-runs", role: "user", content: "查积分", created_at: "2026-10-01T08:00:00Z" }];
        const { chat } = createChat();
        await chat.open();
        api.createRun.mockRejectedValueOnce(new ApiRequestError("提交结果暂时未知", 100500));
        expect(await chat.send("查积分")).toBe(false);
        chat.close();
        await chat.open();
        expect(chat.conversation.value?.messages).toHaveLength(2);
        api.createRun.mockImplementationOnce(async () => {
            server.runs.unshift(run("queued"));
            server.messages.push({ id: "new-user", run_id: "run", role: "user", content: "查积分", created_at: "2026-11-03T08:00:00Z" });
            return response(run("queued"));
        });
        expect(await chat.send("查积分")).toBe(true);
        expect(api.createRun.mock.calls[0]?.[1].client_request_id).toBe(api.createRun.mock.calls[1]?.[1].client_request_id);
        expect(chat.conversation.value?.messages.map((message) => message.id)).toEqual(["historical-user", "new-user"]);
    });

    it("does not infer acceptance from a matching snapshot message and explicitly confirms the same request ID on retry", async () => {
        const { chat } = createChat();
        await chat.open();
        api.createRun.mockRejectedValueOnce(new Error("响应丢失"));
        expect(await chat.send("查积分")).toBe(false);
        server.runs = [run("completed")];
        server.messages = [{ id: "server-user", run_id: "run", role: "user", content: "查积分", created_at: "2026-11-03T08:00:00Z" }];
        chat.close();
        await chat.open();
        expect(chat.conversation.value?.messages).toHaveLength(1);
        expect(await chat.send("改查库存")).toBe(false);
        expect(api.createRun).toHaveBeenCalledTimes(1);
        api.createRun.mockResolvedValueOnce(response(run("completed")));
        expect(await chat.send("查积分")).toBe(true);
        expect(api.createRun.mock.calls[0]?.[1]).toEqual(api.createRun.mock.calls[1]?.[1]);
        expect(chat.conversation.value?.messages).toHaveLength(1);
    });

    it("waits for the confirmation result, locks conflicting operations and notifies success once", async () => {
        server.actions = [action()];
        server.runs = [run()];
        const { chat, succeeded } = createChat();
        await chat.open();
        const result = deferred<ReturnType<typeof response<AgentAction>>>();
        api.decideAction.mockReturnValueOnce(result.promise);
        const confirming = chat.decide("action", "confirm");
        expect(chat.actionBusyId.value).toBe("action");
        expect(chat.conversation.value?.actions[0]?.status).toBe("pending");
        expect(succeeded).not.toHaveBeenCalled();
        await chat.decide("action", "confirm");
        await chat.cancel();
        expect(await chat.send("查积分")).toBe(false);
        expect(api.decideAction).toHaveBeenCalledTimes(1);
        expect(api.cancelRun).not.toHaveBeenCalled();
        result.resolve(response(action("succeeded")));
        await confirming;
        expect(chat.conversation.value?.actions[0]?.status).toBe("succeeded");
        expect(succeeded).toHaveBeenCalledTimes(1);
        await chat.decide("action", "confirm");
        expect(succeeded).toHaveBeenCalledTimes(1);
        expect(api.decideAction).toHaveBeenCalledWith("action", "confirm");
    });

    it("keeps a failed confirmation pending for retry and refreshes conflicts without reporting success", async () => {
        server.actions = [action()];
        const { chat, succeeded } = createChat();
        await chat.open();
        api.decideAction.mockRejectedValueOnce(new Error("网络中断，请重试"));
        await chat.decide("action", "confirm");
        expect(chat.conversation.value?.actions[0]?.status).toBe("pending");
        expect(chat.actionBusyId.value).toBe("");
        expect(succeeded).not.toHaveBeenCalled();
        api.decideAction.mockRejectedValueOnce(new ApiRequestError("价格已变化，请重新预览", 100409));
        server.actions = [action("expired")];
        await chat.decide("action", "confirm");
        expect(chat.conversation.value?.actions[0]?.status).toBe("expired");
        expect(chat.error.value).toBe("价格已变化，请重新预览");
        expect(succeeded).not.toHaveBeenCalled();
    });

    it("retries the same pending action and only disables expired confirmation locally", async () => {
        server.actions = [action()];
        const { chat, succeeded } = createChat();
        await chat.open();
        api.decideAction.mockRejectedValueOnce(new Error("网络中断"));
        await chat.decide("action", "confirm");
        api.decideAction.mockResolvedValueOnce(response(action("succeeded")));
        await chat.decide("action", "confirm");
        expect(succeeded).toHaveBeenCalledTimes(1);
        expect(api.decideAction.mock.calls).toEqual([["action", "confirm"], ["action", "confirm"]]);
        server.actions = [{ ...action(), id: "expired-local", expires_at: "2020-01-01T00:00:00Z" }];
        await chat.newConversation();
        await chat.decide("expired-local", "confirm");
        expect(api.decideAction).toHaveBeenCalledTimes(2);
        expect(chat.conversation.value?.actions[0]?.status).toBe("pending");
        expect(chat.error.value).toContain("已过期");
    });

    it("notifies once when a lost confirmation response is recovered as succeeded in a later snapshot", async () => {
        server.actions = [action()];
        const { chat, succeeded } = createChat();
        await chat.open();
        api.decideAction.mockRejectedValueOnce(new Error("确认响应丢失"));
        await chat.decide("action", "confirm");
        expect(chat.conversation.value?.actions[0]?.status).toBe("pending");
        expect(succeeded).not.toHaveBeenCalled();
        server.actions = [action("succeeded")];
        await chat.reconnect();
        expect(chat.conversation.value?.actions[0]?.status).toBe("succeeded");
        expect(succeeded).toHaveBeenCalledTimes(1);
        await chat.reconnect();
        chat.close();
        await chat.open();
        expect(succeeded).toHaveBeenCalledTimes(1);
        expect(api.decideAction).toHaveBeenCalledTimes(1);
    });

    it.each(["completed", "failed"] as const)("uses a recovered %s snapshot after the stream disconnects", async (status) => {
        server.runs = [run()];
        const { chat } = createChat();
        await chat.open();
        streams[0]!.onEvent({ type: "message.delta", run_id: "run", event_id: 1, data: { text: "部分回复" } });
        server.runs = [{ ...run(status, 2), error: status === "failed" ? "模型服务超时，请重试" : undefined }];
        if (status === "completed") {
            server.messages = [{ id: "complete-server-message", run_id: "run", role: "assistant", content: "完整的服务端回复", created_at: "2026-11-03T08:01:00Z" }];
        }
        streams[0]!.fail(new Error("连接中断"));
        await settle();
        expect(chat.responding.value).toBe(false);
        expect(chat.error.value).toBe(status === "failed" ? "模型服务超时，请重试" : "");
        if (status === "completed") expect(chat.conversation.value?.messages[0]?.id).toBe("complete-server-message");
    });

    it("uses the cancellation endpoint's actual terminal status", async () => {
        server.runs = [run()];
        server.actions = [action("succeeded")];
        const { chat } = createChat();
        await chat.open();
        server.runs = [run("completed", 4)];
        api.cancelRun.mockResolvedValueOnce(response(server.runs[0]));
        await chat.cancel();
        expect(api.cancelRun).toHaveBeenCalledWith("run");
        expect(chat.conversation.value?.runs[0]?.status).toBe("completed");
        expect(chat.conversation.value?.actions[0]?.status).toBe("succeeded");
        expect(chat.responding.value).toBe(false);
    });

    it("ignores a confirmation from the previous identity after scope changes", async () => {
        server.actions = [action()];
        const { chat, selected, succeeded } = createChat();
        await chat.open();
        const result = deferred<ReturnType<typeof response<AgentAction>>>();
        api.decideAction.mockReturnValueOnce(result.promise);
        const confirming = chat.decide("action", "confirm");
        server = snapshot("other-chat", 8);
        selected.userId = "other-teacher";
        selected.classId = 8;
        await settle();
        result.resolve(response(action("succeeded")));
        await confirming;
        expect(chat.conversation.value?.id).toBe("other-chat");
        expect(chat.conversation.value?.actions).toEqual([]);
        expect(succeeded).not.toHaveBeenCalled();
        expect([...storage.values()]).not.toContainEqual(expect.stringContaining("确认加分"));
    });

    it("clears scope immediately and restores only the final class and semester selected in one update", async () => {
        const { chat, selected } = createChat();
        await chat.open();
        server = { ...snapshot("next-class", 8), semester_id: 10 };
        selected.classId = 8;
        expect(chat.conversation.value).toBeNull();
        selected.semesterId = 10;
        await settle();
        expect(api.createConversation).toHaveBeenCalledTimes(2);
        expect(api.createConversation).toHaveBeenLastCalledWith({ class_id: 8, semester_id: 10 });
        expect(chat.conversation.value?.id).toBe("next-class");
    });

    it.each(["create", "restore", "new"] as const)("ignores an old %s response after the selected class changes", async (operation) => {
        const { chat, selected } = createChat();
        const old = deferred<ReturnType<typeof response<AgentConversation>>>();
        let loadingOld: Promise<void>;
        if (operation === "create") {
            api.createConversation.mockReturnValueOnce(old.promise);
            loadingOld = chat.open();
        } else {
            await chat.open();
            if (operation === "restore") {
                chat.close();
                api.getConversation.mockReturnValueOnce(old.promise);
                loadingOld = chat.open();
            } else {
                api.createConversation.mockReturnValueOnce(old.promise);
                loadingOld = chat.newConversation();
            }
        }
        server = snapshot("new-scope", 8);
        selected.classId = 8;
        await settle();
        old.resolve(response(snapshot("old-response")));
        await loadingOld;
        expect(chat.conversation.value?.id).toBe("new-scope");
        expect(chat.loading.value).toBe(false);
        expect([...storage.values()]).not.toContain("old-response");
    });

    it("keeps the previous conversation and stream if creating a new conversation fails", async () => {
        server.runs = [run()];
        server.messages = [{ id: "user", run_id: "run", role: "user", content: "查积分", created_at: "2026-11-03T08:00:00Z" }];
        const { chat } = createChat();
        await chat.open();
        api.createConversation.mockRejectedValueOnce(new Error("暂时无法创建会话"));
        await chat.newConversation();
        expect(chat.conversation.value?.id).toBe("chat");
        expect(chat.conversation.value?.messages[0]?.content).toBe("查积分");
        expect(chat.error.value).toBe("暂时无法创建会话");
        expect(streams[0]!.signal.aborted).toBe(false);
        expect(chat.loading.value).toBe(false);
    });

    it("displays a persisted failed run and never prefetches while the window has not opened", async () => {
        server.runs = [{ ...run("failed"), error: "回复超时，请缩小查询范围后重试" }];
        const { chat, selected } = createChat();
        selected.classId = 8;
        expect(api.createConversation).not.toHaveBeenCalled();
        server.class_id = 8;
        await chat.open();
        expect(chat.error.value).toContain("回复超时");
        expect(chat.responding.value).toBe(false);
        expect(api.subscribe).not.toHaveBeenCalled();
    });

    it("shows the latest run outcome when run snapshots are ordered newest first", async () => {
        server.runs = [
            { ...run("completed"), id: "newest", created_at: "2026-11-03T09:00:00Z" },
            { ...run("failed"), id: "older", error: "旧请求失败", created_at: "2026-11-03T08:00:00Z" }
        ];
        const { chat } = createChat();
        await chat.open();
        expect(chat.error.value).toBe("");
        server.runs[0] = { ...server.runs[0]!, status: "failed", error: "最新请求失败" };
        chat.close();
        await chat.open();
        expect(chat.error.value).toBe("最新请求失败");
    });

    it("retries opening the conversation when synchronization follows an initial creation failure", async () => {
        const { chat } = createChat();
        api.createConversation.mockRejectedValueOnce(new Error("创建连接失败"));
        await chat.open();
        expect(chat.conversation.value).toBeNull();
        expect(chat.error.value).toBe("创建连接失败");
        await chat.reconnect();
        expect(api.createConversation).toHaveBeenCalledTimes(2);
        expect(chat.conversation.value?.id).toBe("chat");
        expect(chat.error.value).toBe("");
    });
});
