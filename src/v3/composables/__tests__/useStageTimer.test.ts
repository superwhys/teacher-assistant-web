import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/mall', () => ({ mallApi: {} }))
vi.mock('@/managers/lottery', () => ({ lotteryManager: {} }))
vi.mock('@/managers/student', () => ({ studentManager: {} }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => ({}) }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))

let storage: Map<string, string>
let events: Map<string, () => void>
const stages = [
    { name: '思考', duration: 2, unit: 'second' as const },
    { name: '讨论', duration: 3, unit: 'second' as const },
    { name: '展示', duration: 4, unit: 'second' as const },
]
const stageStorageKey = 'teacher-assistant:v3:tools:stage-timer'

beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-08T08:00:00Z'))
    storage = new Map()
    events = new Map()
    vi.stubGlobal('window', {
        localStorage: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
        },
        setInterval: globalThis.setInterval,
        clearInterval: globalThis.clearInterval,
        addEventListener: (name: string, callback: () => void) => events.set(name, callback),
    })
    vi.stubGlobal('document', {
        createElement: () => ({}),
        addEventListener: (name: string, callback: () => void) => events.set(name, callback),
    })
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('shared multi-stage timer controls', () => {
    it('keeps single and multi-stage timers mutually exclusive and resumes paused progress', async () => {
        const { useSharedTimer, useStageTimer } = await import('../useToolsWorkspace')
        const single = useSharedTimer()
        const flow = useStageTimer()
        single.toggleTimer()
        expect(single.timerState.isRunning).toBe(true)
        flow.selectTimerMode('stages')
        expect(single.timerState.isRunning).toBe(false)
        flow.configureStages(stages)
        flow.toggleStages()
        vi.advanceTimersByTime(3000)
        expect(flow.state).toMatchObject({ stageIndex: 1, remainingMs: 2000, isRunning: true })
        flow.selectTimerMode('single')
        expect(flow.state.isRunning).toBe(false)
        vi.advanceTimersByTime(10000)
        expect(flow.state.remainingMs).toBe(2000)
        flow.selectTimerMode('stages')
        flow.toggleStages()
        vi.advanceTimersByTime(2000)
        expect(flow.state).toMatchObject({ stageIndex: 2, remainingMs: 4000 })
        single.toggleTimer()
        expect(flow.state.isRunning).toBe(false)
        expect(flow.timerMode.value).toBe('single')
    })

    it('catches up across phases as soon as the page returns from a long background gap', async () => {
        const { useStageTimer } = await import('../useToolsWorkspace')
        const flow = useStageTimer()
        flow.configureStages(stages)
        flow.toggleStages()
        vi.setSystemTime(Date.now() + 6500)
        events.get('visibilitychange')!()
        expect(flow.state).toMatchObject({ stageIndex: 2, remainingMs: 2500, isRunning: true })
        expect(flow.progress.value.percent).toBe(72)
        vi.setSystemTime(Date.now() + 20000)
        events.get('pageshow')!()
        expect(flow.state).toMatchObject({ remainingMs: 0, isRunning: false })
        expect(flow.progress.value.percent).toBe(100)
    })

    it('restores the selected mode and deadline after a reload without adding background time', async () => {
        const first = (await import('../useToolsWorkspace')).useStageTimer()
        first.configureStages(stages)
        first.toggleStages()
        expect(first.state).toMatchObject({ stageIndex: 0, remainingMs: 2000, isRunning: true })
        expect(JSON.parse(storage.get(stageStorageKey)!).state.endAtMs).toBe(Date.now() + 2000)
        expect(JSON.parse(storage.get(stageStorageKey)!).mode).toBe('stages')
        const startedAt = Date.now()
        vi.clearAllTimers()
        vi.resetModules()
        vi.setSystemTime(startedAt + 6500)
        const restored = (await import('../useToolsWorkspace')).useStageTimer()
        expect(restored.timerMode.value).toBe('stages')
        expect(restored.state).toMatchObject({ stageIndex: 2, remainingMs: 2500, isRunning: true })
        vi.advanceTimersByTime(2500)
        expect(restored.state).toMatchObject({ remainingMs: 0, isRunning: false })
    })

    it('protects running or paused stage configuration until reset and rejects invalid durations', async () => {
        const flow = (await import('../useToolsWorkspace')).useStageTimer()
        flow.configureStages(stages)
        flow.toggleStages()
        vi.advanceTimersByTime(500)
        flow.toggleStages()
        expect(flow.editable.value).toBe(false)
        flow.configureStages([{ name: '覆盖', duration: 1, unit: 'second' }])
        expect(flow.state.stages).toHaveLength(3)
        flow.resetStages()
        expect(flow.editable.value).toBe(true)
        expect(flow.state).toMatchObject({ stageIndex: 0, remainingMs: 2000, isRunning: false })
        flow.configureStages([{ name: '无效', duration: 0, unit: 'second' }])
        expect(flow.state.stages).toHaveLength(3)
        flow.configureStages([{ name: '新阶段', duration: 1, unit: 'minute' }])
        expect(flow.state).toMatchObject({ stageIndex: 0, remainingMs: 60000 })
    })

    it('continues timing when browser storage writes are unavailable', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        window.localStorage.setItem = () => { throw new Error('storage unavailable') }
        const flow = (await import('../useToolsWorkspace')).useStageTimer()
        flow.configureStages(stages)
        expect(() => flow.toggleStages()).not.toThrow()
        vi.advanceTimersByTime(2500)
        expect(flow.state).toMatchObject({ stageIndex: 1, remainingMs: 2500, isRunning: true })
    })
})
