<template>
    <AppDialogShell
        v-model="visible"
        :title="mode === 'create' ? '新增积分项' : '编辑积分项'"
        eyebrow="规则管理"
        description="积分项会直接用于单项榜与课堂积分操作。"
        width="620px"
    >
        <section class="dialog-surface-card">
            <div class="dialog-form dialog-form--points">
                <label class="field-block">
                    <span class="field-label">积分项名称</span>
                    <el-input v-model="form.name" size="large" placeholder="例如：主动发言" />
                </label>

                <div class="dialog-form__row">
                    <label class="field-block">
                        <span class="field-label">分值</span>
                        <el-input-number v-model="form.points" size="large" :min="1" :max="99" :step="1" class="field-full" />
                    </label>

                    <div class="field-block">
                        <span class="field-label">类型</span>
                        <div class="points-sign-switch">
                            <button
                                type="button"
                                class="points-sign-switch__button points-sign-switch__button--plus"
                                :class="{ 'is-active': form.sign === 'plus' }"
                                @click="form.sign = 'plus'"
                            >
                                加分
                            </button>
                            <button
                                type="button"
                                class="points-sign-switch__button points-sign-switch__button--minus"
                                :class="{ 'is-active': form.sign === 'minus' }"
                                @click="form.sign = 'minus'"
                            >
                                扣分
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" :disabled="loading" @click="visible = false">
                    取消
                </button>
                <button type="button" class="primary-button" :disabled="loading" @click="handleSave">
                    {{ loading ? "保存中..." : "保存积分项" }}
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import AppDialogShell from "@/v3/components/AppDialogShell.vue";
import { computed, reactive, watch } from "vue";

defineOptions({ name: "PointsRuleItemDialog" })

/** 定义积分项表单数据。 */
interface PointsRuleItemDialogForm {
    name: string
    points: number
    sign: "plus" | "minus"
}

/** 定义积分项弹窗属性。 */
interface PointsRuleItemDialogProps {
    initialValue: PointsRuleItemDialogForm
    loading: boolean
    mode: "create" | "edit"
    modelValue: boolean
}

const props = defineProps<PointsRuleItemDialogProps>()

const emit = defineEmits<{
    (e: "save", value: PointsRuleItemDialogForm): void
    (e: "update:modelValue", value: boolean): void
}>()

const form = reactive<PointsRuleItemDialogForm>({
    name: "",
    points: 1,
    sign: "plus"
})

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

/** 在弹窗打开时同步当前积分项表单。 */
function syncFormState(): void {
    form.name = props.initialValue.name
    form.points = props.initialValue.points
    form.sign = props.initialValue.sign
}

/** 提交当前积分项表单。 */
function handleSave(): void {
    emit("save", {
        name: form.name,
        points: form.points,
        sign: form.sign
    })
}

watch(() => props.modelValue, (value) => {
    if (value) {
        syncFormState()
    }
})
</script>

<style scoped>
.dialog-actions,
.dialog-form__row {
    display: flex;
    align-items: center;
}

.dialog-actions {
    justify-content: space-between;
    gap: 16px;
}

.dialog-form__row {
    gap: 16px;
    align-items: flex-start;
}

.field-block,
.dialog-form {
    display: grid;
    gap: 10px;
}

.dialog-form--points {
    gap: 18px;
}

.field-full {
    width: 100%;
}

.field-label {
    display: block;
    color: #627099;
    font-size: 14px;
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

.dialog-form__row > .field-block {
    flex: 1;
}

.points-sign-switch {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.ghost-button,
.primary-button,
.points-sign-switch__button {
    border: none;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button,
.primary-button {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 16px;
}

.ghost-button:hover,
.primary-button:hover,
.points-sign-switch__button:hover {
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

.points-sign-switch__button {
    min-height: 44px;
    padding: 0 18px;
    border: 1px solid rgba(122, 141, 198, 0.22);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
    font-weight: 700;
}

.points-sign-switch__button--plus.is-active {
    border-color: rgba(18, 185, 129, 0.24);
    background: rgba(18, 185, 129, 0.12);
    color: #067647;
}

.points-sign-switch__button--minus.is-active {
    border-color: rgba(239, 68, 68, 0.24);
    background: rgba(239, 68, 68, 0.12);
    color: #d92d20;
}

.ghost-button:disabled,
.primary-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
}

.dialog-surface-card :deep(.el-input__wrapper),
.dialog-surface-card :deep(.el-input-number .el-input__wrapper) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.dialog-surface-card :deep(.el-input__wrapper.is-focus),
.dialog-surface-card :deep(.el-input-number .el-input__wrapper.is-focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

.dialog-surface-card :deep(.el-input-number) {
    width: 100%;
}

@media (max-width: 768px) {
    .dialog-actions,
    .dialog-form__row {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
