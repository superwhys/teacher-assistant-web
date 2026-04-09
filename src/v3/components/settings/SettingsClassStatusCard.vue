<template>
    <article class="panel-surface spotlight-card">
        <div class="panel-head panel-head--stack">
            <div>
                <h3>班级状态概览</h3>
                <p>查看当前班级、当前学期和课堂操作权限。</p>
            </div>
            <span class="status-chip" :class="semesterPermissionToneClass">
                {{ semesterPermissionText }}
            </span>
        </div>

        <div class="class-summary-list">
            <div class="summary-item">
                <span>当前班级</span>
                <strong>{{ currentClassName || "未选择班级" }}</strong>
            </div>
            <div class="summary-item">
                <span>当前学期</span>
                <strong>{{ currentSemesterName || "未设置学期" }}</strong>
            </div>
            <div class="summary-item">
                <span>学期状态</span>
                <strong>{{ semesterStatusText }}</strong>
            </div>
            <div class="summary-item">
                <span>使用建议</span>
                <strong>{{ semesterNoticeText }}</strong>
            </div>
        </div>

        <div class="toolbar compact-toolbar">
            <button
                type="button"
                class="ghost-button ghost-button--small"
                :disabled="!activeClassId || classesLoading"
                @click="emit('open-next-semester')"
            >
                切换到新学期
            </button>
            <button type="button" class="ghost-button ghost-button--small" @click="emit('go-dashboard')">
                返回工作台
            </button>
        </div>
    </article>
</template>

<script setup lang="ts">
/** 定义班级状态卡片属性。 */
interface SettingsClassStatusCardProps {
    activeClassId: number | null
    classesLoading: boolean
    currentClassName: string
    currentSemesterName: string
    semesterNoticeText: string
    semesterPermissionText: string
    semesterPermissionToneClass: string
    semesterStatusText: string
}

/** 定义班级状态卡片事件。 */
interface SettingsClassStatusCardEmits {
    (event: "go-dashboard"): void
    (event: "open-next-semester"): void
}

defineProps<SettingsClassStatusCardProps>()
const emit = defineEmits<SettingsClassStatusCardEmits>()
</script>

<style scoped>
.panel-surface {
    padding: 24px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    backdrop-filter: blur(16px);
}

.spotlight-card {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(245, 247, 255, 0.92));
}

.panel-head,
.toolbar {
    display: flex;
    align-items: center;
}

.panel-head {
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
}

.panel-head--stack {
    align-items: flex-start;
}

.panel-head h3 {
    margin: 0;
    font-size: 24px;
    color: #16213e;
}

.panel-head p {
    margin: 0;
    color: #627099;
    line-height: 1.7;
}

.class-summary-list {
    display: grid;
    gap: 14px;
}

.summary-item {
    padding: 18px;
    border-radius: 24px;
    background: rgba(85, 104, 255, 0.06);
}

.summary-item span {
    display: block;
    font-size: 13px;
    color: #627099;
}

.summary-item strong {
    display: block;
    margin-top: 8px;
    font-size: 18px;
    color: #16213e;
    line-height: 1.5;
}

.toolbar {
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 18px;
}

.compact-toolbar {
    gap: 10px;
}

.status-chip {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(22, 33, 62, 0.06);
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.status-chip--emerald {
    color: #067647;
    background: rgba(18, 185, 129, 0.12);
}

.status-chip--amber {
    color: #b45309;
    background: rgba(245, 158, 11, 0.16);
}

.ghost-button {
    min-height: 46px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(122, 141, 198, 0.24);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button--small {
    min-height: 42px;
    padding: 0 14px;
    border-radius: 14px;
}

.ghost-button:hover {
    transform: translateY(-2px);
}

.ghost-button:disabled {
    opacity: 0.56;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

@media (max-width: 768px) {
    .panel-surface {
        padding: 20px;
        border-radius: 26px;
    }
}
</style>
