<template>
    <div class="tools-view">
        <section class="tools-view__grid">
            <ToolsTimerCard :display-time="timerDisplayTime" :is-running="timerState.isRunning"
                :preset-minutes="timerState.presetMinutes" :preset-options="timerPresetOptions"
                :preset-unit="timerState.presetUnit" :preset-unit-label="timerPresetUnitLabel" :show-custom-minutes="false"
                :status-label="timerStatusLabel" :status-tone-class="timerStatusToneClass"
                @open-timer="openToolRoute('/tools/timer')" @reset="resetTimer" @select-preset="applyTimerPreset"
                @toggle="toggleTimer" @toggle-unit="toggleTimerPresetUnit" />

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
import { useToolsWorkspace } from "@/v3/composables/useToolsWorkspace";
import ToolsLotteryCard from "@/v3/components/tools/ToolsLotteryCard.vue";
import ToolsRollCallCard from "@/v3/components/tools/ToolsRollCallCard.vue";
import ToolsTimerCard from "@/v3/components/tools/ToolsTimerCard.vue";
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
    timerState,
    timerStatusLabel,
    timerStatusToneClass,
    toggleTimerPresetUnit,
    toggleTimer
} = useToolsWorkspace()

/** 打开指定工具或页面路由。 */
function openToolRoute(path: string): void {
    void router.push(path)
}
</script>

<style scoped>
.tools-view {
    display: grid;
    gap: 20px;
}

.tools-view__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
    align-items: stretch;
}

@media (max-width: 1280px) {
    .tools-view__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 1080px) {
    .tools-view__grid {
        grid-template-columns: 1fr;
    }
}
</style>
