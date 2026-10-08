import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, reactive, ssrContextKey, type App } from 'vue'

const mocks = vi.hoisted(() => ({
    list: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    cache: {
        isAuthenticated: true,
        isLocked: false,
        token: 'session-token',
        isExpired: false,
        profile: { id: 'teacher', avatar: null, wechatBound: true },
        displayName: '教师',
        getActiveClassId: () => null,
        getActiveClassName: () => null,
        getActiveSemesterId: () => null,
        getActiveSemesterName: () => null,
        getActiveSemesterStatus: () => null,
        clearActiveClassId: vi.fn(),
        clearActiveClassName: vi.fn(),
        clearActiveSemesterId: vi.fn(),
        clearActiveSemesterName: vi.fn(),
        clearActiveSemesterStatus: vi.fn(),
    },
    session: {
        toolsAllowed: true,
        sidebar: [],
        initialize: vi.fn(),
        canAccess(path: string) { return path !== '/tools' || this.toolsAllowed },
    },
    route: { path: '/tools/timer' },
}))

vi.mock('@/managers/class', () => ({ classManager: { list: mocks.list } }))
vi.mock('@/api/mall', () => ({ mallApi: {} }))
vi.mock('@/managers/lottery', () => ({ lotteryManager: {} }))
vi.mock('@/managers/student', () => ({ studentManager: {} }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => mocks.session }))
vi.mock('vue-router', () => ({
    RouterLink: { render: () => null },
    RouterView: { render: () => null },
    useRoute: () => mocks.route,
    useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), error: vi.fn() } }))
vi.mock('element-plus/es', () => ({ ElMessage: { success: vi.fn(), error: vi.fn() } }))
vi.mock('element-plus/es/components/base/style/css', () => ({}))
vi.mock('element-plus/es/components/avatar/style/css', () => ({}))
vi.mock('element-plus/es/components/input/style/css', () => ({}))
vi.mock('element-plus/es/components/icon/style/css', () => ({}))
vi.mock('@/v3/components/AppDialogShell.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/ClassSwitchButton.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/SemesterSwitchButton.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/TeachersDayWelcomeDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/tools/FloatingTimerStrip.vue', () => ({ default: { render: () => null } }))

interface MainTimerState {
    showTimerStrip: boolean
    timerStrip: {
        active: boolean
        caption: string
        title: string
        countdown: string
        progress: number
        paused: boolean
    }
}

// Exercise MainView's actual computed state and lifecycle with the shared timers.
const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})

let app: App | undefined

async function mountMain() {
    const MainView = (await import('../MainView.vue')).default
    const { useSharedTimer, useStageTimer } = await import('@/v3/composables/useToolsWorkspace')
    app = renderer.createApp({ ...MainView, render: () => null })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    await Promise.resolve()
    await nextTick()
    return {
        main: (vm.$ as unknown as { setupState: MainTimerState }).setupState,
        single: useSharedTimer(),
        stages: useStageTimer(),
    }
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-08T08:00:00Z'))
    const storage = new Map<string, string>()
    vi.stubGlobal('window', {
        localStorage: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
        },
        setInterval: globalThis.setInterval,
        clearInterval: globalThis.clearInterval,
        setTimeout: globalThis.setTimeout,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })
    vi.stubGlobal('document', {
        createElement: () => ({}),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })
    mocks.cache = reactive({ ...mocks.cache, isAuthenticated: true, isLocked: false })
    mocks.session = reactive({ ...mocks.session, toolsAllowed: true })
    mocks.route = reactive({ path: '/tools/timer' })
    mocks.list.mockResolvedValue([])
    mocks.session.initialize.mockResolvedValue(undefined)
})

afterEach(() => {
    app?.unmount()
    app = undefined
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('MainView floating timer strip', () => {
    it('shows a single countdown on its timer page and other pages, retaining paused progress until reset or completion', async () => {
        const { main, single } = await mountMain()
        single.toggleTimerPresetUnit()
        single.applyTimerPreset(10)
        expect(main.showTimerStrip).toBe(false)
        single.toggleTimer()
        expect(main.showTimerStrip).toBe(true)
        expect(main.timerStrip).toMatchObject({ caption: '单段计时', countdown: '00:10', progress: 0, paused: false })
        mocks.route.path = '/students'
        vi.advanceTimersByTime(3000)
        expect(main.showTimerStrip).toBe(true)
        expect(main.timerStrip).toMatchObject({ countdown: '00:07', progress: 30 })
        single.toggleTimer()
        vi.advanceTimersByTime(5000)
        expect(main.showTimerStrip).toBe(true)
        expect(main.timerStrip).toMatchObject({ countdown: '00:07', progress: 30, paused: true })
        single.resetTimer()
        expect(main.showTimerStrip).toBe(false)
        single.toggleTimer()
        vi.advanceTimersByTime(10000)
        expect(main.showTimerStrip).toBe(false)
        expect(main.timerStrip).toMatchObject({ countdown: '00:00', progress: 100 })
    })

    it('keeps the strip after an immediate pause in either mode even when progress is still zero', async () => {
        const { main, single, stages } = await mountMain()
        single.toggleTimer()
        single.toggleTimer()
        expect(main.showTimerStrip).toBe(true)
        expect(main.timerStrip).toMatchObject({ progress: 0, paused: true })
        stages.selectTimerMode('stages')
        expect(main.showTimerStrip).toBe(false)
        stages.toggleStages()
        stages.toggleStages()
        expect(main.showTimerStrip).toBe(true)
        expect(main.timerStrip).toMatchObject({ progress: 0, paused: true, title: '独立思考' })
        stages.resetStages()
        expect(main.showTimerStrip).toBe(false)
    })

    it('updates the current stage and overall progress across phases, then hides after the flow completes', async () => {
        const { main, stages } = await mountMain()
        stages.selectTimerMode('stages')
        stages.configureStages([
            { name: '独立思考', duration: 2, unit: 'second' },
            { name: '小组讨论', duration: 3, unit: 'second' },
        ])
        stages.toggleStages()
        expect(main.showTimerStrip).toBe(true)
        expect(main.timerStrip).toMatchObject({ caption: '多阶段计时 · 第 1 / 2 阶段', title: '独立思考', countdown: '00:02', progress: 0 })
        vi.advanceTimersByTime(2000)
        expect(main.timerStrip).toMatchObject({ caption: '多阶段计时 · 第 2 / 2 阶段', title: '小组讨论', countdown: '00:03', progress: 40 })
        stages.toggleStages()
        vi.advanceTimersByTime(4000)
        expect(main.showTimerStrip).toBe(true)
        expect(main.timerStrip).toMatchObject({ countdown: '00:03', progress: 40, paused: true })
        stages.toggleStages()
        vi.advanceTimersByTime(1000)
        expect(main.timerStrip).toMatchObject({ countdown: '00:02', progress: 60, paused: false })
        vi.advanceTimersByTime(2000)
        expect(main.showTimerStrip).toBe(false)
        expect(main.timerStrip).toMatchObject({ countdown: '00:00', progress: 100 })
    })

    it('hides without tools access or while locked, and keeps the timer running behind the lock', async () => {
        const { main, single } = await mountMain()
        single.toggleTimerPresetUnit()
        single.applyTimerPreset(10)
        single.toggleTimer()
        expect(main.showTimerStrip).toBe(true)
        mocks.session.toolsAllowed = false
        expect(main.showTimerStrip).toBe(false)
        mocks.session.toolsAllowed = true
        mocks.cache.isLocked = true
        expect(main.showTimerStrip).toBe(false)
        vi.advanceTimersByTime(2000)
        mocks.cache.isLocked = false
        expect(main.showTimerStrip).toBe(true)
        expect(main.timerStrip.countdown).toBe('00:08')
        mocks.cache.isAuthenticated = false
        expect(main.showTimerStrip).toBe(false)
    })
})
