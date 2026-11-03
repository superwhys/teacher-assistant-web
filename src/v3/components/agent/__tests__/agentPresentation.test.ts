import { describe, expect, it } from "vitest";
import type { AgentAction, AgentConversation, AgentRun } from "@/types/agent";
import { formatDuration, toChatMessages, toDataCard } from "../agentPresentation";

function conversation(fields: Partial<AgentConversation> = {}): AgentConversation {
    return {
        id: "conversation", class_id: 7, semester_id: 9,
        messages: [], runs: [], actions: [], results: [], ...fields,
    };
}

function run(id: string, status: AgentRun["status"], createdAt = "2026-11-03T10:00:00+08:00"): AgentRun {
    return { id, status, created_at: createdAt, last_event_id: 1 };
}

function action(status: AgentAction["status"]): AgentAction {
    return {
        id: "action", run_id: "run", kind: "points", status,
        title: "确认添加学生积分", description: "确认后才会写入",
        details: [{ label: "积分规则", value: "作业完成 · 每人 +3 分" }],
        rows: [{ name: "林小满", detail: "作业完成", value: "+3 分" }],
        expires_at: "2026-11-03T10:15:00+08:00",
    };
}

describe("agent business result presentation", () => {
    it("shows the server summary without inventing rankings or adding limited records", () => {
        const card = toDataCard({ tool: "query_points_summary", result: {
            awarded: 10, deducted: 40, net_change: -30, records: 5, participating_students: 2,
            from: "2026-11-02T00:00:00+08:00", to: "2026-11-03T23:59:59+08:00",
        } });
        expect(card.stats).toEqual([
            { label: "获得积分", value: "10" }, { label: "扣除积分", value: "40" },
            { label: "净变化", value: "-30" }, { label: "积分记录", value: "5" },
            { label: "参与学生", value: "2" },
        ]);
        expect(card.rows).toBeUndefined();
        expect(card.note).toContain("兑换");
    });

    it("keeps real student identities and distinguishes absent historical wallets from zero balances", () => {
        const current = toDataCard({ tool: "list_students", result: {
            students: [{ id: 12, name: "真实姓名", group_id: 21, total_points: 15, available_points: 0 }],
            matched_count: 125, truncated: true, wallet_is_current_semester: true,
        } });
        expect(current.rows).toEqual([{ id: 12, name: "真实姓名", detail: "小组 ID 21 · 总积分 15", value: "可用 0 分" }]);
        expect(current.note).toContain("共匹配 125 名");
        expect(current.rows?.[0]).not.toHaveProperty("rank");
        const historical = toDataCard({ tool: "list_students", result: {
            students: [{ id: 12, name: "真实姓名", group_id: 0 }], matched_count: 1,
            truncated: false, wallet_is_current_semester: false,
        } });
        expect(historical.rows?.[0]?.value).toBe("");
        expect(historical.note).toContain("历史学期");
    });

    it("maps actual group ids, rule signs and prize stock", () => {
        expect(toDataCard({ tool: "list_student_groups", result: [{ id: 20, name: "阅读组" }] }).rows)
            .toEqual([{ id: 20, name: "阅读组", detail: "学生分组", value: "ID 20" }]);
        expect(toDataCard({ tool: "list_points_rules", result: [
            { id: 3, name: "作业完成", points: 3, type: 1, group: "学习" },
            { id: 4, name: "未完成", points: 2, type: 2, group: "学习" },
        ] }).rows?.map((row) => row.value)).toEqual(["+3 分", "-2 分"]);
        expect(toDataCard({ tool: "list_prizes", result: [{ id: 4, name: "笔记本", points: 40, stock: 0 }] }).rows)
            .toEqual([{ id: 4, name: "笔记本", detail: "库存 0 件", value: "40 分" }]);
    });

    it("keeps signed record amounts and student ids without guessing names", () => {
        const card = toDataCard({ tool: "query_points_records", result: {
            records: [{ id: 81, student_id: 12, amount: -40, description: "兑换笔记本", source: 1,
                created_at: "2026-11-03T02:00:00Z" }], total: 50,
        } });
        expect(card.rows?.[0]?.name).toBe("兑换笔记本");
        expect(card.rows?.[0]?.value).toBe("-40 分");
        expect(card.rows?.[0]?.detail).toContain("学生 ID 12");
        expect(card.rows?.[0]?.detail).toContain("奖品兑换");
        expect(card.note).toContain("共 50 条，当前展示 1 条");
        expect(card.stats).toBeUndefined();
    });

    it("shows an explicit unavailable result for unknown tools and malformed result shapes", () => {
        const unknown = toDataCard({ tool: "unknown", result: { secret: "never render this raw object" } });
        expect(unknown.note).toContain("暂无可展示");
        expect(JSON.stringify(unknown)).not.toContain("secret");
        for (const result of [null, undefined, "wrong", { awarded: null }]) {
            expect(toDataCard({ tool: "query_points_summary", result }).stats).toBeUndefined();
        }
        expect(toDataCard({ tool: "list_prizes", result: [] }).rows).toEqual([]);
        expect(toDataCard({ tool: "list_students", result: { students: [], matched_count: 0 } }).stats)
            .toEqual([{ label: "匹配学生", value: "0" }]);
    });
});

describe("agent conversation presentation", () => {
    it("attaches the completed run duration only to its final assistant message", () => {
        const messages = toChatMessages(conversation({
            runs: [{ ...run("run", "completed"), duration_ms: 12340 }],
            messages: [
                { id: "user", run_id: "run", role: "user", content: "查询班级", created_at: "2026-11-03T10:00:00+08:00" },
                { id: "first", run_id: "run", role: "assistant", content: "正在查询", created_at: "2026-11-03T10:00:01+08:00" },
                { id: "final", run_id: "run", role: "assistant", content: "查询完成", created_at: "2026-11-03T10:00:12+08:00" },
            ],
        }));
        expect(messages.map((message) => [message.id, message.durationMs])).toEqual([
            ["user", undefined], ["first", undefined], ["final", 12340],
        ]);
    });

    it.each(["query", "action"])("keeps the duration on a completed %s result without an assistant text", (kind) => {
        const messages = toChatMessages(conversation({
            runs: [{ ...run("run", "completed"), duration_ms: 0 }],
            results: kind === "query" ? [{ run_id: "run", data: { tool: "list_prizes", result: [] } }] : [],
            actions: kind === "action" ? [action("pending")] : [],
        }));
        expect(messages[0]?.id).toBe("result:run");
        expect(messages[0]?.durationMs).toBe(0);
    });

    it.each(["queued", "running", "failed", "cancelled"] as const)("hides duration for a %s run", (status) => {
        const messages = toChatMessages(conversation({
            runs: [{ ...run("run", status), duration_ms: 12000 }],
            messages: [{ id: "assistant", run_id: "run", role: "assistant", content: "回复内容",
                created_at: "2026-11-03T10:00:00+08:00" }],
        }));
        expect(messages[0]?.durationMs).toBeUndefined();
    });

    it.each([undefined, -1, NaN, Infinity])("hides missing or invalid duration (%s)", (duration) => {
        const messages = toChatMessages(conversation({
            runs: [{ ...run("run", "completed"), duration_ms: duration }],
            messages: [{ id: "assistant", run_id: "run", role: "assistant", content: "回复内容",
                created_at: "2026-11-03T10:00:00+08:00" }],
        }));
        expect(messages[0]?.durationMs).toBeUndefined();
    });

    it("does not invent an assistant reply while a user message is only queued", () => {
        const messages = toChatMessages(conversation({
            runs: [run("run", "queued")],
            messages: [{ id: "user", run_id: "run", role: "user", content: "查询班级", created_at: "2026-11-03T10:00:00+08:00" }],
        }));
        expect(messages.map((message) => message.id)).toEqual(["user"]);
    });

    it("attaches tool results to the matching run while preserving user and assistant order", () => {
        const messages = toChatMessages(conversation({
            runs: [run("new", "running", "2026-11-03T11:00:00+08:00"), run("old", "completed")],
            messages: [
                { id: "u1", run_id: "old", role: "user", content: "查询分组", created_at: "2026-11-03T10:00:00+08:00" },
                { id: "a1", run_id: "old", role: "assistant", content: "这是查询结果", created_at: "2026-11-03T10:01:00+08:00" },
                { id: "u2", run_id: "new", role: "user", content: "查询奖品", created_at: "2026-11-03T11:00:00+08:00" },
            ],
            results: [
                { run_id: "old", data: { tool: "list_student_groups", result: [{ id: 20, name: "阅读组" }] } },
                { run_id: "new", data: { tool: "list_prizes", result: [{ id: 4, name: "笔记本", points: 40, stock: 12 }] } },
            ],
        }));
        expect(messages.map((message) => message.id)).toEqual(["u1", "a1", "u2", "result:new"]);
        expect(messages[1]?.cards[0]?.title).toBe("学生分组");
        expect(messages[3]?.cards[0]?.title).toBe("可兑换奖品");
        expect(messages[3]?.text).toBe("");
        expect(messages[3]?.complete).toBe(false);
    });

    it("keeps the current action status and actual server success summary without fabricating a reply", () => {
        const succeeded = { ...action("succeeded"), result: { summary: "已为林小满加 3 分", wallets: [] } };
        const snapshot = conversation({ runs: [run("run", "completed")], actions: [succeeded] });
        const before = structuredClone(snapshot);
        const messages = toChatMessages(snapshot);
        expect(messages[0]?.id).toBe("result:run");
        expect(messages[0]?.text).toBe("");
        expect(messages[0]?.actions[0]?.status).toBe("succeeded");
        expect(messages[0]?.actions[0]?.result?.summary).toBe("已为林小满加 3 分");
        expect(snapshot).toEqual(before);
        expect(toChatMessages(conversation({ actions: [action("expired")] }))[0]?.actions[0]?.status).toBe("expired");
    });

    it("shows a failed run error even if no assistant message was persisted", () => {
        const messages = toChatMessages(conversation({ runs: [{ ...run("failed", "failed"), error: "回复超时，请重试" }] }));
        expect(messages[0]?.error).toBe("回复超时，请重试");
        expect(messages[0]?.text).toBe("");
        expect(messages[0]?.complete).toBe(true);
        expect(toChatMessages(null)).toEqual([]);
    });
});

describe("agent duration presentation", () => {
    it.each([
        { duration: 300, expected: "<1 秒" },
        { duration: 12000, expected: "12 秒" },
        { duration: 12340, expected: "12.3 秒" },
        { duration: 60000, expected: "1 分" },
        { duration: 68900, expected: "1 分 8 秒" },
    ])("formats $duration ms as $expected", ({ duration, expected }) => {
        expect(formatDuration(duration)).toBe(expected);
    });
});
