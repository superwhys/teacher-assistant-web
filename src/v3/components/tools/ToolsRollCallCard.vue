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
.rollcall-display__name,
.rollcall-display p {
    margin: 0;
}

.rollcall-display {
    flex: 1;
    min-height: 0;
    padding: 24px;
    border-radius: 28px;
    display: grid;
    place-items: center;
    text-align: center;
    background: rgba(255, 255, 255, 0.72);
}

.rollcall-display__avatar {
    width: 92px;
    height: 92px;
    display: grid;
    place-items: center;
    border-radius: 28px;
    background: linear-gradient(135deg, #ff8f6b, #ff6b81);
    color: #ffffff;
    font-size: 34px;
    font-weight: 900;
}

.rollcall-display__name {
    margin-top: 18px;
    color: #16213e;
    font-size: 34px;
    font-weight: 900;
}

.rollcall-display p {
    margin-top: 10px;
    color: #627099;
    line-height: 1.7;
}

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

.action-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(255, 107, 129, 0.14);
}

.action-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.action-button--primary {
    border: none;
    background: linear-gradient(135deg, #ff8f6b, #ff6b81);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(255, 107, 129, 0.24);
}

@media (max-width: 768px) {
    .rollcall-display {
        min-height: 220px;
    }

    .rollcall-display__name {
        font-size: 28px;
    }

    .action-button {
        width: 100%;
    }
}
</style>
