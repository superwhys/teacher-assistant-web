export interface TimerStage {
    name: string
    duration: number
    unit: "minute" | "second"
}

export interface StageTimerState {
    stages: TimerStage[]
    stageIndex: number
    remainingMs: number
    endAtMs: number | null
    hasStarted: boolean
    isRunning: boolean
}

export function timerStageDurationMs(stage: TimerStage): number {
    return stage.duration * (stage.unit === "minute" ? 60000 : 1000)
}

export function createStageTimerState(stages: TimerStage[] = [
    { name: "独立思考", duration: 3, unit: "minute" },
    { name: "小组讨论", duration: 5, unit: "minute" },
    { name: "分享展示", duration: 8, unit: "minute" }
]): StageTimerState {
    return {
        stages: stages.map(stage => ({ ...stage })),
        stageIndex: 0,
        remainingMs: timerStageDurationMs(stages[0]!),
        endAtMs: null,
        hasStarted: false,
        isRunning: false
    }
}

export function isValidTimerStages(stages: unknown): stages is TimerStage[] {
    return Array.isArray(stages) && stages.length > 0 && stages.length <= 20 && stages.every(stage => {
        if (!stage || typeof stage !== "object") return false
        const { name, duration, unit } = stage
        return typeof name === "string" && name.trim().length > 0 && name.length <= 60
            && (unit === "minute" || unit === "second")
            && Number.isSafeInteger(duration) && duration >= 1
            && duration <= 999
    })
}

/** Keep subsequent deadlines anchored to the previous deadline, including after a long background gap. */
export function syncStageTimer(state: StageTimerState, now: number): StageTimerState {
    if (!state.isRunning || state.endAtMs === null) return { ...state }

    let stageIndex = state.stageIndex
    let endAtMs = state.endAtMs
    while (now >= endAtMs) {
        if (stageIndex === state.stages.length - 1) {
            return { ...state, stageIndex, remainingMs: 0, endAtMs: null, isRunning: false }
        }
        stageIndex += 1
        endAtMs += timerStageDurationMs(state.stages[stageIndex]!)
    }
    return { ...state, stageIndex, endAtMs, remainingMs: endAtMs - now }
}

export function toggleStageTimer(state: StageTimerState, now: number): StageTimerState {
    if (state.isRunning) {
        const synced = syncStageTimer(state, now)
        return { ...synced, endAtMs: null, isRunning: false }
    }
    const ready = state.remainingMs > 0 ? state : createStageTimerState(state.stages)
    return { ...ready, endAtMs: now + ready.remainingMs, hasStarted: true, isRunning: true }
}

export function stageTimerProgress(state: StageTimerState): { totalMs: number, remainingMs: number, percent: number } {
    const totalMs = state.stages.reduce((total, stage) => total + timerStageDurationMs(stage), 0)
    const remainingMs = state.remainingMs + state.stages.slice(state.stageIndex + 1)
        .reduce((total, stage) => total + timerStageDurationMs(stage), 0)
    return { totalMs, remainingMs, percent: Math.round((1 - remainingMs / totalMs) * 100) }
}

/** Invalid caches must never produce NaN durations or a running timer without a deadline. */
export function restoreStageTimer(value: unknown, now: number): StageTimerState {
    if (!value || typeof value !== "object") return createStageTimerState()
    const saved = value as Partial<StageTimerState>
    if (!isValidTimerStages(saved.stages)
        || !Number.isInteger(saved.stageIndex) || saved.stageIndex! < 0 || saved.stageIndex! >= saved.stages.length
        || typeof saved.remainingMs !== "number" || !Number.isFinite(saved.remainingMs)
        || saved.remainingMs < 0 || saved.remainingMs > timerStageDurationMs(saved.stages[saved.stageIndex!]!)
        || (!saved.isRunning && saved.remainingMs === 0 && saved.stageIndex !== saved.stages.length - 1)
        || (saved.hasStarted !== undefined && typeof saved.hasStarted !== "boolean")
        || typeof saved.isRunning !== "boolean"
        || (saved.isRunning && (typeof saved.endAtMs !== "number" || !Number.isFinite(saved.endAtMs)))) {
        return createStageTimerState()
    }
    const state: StageTimerState = {
        stages: saved.stages.map(stage => ({ ...stage })),
        stageIndex: saved.stageIndex!,
        remainingMs: saved.remainingMs,
        endAtMs: saved.isRunning ? saved.endAtMs! : null,
        hasStarted: saved.hasStarted ?? (saved.isRunning || saved.stageIndex! > 0
            || saved.remainingMs < timerStageDurationMs(saved.stages[saved.stageIndex!]!)),
        isRunning: saved.isRunning
    }
    const synced = syncStageTimer(state, now)
    if (synced.remainingMs > timerStageDurationMs(synced.stages[synced.stageIndex]!)) return createStageTimerState(state.stages)
    return synced
}
