import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, reactive, ssrContextKey, type App } from 'vue'
import PointsExportDialog from '../PointsExportDialog.vue'

const mocks = vi.hoisted(() => ({ preview: vi.fn(), export: vi.fn(), warning: vi.fn(), createObjectURL: vi.fn() }))
const session = reactive({ canWrite: true, canPrepare: true, canImportExport: true, entitlementMessage: '试用已到期，仅可查看' })
vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => session }))
vi.mock('@/managers/points', () => ({ pointsManager: {
    exportRuleRecordsPreview: mocks.preview, exportRuleRecords: mocks.export,
} }))
vi.mock('element-plus', () => ({ ElMessage: { warning: mocks.warning, error: vi.fn(), success: vi.fn() } }))
vi.mock('element-plus/es', () => ({ ElMessage: { warning: mocks.warning, error: vi.fn(), success: vi.fn() } }))
vi.mock('element-plus/es/components/loading/style/css', () => ({}))
vi.mock('element-plus/es/components/base/style/css', () => ({}))
vi.mock('element-plus/es/components/radio-group/style/css', () => ({}))
vi.mock('element-plus/es/components/radio-button/style/css', () => ({}))
vi.mock('element-plus/es/components/select/style/css', () => ({}))
vi.mock('element-plus/es/components/option/style/css', () => ({}))
vi.mock('element-plus/es/components/date-picker/style/css', () => ({}))
vi.mock('element-plus/es/components/table/style/css', () => ({}))
vi.mock('element-plus/es/components/table-column/style/css', () => ({}))
vi.mock('@/v3/components/AppDialogShell.vue', () => ({ default: { render: () => null } }))

interface ExportState {
    canExport: boolean
    refreshPreview: () => Promise<void>
    handleExport: () => Promise<void>
}

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})
let app: App | undefined
function mountExport(): ExportState {
    app = renderer.createApp({ ...PointsExportDialog, render: () => null }, {
        modelValue: false, activeClassId: 7, activeClassName: '一班', groupOptions: [], ruleOptions: [],
    })
    app.provide(ssrContextKey, { modules: new Set() })
    return (app.mount({}).$ as unknown as { setupState: ExportState }).setupState
}

beforeEach(() => {
    vi.resetAllMocks()
    Object.assign(session, { canWrite: true, canPrepare: true, canImportExport: true })
    vi.stubGlobal('window', { URL: { createObjectURL: mocks.createObjectURL } })
    mocks.preview.mockResolvedValue({ key: 'preview-key', headers: ['姓名'], values: [['小明']] })
})
afterEach(() => { app?.unmount(); app = undefined; vi.unstubAllGlobals() })

describe('points export commercial access', () => {
    it('blocks both preview and download when an already prepared export expires', async () => {
        const state = mountExport()
        await state.refreshPreview()
        expect(state.canExport).toBe(true)
        session.canImportExport = false
        expect(state.canExport).toBe(false)
        await state.refreshPreview()
        await state.handleExport()
        expect(mocks.preview).toHaveBeenCalledOnce()
        expect(mocks.export).not.toHaveBeenCalled()
        expect(mocks.warning).toHaveBeenCalledWith(session.entitlementMessage)
    })

    it('does not save a returned file when access expires while the download request is pending', async () => {
        const state = mountExport()
        await state.refreshPreview()
        let complete!: (blob: Blob) => void
        mocks.export.mockReturnValue(new Promise<Blob>(resolve => { complete = resolve }))
        const pending = state.handleExport()
        expect(mocks.export).toHaveBeenCalledWith('preview-key')
        session.canImportExport = false
        complete(new Blob(['spreadsheet']))
        await pending
        expect(mocks.createObjectURL).not.toHaveBeenCalled()
    })
})
