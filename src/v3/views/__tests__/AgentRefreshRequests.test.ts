import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, nextTick, reactive, ssrContextKey, type App } from "vue";
import PointsView from "../PointsView.vue";
import DashboardView from "../DashboardView.vue";
import { notifyAgentActionSucceeded } from "@/utils/agentEvents";

const mocks = vi.hoisted(() => ({
    ranking: vi.fn(), records: vi.fn(), statistics: vi.fn(), error: vi.fn(),
    cache: {
        profile: { id: "teacher" }, classId: 7, semesterId: 70,
        getActiveClassId() { return this.classId; },
        getActiveSemesterId() { return this.semesterId; },
        getActiveSemesterStatus: () => 1,
        getActiveClassName: () => "当前班级",
        getPointsContentTab: () => "ranking",
        getPointsRankingTab: () => "total",
        getPointsRankingTimeRange: () => "all",
        setPointsContentTab: () => {}, setPointsRankingTab: () => {}, setPointsRankingTimeRange: () => {},
    },
}));

vi.mock("@/stores/cacheStore", () => ({ useCacheStore: () => mocks.cache }));
vi.mock("@/stores/sessionStore", () => ({ useSessionStore: () => ({ canWrite: true, canImportExport: true }) }));
vi.mock("@/managers/student", () => ({ studentManager: { listGroups: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/managers/points", () => ({ pointsManager: {
    listRuleGroups: vi.fn().mockResolvedValue([]), getClassRanking: mocks.ranking, listApplyRecords: mocks.records,
} }));
vi.mock("@/api/dashboard", () => ({ dashboardApi: { getStatistics: mocks.statistics } }));
vi.mock("vue-router", () => ({ useRoute: () => ({ query: {} }) }));
vi.mock("element-plus", () => ({ ElMessage: { error: mocks.error, success: vi.fn(), warning: vi.fn() } }));
vi.mock("element-plus/es", () => ({ ElMessage: { error: mocks.error, success: vi.fn(), warning: vi.fn() } }));
vi.mock("@/v3/components/points/PointsDeleteConfirmDialog.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/points/PointsContentPanel.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/points/PointsExportDialog.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/points/PointsImportItemsDialog.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/points/PointsImportRecordsDialog.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/points/PointsRuleGroupDialog.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/points/PointsRuleItemDialog.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/points/PointsRulesManagePanel.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/DashboardRankingPanel.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/DashboardRecentRecordsPanel.vue", () => ({ default: { render: () => null } }));

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {}, createElement: () => ({}),
    createText: () => ({}), createComment: () => ({}), setText: () => {}, setElementText: () => {},
    parentNode: () => null, nextSibling: () => null,
});

interface PointsState {
    pageLoading: boolean;
    rankingLoading: boolean;
    recordsLoading: boolean;
    totalRankingItems: { score: number }[];
    historyRecords: { id: number }[];
    activeContentTab: "ranking" | "records";
    loadRankingData(): Promise<void>;
    loadHistoryRecords(): Promise<void>;
}

interface DashboardState {
    agentRefreshVersion: number;
    dashboardSummaryResponse: { summary: { records: { value: number } } };
    loadDashboardSummary(): Promise<void>;
}

let app: App | undefined;
const scope = { userId: "teacher", classId: 7, semesterId: 70, kind: "points" as const };

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((finish, fail) => { resolve = finish; reject = fail; });
    return { promise, resolve, reject };
}

async function flush() {
    await Promise.resolve();
    await nextTick();
    await Promise.resolve();
}

function mount<T>(component: typeof PointsView | typeof DashboardView): T {
    app = renderer.createApp({ ...component, render: () => null });
    app.provide(ssrContextKey, { modules: new Set() });
    const vm = app.mount({});
    return (vm.$ as unknown as { setupState: T }).setupState;
}

function summary(value: number) {
    return { data: { current_term_name: "当前学期", operation_status_text: "可积分操作",
        summary: { students: { value: 1 }, groups: { value: 1 }, records: { value }, shop: { value: 1 } } } };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.cache = reactive({ ...mocks.cache, profile: { id: "teacher" }, classId: 7, semesterId: 70 });
    const events = new EventTarget();
    vi.stubGlobal("window", {
        addEventListener: events.addEventListener.bind(events),
        removeEventListener: events.removeEventListener.bind(events),
        dispatchEvent: events.dispatchEvent.bind(events),
    });
    mocks.ranking.mockResolvedValue({ items: [] });
    mocks.records.mockResolvedValue({ items: [], total: 0 });
    mocks.statistics.mockResolvedValue(summary(2));
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    app?.unmount();
    app = undefined;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("agent write refresh request ordering", () => {
    it.each(["ranking", "records"] as const)("ignores an older %s failure without stopping the new loading state", async (tab) => {
        const state = mount<PointsState>(PointsView);
        await vi.waitFor(() => expect(state.pageLoading).toBe(false));
        state.activeContentTab = tab;
        await flush();
        const old = deferred<{ items: { score: number; id: number }[]; total: number }>();
        const fresh = deferred<{ items: { score: number; id: number }[]; total: number }>();
        const request = tab === "ranking" ? mocks.ranking : mocks.records;
        const load = tab === "ranking" ? state.loadRankingData : state.loadHistoryRecords;
        request.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
        const oldRequest = load();
        notifyAgentActionSucceeded(scope);
        old.reject(new Error("old request failed"));
        await oldRequest;
        expect(tab === "ranking" ? state.rankingLoading : state.recordsLoading).toBe(true);
        expect(mocks.error).not.toHaveBeenCalled();
        fresh.resolve({ items: [{ id: 99, score: 99 }], total: 1 });
        await flush();
        expect(tab === "ranking" ? state.totalRankingItems[0]?.score : state.historyRecords[0]?.id).toBe(99);
        expect(tab === "ranking" ? state.rankingLoading : state.recordsLoading).toBe(false);
    });

    it.each(["ranking", "records"] as const)("ignores an older %s success after the agent refresh finishes", async (tab) => {
        const state = mount<PointsState>(PointsView);
        await vi.waitFor(() => expect(state.pageLoading).toBe(false));
        state.activeContentTab = tab;
        await flush();
        const old = deferred<{ items: { score: number; id: number }[]; total: number }>();
        const fresh = deferred<{ items: { score: number; id: number }[]; total: number }>();
        const request = tab === "ranking" ? mocks.ranking : mocks.records;
        const load = tab === "ranking" ? state.loadRankingData : state.loadHistoryRecords;
        request.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
        const oldRequest = load();
        notifyAgentActionSucceeded(scope);
        fresh.resolve({ items: [{ id: 99, score: 99 }], total: 1 });
        await flush();
        old.resolve({ items: [{ id: 1, score: 1 }], total: 1 });
        await oldRequest;
        expect(tab === "ranking" ? state.totalRankingItems[0]?.score : state.historyRecords[0]?.id).toBe(99);
    });

    it("does not apply a points response after its semester scope changes", async () => {
        const state = mount<PointsState>(PointsView);
        await vi.waitFor(() => expect(state.pageLoading).toBe(false));
        const old = deferred<{ items: { score: number }[] }>();
        mocks.ranking.mockReturnValueOnce(old.promise);
        const pending = state.loadRankingData();
        mocks.cache.semesterId = 71;
        old.resolve({ items: [{ score: 500 }] });
        await pending;
        expect(state.totalRankingItems).toEqual([]);
    });

    it("keeps the refreshed dashboard summary when the old response arrives later", async () => {
        const state = mount<DashboardState>(DashboardView);
        await flush();
        const old = deferred<ReturnType<typeof summary>>();
        const fresh = deferred<ReturnType<typeof summary>>();
        mocks.statistics.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
        const pending = state.loadDashboardSummary();
        notifyAgentActionSucceeded(scope);
        fresh.resolve(summary(20));
        await flush();
        old.resolve(summary(3));
        await pending;
        expect(state.dashboardSummaryResponse.summary.records.value).toBe(20);
        expect(state.agentRefreshVersion).toBe(1);
    });

    it("ignores a dashboard failure from the previous scope", async () => {
        const state = mount<DashboardState>(DashboardView);
        await flush();
        const old = deferred<ReturnType<typeof summary>>();
        mocks.statistics.mockReturnValueOnce(old.promise);
        const pending = state.loadDashboardSummary();
        mocks.cache.semesterId = 71;
        await flush();
        old.reject(new Error("old scope failed"));
        await pending;
        expect(state.dashboardSummaryResponse.summary.records.value).toBe(2);
        expect(console.error).not.toHaveBeenCalled();
    });
});
