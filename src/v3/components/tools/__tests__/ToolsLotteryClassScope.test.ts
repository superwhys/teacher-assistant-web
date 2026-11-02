import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { createRenderer, nextTick, reactive, ssrContextKey, type App } from 'vue'
import type { DrawRecord } from '@/types/lottery'
import type { UserEntitlement } from '@/types/user'

const mocks = vi.hoisted(() => ({
    listPools: vi.fn(), getPool: vi.fn(), listRecords: vi.fn(), createRecords: vi.fn(),
    clearRecords: vi.fn(), updateRecordStudent: vi.fn(), listStudents: vi.fn(),
    warning: vi.fn(), error: vi.fn(), success: vi.fn(),
}))

let cache: {
    classId: number | null
    profile: { id: number, entitlement: UserEntitlement }
    getActiveClassId: () => number | null
    getActiveClassName: () => string
}
const businessSession = reactive({ canWrite: true, canPrepare: true, canImportExport: true, entitlementMessage: '试用已到期，仅可查看' })
vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => businessSession }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => cache }))
vi.mock('@/managers/lottery', () => ({ lotteryManager: mocks }))
vi.mock('@/managers/student', () => ({ studentManager: { list: mocks.listStudents } }))
vi.mock('@/api/mall', () => ({ mallApi: { listPrizes: vi.fn() } }))
vi.mock('element-plus', () => ({
    ElMessage: { warning: mocks.warning, error: mocks.error, success: mocks.success },
    ElMessageBox: { confirm: vi.fn() },
}))
vi.mock('element-plus/es', () => ({
    ElMessage: { warning: mocks.warning, error: mocks.error, success: mocks.success },
    ElMessageBox: { confirm: vi.fn() },
}))
vi.mock('element-plus/es/components/base/style/css', () => ({}))
vi.mock('element-plus/es/components/loading/style/css', () => ({}))
vi.mock('element-plus/es/components/select/style/css', () => ({}))
vi.mock('element-plus/es/components/option/style/css', () => ({}))
vi.mock('@/v3/components/students/StudentsConfirmDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/tools/ToolsLotteryDisplayPanel.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/tools/ToolsLotteryHistoryPanel.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/tools/ToolsLotteryImportDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/tools/ToolsLotteryPoolDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/tools/ToolsLotteryPoolPanel.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/tools/ToolsLotteryPrizeDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/tools/ToolsLotteryStudentDialog.vue', () => ({ default: { render: () => null } }))

interface WorkspaceState {
    records: DrawRecord[]
    recordsLoading: boolean
    isLoading: boolean
    isRolling: boolean
    currentName: string
    currentPoolId: string
    drawProbabilities: Record<string, number>
    studentDialogVisible: boolean
    selectedStudentId: number | null
    drawOnce: () => void
    startRolling: () => void
    stopRolling: () => void
    openStudentDialog: (record: DrawRecord) => Promise<void>
    saveRecordStudent: () => Promise<void>
}

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})
let app: App | undefined

function record(classId: number): DrawRecord {
    return { id: `class-${classId}`, serverId: classId, prizeId: '贴纸', prizeName: '贴纸', drawnAt: 1780000000000, studentClassId: classId }
}

async function mountWorkspace(): Promise<WorkspaceState> {
    const Workspace = (await import('../ToolsLotteryWorkspace.vue')).default
    app = renderer.createApp({ ...Workspace, render: () => null })
    app.use(createPinia())
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    return (vm.$ as unknown as { setupState: WorkspaceState }).setupState
}

beforeEach(() => {
    Object.assign(businessSession, { canWrite: true, canPrepare: true, canImportExport: true })
    vi.resetAllMocks()
    cache = reactive({
        classId: 23 as number | null,
        profile: {
            id: 7,
            entitlement: {
                state: 'permanent' as const,
                permanent: true,
                trial_started_at: null,
                trial_expires_at: null,
                paid_expires_at: null,
            },
        },
        getActiveClassId() { return this.classId },
        getActiveClassName() { return this.classId === 23 ? '一年级一班' : '二年级一班' },
    })
    const storage = new Map<string, string>()
    vi.stubGlobal('window', {
        localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
        setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval,
        setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
    })
    mocks.listPools.mockResolvedValue([{ id: '4', name: '课堂奖励', prizes: [] }])
    mocks.getPool.mockResolvedValue({ id: '4', name: '课堂奖励', prizes: [{ name: '贴纸', enabled: true, weight: 1 }] })
    mocks.listRecords.mockImplementation(async (_poolId: string, classId: number) => [record(classId)])
    mocks.listStudents.mockImplementation(async (classId: number) => [{ id: 9, class_id: classId, name: '小明' }])
    mocks.createRecords.mockImplementation(async (_poolId: string, _classId: number, records: DrawRecord[]) => (
        records.map(item => ({ ...item, serverId: 99, syncPending: undefined }))
    ))
})

afterEach(() => {
    app?.unmount()
    app = undefined
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
})

describe('lottery page class context', () => {
    it.each(['drawOnce', 'stopRolling'] as const)('reduces today’s repeated prize probability for %s', async (drawMethod) => {
        mocks.getPool.mockResolvedValue({ id: '4', name: '课堂奖励', prizes: [
            { name: '贴纸', enabled: true, weight: 1 },
            { name: '铅笔', enabled: true, weight: 1 },
        ] })
        mocks.listRecords.mockResolvedValue([{ ...record(23), drawnAt: Date.now() }])
        vi.spyOn(Math, 'random').mockReturnValue(0.4)
        const page = await mountWorkspace()
        await vi.waitFor(() => expect(page.isLoading).toBe(false))
        expect(page.drawProbabilities['贴纸']).toBeCloseTo(1 / 3)
        expect(page.drawProbabilities['铅笔']).toBeCloseTo(2 / 3)
        if (drawMethod === 'stopRolling') page.startRolling()
        page[drawMethod]()
        expect(page.currentName).toBe('铅笔')
        expect(mocks.createRecords).toHaveBeenCalledWith('4', 23, [expect.objectContaining({ prizeName: '铅笔' })])
    })

    it('still allows the same prize to win again', async () => {
        mocks.listRecords.mockResolvedValue([{ ...record(23), drawnAt: Date.now() }])
        vi.spyOn(Math, 'random').mockReturnValue(0)
        const page = await mountWorkspace()
        await vi.waitFor(() => expect(page.isLoading).toBe(false))
        page.drawOnce()
        expect(page.currentName).toBe('贴纸')
        expect(mocks.createRecords).toHaveBeenCalled()
    })

    it('counts a locally pending result when saving the record fails', async () => {
        mocks.getPool.mockResolvedValue({ id: '4', name: '课堂奖励', prizes: [
            { name: '贴纸', enabled: true, weight: 1 },
            { name: '铅笔', enabled: true, weight: 1 },
        ] })
        mocks.listRecords.mockResolvedValue([])
        mocks.createRecords.mockRejectedValueOnce(new Error('offline'))
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(Math, 'random').mockReturnValue(0.4)
        const page = await mountWorkspace()
        await vi.waitFor(() => expect(page.isLoading).toBe(false))
        page.drawOnce()
        expect(page.currentName).toBe('贴纸')
        await vi.waitFor(() => expect(page.records[0]?.syncPending).toBe(true))
        expect(page.drawProbabilities['贴纸']).toBeCloseTo(1 / 3)
        page.drawOnce()
        expect(page.currentName).toBe('铅笔')
    })

    it('restores probabilities at local midnight while the page stays open', async () => {
        vi.useFakeTimers()
        window.setTimeout = globalThis.setTimeout
        window.clearTimeout = globalThis.clearTimeout
        vi.setSystemTime(new Date(2026, 10, 2, 23, 59, 58))
        mocks.getPool.mockResolvedValue({ id: '4', name: '课堂奖励', prizes: [
            { name: '贴纸', enabled: true, weight: 1 },
            { name: '铅笔', enabled: true, weight: 1 },
        ] })
        mocks.listRecords.mockResolvedValue([{ ...record(23), drawnAt: Date.now() }])
        vi.spyOn(Math, 'random').mockReturnValue(0.4)
        const page = await mountWorkspace()
        await vi.waitFor(() => expect(page.isLoading).toBe(false))
        expect(page.drawProbabilities['贴纸']).toBeCloseTo(1 / 3)
        await vi.advanceTimersByTimeAsync(2000)
        expect(page.drawProbabilities['贴纸']).toBe(0.5)
        page.drawOnce()
        expect(page.currentName).toBe('贴纸')
    })

    it('uses only the selected class and pool history for daily probabilities', async () => {
        mocks.getPool.mockResolvedValue({ id: '4', name: '课堂奖励', prizes: [
            { name: '贴纸', enabled: true, weight: 1 },
            { name: '铅笔', enabled: true, weight: 1 },
        ] })
        mocks.listRecords.mockImplementation(async (poolId: string, classId: number) => (
            poolId === '4' && classId === 23 ? [{ ...record(23), drawnAt: Date.now() }] : []
        ))
        const page = await mountWorkspace()
        await vi.waitFor(() => expect(page.isLoading).toBe(false))
        expect(page.drawProbabilities['贴纸']).toBeCloseTo(1 / 3)
        cache.classId = 24
        await nextTick()
        await vi.waitFor(() => expect(page.recordsLoading).toBe(false))
        expect(page.drawProbabilities['贴纸']).toBe(0.5)
        cache.classId = 23
        await nextTick()
        await vi.waitFor(() => expect(page.recordsLoading).toBe(false))
        expect(page.drawProbabilities['贴纸']).toBeCloseTo(1 / 3)
        page.currentPoolId = '5'
        await nextTick()
        await vi.waitFor(() => expect(page.recordsLoading).toBe(false))
        expect(page.drawProbabilities['贴纸']).toBe(0.5)
    })

    it('recovers from switching class during initial loading without an old response overwriting the new history', async () => {
        let finishOld!: (records: DrawRecord[]) => void
        mocks.listRecords.mockImplementationOnce(() => new Promise<DrawRecord[]>(resolve => { finishOld = resolve }))
        const page = await mountWorkspace()
        await vi.waitFor(() => expect(mocks.listRecords).toHaveBeenCalledWith('4', 23))
        cache.classId = 24
        await nextTick()
        await vi.waitFor(() => expect(page.records).toEqual([record(24)]))
        expect(page.recordsLoading).toBe(false)
        expect(page.isLoading).toBe(false)
        finishOld([record(23)])
        await vi.waitFor(() => expect(page.isLoading).toBe(false))
        expect(page.records).toEqual([record(24)])
    })

    it('cancels rolling and closes the student dialog when the global class changes', async () => {
        const page = await mountWorkspace()
        await vi.waitFor(() => expect(page.isLoading).toBe(false))
        await page.openStudentDialog(record(23))
        expect(mocks.listStudents).toHaveBeenCalledExactlyOnceWith(23)
        expect(page.studentDialogVisible).toBe(true)
        page.startRolling()
        expect(page.isRolling).toBe(true)
        cache.classId = 24
        await nextTick()
        await vi.waitFor(() => expect(page.records).toEqual([record(24)]))
        expect(page.isRolling).toBe(false)
        expect(page.studentDialogVisible).toBe(false)
        expect(mocks.createRecords).not.toHaveBeenCalled()
    })

    it('saves with the class captured at draw time while a later class switch keeps the new class history', async () => {
        let finishSave!: (records: DrawRecord[]) => void
        mocks.createRecords.mockImplementationOnce(() => new Promise<DrawRecord[]>(resolve => { finishSave = resolve }))
        const page = await mountWorkspace()
        await vi.waitFor(() => expect(page.isLoading).toBe(false))
        page.drawOnce()
        expect(mocks.createRecords).toHaveBeenCalledWith('4', 23, [expect.objectContaining({ studentClassId: 23 })])
        const drawn = mocks.createRecords.mock.calls[0]![2][0] as DrawRecord
        cache.classId = 24
        await nextTick()
        await vi.waitFor(() => expect(page.records).toEqual([record(24)]))
        finishSave([{ ...drawn, serverId: 99, syncPending: undefined }])
        await Promise.resolve()
        await nextTick()
        expect(page.records).toEqual([record(24)])
    })

    it('does not load or draw records without a selected class', async () => {
        cache.classId = null
        const page = await mountWorkspace()
        await vi.waitFor(() => expect(page.isLoading).toBe(false))
        page.drawOnce()
        page.startRolling()
        expect(mocks.listRecords).not.toHaveBeenCalled()
        expect(mocks.createRecords).not.toHaveBeenCalled()
        expect(page.records).toEqual([])
        expect(page.isRolling).toBe(false)
    })
})


describe('lottery commercial access', () => {
    it('cancels an in-progress roll at expiry without generating or saving a result', async () => {
        const state = await mountWorkspace()
        await vi.waitFor(() => expect(state.isLoading).toBe(false))
        state.startRolling()
        expect(state.isRolling).toBe(true)
        Object.assign(businessSession, { canWrite: false, canPrepare: false, canImportExport: false })
        expect(state.isRolling).toBe(false)
        state.stopRolling()
        state.drawOnce()
        expect(mocks.createRecords).not.toHaveBeenCalled()
        expect(mocks.warning).toHaveBeenCalledWith(businessSession.entitlementMessage)
    })
})
