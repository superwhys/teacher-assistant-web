export interface AgentMessage {
    id: string;
    run_id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

export interface AgentRun {
    id: string;
    status: "queued" | "running" | "completed" | "failed" | "cancelled";
    error?: string;
    last_event_id: number;
    created_at: string;
}

export interface AgentAction {
    id: string;
    run_id: string;
    kind: "points" | "redeem";
    status: "pending" | "succeeded" | "rejected" | "expired";
    title: string;
    description: string;
    details: { label: string; value: string }[];
    rows: { name: string; detail: string; value: string }[];
    result?: { summary: string; [field: string]: unknown };
    expires_at: string;
}

export interface AgentResult {
    run_id: string;
    data: { tool: string; result: unknown };
}

export interface AgentConversation {
    id: string;
    class_id: number;
    semester_id: number;
    messages: AgentMessage[];
    runs: AgentRun[];
    actions: AgentAction[];
    results: AgentResult[];
}

interface AgentEventPayloads {
    "message.delta": { text: string };
    "tool.status": { tool: string; status: "running" | "completed" | "failed" };
    "data.result": AgentResult["data"];
    "action.proposed": AgentAction;
    "run.started": { status: "running" };
    "run.completed": { status: "completed" };
    "run.failed": { message: string };
    "run.cancelled": { status: "cancelled" };
}

export type AgentStreamEvent = {
    [Type in keyof AgentEventPayloads]: {
        type: Type;
        run_id: string;
        event_id: number;
        data: AgentEventPayloads[Type];
    };
}[keyof AgentEventPayloads] | { type: "run.snapshot"; data: AgentRun };
