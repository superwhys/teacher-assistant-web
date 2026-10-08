<template>
    <ToolsStandalonePageFrame>
        <section class="tools-timer-page__content">
            <div class="tools-timer-page__modes" role="group" aria-label="计时模式">
                <button type="button" :aria-pressed="timerMode === 'single'" @click="selectTimerMode('single')">单段计时</button>
                <button type="button" :aria-pressed="timerMode === 'stages'" @click="selectTimerMode('stages')">多阶段计时</button>
            </div>
            <ToolsTimerCard v-if="timerMode === 'single'" :display-time="timerDisplayTime" :is-running="timerState.isRunning"
                :preset-minutes="timerState.presetMinutes" :preset-options="timerPresetOptions"
                :preset-unit="timerState.presetUnit" :preset-unit-label="timerPresetUnitLabel"
                :show-open-page-action="false" :status-label="timerStatusLabel" :status-tone-class="timerStatusToneClass"
                @reset="resetTimer" @select-preset="applyTimerPreset" @toggle="toggleTimer"
                @toggle-unit="toggleTimerPresetUnit" />
            <ToolsStageTimerCard v-else :stages="stageState.stages" :stage-index="stageState.stageIndex"
                :display-time="stageDisplayTime" :is-running="stageState.isRunning" :editable="stageEditable"
                :completed="stageState.remainingMs === 0" :percent="stageProgress.percent"
                :remaining-time="stageRemainingTime" :total-time="stageTotalTime"
                @configure="configureStages" @toggle="toggleStages" @reset="resetStages" />
        </section>
    </ToolsStandalonePageFrame>
</template>

<script setup lang="ts">
import ToolsStandalonePageFrame from "@/v3/components/tools/ToolsStandalonePageFrame.vue";
import ToolsTimerCard from "@/v3/components/tools/ToolsTimerCard.vue";
import ToolsStageTimerCard from "@/v3/components/tools/ToolsStageTimerCard.vue";
import { useSharedTimer, useStageTimer } from "@/v3/composables/useToolsWorkspace";

defineOptions({ name: "ToolsTimerPage" })

const {
    applyTimerPreset,
    resetTimer,
    timerDisplayTime,
    timerPresetOptions,
    timerPresetUnitLabel,
    timerState,
    timerStatusLabel,
    timerStatusToneClass,
    toggleTimerPresetUnit,
    toggleTimer
} = useSharedTimer()
const {
    configureStages,
    editable: stageEditable,
    progress: stageProgress,
    resetStages,
    selectTimerMode,
    state: stageState,
    timerMode,
    toggleStages,
    displayTime: stageDisplayTime,
    totalTime: stageTotalTime,
    remainingTime: stageRemainingTime
} = useStageTimer()
</script>

<style scoped>
.tools-timer-page__content {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.tools-timer-page__modes {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.tools-timer-page__modes button {
    min-height: 40px;
    padding: 0 16px;
    border: 1px solid var(--ta-line-strong);
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: #ffffff;
    font: inherit;
    cursor: pointer;
}

.tools-timer-page__modes button[aria-pressed="true"] {
    color: var(--ta-blue);
    border-color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.tools-timer-page__modes button:focus-visible {
    outline: 2px solid var(--ta-blue);
    outline-offset: 2px;
}
.tools-timer-page__content :deep(.tools-card-panel) {
    flex: 1;
    min-height: 0;
}
</style>
