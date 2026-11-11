import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, ref, ssrContextKey, type App } from 'vue'
import StudentGrowthReportDialog from '../StudentGrowthReportDialog.vue'
import { growthReportFixture } from '@/utils/__tests__/growthReportFixture'
import { ApiRequestError } from '@/types/api'
import type { GrowthInterpretationTask, GrowthReport } from '@/types/studentGrowth'

const api = vi.hoisted(() => ({
    getReport: vi.fn(), getSavedReport: vi.fn(), saveReport: vi.fn(), listReports: vi.fn(),
    findInterpretationTask: vi.fn(), createInterpretationTask: vi.fn(), getInterpretationTask: vi.fn(),
    listSemesters: vi.fn(),
}))
vi.mock('@/api/studentGrowth', () => ({ studentGrowthApi: api }))
vi.mock('@/api/class', () => ({ classApi: { listSemesters: api.listSemesters } }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => ({ profile: { id: 'teacher', roleCode: 'pro' } }) }))
vi.mock('@/composables/useBusinessAccess', () => ({ useBusinessAccess: () => ({
    canWrite: ref(true), canImportExport: ref(true), canViewGrowthReports: ref(true), allowWrite: () => true, allowImportExport: () => true,
}) }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))
vi.mock('@/v3/components/AppDialogShell.vue', () => ({ default: { render: () => null } }))
vi.mock('../StudentGrowthStatistics.vue', () => ({ default: { render: () => null } }))

const response = <T>(data: T) => ({ code: 0, message: '', data })
const task = (status: GrowthInterpretationTask['status']): GrowthInterpretationTask => ({
    id: 'task-1', snapshot_hash: 'snapshot-1', status, interpretation: status === 'succeeded' ? 'AI 新生成的内容' : '',
    error: '', error_code: 0, created_at: '2026-11-11T10:00:00+08:00', updated_at: '2026-11-11T10:00:00+08:00',
})
interface DialogState {
    teacherNote: string
    interpretation: string
    busy: boolean
    taskPending: boolean
    taskReportStale: boolean
    interpretationButtonLabel: string
    generatedSuggestion: GrowthInterpretationTask | null
    report: GrowthReport | null
    from: string
    to: string
    generateInterpretation: () => Promise<void>
    useGeneratedInterpretation: () => void
    saveSnapshot: () => Promise<void>
    applyPeriod: () => Promise<void>
    openSaved: (id: number) => Promise<void>
}
const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})
let app: App | undefined
async function settle() {
    for (let index = 0; index < 20; index++) await Promise.resolve()
    await nextTick()
}
async function mountDialog(): Promise<DialogState> {
    app = renderer.createApp({ ...StudentGrowthReportDialog, render: () => null }, {
        modelValue: true, studentId: 11, studentName: '小明', classId: 7, semesterId: 70,
    })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    await settle()
    return (vm.$ as unknown as { setupState: DialogState }).setupState
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-11T10:00:00+08:00'))
    const storage = new Map<string, string>()
    vi.stubGlobal('window', { sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
    } })
    api.listSemesters.mockResolvedValue(response({ semesters: [{ id: 70, start_date: '2026-09-01', end_date: '' }] }))
    api.getReport.mockResolvedValue(response(growthReportFixture()))
    api.listReports.mockResolvedValue(response({ reports: [] }))
    api.findInterpretationTask.mockResolvedValue(response({ task: null, data_changed: false }))
    api.createInterpretationTask.mockResolvedValue(response(task('queued')))
    api.getInterpretationTask.mockResolvedValue(response(task('succeeded')))
})
afterEach(() => {
    app?.unmount()
    app = undefined
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('growth interpretation text in the report dialog', () => {
    it('keeps typed interpretation and teacher notes while generation continues, then requires an explicit replacement', async () => {
        const state = await mountDialog()
        await state.generateInterpretation()
        state.teacherNote = '老师正在编辑的寄语'
        state.interpretation = '老师自己写的观察'
        expect(state.taskPending).toBe(true)
        expect(state.busy).toBe(false)
        await vi.advanceTimersByTimeAsync(2000)
        await settle()
        expect(state.teacherNote).toBe('老师正在编辑的寄语')
        expect(state.interpretation).toBe('老师自己写的观察')
        expect(state.generatedSuggestion?.interpretation).toBe('AI 新生成的内容')
        state.useGeneratedInterpretation()
        expect(state.interpretation).toBe('AI 新生成的内容')
        expect(state.generatedSuggestion).toBeNull()
    })

    it('fills an empty editor when a completed matching task is recovered', async () => {
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: task('succeeded'), data_changed: false }))
        const state = await mountDialog()
        expect(state.interpretation).toBe('AI 新生成的内容')
        expect(api.createInterpretationTask).not.toHaveBeenCalled()
    })

    it('allows saving current text while a task remains queued and keeps tracking it after the save', async () => {
        const state = await mountDialog()
        await state.generateInterpretation()
        state.teacherNote = '当前寄语'
        state.interpretation = '当前解读'
        api.saveReport.mockResolvedValueOnce(response(growthReportFixture({ id: 44, teacher_note: '当前寄语', interpretation: '当前解读' })))
        await state.saveSnapshot()
        expect(api.saveReport).toHaveBeenCalledWith(11, expect.objectContaining({
            teacher_note: '当前寄语', interpretation: '当前解读', snapshot_hash: 'snapshot-1',
        }), expect.any(AbortSignal))
        expect(state.taskPending).toBe(true)
        await vi.advanceTimersByTimeAsync(2000)
        await settle()
        expect(state.interpretation).toBe('当前解读')
        expect(state.report?.interpretation).toBe('当前解读')
        expect(state.generatedSuggestion?.interpretation).toBe('AI 新生成的内容')
    })

    it('clears completed task state safely when switching the report period', async () => {
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: task('succeeded'), data_changed: false }))
        const state = await mountDialog()
        expect(state.interpretation).toBe('AI 新生成的内容')
        state.from = '2026-10-01'
        state.to = '2026-10-31'
        api.getReport.mockResolvedValueOnce(response(growthReportFixture({
            from: state.from, to: state.to, snapshot_hash: 'october-snapshot',
        })))
        await state.applyPeriod()
        await settle()
        expect(state.report?.snapshot_hash).toBe('october-snapshot')
        expect(state.interpretation).toBe('')
        expect(state.generatedSuggestion).toBeNull()
    })

    it('leaves the generating state after a stale-data response and tells the teacher to refresh', async () => {
        api.getInterpretationTask.mockRejectedValueOnce(new ApiRequestError('报告数据已变化，请刷新报告后重试', 100409))
        const state = await mountDialog()
        await state.generateInterpretation()
        expect(state.taskPending).toBe(true)
        await vi.advanceTimersByTimeAsync(2000)
        await settle()
        expect(state.taskReportStale).toBe(true)
        expect(state.taskPending).toBe(false)
        expect(state.interpretationButtonLabel).toBe('刷新报告后生成解读')
        expect(state.generatedSuggestion).toBeNull()
        await vi.advanceTimersByTimeAsync(10000)
        expect(api.getInterpretationTask).toHaveBeenCalledOnce()
    })

    it.each(['已保存的解读', ''])('recovers a task started from a saved snapshot after reopening, preserving frozen text %j', async originalText => {
        const saved = growthReportFixture({ id: 42, interpretation: originalText })
        api.getSavedReport.mockResolvedValue(response(saved))
        const first = await mountDialog()
        await first.openSaved(42)
        await settle()
        await first.generateInterpretation()
        expect(first.taskPending).toBe(true)
        app?.unmount()
        app = undefined
        const second = await mountDialog()
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: task('running'), data_changed: false }))
        await second.openSaved(42)
        await settle()
        expect(second.taskPending).toBe(true)
        expect(second.interpretation).toBe(originalText)
        await vi.advanceTimersByTimeAsync(2000)
        await settle()
        expect(api.createInterpretationTask).toHaveBeenCalledOnce()
        expect(second.interpretation).toBe(originalText)
        expect(second.report?.interpretation).toBe(originalText)
        expect(second.generatedSuggestion?.interpretation).toBe('AI 新生成的内容')
        second.useGeneratedInterpretation()
        expect(second.interpretation).toBe('AI 新生成的内容')
        expect(second.report?.interpretation).toBe(originalText)
    })
})
