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

            <div class="tools-timer-card__unit-switch">
                <span class="tools-timer-card__unit-label">当前单位：{{ presetUnitLabel }}</span>
                <button type="button" class="action-button" @click="emit('toggleUnit')">
                    切换为{{ nextPresetUnitLabel }}
                </button>
            </div>

            <div class="tools-timer-card__presets">
                <button
                    v-for="item in presetOptions"
                    :key="item"
                    type="button"
                    class="preset-button"
                    :class="{ 'is-active': item === presetMinutes }"
                    @click="emit('selectPreset', item)"
                >
                    {{ item }} {{ presetUnitLabel }}
                </button>
            </div>

            <div v-if="showCustomMinutes" class="tools-timer-card__custom">
                <div class="tools-timer-card__custom-input" :class="{ 'is-active': isCustomPresetActive }">
                    <span class="tools-timer-card__custom-label">自定义时长</span>
                    <el-input-number
                        v-model="customPresetValue"
                        :min="1"
                        :max="customPresetMax"
                        :step="1"
                        :controls="true"
                        size="large"
                        class="custom-minutes-input"
                        @change="handleCustomPresetChange"
                    />
                    <span class="tools-timer-card__custom-unit">{{ presetUnitLabel }}</span>
                </div>
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
import { computed, ref, watch } from "vue";

defineOptions({ name: "ToolsTimerCard" })

/** 定义计时器卡片属性。 */
interface ToolsTimerCardProps {
    displayTime: string
    isRunning: boolean
    presetMinutes: number
    presetOptions: number[]
    presetUnit: "minute" | "second"
    presetUnitLabel: string
    showCustomMinutes?: boolean
    showOpenPageAction?: boolean
    statusLabel: string
    statusToneClass: string
}

const props = withDefaults(defineProps<ToolsTimerCardProps>(), {
    showCustomMinutes: true,
    showOpenPageAction: true
})

const emit = defineEmits<{
    (e: "openTimer"): void
    (e: "reset"): void
    (e: "selectPreset", minutes: number): void
    (e: "toggleUnit"): void
    (e: "toggle"): void
}>()

const customPresetValue = ref<number>(props.presetMinutes)

/** 判断当前是否正在使用自定义时长。 */
const isCustomPresetActive = computed<boolean>(() => {
    return !props.presetOptions.includes(props.presetMinutes)
        && props.presetMinutes === Math.max(1, Math.floor(customPresetValue.value))
})

/** 返回切换后的单位文案。 */
const nextPresetUnitLabel = computed<string>(() => {
    return props.presetUnit === "second" ? "分钟" : "秒"
})

/** 返回自定义时长输入上限。 */
const customPresetMax = computed<number>(() => {
    return props.presetUnit === "second" ? 3600 : 180
})

/** 同步自定义时长输入值。 */
watch(() => props.presetMinutes, (value) => {
    customPresetValue.value = value
}, { immediate: true })

/** 应用当前输入的自定义时长。 */
function handleCustomPresetChange(): void {
    emit("selectPreset", Math.max(1, Math.floor(customPresetValue.value)))
}
</script>

<style scoped>
.tools-timer-card__content,
.tools-timer-card__unit-switch,
.tools-timer-card__presets,
.tools-timer-card__custom,
.tools-timer-card__custom-input {
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

.tools-timer-card__unit-switch {
    align-items: center;
    justify-content: center;
}

.tools-timer-card__unit-label {
    color: #475467;
    font-size: 14px;
    font-weight: 700;
}

.tools-timer-card__custom {
    align-items: center;
    justify-content: center;
}

.tools-timer-card__custom-input {
    align-items: center;
    justify-content: center;
    padding: 12px 14px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.72);
}

.tools-timer-card__custom-input.is-active {
    border-color: rgba(85, 104, 255, 0.22);
    background: rgba(85, 104, 255, 0.08);
}

.tools-timer-card__custom-label,
.tools-timer-card__custom-unit {
    color: #475467;
    font-size: 14px;
    font-weight: 700;
}

.custom-minutes-input {
    width: 132px;
}

.custom-minutes-input :deep(.el-input-number) {
    width: 100%;
}

.custom-minutes-input :deep(.el-input__wrapper) {
    border-radius: 14px;
    box-shadow: 0 0 0 1px rgba(122, 141, 198, 0.18) inset;
}

.custom-minutes-input :deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px rgba(85, 104, 255, 0.42) inset;
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

    .tools-timer-card__custom-input {
        width: 100%;
        justify-content: space-between;
    }

    .custom-minutes-input {
        flex: 1;
        width: auto;
        min-width: 120px;
    }

    .preset-button,
    .action-button {
        width: 100%;
    }
}
</style>
