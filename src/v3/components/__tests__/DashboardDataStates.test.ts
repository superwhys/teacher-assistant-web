import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, h, nextTick, reactive, ssrContextKey, type App, type Component } from "vue";
import DashboardRankingPanel from "../DashboardRankingPanel.vue";
import DashboardRecentRecordsPanel from "../DashboardRecentRecordsPanel.vue";

const mocks = vi.hoisted(() => ({
    ranking: vi.fn(), records: vi.fn(), students: vi.fn(),
    cache: { profile: { id: "teacher" }, getPointsRankingTimeRange: () => "all", getDashboardRankingPreviewMasked: () => false,
        setPointsRankingTimeRange: () => {}, setDashboardRankingPreviewMasked: () => {} },
}));
vi.mock("@/stores/cacheStore", () => ({ useCacheStore: () => mocks.cache }));
vi.mock("@/managers/points", () => ({ pointsManager: { getClassRanking: mocks.ranking, listApplyRecords: mocks.records } }));
vi.mock("@/managers/student", () => ({ studentManager: { list: mocks.students } }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {}, createElement: () => ({}),
    createText: () => ({}), createComment: () => ({}), setText: () => {}, setElementText: () => {},
    parentNode: () => null, nextSibling: () => null,
});
let app: App | undefined;
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: Error) => void;
    const promise = new Promise<T>((success, failure) => { resolve = success; reject = failure; });
    return { promise, resolve, reject };
}
function mount<T>(component: typeof DashboardRankingPanel | typeof DashboardRecentRecordsPanel) {
    const props = reactive({ activeClassId: 7, currentSemesterId: 70, refreshVersion: 0 });
    const panel = { ...component, render: () => null } as Component;
    app = renderer.createApp({ render: () => h(panel, { ...props }) });
    app.provide(ssrContextKey, { modules: new Set() });
    const state = (app.mount({}).$ as unknown as { subTree: { component: { setupState: T } } }).subTree.component.setupState;
    return { state, props };
}
interface RankingState {
    rankingLoading: boolean;
    rankingError: string;
    rankingPreviewResponse: { score: number }[];
    loadRankingPreview(): Promise<void>;
}
interface RecordsState {
    recordsLoading: boolean;
    recordsError: string;
    recordPreviewResponse: { id: number }[];
    loadRecordPreview(): Promise<void>;
}
beforeEach(() => {
    vi.resetAllMocks();
    mocks.ranking.mockResolvedValue({ items: [{ rank: 1, student_id: 1, score: 9 }] });
    mocks.students.mockResolvedValue([{ id: 1, name: "小明" }]);
    mocks.records.mockResolvedValue({ items: [{ id: 1, student_id: 1, from: 2, amount: 2 }] });
    vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { app?.unmount(); app = undefined; vi.restoreAllMocks(); });

describe("dashboard panel loading states", () => {
    it("keeps the successful ranking after a refresh failure and clears the error on retry", async () => {
        const { state } = mount<RankingState>(DashboardRankingPanel);
        await vi.waitFor(() => expect(state.rankingLoading).toBe(false));
        mocks.ranking.mockRejectedValueOnce(new Error("offline"));
        await state.loadRankingPreview();
        expect(state.rankingError).toContain("失败");
        expect(state.rankingPreviewResponse[0]?.score).toBe(9);
        await state.loadRankingPreview();
        expect(state.rankingError).toBe("");
    });

    it("ignores an older ranking response after changing semester", async () => {
        const { state, props } = mount<RankingState>(DashboardRankingPanel);
        await vi.waitFor(() => expect(state.rankingLoading).toBe(false));
        const old = deferred<{ items: { score: number }[] }>();
        mocks.ranking.mockReturnValueOnce(old.promise);
        const pending = state.loadRankingPreview();
        props.currentSemesterId = 71;
        await nextTick();
        await vi.waitFor(() => expect(state.rankingLoading).toBe(false));
        old.resolve({ items: [{ score: 999 }] });
        await pending;
        expect(state.rankingPreviewResponse[0]?.score).toBe(9);
        expect(state.rankingError).toBe("");
    });

    it("preserves successful records on refresh failure", async () => {
        const { state } = mount<RecordsState>(DashboardRecentRecordsPanel);
        await vi.waitFor(() => expect(state.recordsLoading).toBe(false));
        mocks.records.mockRejectedValueOnce(new Error("offline"));
        await state.loadRecordPreview();
        expect(state.recordsError).toContain("失败");
        expect(state.recordPreviewResponse[0]?.id).toBe(1);
    });

    it("does not display a late response from a previous class", async () => {
        const { state, props } = mount<RecordsState>(DashboardRecentRecordsPanel);
        await vi.waitFor(() => expect(state.recordsLoading).toBe(false));
        const old = deferred<{ items: { id: number; from: number }[] }>();
        mocks.records.mockReturnValueOnce(old.promise);
        const pending = state.loadRecordPreview();
        props.activeClassId = 8;
        await nextTick();
        await vi.waitFor(() => expect(state.recordsLoading).toBe(false));
        old.resolve({ items: [{ id: 999, from: 2 }] });
        await pending;
        expect(state.recordPreviewResponse[0]?.id).toBe(1);
    });
});
