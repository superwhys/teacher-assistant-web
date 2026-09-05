<template>
    <ToolsCardPanel
        eyebrow="点名器"
        title="随机点名"
        :status-label="disabled ? '暂无学生' : `可抽取 ${studentCount} 人`"
        status-tone-class="status-chip--rose"
        tone-class="tools-card-panel--rollcall"
    >
        <div class="rollcall-display">
            <div class="rollcall-display__avatar">{{ initials }}</div>
            <div class="rollcall-display__name">{{ studentName }}</div>
            <p>{{ studentMeta }}</p>
        </div>

        <template #actions>
            <button type="button" class="action-button action-button--primary" :disabled="disabled" @click="emit('random')">
                随机点名
            </button>
            <button type="button" class="action-button" @click="emit('openStudents')">
                查看学生名册
            </button>
            <button v-if="showOpenPageAction" type="button" class="action-button" @click="emit('openRollCall')">
                进入完整页
            </button>
        </template>
    </ToolsCardPanel>
</template>

<script setup lang="ts">
import ToolsCardPanel from "@/v3/components/tools/ToolsCardPanel.vue";

defineOptions({ name: "ToolsRollCallCard" })

/** 定义点名器卡片属性。 */
interface ToolsRollCallCardProps {
    disabled: boolean
    initials: string
    showOpenPageAction?: boolean
    studentCount: number
    studentMeta: string
    studentName: string
}

withDefaults(defineProps<ToolsRollCallCardProps>(), {
    showOpenPageAction: true
})

const emit = defineEmits<{
    (e: "openRollCall"): void
    (e: "openStudents"): void
    (e: "random"): void
}>()
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
    border-radius: 30px;
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

.action-button--primary {
    color: #ffffff;
    background: var(--ta-green);
    box-shadow: 0 5px 14px rgba(36, 138, 61, 0.18);
}

.action-button:disabled {
    opacity: 0.42;
}
</style>
