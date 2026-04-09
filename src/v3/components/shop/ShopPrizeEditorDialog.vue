<template>
    <AppDialogShell
        v-model="visible"
        :eyebrow="mode === 'add' ? '新增奖品' : '编辑奖品'"
        :title="mode === 'add' ? '配置新的课堂奖励商品' : '更新当前商品信息'"
        description="支持设置商品名称、所需积分、库存和展示图标，方便在大屏和移动端统一呈现。"
        width="720px"
    >
        <div class="editor-layout">
            <section class="editor-form">
                <el-form :model="form" label-position="top">
                    <el-form-item label="商品名称" required>
                        <el-input v-model="form.name" placeholder="例如：免作业券" />
                    </el-form-item>

                    <div class="editor-form__grid">
                        <el-form-item label="兑换积分" required>
                            <el-input-number v-model="form.points" :min="1" :step="10" style="width: 100%;" />
                        </el-form-item>

                        <el-form-item label="库存数量" required>
                            <el-input-number v-model="form.stock" :min="mode === 'add' ? 1 : 0" style="width: 100%;" />
                        </el-form-item>
                    </div>

                    <el-form-item label="商品图标">
                        <el-select v-model="form.icon" placeholder="请选择图标" style="width: 100%;">
                            <el-option
                                v-for="option in shopIconOptions"
                                :key="option.value"
                                :label="option.label"
                                :value="option.value"
                            >
                                <div class="icon-option">
                                    <component :is="option.icon" />
                                    <span>{{ option.label }}</span>
                                </div>
                            </el-option>
                        </el-select>
                    </el-form-item>

                    <el-form-item label="商品描述">
                        <el-input
                            v-model="form.description"
                            type="textarea"
                            :rows="4"
                            placeholder="例如：可用于奖励课堂表现优异的同学。"
                        />
                    </el-form-item>
                </el-form>
            </section>

            <aside class="editor-preview">
                <div class="editor-preview__visual" :class="visualClass">
                    <component :is="iconComponent" />
                    <span>{{ previewName }}</span>
                </div>

                <div class="editor-preview__meta">
                    <strong>{{ previewName }}</strong>
                    <p>{{ previewDescription }}</p>
                </div>

                <div class="editor-preview__summary">
                    <div>
                        <span>兑换积分</span>
                        <strong>{{ previewPoints }}</strong>
                    </div>
                    <div>
                        <span>当前库存</span>
                        <strong>{{ previewStock }}</strong>
                    </div>
                </div>
            </aside>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <button type="button" class="dialog-button" @click="visible = false">
                    取消
                </button>
                <button type="button" class="dialog-button dialog-button--primary" @click="emit('save')">
                    {{ mode === "add" ? "创建商品" : "保存修改" }}
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { computed } from "vue"
import AppDialogShell from "@/v3/components/AppDialogShell.vue"
import { getShopIconComponent, getShopVisualClass, shopIconOptions } from "@/v3/components/shop/shopIcons"

defineOptions({ name: "ShopPrizeEditorDialog" })

/** 定义商品编辑弹窗模式。 */
type ShopPrizeEditorMode = "add" | "edit"

/** 定义商品编辑表单结构。 */
interface ShopPrizeEditorForm {
    description: string
    icon: string
    id: number
    name: string
    points: number
    stock: number
}

/** 定义商品编辑弹窗属性。 */
interface ShopPrizeEditorDialogProps {
    form: ShopPrizeEditorForm
    mode: ShopPrizeEditorMode
    modelValue: boolean
}

const props = defineProps<ShopPrizeEditorDialogProps>()

const emit = defineEmits<{
    (e: "save"): void
    (e: "update:modelValue", value: boolean): void
}>()

/** 返回弹窗显示状态。 */
const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value),
})

/** 返回商品预览名称。 */
const previewName = computed<string>(() => props.form.name.trim() || "课堂奖励")

/** 返回商品预览描述。 */
const previewDescription = computed<string>(() => props.form.description.trim() || "这里会展示商品说明，帮助老师在课堂上快速介绍奖品内容。")

/** 返回商品预览积分。 */
const previewPoints = computed<number>(() => normalizePositiveNumber(props.form.points))

/** 返回商品预览库存。 */
const previewStock = computed<number>(() => normalizePositiveNumber(props.form.stock, true))

/** 返回商品预览图标。 */
const iconComponent = computed(() => getShopIconComponent(props.form.icon))

/** 返回商品预览背景样式。 */
const visualClass = computed<string>(() => getShopVisualClass(props.form.icon))

/** 规范化正整数展示值。 */
function normalizePositiveNumber(value: number, allowZero = false): number {
    const safeValue = Number.isFinite(value) ? value : 0
    if (allowZero) {
        return Math.max(0, safeValue)
    }

    return Math.max(1, safeValue)
}
</script>

<style scoped>
.editor-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
    gap: 18px;
}

.editor-form,
.editor-preview {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.14);
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.72);
}

.editor-form__grid,
.editor-preview__summary,
.dialog-footer,
.icon-option {
    display: flex;
    gap: 12px;
}

.editor-form__grid > * {
    flex: 1;
}

.icon-option {
    align-items: center;
}

.editor-preview {
    display: grid;
    gap: 16px;
    align-content: start;
    background:
        radial-gradient(circle at top right, rgba(142, 108, 255, 0.14), transparent 28%),
        rgba(255, 255, 255, 0.82);
}

.editor-preview__visual {
    height: 180px;
    border-radius: 24px;
    display: grid;
    place-items: center;
    gap: 10px;
    color: #ffffff;
}

.editor-preview__visual :deep(svg) {
    width: 34px;
    height: 34px;
}

.editor-preview__visual span {
    font-size: 26px;
    font-weight: 800;
    text-align: center;
}

.shop-card__visual--violet {
    background: linear-gradient(135deg, #8e6cff, #5568ff);
}

.shop-card__visual--emerald {
    background: linear-gradient(135deg, #12b981, #14b8a6);
}

.shop-card__visual--gold {
    background: linear-gradient(135deg, #f59e0b, #f97316);
}

.shop-card__visual--sunset {
    background: linear-gradient(135deg, #ff8f6b, #ff6b81);
}

.shop-card__visual--indigo {
    background: linear-gradient(135deg, #5568ff, #7c8cff);
}

.shop-card__visual--cyan {
    background: linear-gradient(135deg, #06b6d4, #3b82f6);
}

.editor-preview__meta strong,
.editor-preview__meta p,
.editor-preview__summary span,
.editor-preview__summary strong {
    margin: 0;
}

.editor-preview__meta strong {
    display: block;
    color: #16213e;
    font-size: 22px;
}

.editor-preview__meta p {
    margin-top: 8px;
    color: #627099;
    line-height: 1.7;
}

.editor-preview__summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.editor-preview__summary > div {
    padding: 18px;
    border-radius: 22px;
    background: rgba(22, 33, 62, 0.05);
}

.editor-preview__summary span {
    display: block;
    color: #627099;
    font-size: 13px;
}

.editor-preview__summary strong {
    display: block;
    margin-top: 8px;
    color: #16213e;
    font-size: 24px;
}

.dialog-footer {
    justify-content: flex-end;
}

.dialog-button {
    min-height: 46px;
    padding: 0 18px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.dialog-button--primary {
    border: none;
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
}

@media (max-width: 768px) {
    .editor-layout {
        grid-template-columns: 1fr;
    }

    .editor-form,
    .editor-preview {
        padding: 16px;
    }

    .editor-form__grid,
    .editor-preview__summary,
    .dialog-footer {
        grid-template-columns: 1fr;
        flex-direction: column;
    }

    .dialog-button {
        width: 100%;
    }
}
</style>
