import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import MainView from '../MainView.vue'

const mocks = vi.hoisted(() => ({
    setupAssistant: vi.fn(), list: vi.fn(), initialize: vi.fn(),
    cache: {
        isAuthenticated: true, isLocked: false, token: 'session-token', isExpired: false,
        profile: { id: 'teacher', avatar: null, wechatBound: true }, displayName: '教师',
        getActiveClassId: () => null, getActiveClassName: () => null,
        getActiveSemesterId: () => null, getActiveSemesterName: () => null,
        getActiveSemesterStatus: () => 1,
        clearActiveClassId: vi.fn(), clearActiveClassName: vi.fn(),
        clearActiveSemesterId: vi.fn(), clearActiveSemesterName: vi.fn(), clearActiveSemesterStatus: vi.fn(),
    },
    session: {
        canUseAgent: false, canWrite: true, entitlementState: 'permanent', sidebar: [],
        canAccess: () => false,
    },
}))

vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => ({
    get canUseAgent() { return mocks.session.canUseAgent },
    get canWrite() { return mocks.session.canWrite },
    get entitlementState() { return mocks.session.entitlementState },
    sidebar: [], canAccess: mocks.session.canAccess, initialize: mocks.initialize,
}) }))
vi.mock('@/managers/class', () => ({ classManager: { list: mocks.list } }))
vi.mock('vue-router', () => ({
    RouterLink: { render: () => null }, RouterView: { render: () => null },
    useRoute: () => ({ path: '/students' }), useRouter: () => ({}),
}))
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }))
vi.mock('element-plus/es', () => ({
    ElMessage: { error: vi.fn() }, ElAvatar: { render: () => null },
    ElInput: { render: () => null }, ElIcon: { render: () => null },
}))
vi.mock('element-plus/es/components/base/style/css', () => ({}))
vi.mock('element-plus/es/components/avatar/style/css', () => ({}))
vi.mock('element-plus/es/components/input/style/css', () => ({}))
vi.mock('element-plus/es/components/icon/style/css', () => ({}))
vi.mock('@/v3/components/AppDialogShell.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/AppNoticeBar.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/settings/AccountEntitlementNotice.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/ClassSwitchButton.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/SemesterSwitchButton.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/TeachersDayWelcomeDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/tools/FloatingTimerStrip.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/agent/AgentAssistant.vue', async () => {
    const { defineComponent } = await import('vue')
    return { default: defineComponent({
        props: { canWrite: Boolean },
        setup(props) {
            mocks.setupAssistant(props.canWrite)
            return () => null
        },
    }) }
})
vi.mock('@/v3/composables/useToolsWorkspace', async () => {
    const { ref } = await import('vue')
    return {
        useSharedTimer: () => ({
            closeTimerFinishedDialog: vi.fn(), timerDisplayTime: ref('00:00'),
            timerFinishedDialogVisible: ref(false), timerProgressPercent: ref(0),
            timerState: { hasStarted: false, remainingSeconds: 0, isRunning: false },
        }),
        useStageTimer: () => ({ state: {}, timerMode: ref('single') }),
    }
})

function renderMain() {
    return renderToString(createSSRApp(MainView))
}

beforeEach(() => {
    vi.clearAllMocks()
    mocks.cache.isAuthenticated = true
    mocks.cache.isLocked = false
    mocks.session.canUseAgent = false
    mocks.session.canWrite = true
    mocks.list.mockResolvedValue([])
    mocks.initialize.mockResolvedValue(undefined)
    vi.stubGlobal('window', { localStorage: { getItem: () => null } })
    vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
afterEach(() => {
    vi.unstubAllGlobals()
})

describe('MainView AI assistant access', () => {
    it('only creates the assistant with its module grant and stops rendering it when revoked', async () => {
        await renderMain()
        expect(mocks.setupAssistant).not.toHaveBeenCalled()
        mocks.session.canUseAgent = true
        await renderMain()
        expect(mocks.setupAssistant).toHaveBeenCalledOnce()
        mocks.setupAssistant.mockClear()
        mocks.session.canUseAgent = false
        await renderMain()
        expect(mocks.setupAssistant).not.toHaveBeenCalled()
    })

    it('keeps the granted assistant read-only when commercial writes are unavailable', async () => {
        mocks.session.canUseAgent = true
        mocks.session.canWrite = false
        await renderMain()
        expect(mocks.setupAssistant).toHaveBeenCalledWith(false)
    })

    it('also excludes the granted assistant while locked and after logout', async () => {
        mocks.session.canUseAgent = true
        mocks.cache.isLocked = true
        await renderMain()
        expect(mocks.setupAssistant).not.toHaveBeenCalled()
        mocks.cache.isLocked = false
        mocks.cache.isAuthenticated = false
        await renderMain()
        expect(mocks.setupAssistant).not.toHaveBeenCalled()
    })
})
