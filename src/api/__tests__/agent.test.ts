import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/types/user";
import type { AgentStreamEvent } from "@/types/agent";
import { agentApi } from "../agent";

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(), message: vi.fn(), logout: vi.fn(), rejected: vi.fn(),
    cache: { token: "session" as string | null, profile: null as UserProfile | null, logout: () => {}, updateProfile: (_value: UserProfile) => {} },
}));
vi.mock("@/routers", () => ({ default: { currentRoute: { value: { path: "/students", fullPath: "/students" } }, replace: vi.fn() } }));
vi.mock("@/stores/cacheStore", () => ({ useCacheStore: () => mocks.cache }));
vi.mock("element-plus", () => ({ ElMessage: mocks.message }));
vi.mock("@/utils/entitlementEvents", () => ({ notifyEntitlementRejected: mocks.rejected }));

function jsonResponse(code = 0, message = "success", status = 200, data: unknown = {}): Response {
    return new Response(JSON.stringify({ code, message, data }), { status, headers: { "Content-Type": "application/json" } });
}

function frame(id: number, type: string, data: unknown): string {
    return `id: ${id}\nevent: ${type}\ndata: ${JSON.stringify({ run_id: "run", event_id: id, type, data })}\n\n`;
}

function eventResponse(text: string, byteByByte = false): Response {
    const bytes = new TextEncoder().encode(text);
    return new Response(new ReadableStream<Uint8Array>({
        start(controller) {
            if (byteByByte) {
                for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
            } else {
                controller.enqueue(bytes);
            }
            controller.close();
        },
    }), { headers: { "Content-Type": "text/event-stream; charset=utf-8" } });
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.cache.token = "session";
    mocks.cache.profile = { id: "teacher", name: "Teacher", email: "", roleCode: "pro", entitlement: {
        state: "permanent", permanent: true, trial_started_at: null, trial_expires_at: null, paid_expires_at: null,
    } };
    mocks.cache.logout = mocks.logout;
    mocks.cache.updateProfile = (value) => { mocks.cache.profile = value; };
    vi.stubGlobal("fetch", mocks.fetch);
    vi.stubGlobal("window", { setTimeout: vi.fn(), location: { href: "" } });
    mocks.fetch.mockImplementation(() => Promise.resolve(jsonResponse()));
});
afterEach(() => vi.unstubAllGlobals());

describe("Agent transport", () => {
    it("requests history for the selected class, semester and page", async () => {
        mocks.fetch.mockResolvedValueOnce(jsonResponse(0, "success", 200, { items: [], has_more: false }));
        await agentApi.listConversations({ class_id: 7, semester_id: 9, page: 2, page_size: 20 });
        expect(mocks.fetch.mock.calls[0]?.[0]).toBe("/api/agent/conversations?class_id=7&semester_id=9&page=2&page_size=20");
        expect(mocks.fetch.mock.calls[0]?.[1].headers.Authorization).toBe("session");
    });

    it.each([
        { items: null, has_more: false },
        { items: [], has_more: "false" },
        { items: [{ id: "history", title: "查询积分", created_at: "invalid" }], has_more: false },
    ])("rejects malformed history pages %#", async (data) => {
        mocks.fetch.mockResolvedValueOnce(jsonResponse(0, "success", 200, data));
        await expect(agentApi.listConversations({ class_id: 7, semester_id: 9, page: 1, page_size: 20 }))
            .rejects.toThrow("历史对话数据无效");
    });

    it("passes completed durations from events and restored snapshots", async () => {
        const run = { id: "run", status: "completed", last_event_id: 2,
            created_at: "2026-11-03T08:00:00Z", duration_ms: 12340 };
        mocks.fetch.mockResolvedValue(eventResponse(frame(2, "run.completed", { status: "completed", duration_ms: 12340 })
            + `event: run.snapshot\ndata: ${JSON.stringify(run)}\n\n`));
        const onEvent = vi.fn();
        await agentApi.subscribe("run", 0, { signal: new AbortController().signal, onEvent });
        expect(onEvent.mock.calls.map(([event]) => event.data.duration_ms)).toEqual([12340, 12340]);
    });

    it.each([-1, null, "1200", 1.5])("rejects invalid completed durations (%s)", async (duration_ms) => {
        for (const text of [
            frame(1, "run.completed", { status: "completed", duration_ms }),
            `event: run.snapshot\ndata: ${JSON.stringify({ id: "run", status: "completed", last_event_id: 1,
                created_at: "2026-11-03T08:00:00Z", duration_ms })}\n\n`,
        ]) {
            mocks.fetch.mockResolvedValue(eventResponse(text));
            const onEvent = vi.fn();
            await expect(agentApi.subscribe("run", 0, { signal: new AbortController().signal, onEvent })).rejects.toThrow(/无效/);
            expect(onEvent).not.toHaveBeenCalled();
        }
    });

    it("uses the authenticated JSON endpoints without changing request identifiers or paths", async () => {
        await agentApi.createConversation({ class_id: 7, semester_id: 8 });
        await agentApi.getConversation("conversation");
        await agentApi.createRun("conversation", { client_request_id: "request", message: "总结本周积分" });
        await agentApi.cancelRun("run");
        await agentApi.decideAction("action", "confirm");
        expect(mocks.fetch.mock.calls.map(([url]) => url)).toEqual([
            "/api/agent/conversations", "/api/agent/conversations/conversation",
            "/api/agent/conversations/conversation/runs", "/api/agent/runs/run/cancel", "/api/agent/actions/action/decision",
        ]);
        for (const [, options] of mocks.fetch.mock.calls) expect(options.headers.Authorization).toBe("session");
        expect(JSON.parse(mocks.fetch.mock.calls[2]![1].body)).toEqual({ client_request_id: "request", message: "总结本周积分" });
        expect(JSON.parse(mocks.fetch.mock.calls[4]![1].body)).toEqual({ decision: "confirm" });
    });

    it("decodes split UTF-8, CRLF, comments and multiple data lines without delivering unfinished frames", async () => {
        const text = ": heartbeat\r\nid: 1\r\nevent: message.delta\r\n"
            + 'data: {"run_id":"run",\r\ndata: "event_id":1,"type":"message.delta","data":{"text":"中文🙂"}}\r\n\r\n'
            + frame(1, "message.delta", { text: "duplicate" })
            + "event: future.event\ndata: unknown-secret-payload\n\n"
            + frame(2, "data.result", { tool: "list_students", result: { students: [] } })
            + 'id: 3\nevent: message.delta\ndata: {"unfinished":"secret';
        mocks.fetch.mockResolvedValue(eventResponse(text, true));
        const events: AgentStreamEvent[] = [];
        const controller = new AbortController();
        await agentApi.subscribe("run", 0, { signal: controller.signal, onEvent: (event) => events.push(event) });
        expect(events).toEqual([
            { run_id: "run", event_id: 1, type: "message.delta", data: { text: "中文🙂" } },
            { run_id: "run", event_id: 2, type: "data.result", data: { tool: "list_students", result: { students: [] } } },
        ]);
        expect(mocks.fetch).toHaveBeenCalledOnce();
        expect(mocks.fetch.mock.calls[0]![0]).toBe("/api/agent/runs/run/events?after_event_id=0");
        expect(mocks.fetch.mock.calls[0]![1]).toMatchObject({ method: "GET", signal: controller.signal, headers: { Authorization: "session", Accept: "text/event-stream" } });
    });

    it("normalizes the bare run snapshot without inventing a durable event ID", async () => {
        const run = { id: "run", status: "failed", last_event_id: 7, created_at: "2026-11-03T08:00:00Z", error: "服务中断" };
        mocks.fetch.mockResolvedValue(eventResponse(`event: run.snapshot\ndata: ${JSON.stringify(run)}\n\n`));
        const onEvent = vi.fn();
        await agentApi.subscribe("run", 7, { signal: new AbortController().signal, onEvent });
        expect(onEvent).toHaveBeenCalledExactlyOnceWith({ type: "run.snapshot", data: run });
        expect(mocks.fetch.mock.calls[0]![0]).toContain("after_event_id=7");
    });

    it.each([100403, 200402, 200403, 200404])("handles HTTP 200 JSON business failure %s through the shared boundary", async (code) => {
        mocks.fetch.mockResolvedValue(jsonResponse(code, "权限已变化"));
        const onEvent = vi.fn();
        await expect(agentApi.subscribe("run", 0, { signal: new AbortController().signal, onEvent })).rejects.toMatchObject({ code, message: "权限已变化" });
        expect(onEvent).not.toHaveBeenCalled();
        expect(mocks.logout).not.toHaveBeenCalled();
        if (code !== 100403) expect(mocks.rejected).toHaveBeenCalledWith("session", code);
    });

    it("uses the same session-expiry handling for HTTP 401", async () => {
        mocks.cache.token = "expired-stream-session";
        mocks.fetch.mockResolvedValue(jsonResponse(100401, "登录已失效", 401));
        await expect(agentApi.subscribe("run", 0, { signal: new AbortController().signal, onEvent: vi.fn() })).rejects.toThrow("登录已失效");
        expect(mocks.logout).toHaveBeenCalledOnce();
    });

    it("preserves the commercial code from HTTP 403", async () => {
        mocks.fetch.mockResolvedValue(jsonResponse(200404, "订阅已到期", 403));
        await expect(agentApi.subscribe("run", 0, { signal: new AbortController().signal, onEvent: vi.fn() })).rejects.toMatchObject({ code: 200404 });
        expect(mocks.cache.profile?.entitlement?.state).toBe("paid_expired");
        expect(mocks.logout).not.toHaveBeenCalled();
    });

    it("turns stream.error into the shared API error and stops consuming later data", async () => {
        mocks.fetch.mockResolvedValue(eventResponse(frame(1, "message.delta", { text: "partial" })
            + 'event: stream.error\ndata: {"code":200402,"message":"试用已到期","data":null}\n\n'
            + frame(2, "message.delta", { text: "must not appear" })));
        const onEvent = vi.fn();
        await expect(agentApi.subscribe("run", 0, { signal: new AbortController().signal, onEvent })).rejects.toMatchObject({ code: 200402 });
        expect(onEvent).toHaveBeenCalledOnce();
        expect(mocks.rejected).toHaveBeenCalledWith("session", 200402);
    });

    it.each([
        'event: stream.error\ndata: {"raw":"secret"}\n\n',
        'event: message.delta\ndata: not-json-secret\n\n',
        frame(1, "message.delta", { text: { raw: "secret" } }),
    ])("does not surface unknown event payloads: %#", async (text) => {
        mocks.fetch.mockResolvedValue(eventResponse(text));
        const onEvent = vi.fn();
        await expect(agentApi.subscribe("run", 0, { signal: new AbortController().signal, onEvent })).rejects.toThrow(/无效/);
        expect(onEvent).not.toHaveBeenCalled();
        expect(mocks.message.mock.calls.some(([value]) => String(value.message).includes("secret"))).toBe(false);
    });

    it("rejects old stream data after an account change and releases the connection", async () => {
        let source!: ReadableStreamDefaultController<Uint8Array>;
        const cancel = vi.fn();
        mocks.fetch.mockResolvedValue(new Response(new ReadableStream<Uint8Array>({ start(controller) { source = controller; }, cancel }), { headers: { "Content-Type": "text/event-stream" } }));
        const onEvent = vi.fn();
        const pending = agentApi.subscribe("run", 0, { signal: new AbortController().signal, onEvent });
        source.enqueue(new TextEncoder().encode(frame(1, "message.delta", { text: "first" })));
        await vi.waitFor(() => expect(onEvent).toHaveBeenCalledOnce());
        mocks.cache.token = "new-session";
        source.enqueue(new TextEncoder().encode(frame(2, "message.delta", { text: "old account secret" })));
        await expect(pending).rejects.toThrow("账号已切换");
        expect(onEvent).toHaveBeenCalledOnce();
        expect(cancel).toHaveBeenCalledOnce();
        expect(mocks.logout).not.toHaveBeenCalled();
    });

    it("does not apply an old handshake rejection to the newly signed-in account", async () => {
        let resolve!: (response: Response) => void;
        mocks.fetch.mockImplementation(() => new Promise<Response>((finish) => { resolve = finish; }));
        const pending = agentApi.subscribe("run", 0, { signal: new AbortController().signal, onEvent: vi.fn() });
        mocks.cache.token = "new-session";
        resolve(jsonResponse(200402, "old account expired", 403));
        await expect(pending).rejects.toThrow("账号已切换");
        expect(mocks.rejected).not.toHaveBeenCalled();
        expect(mocks.cache.profile?.entitlement?.state).toBe("permanent");
    });

    it("passes cancellation through and never creates or cancels a run during subscription", async () => {
        const controller = new AbortController();
        mocks.fetch.mockRejectedValue(new DOMException("Aborted", "AbortError"));
        const pending = agentApi.subscribe("run", 12, { signal: controller.signal, onEvent: vi.fn() });
        controller.abort();
        await expect(pending).rejects.toMatchObject({ name: "AbortError" });
        expect(mocks.fetch).toHaveBeenCalledOnce();
        expect(mocks.fetch.mock.calls[0]![1].signal).toBe(controller.signal);
        expect(mocks.fetch.mock.calls[0]![0]).toBe("/api/agent/runs/run/events?after_event_id=12");
    });
});
