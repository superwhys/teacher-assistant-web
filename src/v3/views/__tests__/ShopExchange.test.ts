import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, nextTick, reactive, ssrContextKey, type App } from "vue";
import ShopView from "../ShopView.vue";

const mocks = vi.hoisted(() => ({ exchange: vi.fn(), listPrizes: vi.fn(), listRecords: vi.fn(), listStudents: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
const cache = reactive({
    profile: { id: "teacher" }, classId: 7, semesterId: 70, semesterStatus: 1,
    getActiveClassId() { return this.classId; },
    getActiveClassName: () => "一班",
    getActiveSemesterId() { return this.semesterId; },
    getActiveSemesterName: () => "秋季学期",
    getActiveSemesterStatus() { return this.semesterStatus; },
});
const session = reactive({ canWrite: true });
vi.mock("@/stores/cacheStore", () => ({ useCacheStore: () => cache }));
vi.mock("@/stores/sessionStore", () => ({ useSessionStore: () => session }));
vi.mock("@/managers/shop", () => ({ shopManager: { exchangePrize: mocks.exchange, listPrizes: mocks.listPrizes, listPrizeRecords: mocks.listRecords } }));
vi.mock("@/managers/student", () => ({ studentManager: { list: mocks.listStudents } }));
vi.mock("element-plus", () => ({ ElMessage: { success: mocks.success, warning: mocks.warning, error: mocks.error } }));
vi.mock("element-plus/es", () => ({ ElMessage: { success: mocks.success, warning: mocks.warning, error: mocks.error } }));
vi.mock("@/v3/components/shop/ShopOverviewBanner.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/shop/ShopExchangeDialog.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/shop/ShopImportDialog.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/shop/ShopPrizeEditorDialog.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/shop/ShopPrizeShelf.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/shop/ShopRecordsPanel.vue", () => ({ default: { render: () => null } }));
vi.mock("@/v3/components/students/StudentsConfirmDialog.vue", () => ({ default: { render: () => null } }));

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {}, createElement: () => ({}),
    createText: () => ({}), createComment: () => ({}), setText: () => {}, setElementText: () => {},
    parentNode: () => null, nextSibling: () => null,
});
interface ShopState {
    prizes: { id: number; name: string; stock: number }[]
    exchangeForm: { count: number; prizeId: number; studentId: number | null }
    exchangeDialogVisible: boolean
    exchangeSubmitting: boolean
    exchangeError: string
    availablePointsByStudentId: Record<number, number>
    openExchangeDialog(prize: { id: number; name: string; stock: number }): Promise<void>
    confirmExchange(): Promise<void>
}
let app: App | undefined;
function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done; });
    return { promise, resolve };
}
async function mountShop(): Promise<ShopState> {
    app = renderer.createApp({ ...ShopView, render: () => null });
    app.provide(ssrContextKey, { modules: new Set() });
    const state = (app.mount({}).$ as unknown as { setupState: ShopState }).setupState;
    await vi.waitFor(() => expect(state.prizes.length).toBe(1));
    await state.openExchangeDialog(state.prizes[0]!);
    state.exchangeForm.studentId = 1;
    return state;
}
beforeEach(() => {
    vi.resetAllMocks();
    Object.assign(cache, { profile: { id: "teacher" }, classId: 7, semesterId: 70, semesterStatus: 1 });
    session.canWrite = true;
    mocks.listPrizes.mockResolvedValue([{ id: 5, name: "奖励", points: 20, stock: 3 }]);
    mocks.listRecords.mockResolvedValue({ items: [], total: 0 });
    mocks.listStudents.mockResolvedValue([{ id: 1, name: "小明", available_points: 100 }]);
    const events = new EventTarget();
    vi.stubGlobal("window", { addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) });
    vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { app?.unmount(); app = undefined; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("shop exchange submission", () => {
    it("sends only one request when confirm is triggered twice while pending", async () => {
        const state = await mountShop();
        const request = deferred();
        mocks.exchange.mockReturnValue(request.promise);
        const first = state.confirmExchange();
        const second = state.confirmExchange();
        expect(mocks.exchange).toHaveBeenCalledTimes(1);
        expect(state.exchangeSubmitting).toBe(true);
        request.resolve();
        await Promise.all([first, second]);
        expect(state.exchangeSubmitting).toBe(false);
        expect(state.exchangeDialogVisible).toBe(false);
    });

    it.each([0, 1.5, Number.NaN])("does not submit invalid quantity %s", async (count) => {
        const state = await mountShop();
        state.exchangeForm.count = count;
        await state.confirmExchange();
        expect(mocks.exchange).not.toHaveBeenCalled();
    });

    it("keeps a failed exchange open with its input and an inline error", async () => {
        const state = await mountShop();
        mocks.exchange.mockRejectedValue(new Error("网络暂不可用"));
        await state.confirmExchange();
        expect(state.exchangeDialogVisible).toBe(true);
        expect(state.exchangeForm.studentId).toBe(1);
        expect(state.exchangeError).toBe("网络暂不可用");
        expect(state.exchangeSubmitting).toBe(false);
    });

    it("does not announce an old exchange after the semester changes", async () => {
        const state = await mountShop();
        const request = deferred();
        mocks.exchange.mockReturnValue(request.promise);
        const pending = state.confirmExchange();
        cache.semesterId = 71;
        await nextTick();
        request.resolve();
        await pending;
        expect(mocks.success).not.toHaveBeenCalled();
        expect(state.exchangeDialogVisible).toBe(false);
    });

    it("keeps success distinct from a later refresh failure", async () => {
        const state = await mountShop();
        mocks.exchange.mockResolvedValue(undefined);
        mocks.listPrizes.mockRejectedValue(new Error("刷新失败"));
        await state.confirmExchange();
        expect(state.exchangeDialogVisible).toBe(false);
        expect(state.exchangeError).toBe("");
        expect(mocks.success).toHaveBeenCalledTimes(1);
        expect(mocks.error).not.toHaveBeenCalled();
    });

    it("refreshes the student's available points before allowing another exchange", async () => {
        const state = await mountShop();
        mocks.exchange.mockResolvedValue(undefined);
        mocks.listStudents.mockResolvedValue([{ id: 1, name: "小明", available_points: 80 }]);
        await state.confirmExchange();
        expect(state.availablePointsByStudentId[1]).toBe(80);
    });
});
