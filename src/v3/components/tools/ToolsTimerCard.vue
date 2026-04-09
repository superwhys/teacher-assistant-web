<template>
    <ToolsCardPanel
        eyebrow="计时器"
        title="课堂倒计时"
        :status-label="statusLabel"
        :status-tone-class="statusToneClass"
        tone-class="tools-card-panel--timer"
    >
        <div class="tools-timer-card__content">
            <div class="tools-timer-card__display">{{ displayTime }}</div>

            <div class="tools-timer-card__presets">
                <button
                    v-for="item in presetOptions"
                    :key="item"
                    type="button"
                    class="preset-button"
                    :class="{ 'is-active': item === presetMinutes }"
                    @click="emit('selectPreset', item)"
                >
                    {{ item }} 分钟
                </button>
            </div>
        </div>

        <template #actions>
            <button type="button" class="action-button action-button--primary" @click="emit('toggle')">
                {{ isRunning ? "暂停计时" : "开始计时" }}
            </button>
            <button type="button" class="action-button" @click="emit('reset')">
                重置
            </button>
            <button v-if="showOpenPageAction" type="button" class="action-button" @click="emit('openTimer')">
                进入完整页
            </button>
        </template>
    </ToolsCardPanel>
</template>

<script setup lang="ts">
import ToolsCardPanel from "@/v3/components/tools/ToolsCardPanel.vue";

defineOptions({ name: "ToolsTimerCard" })

/** 定义计时器卡片属性。 */
interface ToolsTimerCardProps {
    displayTime: string
    isRunning: boolean
    presetMinutes: number
    presetOptions: number[]
    showOpenPageAction?: boolean
    statusLabel: string
    statusToneClass: string
}

withDefaults(defineProps<ToolsTimerCardProps>(), {
    showOpenPageAction: true
})

const emit = defineEmits<{
    (e: "openTimer"): void
    (e: "reset"): void
    (e: "selectPreset", minutes: number): void
    (e: "toggle"): void
}>()
</script>

<style scoped>
.tools-timer-card__content,
.tools-timer-card__presets {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.tools-timer-card__content {
    flex: 1;
    flex-direction: column;
    justify-content: center;
    align-content: center;
}

.tools-timer-card__display {
    margin: 0;
    color: #16213e;
    font-size: clamp(52px, 6vw, 84px);
    font-weight: 900;
    text-align: center;
    letter-spacing: 0.04em;
}

.tools-timer-card__presets {
    justify-content: center;
}

.preset-button,
.action-button {
    min-height: 46px;
    padding: 0 16px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.preset-button:hover,
.action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(85, 104, 255, 0.12);
}

.preset-button.is-active {
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
    border-color: rgba(85, 104, 255, 0.22);
}

.action-button--primary {
    border: none;
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.24);
}

@media (max-width: 768px) {
    .tools-timer-card__display {
        font-size: 52px;
    }

    .preset-button,
    .action-button {
        width: 100%;
    }
}
</style>
