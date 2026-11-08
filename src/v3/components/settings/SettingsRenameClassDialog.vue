<template>
    <AppDialogShell
        v-model="visibleModel"
        title="修改班级名称"
        eyebrow="班级设置"
        description="修改后会立即同步到当前班级，不影响学期数据和学生积分。"
        width="560px"
        height="400px"
        @closed="emit('closed')"
    >
        <div class="dialog-stack">
            <section class="surface-card">
                <div class="settings-form-grid">
                    <label class="field-block">
                        <span class="field-block__label">当前班级</span>
                        <strong class="current-class-name">{{ currentClassName || "未选择班级" }}</strong>
                    </label>

                    <label class="field-block">
                        <span class="field-block__label">新班级名称</span>
                        <el-input
                            v-model="nameModel"
                            maxlength="255"
                            placeholder="例如：一年级三班"
                            @keyup.enter="emit('confirm')"
                        />
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
                    {{ loading ? "保存中..." : "确认修改" }}
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";

/** 定义修改班级名称弹窗属性。 */
interface SettingsRenameClassDialogProps {
    currentClassName: string
    loading: boolean
    modelValue: boolean
    name: string
}

/** 定义修改班级名称弹窗事件。 */
interface SettingsRenameClassDialogEmits {
    (event: "closed"): void
    (event: "confirm"): void
    (event: "update:modelValue", value: boolean): void
    (event: "update:name", value: string): void
}

const props = defineProps<SettingsRenameClassDialogProps>()
const emit = defineEmits<SettingsRenameClassDialogEmits>()

/** 代理弹窗显示状态。 */
const visibleModel = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value),
})

/** 代理新班级名称输入值。 */
const nameModel = computed({
    get: () => props.name,
    set: (value: string) => emit("update:name", value),
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

.current-class-name {
    font-size: 21px;
    color: var(--ta-text);
    line-height: 1.4;
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
</style>
