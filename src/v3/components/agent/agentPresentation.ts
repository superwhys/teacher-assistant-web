import type { AgentAction, AgentConversation, AgentResult, AgentRun } from "@/types/agent";

export interface AgentCard {
    title?: string;
    stats?: { label: string; value: string; detail?: string }[];
    rows?: { id: string | number; name: string; detail: string; value: string }[];
    note?: string;
}

export interface AgentChatMessage {
    id: string;
    runId: string;
    role: "user" | "assistant";
    text: string;
    complete: boolean;
    cards: AgentCard[];
    actions: AgentAction[];
    error?: string;
    durationMs?: number;
}

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numeric(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function records(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value) ? value.filter(record) : [];
}

function signed(value: number): string {
    return value > 0 ? `+${value}` : String(value);
}

const dayFormatter = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", dateStyle: "short" });
const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", dateStyle: "short", timeStyle: "short",
});

function dateText(value: unknown, time = false): string {
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return "";
    return (time ? timeFormatter : dayFormatter).format(new Date(value));
}

function period(data: Record<string, unknown>): string {
    const from = dateText(data.from);
    const to = dateText(data.to);
    return from && to ? `${from} 至 ${to}` : "";
}

function unavailable(title = "查询结果"): AgentCard {
    return { title, note: "暂无可展示的查询结果。" };
}

export function toDataCard(data: AgentResult["data"]): AgentCard {
    const value = data.result;
    if (data.tool === "query_points_summary" && record(value)) {
        const metrics = [
            ["获得积分", value.awarded],
            ["扣除积分", value.deducted],
            ["净变化", value.net_change],
            ["积分记录", value.records],
            ["参与学生", value.participating_students],
        ] as const;
        const stats = metrics.flatMap(([label, amount]) => numeric(amount)
            ? [{ label, value: label === "净变化" ? signed(amount) : String(amount) }]
            : []);
        return stats.length ? {
            title: "班级积分汇总",
            stats,
            note: [period(value), "统计包含加分、扣分和兑换等积分流水。"].filter(Boolean).join(" · "),
        } : unavailable("班级积分汇总");
    }

    if (data.tool === "list_students" && record(value) && Array.isArray(value.students)) {
        const rows = records(value.students).flatMap((student) => {
            if (!numeric(student.id) || typeof student.name !== "string") return [];
            const details: string[] = [];
            if (numeric(student.group_id)) {
                details.push(student.group_id === 0 ? "未分组" : `小组 ID ${student.group_id}`);
            }
            if (numeric(student.total_points)) details.push(`总积分 ${student.total_points}`);
            return [{
                id: student.id,
                name: student.name,
                detail: details.join(" · "),
                value: numeric(student.available_points) ? `可用 ${student.available_points} 分` : "",
            }];
        });
        const notes: string[] = [];
        if (value.truncated === true && numeric(value.matched_count)) {
            notes.push(`展示前 ${rows.length} 名，共匹配 ${value.matched_count} 名，请按姓名或小组缩小范围。`);
        }
        if (value.wallet_is_current_semester === false) notes.push("该历史学期不展示当前钱包余额。");
        if (!rows.length) notes.push("没有可展示的学生资料。");
        return {
            title: "学生资料",
            rows,
            stats: numeric(value.matched_count) ? [{ label: "匹配学生", value: String(value.matched_count) }] : [],
            note: notes.join(" ") || undefined,
        };
    }

    if (data.tool === "query_points_records" && record(value) && Array.isArray(value.records)) {
        const sourceNames: Record<number, string> = { 1: "奖品兑换", 2: "积分规则", 3: "积分导入" };
        const rows = records(value.records).flatMap((item) => {
            if (!numeric(item.id) || !numeric(item.amount)) return [];
            const details: string[] = [];
            if (numeric(item.student_id)) details.push(`学生 ID ${item.student_id}`);
            if (numeric(item.source)) details.push(sourceNames[item.source] ?? `来源 ${item.source}`);
            const created = dateText(item.created_at, true);
            if (created) details.push(created);
            return [{
                id: item.id,
                name: typeof item.description === "string" ? item.description : "积分记录",
                detail: details.join(" · "),
                value: `${signed(item.amount)} 分`,
            }];
        });
        return {
            title: "积分记录",
            rows,
            note: [
                period(value),
                numeric(value.total) ? `共 ${value.total} 条，当前展示 ${rows.length} 条。` : "",
                !rows.length ? "没有可展示的积分记录。" : "",
            ].filter(Boolean).join(" · "),
        };
    }

    if (Array.isArray(value)) {
        const titles: Record<string, string> = {
            list_student_groups: "学生分组", list_points_rules: "积分规则", list_prizes: "可兑换奖品",
        };
        const title = titles[data.tool];
        if (!title) return unavailable();
        const rows = records(value).flatMap((item) => {
            if (!numeric(item.id) || typeof item.name !== "string") return [];
            if (data.tool === "list_student_groups") {
                return [{ id: item.id, name: item.name, detail: "学生分组", value: `ID ${item.id}` }];
            }
            if (data.tool === "list_points_rules" && numeric(item.points)) {
                const sign = item.type === 1 ? "+" : item.type === 2 ? "-" : "";
                return [{
                    id: item.id, name: item.name,
                    detail: typeof item.group === "string" ? item.group : "",
                    value: `${sign}${item.points} 分`,
                }];
            }
            if (data.tool === "list_prizes" && numeric(item.points)) {
                return [{
                    id: item.id, name: item.name,
                    detail: numeric(item.stock) ? `库存 ${item.stock} 件` : "",
                    value: `${item.points} 分`,
                }];
            }
            return [];
        });
        return { title, rows, note: rows.length ? undefined : "暂无可展示的结果。" };
    }
    return unavailable();
}

function complete(run: AgentRun | undefined): boolean {
    return !run || (run.status !== "queued" && run.status !== "running");
}

export function formatDuration(durationMs: number): string {
    if (durationMs < 1000) return "<1 秒";
    if (durationMs < 60000) return `${Math.floor(durationMs / 100) / 10} 秒`;
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分`;
}

export function toChatMessages(conversation: AgentConversation | null): AgentChatMessage[] {
    if (!conversation) return [];
    const runs = new Map(conversation.runs.map((run) => [run.id, run]));
    const groups = new Map<string, { runId: string; createdAt: string; messages: AgentChatMessage[]; order: number }>();
    function group(runId: string, createdAt = "") {
        let entry = groups.get(runId);
        if (!entry) {
            entry = { runId, createdAt: runs.get(runId)?.created_at ?? createdAt, messages: [], order: groups.size };
            groups.set(runId, entry);
        }
        return entry;
    }
    for (const message of conversation.messages) {
        group(message.run_id, message.created_at).messages.push({
            id: message.id, runId: message.run_id, role: message.role, text: message.content,
            complete: message.role === "user" || complete(runs.get(message.run_id)), cards: [], actions: [],
        });
    }
    for (const run of conversation.runs) group(run.id, run.created_at);
    for (const result of conversation.results) group(result.run_id);
    for (const action of conversation.actions) group(action.run_id);

    const ordered = [...groups.values()].sort((left, right) => {
        const difference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
        return Number.isFinite(difference) && difference !== 0 ? difference : left.order - right.order;
    });
    for (const entry of ordered) {
        const run = runs.get(entry.runId);
        const cards = conversation.results.filter((result) => result.run_id === entry.runId)
            .map((result) => toDataCard(result.data));
        const actions = conversation.actions.filter((action) => action.run_id === entry.runId);
        let assistant: AgentChatMessage | undefined;
        for (const message of entry.messages) {
            if (message.role === "assistant") assistant = message;
        }
        if (!assistant) {
            if (!cards.length && !actions.length && run?.status !== "failed") continue;
            assistant = {
                id: `result:${entry.runId}`, runId: entry.runId, role: "assistant", text: "",
                complete: complete(run), cards: [], actions: [],
            };
            entry.messages.push(assistant);
        }
        assistant.cards = cards;
        assistant.actions = actions;
        if (run?.status === "completed" && numeric(run.duration_ms) && run.duration_ms >= 0) {
            assistant.durationMs = run.duration_ms;
        }
        if (run?.status === "failed") assistant.error = run.error || "本次回复未完成，请重试。";
    }
    return ordered.flatMap((entry) => entry.messages);
}
