import { get, post, requestStream } from "@/api/api";
import { ApiRequestError, type ApiResponse } from "@/types/api";
import type { AgentAction, AgentConversation, AgentRun, AgentStreamEvent } from "@/types/agent";

const runStatuses = ["queued", "running", "completed", "failed", "cancelled"];
const eventTypes = new Set([
    "message.delta", "tool.status", "data.result", "action.proposed",
    "run.started", "run.completed", "run.failed", "run.cancelled",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isRun(value: unknown): value is AgentRun {
    return isRecord(value) && typeof value.id === "string" && typeof value.status === "string"
        && runStatuses.includes(value.status) && typeof value.created_at === "string"
        && typeof value.last_event_id === "number" && Number.isSafeInteger(value.last_event_id)
        && value.last_event_id >= 0 && (value.error === undefined || typeof value.error === "string");
}

function isAction(value: unknown): value is AgentAction {
    return isRecord(value) && typeof value.id === "string" && typeof value.run_id === "string"
        && (value.kind === "points" || value.kind === "redeem")
        && typeof value.status === "string" && ["pending", "succeeded", "rejected", "expired"].includes(value.status)
        && typeof value.title === "string" && typeof value.description === "string" && typeof value.expires_at === "string"
        && Array.isArray(value.details) && value.details.every((detail: unknown) => isRecord(detail)
            && typeof detail.label === "string" && typeof detail.value === "string")
        && Array.isArray(value.rows) && value.rows.every((row: unknown) => isRecord(row)
            && typeof row.name === "string" && typeof row.detail === "string" && typeof row.value === "string")
        && (value.result === undefined || (isRecord(value.result) && typeof value.result.summary === "string"));
}

function validPayload(type: string, data: unknown, runId: string): boolean {
    if (!isRecord(data)) return false;
    switch (type) {
        case "message.delta": return typeof data.text === "string";
        case "tool.status": return typeof data.tool === "string" && typeof data.status === "string"
            && ["running", "completed", "failed"].includes(data.status);
        case "data.result": return typeof data.tool === "string" && "result" in data;
        case "action.proposed": return isAction(data) && data.run_id === runId;
        case "run.started": return data.status === "running";
        case "run.completed": return data.status === "completed";
        case "run.cancelled": return data.status === "cancelled";
        case "run.failed": return typeof data.message === "string";
        default: return false;
    }
}

function parsePayload(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        throw new ApiRequestError("事件数据无效，请重新连接");
    }
}

interface SubscriptionOptions {
    signal: AbortSignal;
    onEvent: (event: AgentStreamEvent) => void;
}

async function subscribe(runId: string, afterEventId: number, options: SubscriptionOptions): Promise<void> {
    if (!Number.isSafeInteger(afterEventId) || afterEventId < 0) {
        throw new ApiRequestError("事件游标必须为非负整数");
    }
    const stream = await requestStream(`/agent/runs/${encodeURIComponent(runId)}/events?after_event_id=${afterEventId}`, options.signal);
    const reader = stream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let type = "";
    let id = "";
    let data: string[] = [];
    let lastEventId = afterEventId;
    let ended = false;

    function dispatch() {
        if (!data.length) return;
        stream.assertCurrentSession();
        if (type === "stream.error") {
            stream.handleBusinessResponse(parsePayload(data.join("\n")));
            throw new ApiRequestError("事件流发生错误，请重新连接");
        }
        if (type !== "run.snapshot" && !eventTypes.has(type)) return;
        const payload = parsePayload(data.join("\n"));
        if (type === "run.snapshot") {
            if (!isRun(payload) || payload.id !== runId) throw new ApiRequestError("事件状态无效，请重新连接");
            options.onEvent({ type: "run.snapshot", data: payload });
            return;
        }
        if (!isRecord(payload) || payload.run_id !== runId || payload.type !== type
            || typeof payload.event_id !== "number" || !Number.isSafeInteger(payload.event_id) || payload.event_id < 1
            || (id !== "" && id !== String(payload.event_id)) || !validPayload(type, payload.data, runId)) {
            throw new ApiRequestError("事件数据无效，请重新连接");
        }
        if (payload.event_id <= lastEventId) return;
        lastEventId = payload.event_id;
        options.onEvent(payload as AgentStreamEvent);
    }

    function consume(final = false) {
        let index = buffer.search(/[\r\n]/);
        while (index !== -1) {
            if (buffer[index] === "\r" && index === buffer.length - 1 && !final) return;
            const line = buffer.slice(0, index);
            const separatorLength = buffer[index] === "\r" && buffer[index + 1] === "\n" ? 2 : 1;
            buffer = buffer.slice(index + separatorLength);
            if (line === "") {
                dispatch();
                type = "";
                id = "";
                data = [];
            } else if (!line.startsWith(":")) {
                const colon = line.indexOf(":");
                const field = colon === -1 ? line : line.slice(0, colon);
                let value = colon === -1 ? "" : line.slice(colon + 1);
                if (value.startsWith(" ")) value = value.slice(1);
                if (field === "event") type = value;
                if (field === "id") id = value;
                if (field === "data") data.push(value);
            }
            index = buffer.search(/[\r\n]/);
        }
    }

    try {
        while (true) {
            const chunk = await reader.read();
            stream.assertCurrentSession();
            if (chunk.done) {
                ended = true;
                buffer += decoder.decode();
                consume(true);
                // 没有空行结束的半帧不派发，也不把断连当作运行完成。
                return;
            }
            buffer += decoder.decode(chunk.value, { stream: true });
            consume();
        }
    } finally {
        if (!ended) {
            // 解析/鉴权错误保留为主错误，取消底层流仅负责释放连接。
            await reader.cancel().catch(() => undefined);
        }
        reader.releaseLock();
    }
}

export const agentApi = {
    createConversation(data: { class_id: number; semester_id: number }): Promise<ApiResponse<AgentConversation>> {
        return post<AgentConversation>("/agent/conversations", data);
    },
    getConversation(id: string): Promise<ApiResponse<AgentConversation>> {
        return get<AgentConversation>(`/agent/conversations/${encodeURIComponent(id)}`);
    },
    createRun(conversationId: string, data: { client_request_id: string; message: string }): Promise<ApiResponse<AgentRun>> {
        return post<AgentRun>(`/agent/conversations/${encodeURIComponent(conversationId)}/runs`, data);
    },
    cancelRun(runId: string): Promise<ApiResponse<AgentRun>> {
        return post<AgentRun>(`/agent/runs/${encodeURIComponent(runId)}/cancel`);
    },
    decideAction(actionId: string, decision: "confirm" | "reject"): Promise<ApiResponse<AgentAction>> {
        return post<AgentAction>(`/agent/actions/${encodeURIComponent(actionId)}/decision`, { decision });
    },
    subscribe,
};
