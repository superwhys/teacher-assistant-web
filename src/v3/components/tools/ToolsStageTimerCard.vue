<template>
    <ToolsCardPanel eyebrow="多阶段计时" title="课堂流程" :status-label="statusLabel"
        :status-tone-class="isRunning ? 'status-chip--green' : 'status-chip--slate'"
        tone-class="tools-card-panel--timer">
        <div class="stage-timer">
            <div class="stage-timer__current" role="status">
                <span>{{ completed ? "全部阶段已完成" : `第 ${stageIndex + 1} / ${stages.length} 阶段` }}</span>
                <h2>{{ stages[stageIndex]?.name }}</h2>
                <strong class="stage-timer__clock">{{ displayTime }}</strong>
            </div>
            <div class="stage-timer__progress">
                <div>
                    <span>总进度 {{ percent }}%</span>
                    <span>剩余 {{ remainingTime }} / 总时长 {{ totalTime }}</span>
                </div>
                <progress :value="percent" max="100" aria-label="课堂流程总进度" />
            </div>
            <p class="stage-timer__hint">{{ editable ? "按下方顺序自动切换阶段，每段可使用分钟或秒。" : "流程已开始；重置后可编辑阶段。" }}</p>
            <ol class="stage-timer__stages">
                <li v-for="(stage, index) in draftStages" :key="index"
                    :class="{ 'is-current': index === stageIndex && !completed, 'is-done': index < stageIndex || completed }">
                    <span class="stage-timer__number">{{ index + 1 }}</span>
                    <label class="stage-timer__name">
                        <span class="sr-only">第 {{ index + 1 }} 阶段名称</span>
                        <input v-model="stage.name" type="text" maxlength="60" :disabled="!editable" placeholder="阶段名称" />
                    </label>
                    <label class="stage-timer__duration">
                        <span class="sr-only">第 {{ index + 1 }} 阶段时长</span>
                        <input v-model.number="stage.duration" type="number" min="1" max="999" step="1"
                            :disabled="!editable" inputmode="numeric" />
                    </label>
                    <select v-model="stage.unit" :disabled="!editable" :aria-label="`第 ${index + 1} 阶段时长单位`">
                        <option value="minute">分钟</option>
                        <option value="second">秒</option>
                    </select>
                    <button type="button" class="stage-timer__remove" :disabled="!editable || draftStages.length === 1"
                        :aria-label="`删除第 ${index + 1} 阶段`" @click="draftStages.splice(index, 1)">删除</button>
                </li>
            </ol>
            <div v-if="editable" class="stage-timer__edit-actions">
                <button type="button" class="action-button" :disabled="draftStages.length >= 20" @click="addStage">添加阶段</button>
                <button type="button" class="action-button" :disabled="!dirty" @click="saveStages">保存阶段</button>
            </div>
            <p v-if="error" class="stage-timer__error" role="alert">{{ error }}</p>
        </div>
        <template #actions>
            <button type="button" class="action-button action-button--primary" @click="toggle">
                {{ isRunning ? "暂停流程" : completed ? "重新开始" : editable ? (dirty ? "保存并开始" : "开始流程") : "继续流程" }}
            </button>
            <button type="button" class="action-button" @click="reset">重置流程</button>
        </template>
    </ToolsCardPanel>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { isValidTimerStages, type TimerStage } from "@/utils/stageTimer";
import ToolsCardPanel from "@/v3/components/tools/ToolsCardPanel.vue";

const props = defineProps<{
    stages: TimerStage[]
    stageIndex: number
    displayTime: string
    isRunning: boolean
    editable: boolean
    completed: boolean
    percent: number
    remainingTime: string
    totalTime: string
}>()
const emit = defineEmits<{
    (e: "configure", stages: TimerStage[]): void
    (e: "toggle"): void
    (e: "reset"): void
}>()
const draftStages = ref<TimerStage[]>([])
const error = ref("")
const dirty = computed(() => JSON.stringify(draftStages.value) !== JSON.stringify(props.stages))
const statusLabel = computed(() => props.isRunning ? "计时中" : props.completed ? "已完成" : props.editable ? "待开始" : "已暂停")

watch(() => props.stages, stages => {
    draftStages.value = stages.map(stage => ({ ...stage }))
    error.value = ""
}, { immediate: true })

function addStage(): void {
    if (draftStages.value.length >= 20) return
    draftStages.value.push({ name: `阶段 ${draftStages.value.length + 1}`, duration: 3, unit: "minute" })
}

function saveStages(): boolean {
    const stages = draftStages.value.map(stage => ({ ...stage, name: stage.name.trim() }))
    if (!isValidTimerStages(stages)) {
        error.value = "流程需包含 1～20 个阶段，名称为 1～60 个字符，时长为 1～999 的整数（分钟或秒）。"
        return false
    }
    error.value = ""
    emit("configure", stages)
    return true
}

function toggle(): void {
    if (props.editable && !saveStages()) return
    emit("toggle")
}

function reset(): void {
    draftStages.value = props.stages.map(stage => ({ ...stage }))
    error.value = ""
    emit("reset")
}
</script>

<style scoped>
.stage-timer {
    width: 100%;
    display: grid;
    gap: 18px;
}

.stage-timer__current {
    display: grid;
    justify-items: center;
    gap: 10px;
    text-align: center;
}

.stage-timer__current > span, .stage-timer__hint {
    color: var(--ta-text-tertiary);
    font-size: 13px;
}

.stage-timer__current h2 {
    margin: 0;
    font-size: 23px;
    overflow-wrap: anywhere;
}

.stage-timer__clock {
    font-size: clamp(48px, 6vw, 72px);
    line-height: 1;
    font-variant-numeric: tabular-nums;
}

.stage-timer__progress > div {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    color: var(--ta-text-secondary);
    font-size: 12px;
}

.stage-timer__progress progress {
    width: 100%;
    height: 12px;
    accent-color: var(--ta-blue);
}

.stage-timer__hint {
    margin: 0;
}

.stage-timer__stages {
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
    list-style: none;
}

.stage-timer__stages li {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) 76px 72px 44px;
    align-items: center;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--ta-line);
    border-radius: 12px;
}

.stage-timer__stages li.is-current {
    border-color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.stage-timer__stages li.is-done {
    color: var(--ta-text-tertiary);
}

.stage-timer__number {
    text-align: center;
    font-weight: 700;
}

.stage-timer input, .stage-timer select {
    width: 100%;
    min-width: 0;
    height: 38px;
    padding: 0 8px;
    box-sizing: border-box;
    border: 1px solid var(--ta-line-strong);
    border-radius: 8px;
    color: var(--ta-text);
    background: #ffffff;
    font: inherit;
}

.stage-timer input:disabled, .stage-timer select:disabled {
    color: var(--ta-text-secondary);
    background: transparent;
    opacity: 1;
}

.stage-timer__remove {
    min-height: 38px;
    padding: 0;
    border: 0;
    color: #c34242;
    background: transparent;
    cursor: pointer;
}

.stage-timer__remove:disabled {
    opacity: .4;
    cursor: default;
}

.stage-timer__edit-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.stage-timer__error {
    margin: 0;
    color: #c34242;
    font-size: 13px;
}

.stage-timer :focus-visible {
    outline: 2px solid var(--ta-blue);
    outline-offset: 2px;
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
}

@media (max-width: 520px) {
    .stage-timer__stages li {
        grid-template-columns: 24px minmax(0, 1fr) 68px 62px;
        gap: 6px;
    }

    .stage-timer__remove {
        grid-column: 2 / -1;
        justify-self: end;
    }

    .stage-timer__current h2 {
        font-size: 20px;
    }
}
</style>
