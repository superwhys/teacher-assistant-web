import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, reactive, ssrContextKey, type App } from 'vue'
import SettingsView from '../SettingsView.vue'

const mocks = vi.hoisted(() => ({
    list: vi.fn(), update: vi.fn(), nextSemester: vi.fn(), submitOpinion: vi.fn(), confirm: vi.fn(),
    warning: vi.fn(), success: vi.fn(),
    session: { canWrite: true, entitlementMessage: '试用已到期，仅可查看。' },
    cache: {
        profile: { id: 'teacher', email: 'teacher@example.com', wechatBound: true },
        isAuthenticated: true, displayName: '老师', isExpired: false, dataVersion: 0,
        getActiveClassId: () => 1, getActiveClassName: () => '一班',
        getActiveSemesterName: () => '第一学期', getActiveSemesterStatus: () => 1,
        hasLockPassword: () => false,
        setActiveClassName: vi.fn(), clearActiveClassName: vi.fn(),
        setActiveSemesterId: vi.fn(), setActiveSemesterName: vi.fn(),
        clearActiveSemesterName: vi.fn(), setActiveSemesterStatus: vi.fn(),
    },
}))

vi.mock('@/managers/class', () => ({ classManager: {
    list: mocks.list, update: mocks.update, nextSemester: mocks.nextSemester,
} }))
vi.mock('@/api/opinion', () => ({ submitOpinion: mocks.submitOpinion }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => mocks.session }))
vi.mock('@/utils/confirmDialog', () => ({ confirmDialog: mocks.confirm }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('element-plus', () => ({
    ElMessage: { warning: mocks.warning, success: mocks.success, error: vi.fn() },
}))
vi.mock('@/v3/components/settings/SettingsAccountCard.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/settings/SettingsMiniProgramCard.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/settings/SettingsClassStatusCard.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/settings/SettingsFeedbackCard.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/settings/SettingsLockCard.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/settings/SettingsNextSemesterDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/settings/SettingsRenameClassDialog.vue', () => ({ default: { render: () => null } }))

interface SettingsState {
    renameClassDialogVisible: boolean
    renameClassName: string
    nextSemesterDialogVisible: boolean
    nextSemesterName: string
    feedbackContent: string
    feedbackSubmitting: boolean
    semesterPermissionText: string
    semesterNoticeText: string
    openRenameClassDialog: () => void
    confirmRenameClass: () => Promise<void>
    openNextSemesterDialog: () => void
    confirmNextSemester: () => Promise<void>
    onSubmitFeedback: () => Promise<void>
}

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})

let app: App | undefined

async function mountSettings(): Promise<SettingsState> {
    app = renderer.createApp({ ...SettingsView, render: () => null })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    await Promise.resolve()
    await nextTick()
    return (vm.$ as unknown as { setupState: SettingsState }).setupState
}

beforeEach(() => {
    vi.resetAllMocks()
    mocks.session = reactive({ canWrite: true, entitlementMessage: '试用已到期，仅可查看。' })
    mocks.list.mockResolvedValue([{ id: 1, name: '一班', semester: { id: 1, name: '第一学期', status: 1 } }])
    mocks.confirm.mockResolvedValue('confirm')
    mocks.submitOpinion.mockResolvedValue(undefined)
})

afterEach(() => {
    app?.unmount()
    app = undefined
})

describe('SettingsView commercial restrictions', () => {
    it('allows reading class state but blocks rename, next semester and feedback before trial or after expiry', async () => {
        mocks.session.canWrite = false
        const settings = await mountSettings()
        settings.feedbackContent = '课堂建议'

        settings.openRenameClassDialog()
        settings.openNextSemesterDialog()
        await settings.onSubmitFeedback()

        expect(mocks.list).toHaveBeenCalled()
        expect(settings.renameClassDialogVisible).toBe(false)
        expect(settings.nextSemesterDialogVisible).toBe(false)
        expect(settings.semesterPermissionText).toBe('积分操作已关闭')
        expect(settings.semesterNoticeText).toBe(mocks.session.entitlementMessage)
        expect(mocks.confirm).not.toHaveBeenCalled()
        expect(mocks.update).not.toHaveBeenCalled()
        expect(mocks.nextSemester).not.toHaveBeenCalled()
        expect(mocks.submitOpinion).not.toHaveBeenCalled()
    })

    it('rechecks entitlement when a teacher submits a dialog opened before trial expiry', async () => {
        const settings = await mountSettings()
        settings.openRenameClassDialog()
        settings.openNextSemesterDialog()
        settings.renameClassName = '二班'
        settings.nextSemesterName = '第二学期'
        expect(settings.renameClassDialogVisible).toBe(true)
        expect(settings.nextSemesterDialogVisible).toBe(true)

        mocks.session.canWrite = false
        await settings.confirmRenameClass()
        await settings.confirmNextSemester()

        expect(mocks.update).not.toHaveBeenCalled()
        expect(mocks.nextSemester).not.toHaveBeenCalled()
        expect(mocks.warning).toHaveBeenCalledWith(mocks.session.entitlementMessage)
    })

    it('locks duplicate feedback confirmation and stops a submission if entitlement expires during confirmation', async () => {
        let confirm!: (value: string) => void
        mocks.confirm.mockReturnValue(new Promise((resolve) => { confirm = resolve }))
        const settings = await mountSettings()
        settings.feedbackContent = '课堂建议'

        const pending = settings.onSubmitFeedback()
        await settings.onSubmitFeedback()
        expect(settings.feedbackSubmitting).toBe(true)
        expect(mocks.confirm).toHaveBeenCalledTimes(1)
        mocks.session.canWrite = false
        confirm('confirm')
        await pending

        expect(mocks.submitOpinion).not.toHaveBeenCalled()
        expect(settings.feedbackSubmitting).toBe(false)
        expect(settings.feedbackContent).toBe('课堂建议')
    })

    it('submits feedback normally during an active commercial entitlement', async () => {
        const settings = await mountSettings()
        settings.feedbackContent = '  课堂建议  '
        await settings.onSubmitFeedback()
        expect(mocks.submitOpinion).toHaveBeenCalledWith({ content: '课堂建议' })
        expect(settings.feedbackContent).toBe('')
        expect(settings.feedbackSubmitting).toBe(false)
        expect(mocks.success).toHaveBeenCalledTimes(1)
    })
})
