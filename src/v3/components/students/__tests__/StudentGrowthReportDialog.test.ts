import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, ref, ssrContextKey, type App, type VNode } from 'vue'
import * as Vue from 'vue'
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc'
import { ElMessage } from 'element-plus'
import StudentGrowthReportDialog from '../StudentGrowthReportDialog.vue'
import dialogSource from '../StudentGrowthReportDialog.vue?raw'
import { growthReportFixture } from '@/utils/__tests__/growthReportFixture'
import { ApiRequestError } from '@/types/api'
import type { GrowthInterpretationTask, GrowthReport } from '@/types/studentGrowth'

const api = vi.hoisted(() => ({
    getReport: vi.fn(), getSavedReport: vi.fn(), saveReport: vi.fn(), listReports: vi.fn(),
    findInterpretationTask: vi.fn(), createInterpretationTask: vi.fn(), getInterpretationTask: vi.fn(),
    listSemesters: vi.fn(),
}))
const pdf = vi.hoisted(() => ({ downloadGrowthReportPdf: vi.fn(), allowImportExport: vi.fn() }))
const canViewGrowthReports = ref(true)
vi.mock('@/utils/studentGrowthPdf', () => ({ downloadGrowthReportPdf: pdf.downloadGrowthReportPdf }))
vi.mock('@/api/studentGrowth', () => ({ studentGrowthApi: api }))
vi.mock('@/api/class', () => ({ classApi: { listSemesters: api.listSemesters } }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => ({ profile: { id: 'teacher', roleCode: 'pro' } }) }))
vi.mock('@/composables/useBusinessAccess', () => ({ useBusinessAccess: () => ({
    canWrite: ref(true), canImportExport: ref(true), canViewGrowthReports, allowWrite: () => true, allowImportExport: pdf.allowImportExport,
}) }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))
vi.mock('@/v3/components/AppDialogShell.vue', async () => {
    const { defineComponent, h } = await import('vue')
    return { default: defineComponent({ setup: (_, { slots }) => () => h('div', [slots.default?.(), slots.footer?.()]) }) }
})
vi.mock('../StudentGrowthStatistics.vue', () => ({ default: { render: () => null } }))

const response = <T>(data: T) => ({ code: 0, message: '', data })
const task = (status: GrowthInterpretationTask['status']): GrowthInterpretationTask => ({
    id: 'task-1', snapshot_hash: 'snapshot-1', status, interpretation: status === 'succeeded' ? 'AI 新生成的内容' : '',
    error: '', error_code: 0, created_at: '2026-11-11T10:00:00+08:00', updated_at: '2026-11-11T10:00:00+08:00',
})
interface DialogState {
    interpretation: string
    hasDraftChanges: boolean
    busy: boolean
    exporting: boolean
    exportError: string
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
    selectPreset: (value: 'week' | 'month' | 'custom') => Promise<void>
    exportReport: () => Promise<void>
}
const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})
let app: App | undefined
let renderedRoot: VNode | undefined
// Compile the actual template because this repository loads SFCs in SSR mode during tests.
const { descriptor } = parse(dialogSource)
const script = compileScript(descriptor, { id: 'growth-report-dialog' })
const compiled = compileTemplate({
    source: descriptor.template!.content, filename: 'StudentGrowthReportDialog.vue', id: 'growth-report-dialog',
    compilerOptions: { bindingMetadata: script.bindings },
})
const renderCode = compiled.code.replace(/import \{([^}]+)\} from "vue"/g,
    (_, imports: string) => `const {${imports.replace(/ as /g, ': ')}} = Vue`)
    .replace('export function render', 'return function render')
const renderTemplate = new Function('Vue', renderCode)({ ...Vue, vModelText: {} })

function findVNodes(vnode: VNode, predicate: (node: VNode) => boolean): VNode[] {
    const matches = predicate(vnode) ? [vnode] : []
    if (vnode.component) matches.push(...findVNodes(vnode.component.subTree, predicate))
    if (Array.isArray(vnode.children)) {
        for (const child of vnode.children) {
            if (child && typeof child === 'object' && 'type' in child) matches.push(...findVNodes(child as VNode, predicate))
        }
    }
    return matches
}
async function settle() {
    for (let index = 0; index < 20; index++) await Promise.resolve()
    await nextTick()
}
async function mountDialog(withTemplate = false): Promise<DialogState> {
    app = renderer.createApp({ ...StudentGrowthReportDialog, render: withTemplate ? renderTemplate : () => null }, {
        modelValue: true, studentId: 11, studentName: '小明', classId: 7, semesterId: 70,
    })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    await settle()
    renderedRoot = vm.$.subTree
    return (vm.$ as unknown as { setupState: DialogState }).setupState
}

beforeEach(() => {
    vi.resetAllMocks()
    canViewGrowthReports.value = true
    pdf.allowImportExport.mockReturnValue(true)
    pdf.downloadGrowthReportPdf.mockResolvedValue(undefined)
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
    renderedRoot = undefined
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('growth interpretation text in the report dialog', () => {
    it('renders only the AI editor and a direct PDF download action, ignoring legacy notes', async () => {
        api.getReport.mockResolvedValueOnce(response({ ...growthReportFixture(), teacher_note: '不再展示的历史寄语' }))
        const state = await mountDialog(true)
        const textareas = findVNodes(renderedRoot!, node => node.type === 'textarea')
        expect(textareas).toHaveLength(1)
        expect(textareas[0]!.props?.id).toBe('growth-interpretation')
        expect(textareas[0]!.props?.readonly).toBeUndefined()
        expect(textareas[0]!.props?.disabled).toBe(false)
        expect(findVNodes(renderedRoot!, node => node.props?.['aria-label'] === '已保存的老师寄语')).toHaveLength(0)
        expect(findVNodes(renderedRoot!, node => node.type === 'button' && node.children === '导出 PDF')).toHaveLength(1)
        expect(state.report).not.toHaveProperty('teacher_note')
    })

    it('downloads the current edited text once and locks mutations while exporting', async () => {
        let complete!: () => void
        pdf.downloadGrowthReportPdf.mockReturnValueOnce(new Promise<void>(resolve => { complete = resolve }))
        api.getSavedReport.mockResolvedValueOnce(response(growthReportFixture({ id: 42, interpretation: '原已保存解读' })))
        const state = await mountDialog()
        await state.openSaved(42)
        await settle()
        state.interpretation = '老师核对后的解读'
        const period = { from: state.from, to: state.to }
        const exporting = state.exportReport()
        expect(state.exporting).toBe(true)
        expect(state.busy).toBe(true)
        await state.exportReport()
        await state.selectPreset('month')
        await state.applyPeriod()
        await state.saveSnapshot()
        await vi.waitFor(() => expect(pdf.downloadGrowthReportPdf).toHaveBeenCalledOnce())
        expect(pdf.downloadGrowthReportPdf).toHaveBeenCalledWith(expect.objectContaining({ id: 0, interpretation: '老师核对后的解读' }),
            expect.objectContaining({ signal: expect.any(AbortSignal), canDownload: expect.any(Function) }))
        expect({ from: state.from, to: state.to }).toEqual(period)
        expect(api.getReport).toHaveBeenCalledOnce()
        expect(api.saveReport).not.toHaveBeenCalled()
        complete()
        await exporting
        expect(state.exporting).toBe(false)
        expect(state.exportError).toBe('')
    })

    it('shows an export failure and releases the lock for an explicit retry', async () => {
        pdf.downloadGrowthReportPdf.mockRejectedValueOnce(new Error('font unavailable'))
        const state = await mountDialog()
        await state.exportReport()
        expect(state.exportError).toBe('PDF 导出失败，请重试。')
        expect(state.exporting).toBe(false)
        expect(state.busy).toBe(false)
        await state.exportReport()
        expect(pdf.downloadGrowthReportPdf).toHaveBeenCalledTimes(2)
        expect(state.exportError).toBe('')
    })

    it('exports the original saved snapshot when data changes, excluding unsaved edits and legacy notes', async () => {
        const original = { ...growthReportFixture({ id: 42, interpretation: '原已保存解读' }), teacher_note: '已废弃寄语' }
        api.getSavedReport.mockResolvedValueOnce(response(original))
        api.getInterpretationTask.mockRejectedValueOnce(new ApiRequestError('报告数据已变化，请刷新报告后重试', 100409))
        const state = await mountDialog()
        await state.openSaved(42)
        await state.generateInterpretation()
        state.interpretation = '当前未保存修改'
        await vi.advanceTimersByTimeAsync(2000)
        await settle()
        expect(state.taskReportStale).toBe(true)
        await state.exportReport()
        expect(pdf.downloadGrowthReportPdf).toHaveBeenCalledWith(expect.objectContaining({ id: 42, interpretation: '原已保存解读' }),
            expect.objectContaining({ signal: expect.any(AbortSignal), canDownload: expect.any(Function) }))
        expect(pdf.downloadGrowthReportPdf.mock.calls[0]![0]).not.toHaveProperty('teacher_note')
    })

    it('refuses export without commercial export access', async () => {
        const state = await mountDialog()
        pdf.allowImportExport.mockReturnValue(false)
        await state.exportReport()
        expect(pdf.downloadGrowthReportPdf).not.toHaveBeenCalled()
        expect(state.exporting).toBe(false)
    })

    it('aborts a pending export when the dialog unmounts and suppresses late success', async () => {
        let complete!: () => void
        pdf.downloadGrowthReportPdf.mockReturnValueOnce(new Promise<void>(resolve => { complete = resolve }))
        const state = await mountDialog()
        const exporting = state.exportReport()
        await vi.waitFor(() => expect(pdf.downloadGrowthReportPdf).toHaveBeenCalledOnce())
        const options = pdf.downloadGrowthReportPdf.mock.calls[0]![1] as { signal: AbortSignal; canDownload: () => boolean }
        expect(options.signal.aborted).toBe(false)
        app?.unmount()
        app = undefined
        expect(options.signal.aborted).toBe(true)
        complete()
        await exporting
        expect(ElMessage.success).not.toHaveBeenCalled()
        expect(state.exportError).toBe('')
        expect(state.exporting).toBe(false)
    })

    it('revokes download permission during PDF generation and silently handles cancellation', async () => {
        let complete!: () => void
        const pending = new Promise<void>(resolve => { complete = resolve })
        pdf.downloadGrowthReportPdf.mockImplementationOnce(async (_snapshot: GrowthReport, options: { canDownload: () => boolean }) => {
            await pending
            if (!options.canDownload()) throw new DOMException('Export cancelled', 'AbortError')
        })
        const state = await mountDialog()
        const exporting = state.exportReport()
        await vi.waitFor(() => expect(pdf.downloadGrowthReportPdf).toHaveBeenCalledOnce())
        const options = pdf.downloadGrowthReportPdf.mock.calls[0]![1] as { canDownload: () => boolean }
        expect(options.canDownload()).toBe(true)
        canViewGrowthReports.value = false
        expect(options.canDownload()).toBe(false)
        complete()
        await exporting
        expect(ElMessage.success).not.toHaveBeenCalled()
        expect(state.exportError).toBe('')
        expect(state.exporting).toBe(false)
    })

    it('keeps typed interpretation while generation continues, then requires an explicit replacement', async () => {
        const state = await mountDialog()
        await state.generateInterpretation()
        state.interpretation = '老师自己写的观察'
        expect(state.taskPending).toBe(true)
        expect(state.busy).toBe(false)
        await vi.advanceTimersByTimeAsync(2000)
        await settle()
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
        state.interpretation = '当前解读'
        api.saveReport.mockResolvedValueOnce(response(growthReportFixture({ id: 44, interpretation: '当前解读' })))
        await state.saveSnapshot()
        expect(api.saveReport).toHaveBeenCalledWith(11, expect.objectContaining({
            interpretation: '当前解读', snapshot_hash: 'snapshot-1',
        }), expect.any(AbortSignal))
        expect(state.taskPending).toBe(true)
        await vi.advanceTimersByTimeAsync(2000)
        await settle()
        expect(state.interpretation).toBe('当前解读')
        expect(state.report?.interpretation).toBe('当前解读')
        expect(state.generatedSuggestion?.interpretation).toBe('AI 新生成的内容')
    })

    it('discards legacy teacher notes when editing interpretation and saving a historical report', async () => {
        const original = { ...growthReportFixture({ id: 42, interpretation: '原解读' }), teacher_note: '原先保存的寄语' }
        api.getSavedReport.mockResolvedValueOnce(response(original))
        const state = await mountDialog()
        await state.openSaved(42)
        await settle()
        expect(state.hasDraftChanges).toBe(false)
        state.interpretation = '修改后的解读'
        expect(state.hasDraftChanges).toBe(true)
        api.saveReport.mockResolvedValueOnce(response({ ...original, id: 44, interpretation: '修改后的解读' }))
        await state.saveSnapshot()
        expect(api.saveReport).toHaveBeenCalledWith(11, expect.objectContaining({
            interpretation: '修改后的解读',
        }), expect.any(AbortSignal))
        expect(api.saveReport.mock.calls[0]![1]).not.toHaveProperty('teacher_note')
        expect(state.report).not.toHaveProperty('teacher_note')
        expect(state.hasDraftChanges).toBe(false)
        expect(original.teacher_note).toBe('原先保存的寄语')
        expect(original.interpretation).toBe('原解读')
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
