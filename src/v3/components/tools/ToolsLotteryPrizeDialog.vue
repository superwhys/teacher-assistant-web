<template>
    <AppDialogShell v-model="visible" :title="mode === 'add' ? '添加奖品' : '编辑奖品'" eyebrow="奖品设置"
        description="配置抽奖奖品名称、权重和启用状态，权重越高时被抽中的概率越大。" width="520px">
        <div class="lottery-prize-dialog">
            <section class="surface-card">
                <div class="section-head">
                    <div>
                        <h4>基础配置</h4>
                    </div>
                    <span class="meta-tag">{{ mode === "add" ? "新增奖品" : "编辑奖品" }}</span>
                </div>

                <div class="form-grid">
                    <label class="field-block field-block--full">
                        <span class="field-block__label">奖品名称</span>
                        <el-input v-model="form.name" size="large" placeholder="请输入奖品名称" />
                    </label>

                    <label class="field-block">
                        <span class="field-block__label">权重</span>
                        <el-input-number v-model="form.weight" :min="1" :step="1" size="large" class="weight-input" />
                    </label>

                    <div class="field-block">
                        <span class="field-block__label">启用状态</span>
                        <div class="status-switch">
                            <button type="button" class="status-switch__button" :class="{ 'is-active': form.enabled }"
                                @click="form.enabled = true">
                                启用
                            </button>
                            <button type="button" class="status-switch__button" :class="{ 'is-active': !form.enabled }"
                                @click="form.enabled = false">
                                停用
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section class="guide-list-card">
                <div class="section-head">
                    <div>
                        <h4>使用说明</h4>
                        <p>建议将高价值奖品设置为较低权重，常规奖品设置为中等权重，方便控制课堂抽奖节奏。</p>
                    </div>
                </div>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="visible = false">取消</button>
                <div class="dialog-actions__group">
                    <button v-if="mode === 'edit'" type="button" class="danger-button" @click="emit('delete')">
                        删除
                    </button>
                    <button type="button" class="primary-button" @click="emit('save')">保存</button>
                </div>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";

defineOptions({ name: "ToolsLotteryPrizeDialog" })

/** 定义奖品弹窗模式。 */
type ToolsLotteryPrizeDialogMode = "add" | "edit"

/** 定义奖品弹窗表单结构。 */
interface ToolsLotteryPrizeDialogForm {
    enabled: boolean
    id: string
    name: string
    weight: number
}

/** 定义奖品弹窗属性。 */
interface ToolsLotteryPrizeDialogProps {
    form: ToolsLotteryPrizeDialogForm
    mode: ToolsLotteryPrizeDialogMode
    modelValue: boolean
}

const props = defineProps<ToolsLotteryPrizeDialogProps>()

const emit = defineEmits<{
    (e: "delete"): void
    (e: "save"): void
    (e: "update:modelValue", value: boolean): void
}>()

/** 返回奖品弹窗显示状态。 */
const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})
</script>

<style scoped>
.lottery-prize-dialog {
    display: grid;
    gap: 18px;
}

.surface-card {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.guide-list-card {
    padding: 18px 20px;
    border-radius: 22px;
    background: rgba(85, 104, 255, 0.06);
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
}

.field-block {
    display: grid;
    gap: 10px;
}

.field-block--full {
    grid-column: 1 / -1;
}

.field-block__label {
    display: block;
    color: #627099;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.section-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}

.section-head h4,
.section-head p {
    margin: 0;
}

.section-head h4 {
    color: #16213e;
    font-size: 19px;
}

.section-head p {
    margin-top: 6px;
    color: #627099;
    line-height: 1.7;
}

.meta-tag {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font-size: 13px;
    font-weight: 700;
}

.status-switch,
.dialog-actions,
.dialog-actions__group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.status-switch {
    flex-wrap: wrap;
}

.dialog-actions {
    justify-content: space-between;
}

.dialog-actions__group {
    justify-content: flex-end;
}

.status-switch__button,
.ghost-button,
.primary-button,
.danger-button {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 16px;
    border: none;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.status-switch__button {
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
}

.status-switch__button.is-active {
    border-color: rgba(85, 104, 255, 0.24);
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
}

.status-switch__button:hover,
.ghost-button:hover,
.primary-button:hover,
.danger-button:hover {
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
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.22);
}

.danger-button {
    background: rgba(239, 68, 68, 0.12);
    color: #d92d20;
}

.weight-input,
.weight-input :deep(.el-input-number) {
    width: 100%;
}

.lottery-prize-dialog :deep(.el-input__wrapper),
.lottery-prize-dialog :deep(.el-textarea__inner),
.lottery-prize-dialog :deep(.el-input-number .el-input__wrapper) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.lottery-prize-dialog :deep(.el-input__wrapper.is-focus),
.lottery-prize-dialog :deep(.el-textarea__inner:focus),
.lottery-prize-dialog :deep(.el-input-number .el-input__wrapper.is-focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

.lottery-prize-dialog :deep(.el-input-number .el-input-number__decrease),
.lottery-prize-dialog :deep(.el-input-number .el-input-number__increase) {
    border-color: rgba(122, 141, 198, 0.16);
    background: rgba(85, 104, 255, 0.08);
    color: #5568ff;
}

@media (max-width: 768px) {
    .form-grid {
        grid-template-columns: 1fr;
    }

    .section-head,
    .dialog-actions,
    .dialog-actions__group {
        flex-direction: column;
        align-items: stretch;
    }

    .meta-tag {
        width: fit-content;
    }
}
</style>
