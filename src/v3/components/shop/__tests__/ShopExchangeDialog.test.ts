import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, reactive, ssrContextKey, type App } from "vue";
import ShopExchangeDialog from "../ShopExchangeDialog.vue";

const session = reactive({ canWrite: true });
vi.mock("@/stores/sessionStore", () => ({ useSessionStore: () => session }));
vi.mock("@/v3/components/AppDialogShell.vue", () => ({ default: { render: () => null } }));
vi.mock("element-plus", () => ({ ElMessage: { warning: vi.fn() } }));
vi.mock("element-plus/es", () => ({ ElMessage: { warning: vi.fn() } }));

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {}, createElement: () => ({}),
    createText: () => ({}), createComment: () => ({}), setText: () => {}, setElementText: () => {},
    parentNode: () => null, nextSibling: () => null,
});

interface ExchangeState {
    exchangeStatusText: string
    canConfirmExchange: boolean
    remainingPoints: number | null
    selectedStudentId: number | null
    exchangeCount: number
}

let app: App | undefined;
const props = reactive({
    modelValue: true, busy: false, canExchange: true,
    availablePointsByStudentId: { 1: 100 },
    form: { count: 1, prizeId: 5, studentId: null as number | null },
    maxCount: 3,
    prize: { name: "奖励", description: "", icon: "goods-filled", points: 20, stock: 3 },
    requiredPoints: 20,
    students: [{ id: 1, name: "小明", availablePoints: 100 }],
});

function mountDialog(listeners: Record<string, unknown> = {}): ExchangeState {
    app = renderer.createApp({ ...ShopExchangeDialog, render: () => null }, { ...props, ...listeners });
    app.provide(ssrContextKey, { modules: new Set() });
    return (app.mount({}).$ as unknown as { setupState: ExchangeState }).setupState;
}

beforeEach(() => {
    session.canWrite = true;
    props.form = { count: 1, prizeId: 5, studentId: null };
    props.availablePointsByStudentId = { 1: 100 };
    props.busy = false;
    props.canExchange = true;
    props.requiredPoints = 20;
});
afterEach(() => { app?.unmount(); app = undefined; });

describe("shop exchange availability", () => {
    it("starts with a neutral prompt and no balance preview before choosing a student", () => {
        const state = mountDialog();
        expect(state.exchangeStatusText).toBe("请选择学生");
        expect(state.remainingPoints).toBeNull();
        expect(state.canConfirmExchange).toBe(false);
    });

    it("previews the balance after a valid exchange", () => {
        props.form.studentId = 1;
        const state = mountDialog();
        expect(state.remainingPoints).toBe(80);
        expect(state.exchangeStatusText).toBe("可以兑换");
        expect(state.canConfirmExchange).toBe(true);
    });

    it.each([0, 1.5, 4, Number.NaN])("blocks invalid quantity %s", (count) => {
        props.form.studentId = 1;
        props.form.count = count;
        expect(mountDialog().canConfirmExchange).toBe(false);
    });

    it("blocks insufficient points and reports the shortfall", () => {
        props.form.studentId = 1;
        props.availablePointsByStudentId[1] = 10;
        const state = mountDialog();
        expect(state.canConfirmExchange).toBe(false);
        expect(state.exchangeStatusText).toContain("还差 10");
    });

    it.each(["busy", "archived", "expired"])("blocks a valid form when %s", (condition) => {
        props.form.studentId = 1;
        if (condition === "busy") props.busy = true;
        if (condition === "archived") props.canExchange = false;
        if (condition === "expired") session.canWrite = false;
        expect(mountDialog().canConfirmExchange).toBe(false);
    });

    it("emits form edits without mutating the parent's values", () => {
        const studentChanged = vi.fn();
        const countChanged = vi.fn();
        const state = mountDialog({ "onUpdate:studentId": studentChanged, "onUpdate:count": countChanged });
        state.selectedStudentId = 1;
        state.exchangeCount = 2;
        expect(studentChanged).toHaveBeenCalledWith(1);
        expect(countChanged).toHaveBeenCalledWith(2);
        expect(props.form).toMatchObject({ studentId: null, count: 1 });
    });
});
