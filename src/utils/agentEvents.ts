import type { AgentAction } from "@/types/agent";

export const AGENT_ACTION_SUCCEEDED_EVENT = "teacher-agent-action-succeeded";

export interface AgentActionSucceededDetail {
    userId: string;
    classId: number;
    semesterId: number;
    kind: AgentAction["kind"];
}

declare global {
    interface WindowEventMap {
        "teacher-agent-action-succeeded": CustomEvent<AgentActionSucceededDetail>;
    }
}

export function notifyAgentActionSucceeded(detail: AgentActionSucceededDetail): void {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(AGENT_ACTION_SUCCEEDED_EVENT, { detail }));
    }
}
