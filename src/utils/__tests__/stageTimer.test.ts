import { describe, expect, it } from 'vitest'
import {
    createStageTimerState, isValidTimerStages, restoreStageTimer, stageTimerProgress,
    syncStageTimer, toggleStageTimer, type TimerStage
} from '../stageTimer'

const stages: TimerStage[] = [
    { name: '思考', duration: 3, unit: 'second' },
    { name: '讨论', duration: 5, unit: 'second' },
    { name: '展示', duration: 8, unit: 'second' },
]

describe('multi-stage classroom timer', () => {
    it('distinguishes a never-started timer from an immediately paused timer through restoration and reset', () => {
        const initial = createStageTimerState(stages)
        expect(initial.hasStarted).toBe(false)
        const started = toggleStageTimer(initial, 1000)
        const paused = toggleStageTimer(started, 1000)
        expect(paused).toMatchObject({ remainingMs: 3000, isRunning: false, hasStarted: true })
        expect(restoreStageTimer(paused, 90000).hasStarted).toBe(true)
        expect(createStageTimerState(paused.stages).hasStarted).toBe(false)
    })

    it('infers whether legacy stage caches have started and rejects invalid new flags', () => {
        const { hasStarted: _hasStarted, ...legacy } = createStageTimerState(stages)
        expect(restoreStageTimer(legacy, 1000).hasStarted).toBe(false)
        expect(restoreStageTimer({ ...legacy, remainingMs: 2500 }, 1000).hasStarted).toBe(true)
        expect(restoreStageTimer({ ...legacy, stageIndex: 1, remainingMs: 5000 }, 1000).hasStarted).toBe(true)
        expect(restoreStageTimer({ ...legacy, isRunning: true, endAtMs: 4000 }, 1000).hasStarted).toBe(true)
        expect(restoreStageTimer({ ...legacy, hasStarted: 'yes' }, 1000)).toEqual(createStageTimerState())
    })

    it('advances on the exact deadline without resetting the next deadline to the tick time', () => {
        const started = toggleStageTimer(createStageTimerState(stages), 1000)
        const next = syncStageTimer(started, 4500)
        expect(next).toMatchObject({ stageIndex: 1, remainingMs: 4500, endAtMs: 9000, isRunning: true })
        expect(syncStageTimer(started, 4000).stageIndex).toBe(1)
    })

    it('crosses multiple stages after a background gap and completes the whole flow', () => {
        const started = toggleStageTimer(createStageTimerState(stages), 1000)
        expect(syncStageTimer(started, 11000)).toMatchObject({ stageIndex: 2, remainingMs: 6000, endAtMs: 17000 })
        expect(syncStageTimer(started, 100000)).toMatchObject({ stageIndex: 2, remainingMs: 0, endAtMs: null, isRunning: false })
    })

    it('pauses after a phase boundary, retains fractional time, and resumes from that remainder', () => {
        const started = toggleStageTimer(createStageTimerState(stages), 1000)
        const paused = toggleStageTimer(started, 4234)
        expect(paused).toMatchObject({ stageIndex: 1, remainingMs: 4766, endAtMs: null, isRunning: false })
        expect(syncStageTimer(paused, 90000).remainingMs).toBe(4766)
        const resumed = toggleStageTimer(paused, 100000)
        expect(resumed.endAtMs).toBe(104766)
        expect(syncStageTimer(resumed, 104766)).toMatchObject({ stageIndex: 2, remainingMs: 8000 })
    })

    it('reports progress across the whole flow and can reset or restart a completed flow', () => {
        const started = toggleStageTimer(createStageTimerState(stages), 0)
        expect(stageTimerProgress(syncStageTimer(started, 8000))).toEqual({ totalMs: 16000, remainingMs: 8000, percent: 50 })
        const completed = syncStageTimer(started, 16000)
        expect(stageTimerProgress(completed).percent).toBe(100)
        expect(toggleStageTimer(completed, 20000)).toMatchObject({ stageIndex: 0, remainingMs: 3000, endAtMs: 23000 })
        expect(createStageTimerState(completed.stages)).toMatchObject({ stageIndex: 0, remainingMs: 3000, isRunning: false })
    })

    it('restores running or paused caches and catches up from the persisted deadline', () => {
        const running = toggleStageTimer(createStageTimerState(stages), 1000)
        const restored = restoreStageTimer(JSON.parse(JSON.stringify(running)), 11000)
        expect(restored).toMatchObject({ stageIndex: 2, remainingMs: 6000, endAtMs: 17000, isRunning: true })
        expect(restoreStageTimer(running, 90000)).toMatchObject({ remainingMs: 0, isRunning: false })
        const paused = toggleStageTimer(running, 1500)
        expect(restoreStageTimer(paused, 90000)).toMatchObject({ stageIndex: 0, remainingMs: 2500, isRunning: false })
    })

    it('rejects invalid stage names, zero/fractional durations, and corrupted cache values', () => {
        for (const invalid of [[], [{ ...stages[0], name: ' ' }], [{ ...stages[0], duration: 0 }], [{ ...stages[0], duration: 1.5 }]]) {
            expect(isValidTimerStages(invalid)).toBe(false)
        }
        const valid = createStageTimerState(stages)
        for (const invalid of [null, {}, { ...valid, stageIndex: 99 }, { ...valid, remainingMs: NaN },
            { ...valid, remainingMs: 0 }, { ...valid, isRunning: true, endAtMs: null }]) {
            expect(restoreStageTimer(invalid, 1000)).toEqual(createStageTimerState())
        }
        expect(isValidTimerStages([{ name: '练习', duration: 3, unit: 'minute' }])).toBe(true)
        expect(stageTimerProgress(createStageTimerState([{ name: '练习', duration: 3, unit: 'minute' }])).totalMs).toBe(180000)
    })

    it('accepts exactly 1–20 stages, 1–60 character names, and integer durations from 1–999 in either unit', () => {
        const stage: TimerStage = { name: '练', duration: 1, unit: 'minute' }
        expect(isValidTimerStages([stage])).toBe(true)
        expect(isValidTimerStages(Array.from({ length: 20 }, () => ({ ...stage })))).toBe(true)
        const tooMany = Array.from({ length: 21 }, () => ({ ...stage }))
        expect(isValidTimerStages(tooMany)).toBe(false)
        expect(restoreStageTimer({ ...createStageTimerState(), stages: tooMany }, 0)).toEqual(createStageTimerState())
        expect(isValidTimerStages([{ ...stage, name: '练'.repeat(60) }])).toBe(true)
        expect(isValidTimerStages([{ ...stage, name: '练'.repeat(61) }])).toBe(false)
        for (const unit of ['minute', 'second'] as const) {
            expect(isValidTimerStages([{ ...stage, unit, duration: 999 }])).toBe(true)
            for (const duration of [-1, 0, 1.5, 1000, Infinity, NaN]) {
                expect(isValidTimerStages([{ ...stage, unit, duration }])).toBe(false)
            }
        }
    })
})
