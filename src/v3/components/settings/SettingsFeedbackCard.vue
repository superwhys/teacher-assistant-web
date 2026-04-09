<template>
    <article class="panel-surface">
        <div class="panel-head panel-head--stack">
            <div>
                <h3>意见反馈</h3>
                <p>提交功能建议、问题反馈或课堂使用中的实际情况。</p>
            </div>
            <span class="status-chip status-chip--slate">在线提交</span>
        </div>

        <div class="settings-form-grid">
            <label class="field-block">
                <span class="field-block__label">反馈内容</span>
                <el-input
                    v-model="feedbackContentModel"
                    type="textarea"
                    :rows="8"
                    resize="none"
                    maxlength="1000"
                    show-word-limit
                    placeholder="例如：希望设置页支持更明显的学期权限提示，或者锁屏页展示当前班级信息。"
                />
            </label>
        </div>

        <div class="toolbar compact-toolbar">
            <button
                type="button"
                class="primary-button primary-button--small"
                :disabled="feedbackSubmitting"
                @click="emit('submit')"
            >
                {{ feedbackSubmitting ? "提交中..." : "提交反馈" }}
            </button>
            <button
                type="button"
                class="ghost-button ghost-button--small"
                :disabled="feedbackSubmitting || !feedbackContent.trim()"
                @click="emit('clear')"
            >
                清空内容
            </button>
        </div>

        <div class="helper-note">
            反馈会通过现有接口提交到后台，建议尽量描述具体场景、期望效果和复现步骤。
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
.panel-surface {
    padding: 24px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    backdrop-filter: blur(16px);
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

.panel-head p,
.helper-note {
    margin: 0;
    color: #627099;
    line-height: 1.7;
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

.status-chip--slate {
    color: #475467;
    background: rgba(71, 84, 103, 0.12);
}

.settings-form-grid {
    display: grid;
    gap: 14px;
}

.field-block {
    display: grid;
    gap: 10px;
}

.field-block__label {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #627099;
}

.toolbar {
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 16px;
}

.compact-toolbar {
    gap: 10px;
}

.helper-note {
    margin-top: 16px;
    padding: 14px 16px;
    border-radius: 20px;
    background: rgba(22, 33, 62, 0.04);
}

.ghost-button,
.primary-button {
    min-height: 46px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 16px;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.24);
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
}

.primary-button {
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.26);
}

.ghost-button--small,
.primary-button--small {
    min-height: 42px;
    padding: 0 14px;
    border-radius: 14px;
}

.ghost-button:hover,
.primary-button:hover {
    transform: translateY(-2px);
}

.ghost-button:disabled,
.primary-button:disabled {
    opacity: 0.56;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.panel-surface :deep(.el-textarea__inner) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.panel-surface :deep(.el-textarea__inner:focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

@media (max-width: 768px) {
    .panel-surface {
        padding: 20px;
        border-radius: 26px;
    }
}
</style>
