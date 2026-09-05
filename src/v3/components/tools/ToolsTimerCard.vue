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
                <label class="tools-timer-card__custom-input" :class="{ 'is-active': isCustomPresetActive }">
                    <span class="tools-timer-card__custom-label">自定义时长</span>
                    <span class="tools-timer-card__custom-stepper">
                        <button type="button" class="custom-stepper__button" aria-label="减少自定义时长"
                            @click="adjustCustomPreset(-1)">
                            <i-ep-minus />
                        </button>
                        <span class="custom-stepper__value">
                            <input v-model.number="customPresetValue" type="number" :min="1" :max="customPresetMax"
                                inputmode="numeric" aria-label="自定义时长" @change="handleCustomPresetChange"
                                @blur="handleCustomPresetChange" @keyup.enter="handleCustomPresetChange">
                            <span>{{ presetUnitLabel }}</span>
                        </span>
                        <button type="button" class="custom-stepper__button" aria-label="增加自定义时长"
                            @click="adjustCustomPreset(1)">
                            <i-ep-plus />
                        </button>
                    </span>
                </label>
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
    const normalizedValue = Math.min(
        customPresetMax.value,
        Math.max(1, Math.floor(Number(customPresetValue.value) || 1))
    )
    customPresetValue.value = normalizedValue
    emit("selectPreset", normalizedValue)
}

/** 按固定步长调整自定义时长。 */
function adjustCustomPreset(delta: number): void {
    customPresetValue.value = Math.min(
        customPresetMax.value,
        Math.max(1, customPresetValue.value + delta)
    )
    handleCustomPresetChange()
}
</script>

<style scoped>
.tools-timer-card__content {
    width: 100%;
    display: grid;
    justify-items: center;
}

.tools-timer-card__display {
    font-size: clamp(43px, 5vw, 67px);
    font-weight: 650;
    line-height: 1;
    letter-spacing: -0.055em;
    font-variant-numeric: tabular-nums;
}

.tools-timer-card__unit-switch {
    margin-top: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex-wrap: wrap;
}

.tools-timer-card__unit-label {
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.tools-timer-card__presets {
    margin-top: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex-wrap: wrap;
}

.tools-timer-card__custom {
    width: 100%;
    margin-top: 18px;
    display: grid;
    place-items: center;
}

.tools-timer-card__custom-input {
    width: min(220px, 100%);
    display: grid;
    justify-items: center;
    gap: 6px;
}

.tools-timer-card__custom-label {
    width: 100%;
    color: var(--ta-text-secondary);
    font-size: 12px;
    font-weight: 600;
    text-align: center;
}

.tools-timer-card__custom-stepper {
    width: 100%;
    justify-self: center;
    min-height: 44px;
    padding: 4px;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) 36px;
    align-items: center;
    gap: 4px;
    border-radius: 12px;
    background: #e9e9ed;
    transition: box-shadow 140ms ease, background-color 140ms ease;
}

.tools-timer-card__custom-stepper:focus-within,
.tools-timer-card__custom-input.is-active .tools-timer-card__custom-stepper {
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1), inset 0 0 0 1px rgba(0, 122, 255, 0.45);
}

.custom-stepper__button {
    width: 36px;
    height: 36px;
    padding: 0;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 9px;
    color: var(--ta-text-secondary);
    background: rgba(255, 255, 255, 0.72);
    cursor: pointer;
    transition: color 140ms ease, background-color 140ms ease, transform 100ms ease;
}

.custom-stepper__button:hover {
    color: var(--ta-blue);
    background: #ffffff;
}

.custom-stepper__button:active {
    transform: scale(0.94);
}

.custom-stepper__button svg {
    width: 15px;
    height: 15px;
}

.custom-stepper__value {
    min-width: 0;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
    color: var(--ta-text);
}

.custom-stepper__value input {
    width: 48px;
    padding: 0;
    border: 0;
    color: inherit;
    background: transparent;
    font-size: 16px;
    font-weight: 650;
    line-height: 1;
    text-align: right;
    outline: 0;
    appearance: textfield;
}

.custom-stepper__value input::-webkit-inner-spin-button,
.custom-stepper__value input::-webkit-outer-spin-button {
    margin: 0;
    appearance: none;
}

.custom-stepper__value span {
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.preset-button,
.action-button {
    min-height: 38px;
    padding: 0 13px;
    border: 0;
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
    font-size: 13px;
    font-weight: 620;
    white-space: nowrap;
    cursor: pointer;
}

.preset-button {
    min-height: 32px;
    padding-inline: 10px;
    font-size: 12px;
}

.preset-button.is-active {
    color: #0065d1;
    background: #eaf4ff;
    box-shadow: inset 0 0 0 1px rgba(0, 122, 255, 0.18);
}

.action-button--primary {
    color: #ffffff;
    background: var(--ta-blue);
    box-shadow: 0 5px 14px rgba(0, 122, 255, 0.18);
}
</style>
