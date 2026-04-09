<template>
    <AppDialogShell v-model="visible" :title="mode === 'add' ? '新建奖池' : '编辑奖池'" eyebrow="奖池设置"
        description="为当前抽奖器创建或修改奖池名称，方便按课堂场景切换不同奖品集合。" width="480px">
        <div class="lottery-pool-dialog">
            <section class="surface-card">
                <div class="section-head">
                    <div>
                        <h4>奖池信息</h4>
                    </div>
                    <span class="meta-tag">{{ mode === "add" ? "新建奖池" : "编辑奖池" }}</span>
                </div>

                <div class="form-grid">
                    <label class="field-block field-block--full">
                        <span class="field-block__label">奖池名称</span>
                        <el-input v-model="form.name" size="large" placeholder="请输入奖池名称" />
                    </label>
                </div>
            </section>

            <section class="guide-list-card">
                <div class="section-head">
                    <div>
                        <h4>命名建议</h4>
                        <p>可以按“周会抽奖”“课堂奖励”“节日活动”等场景命名，方便老师快速识别和切换。</p>
                    </div>
                </div>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="visible = false">取消</button>
                <div class="dialog-actions__group">
                    <button v-if="mode === 'edit'" type="button" class="danger-button" @click="emit('delete')">
                        删除（暂不支持）
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

defineOptions({ name: "ToolsLotteryPoolDialog" })

/** 定义奖池弹窗模式。 */
type ToolsLotteryPoolDialogMode = "add" | "edit"

/** 定义奖池弹窗表单结构。 */
interface ToolsLotteryPoolDialogForm {
    id: string
    name: string
}

/** 定义奖池弹窗属性。 */
interface ToolsLotteryPoolDialogProps {
    form: ToolsLotteryPoolDialogForm
    mode: ToolsLotteryPoolDialogMode
    modelValue: boolean
}

const props = defineProps<ToolsLotteryPoolDialogProps>()

const emit = defineEmits<{
    (e: "delete"): void
    (e: "save"): void
    (e: "update:modelValue", value: boolean): void
}>()

/** 返回奖池弹窗显示状态。 */
const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})
</script>

<style scoped>
.lottery-pool-dialog {
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
    font-size: 13px;
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
    font-size: 18px;
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
    font-size: 12px;
    font-weight: 700;
}

.dialog-actions,
.dialog-actions__group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.dialog-actions {
    justify-content: space-between;
}

.dialog-actions__group {
    justify-content: flex-end;
}

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

.lottery-pool-dialog :deep(.el-input__wrapper) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.lottery-pool-dialog :deep(.el-input__wrapper.is-focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
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
