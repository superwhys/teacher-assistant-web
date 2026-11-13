<template>
    <ToolsCardPanel
        eyebrow="点名器"
        title="随机点名"
        :status-label="loading ? '正在加载' : rosterError ? '名单未载入' : `可抽取 ${students.length} 人`"
        status-tone-class="status-chip--rose"
        tone-class="tools-card-panel--rollcall"
    >
        <div class="rollcall-display" aria-live="polite">
            <div class="rollcall-display__avatar">{{ selected?.name.slice(0, 1) || "TA" }}</div>
            <div class="rollcall-display__name">{{ selected?.name || "准备就绪" }}</div>
            <p v-if="rosterError" role="alert">学生名单加载失败，请重新加载。</p>
            <p v-else-if="selected">可用积分 {{ selected.availablePoints }}</p>
            <p v-else>{{ loading ? "正在加载学生名单…" : students.length ? "点击随机点名抽取学生" : "当前班级暂无学生" }}</p>
        </div>

        <div v-if="selected" class="rollcall-score">
            <p v-if="feedback" class="rollcall-score__feedback" role="status">{{ feedback.text }}</p>
            <template v-if="canScore && !feedback?.uncertain">
                <template v-if="!feedback">
                    <button v-for="rule in quickRules" :key="rule.id" type="button" class="action-button"
                        :disabled="applying" @click="applyRule(rule)">
                        {{ rule.name }} {{ rule.sign === 'plus' ? '+' : '−' }}{{ Math.abs(rule.points) }}
                    </button>
                </template>
                <button type="button" class="action-button" :disabled="applying" @click="openSelector">
                    {{ feedback ? "继续评分" : "选择评分规则" }}
                </button>
            </template>
        </div>

        <template #actions>
            <button v-if="rosterError" type="button" class="action-button action-button--primary" @click="loadRoster">重新加载名单</button>
            <button v-else type="button" class="action-button action-button--primary"
                :disabled="!canWrite || !students.length || applying" @click="draw">
                {{ selected ? "点下一位" : "随机点名" }}
            </button>
            <button type="button" class="action-button" @click="emit('openStudents')">查看学生名册</button>
            <button v-if="showOpenPageAction" type="button" class="action-button" @click="emit('openRollCall')">进入完整页</button>
        </template>
    </ToolsCardPanel>
    <StudentsPointsRuleDialog v-if="selectorVisible" v-model="selectorVisible" v-model:tab="selectorTab" :groups="groups"
        :loading="rulesLoading" :error="rulesError" :applying="applying" :target-label="selected?.name"
        @retry="loadRules" @select="applyRule" />
</template>

<script setup lang="ts">
import ToolsCardPanel from "@/v3/components/tools/ToolsCardPanel.vue";
import StudentsPointsRuleDialog from "@/v3/components/students/StudentsPointsRuleDialog.vue";
import { useRollCall } from "@/v3/composables/useRollCall";

defineOptions({ name: "ToolsRollCallCard" })
withDefaults(defineProps<{ showOpenPageAction?: boolean }>(), { showOpenPageAction: true })
const emit = defineEmits<{
    (e: "openRollCall"): void
    (e: "openStudents"): void
}>()
const {
    students, selected, loading, rosterError, canWrite, canScore, groups, quickRules, rulesLoading, rulesError,
    selectorVisible, selectorTab, applying, feedback, loadRoster, loadRules, draw, openSelector, applyRule,
} = useRollCall()
</script>

<style scoped>
.rollcall-display {
    display: grid;
    place-items: center;
    text-align: center;
}

.rollcall-display__avatar {
    width: 94px;
    height: 94px;
    display: grid;
    place-items: center;
    border-radius: var(--ta-radius-large);
    color: #2c6740;
    background: linear-gradient(145deg, #effaf2, #d8efdf);
    font-size: 28px;
    font-weight: 700;
}

.rollcall-display__name {
    margin-top: 13px;
    font-size: 24px;
    font-weight: 700;
}

.rollcall-display p {
    margin: 4px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 13px;
}

.rollcall-score {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
}

.rollcall-score__feedback {
    width: 100%;
    margin: 0;
    text-align: center;
    color: var(--ta-text-secondary);
    font-size: 14px;
}

.rollcall-score .action-button {
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
}

.action-button {
    min-height: 38px;
    padding: 0 13px;
    border: 0;
    border-radius: var(--ta-radius-small);
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
    font-size: 13px;
    font-weight: 620;
    white-space: nowrap;
    cursor: pointer;
}

.action-button--primary {
    color: #ffffff;
    background: var(--ta-blue);
    box-shadow: var(--ta-shadow-1);
}

.action-button:disabled {
    opacity: 0.42;
}
</style>
