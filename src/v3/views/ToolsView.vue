<template>
    <div class="tools-view">
        <section class="tools-view__grid">
            <ToolsTimerCard :display-time="timerPreview.displayTime" :is-running="timerPreview.isRunning"
                :mode="timerMode" :show-mode-switch="true" :has-started="timerPreview.hasStarted"
                :completed="timerPreview.completed" :progress="timerPreview.progress"
                :stage-name="stageState.stages[stageState.stageIndex]?.name || ''"
                :stage-index="stageState.stageIndex" :stage-count="stageState.stages.length"
                :preset-minutes="timerState.presetMinutes" :preset-options="timerPresetOptions"
                :preset-unit="timerState.presetUnit" :preset-unit-label="timerPresetUnitLabel" :show-custom-minutes="false"
                :status-label="timerPreview.statusLabel" :status-tone-class="timerPreview.statusToneClass"
                @open-timer="openToolRoute('/tools/timer')" @reset="resetPreviewTimer" @select-preset="applyTimerPreset"
                @toggle="togglePreviewTimer" @toggle-unit="toggleTimerPresetUnit" @select-mode="selectTimerPreviewMode" />

            <ToolsRollCallCard :disabled="students.length === 0" :initials="currentRollCallInitials"
                :student-count="students.length" :student-meta="currentRollCallMeta" :student-name="currentRollCallName"
                @open-roll-call="openToolRoute('/tools/rollcall')" @open-students="openToolRoute('/students')"
                @random="drawRandomStudent" />

            <ToolsLotteryCard :pool-count="lotteryPools.length" :prize-count="activeLotteryPrizeCount"
                :shop-prize-count="shopPrizes.length"
                @open-lottery="openToolRoute('/tools/lottery')" @open-shop="openToolRoute('/shop')" />
        </section>
    </div>
</template>

<script setup lang="ts">
import { useStageTimer, useToolsWorkspace } from "@/v3/composables/useToolsWorkspace";
import ToolsLotteryCard from "@/v3/components/tools/ToolsLotteryCard.vue";
import ToolsRollCallCard from "@/v3/components/tools/ToolsRollCallCard.vue";
import ToolsTimerCard from "@/v3/components/tools/ToolsTimerCard.vue";
import { computed } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "ToolsView" })

const router = useRouter()
const {
    activeLotteryPrizeCount,
    applyTimerPreset,
    currentRollCallInitials,
    currentRollCallMeta,
    currentRollCallName,
    drawRandomStudent,
    lotteryPools,
    resetTimer,
    shopPrizes,
    students,
    timerDisplayTime,
    timerPresetOptions,
    timerPresetUnitLabel,
    timerProgressPercent,
    timerState,
    timerStatusLabel,
    timerStatusToneClass,
    toggleTimerPresetUnit,
    toggleTimer
} = useToolsWorkspace()

const {
    state: stageState,
    timerMode,
    progress: stageProgress,
    displayTime: stageDisplayTime,
    selectTimerMode,
    toggleStages,
    resetStages
} = useStageTimer()

/** 列表卡片与完整页读取同一个当前计时模式。 */
const timerPreview = computed(() => {
    if (timerMode.value === "stages") {
        const completed = stageState.remainingMs === 0
        return {
            displayTime: stageDisplayTime.value,
            isRunning: stageState.isRunning,
            hasStarted: stageState.hasStarted,
            completed,
            progress: stageProgress.value.percent,
            statusLabel: stageState.isRunning ? "计时中" : completed ? "已完成" : stageState.hasStarted ? "已暂停" : "待开始",
            statusToneClass: stageState.isRunning ? "status-chip--green" : completed ? "status-chip--slate" : "status-chip--amber"
        }
    }
    return {
        displayTime: timerDisplayTime.value,
        isRunning: timerState.isRunning,
        hasStarted: timerState.hasStarted,
        completed: timerState.remainingSeconds === 0,
        progress: timerProgressPercent.value,
        statusLabel: timerStatusLabel.value,
        statusToneClass: timerStatusToneClass.value
    }
})

function selectTimerPreviewMode(mode: "single" | "stages"): void {
    if (mode !== timerMode.value) selectTimerMode(mode)
}

function togglePreviewTimer(): void {
    if (timerMode.value === "stages") toggleStages()
    else toggleTimer()
}

function resetPreviewTimer(): void {
    if (timerMode.value === "stages") resetStages()
    else resetTimer()
}

/** 打开指定工具或页面路由。 */
function openToolRoute(path: string): void {
    void router.push(path)
}
</script>

<style scoped>
.tools-view__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    align-items: stretch;
}

@media (max-width: 1180px) {
    .tools-view__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 920px) {
    .tools-view__grid {
        grid-template-columns: 1fr;
    }
}
</style>
