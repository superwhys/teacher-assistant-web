import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, ssrContextKey, type App } from 'vue'

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    listStudents: vi.fn(),
    listPrizes: vi.fn(),
    listPools: vi.fn(),
}))

vi.mock('@/api/mall', () => ({ mallApi: { listPrizes: mocks.listPrizes } }))
vi.mock('@/managers/lottery', () => ({ lotteryManager: { listPools: mocks.listPools } }))
vi.mock('@/managers/student', () => ({ studentManager: { list: mocks.listStudents } }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => ({
    getActiveClassId: () => null,
    getActiveSemesterId: () => null,
}) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('element-plus', () => ({ ElMessage: {
    success: vi.fn(), error: vi.fn(), warning: vi.fn(),
} }))
vi.mock('@/v3/components/tools/ToolsTimerCard.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/tools/ToolsRollCallCard.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/tools/ToolsLotteryCard.vue', () => ({ default: { render: () => null } }))

interface ToolsTimerState {
    timerMode: 'single' | 'stages'
    timerPreview: {
        displayTime: string
        isRunning: boolean
        hasStarted: boolean
        completed: boolean
        progress: number
        statusLabel: string
        statusToneClass: string
    }
    selectTimerPreviewMode: (mode: 'single' | 'stages') => void
    togglePreviewTimer: () => void
    resetPreviewTimer: () => void
    openToolRoute: (path: string) => void
}

// Exercise the list page's real setup and handlers against the shared timers.
const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})

let app: App | undefined
const shortStages = [
    { name: '独立思考', duration: 2, unit: 'second' as const },
    { name: '小组讨论', duration: 3, unit: 'second' as const },
]

async function mountTools() {
    const ToolsView = (await import('../ToolsView.vue')).default
    const { useSharedTimer, useStageTimer } = await import('@/v3/composables/useToolsWorkspace')
    app = renderer.createApp({ ...ToolsView, render: () => null })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    await Promise.resolve()
    await nextTick()
    return {
        tools: (vm.$ as unknown as { setupState: ToolsTimerState }).setupState,
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
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })
    vi.stubGlobal('document', {
        createElement: () => ({}),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })
    mocks.listStudents.mockResolvedValue([])
    mocks.listPrizes.mockResolvedValue({ data: { items: [] } })
    mocks.listPools.mockResolvedValue([])
})

afterEach(() => {
    app?.unmount()
    app = undefined
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('ToolsView timer preview', () => {
    it('shows the active multi-stage flow when returning from the full timer page', async () => {
        const flow = (await import('@/v3/composables/useToolsWorkspace')).useStageTimer()
        flow.configureStages(shortStages)
        flow.toggleStages()
        vi.advanceTimersByTime(3000)

        const { tools, stages } = await mountTools()

        expect(tools.timerMode).toBe('stages')
        expect(stages.state.stageIndex).toBe(1)
        expect(stages.state.stages[stages.state.stageIndex]?.name).toBe('小组讨论')
        expect(tools.timerPreview).toMatchObject({
            displayTime: '00:02', isRunning: true, hasStarted: true,
            completed: false, progress: 60, statusLabel: '计时中',
        })
    })

    it('starts, pauses and resumes the flow from the list while advancing stages automatically', async () => {
        const { tools, stages } = await mountTools()
        stages.configureStages(shortStages)
        tools.selectTimerPreviewMode('stages')
        expect(tools.timerPreview).toMatchObject({ displayTime: '00:02', hasStarted: false, progress: 0 })

        tools.togglePreviewTimer()
        vi.advanceTimersByTime(2000)
        expect(stages.state.stageIndex).toBe(1)
        expect(tools.timerPreview).toMatchObject({ displayTime: '00:03', isRunning: true, progress: 40 })
        tools.togglePreviewTimer()
        vi.advanceTimersByTime(10000)
        expect(tools.timerPreview).toMatchObject({
            displayTime: '00:03', isRunning: false, hasStarted: true,
            progress: 40, statusLabel: '已暂停',
        })
        tools.togglePreviewTimer()
        vi.advanceTimersByTime(1000)
        expect(tools.timerPreview).toMatchObject({ displayTime: '00:02', isRunning: true, progress: 60 })
    })

    it('pauses the other mode when switching and leaves the current mode running on repeated selection', async () => {
        const { tools, single, stages } = await mountTools()
        single.toggleTimerPresetUnit()
        single.applyTimerPreset(10)
        stages.configureStages(shortStages)
        tools.togglePreviewTimer()
        vi.advanceTimersByTime(1000)
        tools.selectTimerPreviewMode('single')
        expect(single.timerState.isRunning).toBe(true)
        tools.selectTimerPreviewMode('stages')
        expect(single.timerState).toMatchObject({ remainingSeconds: 9, isRunning: false })
        tools.togglePreviewTimer()
        tools.selectTimerPreviewMode('stages')
        expect(stages.state.isRunning).toBe(true)
        vi.advanceTimersByTime(1000)
        tools.selectTimerPreviewMode('single')
        expect(stages.state).toMatchObject({ remainingMs: 1000, isRunning: false })
        expect(tools.timerPreview).toMatchObject({ displayTime: '00:09', hasStarted: true, isRunning: false })
        tools.togglePreviewTimer()
        vi.advanceTimersByTime(1000)
        expect(tools.timerPreview).toMatchObject({ displayTime: '00:08', isRunning: true })
        expect(stages.state.remainingMs).toBe(1000)
    })

    it('resets only the selected flow and supports restarting after all stages complete', async () => {
        const { tools, single, stages } = await mountTools()
        single.toggleTimerPresetUnit()
        single.applyTimerPreset(10)
        single.toggleTimer()
        vi.advanceTimersByTime(1000)
        stages.configureStages(shortStages)
        tools.selectTimerPreviewMode('stages')
        tools.togglePreviewTimer()
        vi.advanceTimersByTime(3000)
        tools.resetPreviewTimer()
        expect(stages.state).toMatchObject({ stageIndex: 0, remainingMs: 2000, hasStarted: false, isRunning: false })
        expect(stages.editable.value).toBe(true)
        expect(single.timerState).toMatchObject({ remainingSeconds: 9, hasStarted: true })

        tools.togglePreviewTimer()
        vi.advanceTimersByTime(5000)
        expect(tools.timerPreview).toMatchObject({ displayTime: '00:00', completed: true, isRunning: false, progress: 100 })
        tools.togglePreviewTimer()
        expect(stages.state).toMatchObject({ stageIndex: 0, remainingMs: 2000, isRunning: true })
        expect(tools.timerPreview).toMatchObject({ completed: false, progress: 0 })
    })

    it('opens the full page without resetting or stopping the shared flow when the list unmounts', async () => {
        const { tools, stages } = await mountTools()
        stages.configureStages(shortStages)
        tools.selectTimerPreviewMode('stages')
        tools.togglePreviewTimer()
        vi.advanceTimersByTime(1000)

        tools.openToolRoute('/tools/timer')
        expect(mocks.push).toHaveBeenCalledExactlyOnceWith('/tools/timer')
        expect(stages.state).toMatchObject({ stageIndex: 0, remainingMs: 1000, isRunning: true })
        app?.unmount()
        app = undefined
        vi.advanceTimersByTime(2000)
        expect(stages.state).toMatchObject({ stageIndex: 1, remainingMs: 2000, isRunning: true })
    })
})
