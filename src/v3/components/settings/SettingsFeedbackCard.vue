<template>
    <article class="settings-section settings-feedback">
        <div class="settings-section__intro">
            <h3>意见反馈</h3>
            <p>提交功能建议、问题反馈或课堂使用中的实际情况。</p>
            <span class="status-chip status-chip--slate">在线提交</span>
        </div>
        <div class="settings-section__body">
            <label class="field-block">
                <span class="field-block__label">反馈内容</span>
                <el-input v-model="feedbackContentModel" type="textarea" :rows="6" resize="vertical" maxlength="1000"
                    show-word-limit placeholder="例如：希望设置页支持更明显的学期权限提示，或者锁屏页展示当前班级信息。" />
            </label>
            <div class="toolbar compact-toolbar">
                <button type="button" class="primary-button" :disabled="feedbackSubmitting" @click="emit('submit')">
                    {{ feedbackSubmitting ? "提交中..." : "提交反馈" }}
                </button>
                <button type="button" class="ghost-button" :disabled="feedbackSubmitting || !feedbackContent.trim()"
                    @click="emit('clear')">清空内容</button>
            </div>
            <div class="helper-note">建议尽量描述具体场景、期望效果和复现步骤。</div>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed } from "vue";

/** 定义反馈卡片属性。 */
interface SettingsFeedbackCardProps {
    feedbackContent: string
    feedbackSubmitting: boolean
}

/** 定义反馈卡片事件。 */
interface SettingsFeedbackCardEmits {
    (event: "clear"): void
    (event: "submit"): void
    (event: "update:feedbackContent", value: string): void
}

const props = defineProps<SettingsFeedbackCardProps>()
const emit = defineEmits<SettingsFeedbackCardEmits>()

/** 代理反馈输入内容。 */
const feedbackContentModel = computed({
    get: () => props.feedbackContent,
    set: (value: string) => emit("update:feedbackContent", value),
})
</script>

<style scoped>
.settings-section {
    padding: 28px 4px;
    display: grid;
    grid-template-columns: minmax(180px, 230px) minmax(0, 1fr);
    gap: clamp(28px, 5vw, 72px);
}

.settings-section__intro h3 {
    margin: 0;
    font-size: 18px;
    letter-spacing: -0.015em;
}

.settings-section__intro p,
.helper-note {
    color: var(--ta-text-tertiary);
    font-size: 13px;
    line-height: 1.6;
}

.settings-section__intro p {
    margin: 7px 0 0;
}

.settings-section__body {
    min-width: 0;
}

.status-chip {
    min-height: 26px;
    margin-top: 12px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: var(--ta-text-secondary);
    background: var(--ta-surface-muted);
    font-size: 12px;
    font-weight: 600;
}

.field-block {
    display: grid;
    gap: 6px;
}

.field-block__label {
    color: var(--ta-text-secondary);
    font-size: 13px;
    font-weight: 600;
}

.settings-section :deep(.el-textarea__inner) {
    min-height: 150px !important;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.62);
    font-size: 14px;
    line-height: 1.55;
}

.toolbar {
    margin-top: 12px;
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
    font-size: 14px;
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

.helper-note {
    margin-top: 11px;
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
}
</style>
