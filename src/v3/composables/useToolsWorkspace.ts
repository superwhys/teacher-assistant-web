import { useBusinessAccess } from "@/composables/useBusinessAccess";
import { mallApi } from "@/api/mall";
import { lotteryManager, type UiLotteryPool } from "@/managers/lottery";
import { useCacheStore } from "@/stores/cacheStore";
import type { Prize } from "@/types/mall";
import {
    createStageTimerState, isValidTimerStages, restoreStageTimer, stageTimerProgress,
    syncStageTimer, toggleStageTimer as toggleStageTimerState, type TimerStage
} from "@/utils/stageTimer";
import { ElMessage } from "element-plus";
import { computed, effectScope, reactive, ref, watch } from "vue";

/** 定义计时器时长单位。 */
type TimerPresetUnit = "minute" | "second"

/** 定义计时器状态结构。 */
interface TimerState {
    intervalId: number | null
    endAtMs: number | null
    hasStarted: boolean
    isRunning: boolean
    presetMinutes: number
    presetUnit: TimerPresetUnit
    remainingSeconds: number
}

/** 定义计时器本地缓存结构。 */
interface PersistedTimerState {
    endAtMs: number | null
    hasStarted: boolean
    isRunning: boolean
    presetMinutes: number
    presetUnit: TimerPresetUnit
    remainingSeconds: number
}

const TOOLS_TIMER_STORAGE_KEY = "teacher-assistant:v3:tools:timer"

/** 创建默认计时器状态。 */
function createDefaultTimerState(): TimerState {
    return {
        endAtMs: null,
        intervalId: null,
        hasStarted: false,
        isRunning: false,
        presetMinutes: 15,
        presetUnit: "minute",
        remainingSeconds: 15 * 60
    }
}

const timerPresetOptions = [5, 10, 15, 20]
const timerFinishedReminderVisible = ref(false)

/** 判断当前环境是否可使用本地缓存。 */
function canUseLocalStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

/** 将时长值与单位转换为秒数。 */
function resolvePresetSeconds(value: number, unit: TimerPresetUnit): number {
    const safeValue = Math.max(1, Math.floor(value))
    return unit === "second" ? safeValue : safeValue * 60
}

/** 规范化计时器时长单位。 */
function normalizeTimerPresetUnit(value: unknown): TimerPresetUnit {
    return value === "second" ? "second" : "minute"
}

/** 计算剩余秒数。 */
function calculateRemainingSeconds(endAtMs: number): number {
    return Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000))
}

/** 读取本地缓存中的计时器状态。 */
function loadPersistedTimerState(): TimerState {
    const defaultState = createDefaultTimerState()
    if (!canUseLocalStorage()) {
        return defaultState
    }

    try {
        const rawValue = window.localStorage.getItem(TOOLS_TIMER_STORAGE_KEY)
        if (!rawValue) {
            return defaultState
        }

        const parsedState = JSON.parse(rawValue) as Partial<PersistedTimerState>
        if (parsedState.hasStarted !== undefined && typeof parsedState.hasStarted !== "boolean") {
            return defaultState
        }
        const presetMinutes = Math.max(1, Math.floor(Number(parsedState.presetMinutes ?? defaultState.presetMinutes)))
        const presetUnit = normalizeTimerPresetUnit(parsedState.presetUnit)
        const isRunning = Boolean(parsedState.isRunning)
        const endAtMs = typeof parsedState.endAtMs === "number" ? parsedState.endAtMs : null
        const fallbackRemainingSeconds = Math.max(
            0,
            Math.floor(Number(parsedState.remainingSeconds ?? resolvePresetSeconds(presetMinutes, presetUnit)))
        )
        const remainingSeconds = isRunning && endAtMs
            ? calculateRemainingSeconds(endAtMs)
            : fallbackRemainingSeconds

        return {
            endAtMs: isRunning && remainingSeconds > 0 ? endAtMs : null,
            intervalId: null,
            hasStarted: parsedState.hasStarted ?? (isRunning || remainingSeconds < resolvePresetSeconds(presetMinutes, presetUnit)),
            isRunning: isRunning && remainingSeconds > 0,
            presetMinutes,
            presetUnit,
            remainingSeconds: isRunning && remainingSeconds <= 0 ? 0 : remainingSeconds
        }
    } catch (error) {
        console.error("读取计时器缓存失败", error)
        return defaultState
    }
}

const sharedTimerState = reactive<TimerState>(loadPersistedTimerState())

/** 持久化共享计时器状态。 */
function persistSharedTimerState(): void {
    if (!canUseLocalStorage()) {
        return
    }

    const persistedState: PersistedTimerState = {
        endAtMs: sharedTimerState.endAtMs,
        hasStarted: sharedTimerState.hasStarted,
        isRunning: sharedTimerState.isRunning,
        presetMinutes: sharedTimerState.presetMinutes,
        presetUnit: sharedTimerState.presetUnit,
        remainingSeconds: sharedTimerState.remainingSeconds
    }

    try {
        window.localStorage.setItem(TOOLS_TIMER_STORAGE_KEY, JSON.stringify(persistedState))
    } catch (error) {
        console.error("保存计时器缓存失败", error)
    }
}

/** 关闭计时结束提醒弹窗。 */
function dismissTimerFinishedReminder(): void {
    timerFinishedReminderVisible.value = false
}

/** 同步共享计时器剩余秒数。 */
function syncSharedTimerRemainingSeconds(): void {
    if (!sharedTimerState.isRunning || !sharedTimerState.endAtMs) {
        return
    }

    sharedTimerState.remainingSeconds = calculateRemainingSeconds(sharedTimerState.endAtMs)
}

/** 停止共享计时器的滴答任务。 */
function stopSharedTimerTick(): void {
    if (sharedTimerState.intervalId !== null) {
        window.clearInterval(sharedTimerState.intervalId)
        sharedTimerState.intervalId = null
    }

    if (sharedTimerState.isRunning) {
        syncSharedTimerRemainingSeconds()
    }

    sharedTimerState.endAtMs = null
    sharedTimerState.isRunning = false
    persistSharedTimerState()
}

/** 完成共享计时器并同步结束状态。 */
function finishSharedTimer(): void {
    if (sharedTimerState.intervalId !== null) {
        window.clearInterval(sharedTimerState.intervalId)
        sharedTimerState.intervalId = null
    }

    sharedTimerState.endAtMs = null
    sharedTimerState.isRunning = false
    sharedTimerState.remainingSeconds = 0
    timerFinishedReminderVisible.value = true
    persistSharedTimerState()
}

/** 启动共享计时器的滴答任务。 */
function startSharedTimerTick(): void {
    if (!sharedTimerState.isRunning || sharedTimerState.remainingSeconds <= 0 || !sharedTimerState.endAtMs) {
        return
    }

    if (sharedTimerState.intervalId !== null) {
        return
    }

    sharedTimerState.intervalId = window.setInterval(() => {
        syncSharedTimerRemainingSeconds()

        if (sharedTimerState.remainingSeconds <= 0) {
            finishSharedTimer()
            ElMessage.success("计时结束")
            return
        }

        persistSharedTimerState()
    }, 250)
}

/** 应用共享计时器的预设时长。 */
function applySharedTimerPreset(minutes: number): void {
    selectTimerMode("single")
    const safeMinutes = Math.max(1, Math.floor(minutes))
    dismissTimerFinishedReminder()
    stopSharedTimerTick()
    sharedTimerState.presetMinutes = safeMinutes
    sharedTimerState.remainingSeconds = resolvePresetSeconds(safeMinutes, sharedTimerState.presetUnit)
    sharedTimerState.hasStarted = false
    persistSharedTimerState()
}

/** 切换共享计时器的时长单位。 */
function toggleSharedTimerPresetUnit(): void {
    selectTimerMode("single")
    const nextPresetUnit: TimerPresetUnit = sharedTimerState.presetUnit === "minute" ? "second" : "minute"
    dismissTimerFinishedReminder()
    stopSharedTimerTick()
    sharedTimerState.presetUnit = nextPresetUnit
    sharedTimerState.remainingSeconds = resolvePresetSeconds(sharedTimerState.presetMinutes, nextPresetUnit)
    sharedTimerState.hasStarted = false
    persistSharedTimerState()
}

/** 切换共享计时器的运行状态。 */
function toggleSharedTimer(): void {
    selectTimerMode("single")
    if (sharedTimerState.isRunning) {
        stopSharedTimerTick()
        return
    }

    if (sharedTimerState.remainingSeconds <= 0) {
        sharedTimerState.remainingSeconds = resolvePresetSeconds(sharedTimerState.presetMinutes, sharedTimerState.presetUnit)
    }

    dismissTimerFinishedReminder()
    sharedTimerState.endAtMs = Date.now() + (sharedTimerState.remainingSeconds * 1000)
    sharedTimerState.hasStarted = true
    sharedTimerState.isRunning = true
    persistSharedTimerState()
    startSharedTimerTick()
}

/** 将共享计时器重置为当前预设时长。 */
function resetSharedTimer(): void {
    applySharedTimerPreset(sharedTimerState.presetMinutes)
}

/** 恢复共享计时器的运行状态。 */
function resumeSharedTimer(): void {
    if (!sharedTimerState.isRunning || !sharedTimerState.endAtMs) {
        return
    }

    syncSharedTimerRemainingSeconds()
    if (sharedTimerState.remainingSeconds <= 0) {
        finishSharedTimer()
        return
    }

    persistSharedTimerState()
    startSharedTimerTick()
}

const TOOLS_STAGE_TIMER_STORAGE_KEY = "teacher-assistant:v3:tools:stage-timer"

/** 读取阶段流程，同时保留上次选择的计时模式。 */
function loadPersistedStageTimer() {
    try {
        const raw = canUseLocalStorage() ? window.localStorage.getItem(TOOLS_STAGE_TIMER_STORAGE_KEY) : null
        const saved = raw ? JSON.parse(raw) as { state?: unknown, mode?: unknown } : null
        return {
            state: restoreStageTimer(saved?.state, Date.now()),
            mode: saved?.mode === "stages" ? "stages" as const : "single" as const
        }
    } catch (error) {
        console.error("读取多阶段计时缓存失败", error)
        return { state: createStageTimerState(), mode: "single" as const }
    }
}

const restoredStageTimer = loadPersistedStageTimer()
const sharedStageTimerState = reactive(restoredStageTimer.state)
const timerMode = ref<"single" | "stages">(restoredStageTimer.mode)
let stageTimerIntervalId: number | null = null

function persistStageTimer(): void {
    try {
        if (canUseLocalStorage()) {
            window.localStorage.setItem(TOOLS_STAGE_TIMER_STORAGE_KEY, JSON.stringify({
                state: sharedStageTimerState,
                mode: timerMode.value
            }))
        }
    } catch (error) {
        console.error("保存多阶段计时缓存失败", error)
    }
}

function stopStageTimerTick(): void {
    if (stageTimerIntervalId !== null) {
        window.clearInterval(stageTimerIntervalId)
        stageTimerIntervalId = null
    }
}

/** 根据实际截止时间推进流程，而非累计 interval 次数。 */
function syncSharedStageTimer(): void {
    if (!sharedStageTimerState.isRunning) return
    const previousStageIndex = sharedStageTimerState.stageIndex
    const next = syncStageTimer(sharedStageTimerState, Date.now())
    Object.assign(sharedStageTimerState, next)
    if (!next.isRunning) {
        stopStageTimerTick()
        ElMessage.success("全部阶段已完成")
    }
    if (!next.isRunning || next.stageIndex !== previousStageIndex) persistStageTimer()
}

function startStageTimerTick(): void {
    if (typeof window === "undefined" || stageTimerIntervalId !== null || !sharedStageTimerState.isRunning) return
    stageTimerIntervalId = window.setInterval(syncSharedStageTimer, 250)
}

function pauseStageTimer(): void {
    syncSharedStageTimer()
    sharedStageTimerState.isRunning = false
    sharedStageTimerState.endAtMs = null
    stopStageTimerTick()
    persistStageTimer()
}

/** 两种模式共享同一个课堂计时入口，切换时暂停原模式。 */
function selectTimerMode(mode: "single" | "stages"): void {
    if (mode === "stages") stopSharedTimerTick()
    else pauseStageTimer()
    timerMode.value = mode
    persistStageTimer()
}

let timerAccess: ReturnType<typeof useBusinessAccess> | null = null
const timerAccessScope = effectScope(true)

/** 共享计时器跨页面运行，商业权益监听也由模块统一持有。 */
function ensureTimerAccess() {
    if (timerAccess) return timerAccess
    timerAccess = useBusinessAccess()
    const access = timerAccess
    timerAccessScope.run(() => {
        watch(access.canWrite, (allowed) => {
            if (!allowed) {
                stopSharedTimerTick()
                pauseStageTimer()
                return
            }
            if (timerMode.value === "stages") {
                stopSharedTimerTick()
                startStageTimerTick()
            } else {
                pauseStageTimer()
                resumeSharedTimer()
            }
        }, { immediate: true, flush: "sync" })
    })
    return access
}

if (typeof window !== "undefined") {
    // 模块级共享计时器在路由切换后继续运行；页面重新可见时立即校准。
    document.addEventListener("visibilitychange", syncSharedStageTimer)
    window.addEventListener("pageshow", syncSharedStageTimer)
}

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        timerAccessScope.stop()
        stopStageTimerTick()
        if (sharedTimerState.intervalId !== null) window.clearInterval(sharedTimerState.intervalId)
        document.removeEventListener("visibilitychange", syncSharedStageTimer)
        window.removeEventListener("pageshow", syncSharedStageTimer)
    })
}

export function useStageTimer() {
    const access = ensureTimerAccess()
    const state = sharedStageTimerState
    const progress = computed(() => stageTimerProgress(state))
    const editable = computed(() => access.canWrite.value && !state.isRunning && !state.hasStarted)

    function configureStages(stages: TimerStage[]): void {
        if (!access.allowWrite()) return
        if (!editable.value || !isValidTimerStages(stages)) return
        Object.assign(state, createStageTimerState(stages))
        persistStageTimer()
    }

    function toggleStages(): void {
        if (!access.allowWrite()) return
        if (!state.isRunning) selectTimerMode("stages")
        Object.assign(state, toggleStageTimerState(state, Date.now()))
        if (state.isRunning) startStageTimerTick()
        else stopStageTimerTick()
        persistStageTimer()
    }

    function resetStages(): void {
        if (!access.allowWrite()) return
        stopStageTimerTick()
        Object.assign(state, createStageTimerState(state.stages))
        persistStageTimer()
    }

    return {
        configureStages,
        editable,
        progress,
        resetStages,
        selectTimerMode: (mode: "single" | "stages") => {
            if (access.allowWrite()) selectTimerMode(mode)
        },
        state,
        timerMode,
        toggleStages,
        displayTime: computed(() => formatDisplayTime(Math.ceil(state.remainingMs / 1000))),
        totalTime: computed(() => formatDisplayTime(Math.ceil(progress.value.totalMs / 1000))),
        remainingTime: computed(() => formatDisplayTime(Math.ceil(progress.value.remainingMs / 1000)))
    }
}

/** 将秒数格式化为计时器展示文案。 */
function formatDisplayTime(totalSeconds: number): string {
    const safeSeconds = Math.max(0, totalSeconds)
    const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0")
    const seconds = String(safeSeconds % 60).padStart(2, "0")
    return `${minutes}:${seconds}`
}

/** 提供课堂计时器的共享状态与交互。 */
export function useSharedTimer() {
    const access = ensureTimerAccess()
    const timerState = sharedTimerState

    /** 返回计时器展示文案。 */
    const timerDisplayTime = computed<string>(() => formatDisplayTime(timerState.remainingSeconds))

    /** 返回计时器状态文案。 */
    const timerStatusLabel = computed<string>(() => {
        if (timerState.isRunning) {
            return "计时中"
        }

        if (timerState.remainingSeconds <= 0) {
            return "已结束"
        }

        return timerState.hasStarted ? "已暂停" : "待开始"
    })

    /** 返回计时器状态色值类名。 */
    const timerStatusToneClass = computed<string>(() => {
        if (timerState.isRunning) {
            return "status-chip--green"
        }

        if (timerState.remainingSeconds <= 0) {
            return "status-chip--slate"
        }

        return "status-chip--amber"
    })

    /** 返回当前计时已进行的进度百分比。 */
    const timerProgressPercent = computed<number>(() => {
        const totalSeconds = Math.max(1, resolvePresetSeconds(timerState.presetMinutes, timerState.presetUnit))
        const elapsedSeconds = Math.min(totalSeconds, Math.max(0, totalSeconds - timerState.remainingSeconds))
        return Math.round((elapsedSeconds / totalSeconds) * 100)
    })

    /** 返回当前计时器使用的单位文案。 */
    const timerPresetUnitLabel = computed<string>(() => {
        return timerState.presetUnit === "second" ? "秒" : "分钟"
    })

    /** 返回计时结束提醒弹窗是否可见。 */
    const timerFinishedDialogVisible = computed<boolean>({
        get: () => timerFinishedReminderVisible.value,
        set: (value: boolean) => {
            if (!value) {
                dismissTimerFinishedReminder()
            }
        }
    })

    /** 应用新的计时器预设时长。 */
    function applyTimerPreset(minutes: number): void {
        if (!access.allowWrite()) return
        applySharedTimerPreset(minutes)
    }

    /** 切换计时器运行状态。 */
    function toggleTimer(): void {
        if (!access.allowWrite()) return
        toggleSharedTimer()
    }

    /** 重置当前计时器到预设时长。 */
    function resetTimer(): void {
        if (!access.allowWrite()) return
        resetSharedTimer()
    }

    /** 切换当前计时器的单位。 */
    function toggleTimerPresetUnit(): void {
        if (!access.allowWrite()) return
        toggleSharedTimerPresetUnit()
    }

    /** 关闭计时结束提醒弹窗。 */
    function closeTimerFinishedDialog(): void {
        dismissTimerFinishedReminder()
    }

    return {
        applyTimerPreset,
        closeTimerFinishedDialog,
        resetTimer,
        timerDisplayTime,
        timerFinishedDialogVisible,
        timerPresetOptions,
        timerPresetUnitLabel,
        timerProgressPercent,
        timerState,
        timerStatusLabel,
        timerStatusToneClass,
        toggleTimerPresetUnit,
        toggleTimer
    }
}

/** 提供课堂工具工作区的共享状态与交互。 */
export function useToolsWorkspace() {
    const cacheStore = useCacheStore()

    const shopPrizes = ref<Prize[]>([])
    const lotteryPools = ref<UiLotteryPool[]>([])
    const isDataLoading = ref(false)
    const {
        applyTimerPreset,
        resetTimer,
        timerDisplayTime,
        timerPresetOptions,
        timerPresetUnitLabel,
        timerProgressPercent,
        timerState,
        timerStatusLabel,
        timerStatusToneClass,
        toggleTimerPresetUnit,
        toggleTimer
    } = useSharedTimer()

    const activeClassId = computed<number | null>(() => cacheStore.getActiveClassId())
    const activeSemesterId = computed<number | null>(() => cacheStore.getActiveSemesterId())

    /** 返回启用中的抽奖奖品数量。 */
    const activeLotteryPrizeCount = computed<number>(() => {
        return lotteryPools.value.reduce((total, pool) => {
            return total + pool.prizes.filter((item) => item.enabled && item.weight > 0).length
        }, 0)
    })

    /** 加载课堂工具页所需的业务数据。 */
    async function loadToolsPageData(): Promise<void> {
        if (isDataLoading.value) {
            return
        }

        isDataLoading.value = true
        try {
            const [shopResp, poolList] = await Promise.all([
                mallApi.listPrizes(),
                lotteryManager.listPools()
            ])

            shopPrizes.value = shopResp.data?.items ?? []
            lotteryPools.value = poolList
        } catch (error) {
            console.error("加载课堂工具页数据失败", error)
            ElMessage.error("加载课堂工具数据失败")
        } finally {
            isDataLoading.value = false
        }
    }

    watch([activeClassId, activeSemesterId], async () => {
        await loadToolsPageData()
    }, { immediate: true })

    return {
        activeLotteryPrizeCount,
        applyTimerPreset,
        lotteryPools,
        resetTimer,
        shopPrizes,
        timerDisplayTime,
        timerPresetOptions,
        timerPresetUnitLabel,
        timerProgressPercent,
        timerState,
        timerStatusLabel,
        timerStatusToneClass,
        toggleTimerPresetUnit,
        toggleTimer
    }
}
