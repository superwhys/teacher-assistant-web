<template>
    <AppDialogShell
        v-model="visible"
        :title="mode === 'create' ? '新增规则组' : '编辑规则组'"
        eyebrow="规则管理"
        description="规则组用于归类课堂中的常用加减分场景，例如课堂表现、作业表现、小组合作等。"
        width="560px"
    >
        <section class="dialog-surface-card">
            <div class="dialog-form dialog-form--points">
                <label class="field-block">
                    <span class="field-label">规则组名称</span>
                    <el-input v-model="formName" size="large" placeholder="例如：课堂表现" />
                </label>
            </div>
        </section>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" :disabled="loading" @click="visible = false">
                    取消
                </button>
                <button type="button" class="primary-button" :disabled="loading" @click="handleSave">
                    {{ loading ? "保存中..." : "保存规则组" }}
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import AppDialogShell from "@/v3/components/AppDialogShell.vue";
import { computed, ref, watch } from "vue";

defineOptions({ name: "PointsRuleGroupDialog" })

/** 定义规则组弹窗属性。 */
interface PointsRuleGroupDialogProps {
    initialName: string
    loading: boolean
    mode: "create" | "edit"
    modelValue: boolean
}

const props = defineProps<PointsRuleGroupDialogProps>()

const emit = defineEmits<{
    (e: "save", value: string): void
    (e: "update:modelValue", value: boolean): void
}>()

const formName = ref("")

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

/** 在弹窗打开时同步当前规则组名称。 */
function syncFormState(): void {
    formName.value = props.initialName
}

/** 提交当前规则组名称。 */
function handleSave(): void {
    emit("save", formName.value)
}

watch(() => props.modelValue, (value) => {
    if (value) {
        syncFormState()
    }
})
</script>

<style scoped>
.dialog-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
}

.field-block,
.dialog-form {
    display: grid;
    gap: 18px;
}

.field-label {
    display: block;
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.dialog-surface-card {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.ghost-button,
.primary-button {
    min-height: 44px;
    padding: 0 16px;
    border: none;
    border-radius: 16px;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button:hover,
.primary-button:hover {
    transform: translateY(-2px);
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
}

.primary-button {
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.26);
}

.ghost-button:disabled,
.primary-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
}

.dialog-surface-card :deep(.el-input__wrapper) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.dialog-surface-card :deep(.el-input__wrapper.is-focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

@media (max-width: 768px) {
    .dialog-actions {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
