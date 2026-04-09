<template>
    <AppDialogShell
        v-model="visible"
        title="从商城导入奖品"
        eyebrow="商城同步"
        description="可以直接选择商城中的奖品导入当前奖池，并按固定权重或库存自动生成抽奖权重。"
        width="760px"
    >
        <div
            v-loading="loading"
            class="lottery-import-dialog"
            element-loading-text="正在加载商城奖品..."
            element-loading-background="rgba(255, 255, 255, 0.68)"
        >
            <section class="surface-card">
                <div class="section-head">
                    <div>
                        <h4>导入设置</h4>
                        <p>选择导入权重的生成方式，再勾选需要同步到当前奖池的商城奖品。</p>
                    </div>
                    <span class="meta-tag">已选 {{ selectionCount }} 项</span>
                </div>

                <div class="field-block">
                    <span class="field-block__label">权重策略</span>
                    <div class="mode-switch">
                        <button
                            type="button"
                            class="mode-switch__button"
                            :class="{ 'is-active': selectedWeightStrategy === 'fixed' }"
                            @click="selectedWeightStrategy = 'fixed'"
                        >
                            权重 = 1
                        </button>
                        <button
                            type="button"
                            class="mode-switch__button"
                            :class="{ 'is-active': selectedWeightStrategy === 'stock' }"
                            @click="selectedWeightStrategy = 'stock'"
                        >
                            权重 = 库存
                        </button>
                    </div>
                </div>
            </section>

            <section class="guide-list-card">
                <div class="section-head">
                    <div>
                        <h4>导入说明</h4>
                        <p>可追加到现有奖池，也可覆盖当前奖池中的全部奖品。</p>
                    </div>
                </div>

                <ul class="guide-list">
                    <li>使用 `权重 = 1` 时，所有导入奖品的抽中概率一致。</li>
                    <li>使用 `权重 = 库存` 时，库存越高的奖品抽中概率越高。</li>
                    <li>覆盖导入会替换当前奖池中的已有奖品，请谨慎操作。</li>
                </ul>
            </section>

            <section class="surface-card surface-card--nested">
                <div class="section-head">
                    <div>
                        <h4>商城奖品列表</h4>
                        <p>支持从商城中多选奖品导入，便于快速搭建课堂抽奖池。</p>
                    </div>
                </div>

                <el-table
                    :data="items"
                    class="v3-table"
                    max-height="360"
                    @selection-change="handleSelectionChange"
                >
                    <el-table-column type="selection" width="60" />
                    <el-table-column label="商品" prop="name" min-width="160" />
                    <el-table-column label="库存" prop="stock" width="100" align="center" />
                    <el-table-column label="积分" prop="points" width="100" align="center" />
                    <el-table-column label="描述" prop="description" min-width="200" show-overflow-tooltip />
                </el-table>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="visible = false">取消</button>
                <div class="dialog-actions__group">
                    <button
                        type="button"
                        class="ghost-button"
                        :disabled="selectionCount === 0"
                        @click="emit('confirm', false)"
                    >
                        追加导入
                    </button>
                    <button
                        type="button"
                        class="danger-button"
                        :disabled="selectionCount === 0"
                        @click="emit('confirm', true)"
                    >
                        覆盖现有
                    </button>
                </div>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ShopItem } from "@/types/shopItem";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";

defineOptions({ name: "ToolsLotteryImportDialog" })

/** 定义导入权重策略类型。 */
type ToolsLotteryImportWeightStrategy = "fixed" | "stock"

/** 定义商城导入弹窗属性。 */
interface ToolsLotteryImportDialogProps {
    items: ShopItem[]
    loading: boolean
    modelValue: boolean
    selectionCount: number
    weightStrategy: ToolsLotteryImportWeightStrategy
}

const props = defineProps<ToolsLotteryImportDialogProps>()

const emit = defineEmits<{
    (e: "confirm", overwrite: boolean): void
    (e: "selectionChange", rows: ShopItem[]): void
    (e: "update:modelValue", value: boolean): void
    (e: "update:weightStrategy", value: ToolsLotteryImportWeightStrategy): void
}>()

/** 返回导入弹窗显示状态。 */
const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

/** 返回支持双向绑定的导入权重策略。 */
const selectedWeightStrategy = computed<ToolsLotteryImportWeightStrategy>({
    get: () => props.weightStrategy,
    set: (value) => emit("update:weightStrategy", value)
})

/** 处理导入表格的勾选变化。 */
function handleSelectionChange(rows: ShopItem[]): void {
    emit("selectionChange", rows)
}
</script>

<style scoped>
.lottery-import-dialog {
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

.surface-card--nested {
    min-height: 0;
}

.guide-list-card {
    padding: 18px 20px;
    border-radius: 22px;
    background: rgba(85, 104, 255, 0.06);
}

.field-block {
    display: grid;
    gap: 10px;
}

.field-block__label {
    display: block;
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.mode-switch,
.section-head,
.dialog-actions,
.dialog-actions__group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.mode-switch {
    flex-wrap: wrap;
}

.section-head,
.dialog-actions {
    justify-content: space-between;
}

.dialog-actions__group {
    justify-content: flex-end;
}

.section-head {
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

.guide-list {
    margin: 0;
    padding-left: 18px;
    color: #627099;
    line-height: 1.9;
}

.v3-table :deep(.el-table) {
    border-radius: 18px;
    overflow: hidden;
    --el-table-border-color: rgba(122, 141, 198, 0.16);
    --el-table-header-bg-color: rgba(85, 104, 255, 0.08);
    --el-table-row-hover-bg-color: rgba(85, 104, 255, 0.06);
}

.mode-switch__button,
.ghost-button,
.danger-button {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 16px;
    border: none;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.mode-switch__button {
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
}

.mode-switch__button.is-active {
    border-color: rgba(85, 104, 255, 0.24);
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
}

.mode-switch__button:hover,
.ghost-button:hover,
.danger-button:hover {
    transform: translateY(-2px);
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
}

.danger-button {
    background: rgba(239, 68, 68, 0.12);
    color: #d92d20;
}

.ghost-button:disabled,
.danger-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
}

@media (max-width: 768px) {
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
