<template>
    <ToolsStandalonePageFrame>
        <section class="tools-timer-page__content">
            <ToolsTimerCard :display-time="timerDisplayTime" :is-running="timerState.isRunning"
                :preset-minutes="timerState.presetMinutes" :preset-options="timerPresetOptions"
                :show-open-page-action="false" :status-label="timerStatusLabel" :status-tone-class="timerStatusToneClass"
                @reset="resetTimer" @select-preset="applyTimerPreset" @toggle="toggleTimer" />
        </section>
    </ToolsStandalonePageFrame>
</template>

<script setup lang="ts">
import ToolsStandalonePageFrame from "@/v3/components/tools/ToolsStandalonePageFrame.vue";
import ToolsTimerCard from "@/v3/components/tools/ToolsTimerCard.vue";
import { useToolsWorkspace } from "@/v3/composables/useToolsWorkspace";

defineOptions({ name: "ToolsTimerPage" })

const {
    applyTimerPreset,
    resetTimer,
    timerDisplayTime,
    timerPresetOptions,
    timerState,
    timerStatusLabel,
    timerStatusToneClass,
    toggleTimer
} = useToolsWorkspace()
</script>

<style scoped>
.tools-timer-page__content {
    height: 100%;
    min-height: 0;
    display: flex;
}

.tools-timer-page__content :deep(.tools-card-panel) {
    flex: 1;
    min-height: 0;
}
</style>
