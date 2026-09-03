<template>
    <article class="settings-section">
        <div class="settings-section__intro">
            <h3>班级与学期</h3>
            <p>查看当前班级、当前学期和课堂操作权限，也可以在这里修改班级名称。</p>
        </div>
        <div class="settings-section__body">
            <div class="class-summary-list">
                <div class="summary-item"><span>当前班级</span><strong>{{ currentClassName || "未选择班级" }}</strong></div>
                <div class="summary-item"><span>当前学期</span><strong>{{ currentSemesterName || "未设置学期" }}</strong></div>
                <div class="summary-item"><span>学期状态</span><strong>{{ semesterStatusText }}</strong></div>
                <div class="summary-item"><span>课堂权限</span><strong><span class="status-chip"
                            :class="semesterPermissionToneClass">{{ semesterPermissionText }}</span></strong></div>
                <div class="summary-item summary-item--wide"><span>使用建议</span><strong>{{ semesterNoticeText }}</strong></div>
            </div>
            <div class="toolbar compact-toolbar">
                <button type="button" class="ghost-button" :disabled="!activeClassId || classesLoading"
                    @click="emit('open-rename-class')">修改班级名称</button>
                <button type="button" class="ghost-button" :disabled="!activeClassId || classesLoading"
                    @click="emit('open-next-semester')">切换到新学期</button>
                <button type="button" class="ghost-button" @click="emit('go-dashboard')">返回工作台</button>
            </div>
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
    (event: "open-rename-class"): void
}

defineProps<SettingsClassStatusCardProps>()
const emit = defineEmits<SettingsClassStatusCardEmits>()
</script>

<style scoped>
.settings-section {
    padding: 28px 4px;
    display: grid;
    grid-template-columns: minmax(180px, 230px) minmax(0, 1fr);
    gap: clamp(28px, 5vw, 72px);
    border-bottom: 1px solid var(--ta-line);
}

.settings-section:last-child {
    border-bottom: 0;
}

.settings-section__intro h3 {
    margin: 0;
    font-size: 17px;
    letter-spacing: -0.015em;
}

.settings-section__intro p {
    margin: 7px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 12px;
    line-height: 1.6;
}

.settings-section__body {
    min-width: 0;
}

.class-summary-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 28px;
}

.summary-item {
    min-height: 58px;
    padding: 10px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    border-bottom: 1px solid var(--ta-line);
}

.summary-item span {
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.summary-item strong {
    min-width: 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
    text-align: right;
}

.summary-item--wide {
    grid-column: 1 / -1;
}

.status-chip {
    min-height: 26px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: var(--ta-text-secondary);
    background: var(--ta-surface-muted);
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
}

.status-chip--emerald {
    color: #1b7133;
    background: var(--ta-green-soft);
}

.status-chip--amber {
    color: #a53400;
    background: var(--ta-orange-soft);
}

.toolbar {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.ghost-button,
.primary-button {
    min-height: 38px;
    padding: 0 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 620;
    white-space: nowrap;
    cursor: pointer;
}

.ghost-button {
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
}

.primary-button {
    color: #ffffff;
    background: var(--ta-blue);
    box-shadow: 0 5px 14px rgba(0, 122, 255, 0.18);
}

.ghost-button:disabled,
.primary-button:disabled {
    opacity: 0.42;
}

@media (min-width: 1800px) {
    .settings-section {
        grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
        gap: clamp(60px, 5vw, 100px);
    }
}

@media (max-width: 920px) {
    .settings-section {
        grid-template-columns: minmax(150px, 190px) minmax(0, 1fr);
        gap: 28px;
    }
}

@media (max-width: 660px) {
    .settings-section {
        grid-template-columns: 1fr;
        gap: 16px;
        padding-block: 22px;
    }

    .class-summary-list {
        grid-template-columns: 1fr;
    }

    .summary-item--wide {
        grid-column: auto;
    }

    .toolbar {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .toolbar button {
        min-width: 0;
        width: 100%;
        padding-inline: 7px;
        font-size: 11px;
    }
}
</style>
