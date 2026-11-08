<template>
    <AppDialogShell
        v-model="visibleModel"
        title="切换到新学期"
        eyebrow="学期设置"
        description="切换后当前学期会进入历史状态，积分数据仅支持查看，不能继续操作。"
        width="560px"
        height="680px"
        @closed="emit('closed')"
    >
        <div class="dialog-stack">
            <section class="surface-card surface-card--warning">
                <div class="warning-box">
                    <i-ep-warning-filled />
                    <div>
                        <strong>切换后当前学期会进入只读状态</strong>
                        <p>旧学期仍可用于查看历史记录、排行榜与积分结果，但不能继续进行课堂积分操作。</p>
                    </div>
                </div>
            </section>

            <section class="surface-card">
                <div class="settings-form-grid">
                    <label class="field-block">
                        <span class="field-block__label">新学期名称</span>
                        <el-input v-model="nameModel" placeholder="例如：2026年秋季学期" />
                    </label>

                    <label class="field-block">
                        <span class="field-block__label">学生积分处理方式</span>
                        <el-radio-group v-model="clearPointsModel" class="clear-points-group">
                            <el-radio :label="true">清空积分</el-radio>
                            <el-radio :label="false">保留积分</el-radio>
                        </el-radio-group>
                    </label>
                </div>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" :disabled="loading" @click="visibleModel = false">
                    取消
                </button>
                <button type="button" class="primary-button" :disabled="loading" @click="emit('confirm')">
                    {{ loading ? "切换中..." : "确认切换" }}
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";

/** 定义学期切换弹窗属性。 */
interface SettingsNextSemesterDialogProps {
    clearPoints: boolean
    loading: boolean
    modelValue: boolean
    name: string
}

/** 定义学期切换弹窗事件。 */
interface SettingsNextSemesterDialogEmits {
    (event: "closed"): void
    (event: "confirm"): void
    (event: "update:clearPoints", value: boolean): void
    (event: "update:modelValue", value: boolean): void
    (event: "update:name", value: string): void
}

const props = defineProps<SettingsNextSemesterDialogProps>()
const emit = defineEmits<SettingsNextSemesterDialogEmits>()

/** 代理弹窗显示状态。 */
const visibleModel = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value),
})

/** 代理新学期名称输入值。 */
const nameModel = computed({
    get: () => props.name,
    set: (value: string) => emit("update:name", value),
})

/** 代理积分处理方式值。 */
const clearPointsModel = computed({
    get: () => props.clearPoints,
    set: (value: boolean) => emit("update:clearPoints", value),
})
</script>

<style scoped>
.dialog-stack,
.settings-form-grid {
    display: grid;
    gap: 16px;
}

.surface-card {
    padding: 20px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface-solid);
    box-shadow: none;
}

.surface-card--warning {
    background: rgba(245, 158, 11, 0.12);
}

.warning-box {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    color: #9a6700;
}

.warning-box i {
    margin-top: 2px;
    font-size: 19px;
}

.warning-box strong {
    display: block;
    margin-bottom: 4px;
}

.warning-box p {
    margin: 0;
    line-height: 1.7;
}

.field-block {
    display: grid;
    gap: 10px;
}

.field-block__label {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: var(--ta-text-secondary);
}

.clear-points-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.ghost-button,
.primary-button {
    min-height: 46px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: var(--ta-radius-small);
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button {
    border: 1px solid var(--ta-line);
    background: var(--ta-surface-solid);
    color: var(--ta-text);
}

.primary-button {
    background: var(--ta-blue);
    color: #ffffff;
    box-shadow: var(--ta-shadow-1);
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

.dialog-stack :deep(.el-input__wrapper) {
    border-radius: var(--ta-radius-small);
    box-shadow: none;
    border: 1px solid var(--ta-line);
    background: var(--ta-surface-solid);
}

.dialog-stack :deep(.el-input__wrapper.is-focus) {
    border-color: rgba(24, 116, 100, 0.36);
    box-shadow: 0 0 0 4px rgba(24, 116, 100, 0.08);
}

.dialog-stack :deep(.el-radio) {
    margin-right: 0;
}
</style>
