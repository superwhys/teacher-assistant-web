<template>
    <AppDialogShell
        v-model="visible"
        eyebrow="商品兑换"
        title="确认课堂奖励兑换"
        description="请先选择兑换学生，再确认数量与所需积分，系统会自动校验库存和可用积分。"
        width="720px"
    >
        <div class="exchange-layout">
            <aside class="exchange-preview">
                <div class="exchange-preview__visual" :class="visualClass">
                    <component :is="iconComponent" />
                    <span>{{ prizeName }}</span>
                </div>

                <div class="exchange-preview__meta">
                    <strong>{{ prizeName }}</strong>
                    <p>{{ prizeDescription }}</p>
                </div>

                <div class="exchange-preview__summary">
                    <div>
                        <span>单件积分</span>
                        <strong>{{ prizePoints }}</strong>
                    </div>
                    <div>
                        <span>剩余库存</span>
                        <strong>{{ prizeStock }}</strong>
                    </div>
                    <div>
                        <span>兑换数量</span>
                        <strong>{{ form.count }}</strong>
                    </div>
                    <div>
                        <span>本次消耗</span>
                        <strong>{{ requiredPoints }}</strong>
                    </div>
                </div>
            </aside>

            <section class="exchange-form">
                <el-form :model="form" label-position="top">
                    <el-form-item label="选择学生" required>
                        <el-select
                            v-model="form.studentId"
                            placeholder="请选择学生"
                            filterable
                            clearable
                            size="large"
                            style="width: 100%;"
                        >
                            <el-option
                                v-for="student in students"
                                :key="student.id"
                                :label="`${student.name}（可用积分：${student.availablePoints}）`"
                                :value="student.id"
                            >
                                <div class="student-option">
                                    <span>{{ student.name }}</span>
                                    <span
                                        class="student-option__points"
                                        :class="{ 'is-insufficient': student.availablePoints < requiredPoints }"
                                    >
                                        可用 {{ student.availablePoints }}
                                    </span>
                                </div>
                            </el-option>
                        </el-select>
                    </el-form-item>

                    <el-form-item label="兑换数量" required>
                        <el-input-number
                            v-model="form.count"
                            :min="1"
                            :max="Math.max(1, maxCount)"
                            style="width: 100%;"
                        />
                    </el-form-item>
                </el-form>

                <div class="exchange-notice">
                    <div class="notice-card">
                        <span>学生可用积分</span>
                        <strong>{{ selectedStudentAvailablePoints }}</strong>
                    </div>
                    <div class="notice-card">
                        <span>是否足够兑换</span>
                        <strong :class="selectedStudentCanExchange ? 'is-enough' : 'is-insufficient'">
                            {{ selectedStudentCanExchange ? "可以兑换" : "积分不足" }}
                        </strong>
                    </div>
                </div>
            </section>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <button type="button" class="dialog-button" @click="visible = false">
                    取消
                </button>
                <button type="button" class="dialog-button dialog-button--primary" @click="emit('confirm')">
                    确认兑换
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { computed } from "vue"
import AppDialogShell from "@/v3/components/AppDialogShell.vue"
import { getShopIconComponent, getShopVisualClass } from "@/v3/components/shop/shopIcons"

defineOptions({ name: "ShopExchangeDialog" })

/** 定义兑换弹窗学生选项结构。 */
interface ShopExchangeStudentOption {
    availablePoints: number
    id: number
    name: string
}

/** 定义兑换弹窗商品结构。 */
interface ShopExchangePrizeInfo {
    description: string
    icon: string
    name: string
    points: number
    stock: number
}

/** 定义兑换弹窗表单结构。 */
interface ShopExchangeForm {
    count: number
    prizeId: number
    studentId: number | null
}

/** 定义兑换弹窗属性。 */
interface ShopExchangeDialogProps {
    availablePointsByStudentId: Record<number, number>
    form: ShopExchangeForm
    maxCount: number
    modelValue: boolean
    prize: ShopExchangePrizeInfo
    requiredPoints: number
    students: ShopExchangeStudentOption[]
}

const props = defineProps<ShopExchangeDialogProps>()

const emit = defineEmits<{
    (e: "confirm"): void
    (e: "update:modelValue", value: boolean): void
}>()

/** 返回弹窗显示状态。 */
const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value),
})

/** 返回当前商品图标组件。 */
const iconComponent = computed(() => getShopIconComponent(props.prize.icon))

/** 返回当前商品渐变背景样式。 */
const visualClass = computed<string>(() => getShopVisualClass(props.prize.icon))

/** 返回当前商品名称。 */
const prizeName = computed<string>(() => props.prize.name.trim() || "课堂奖励")

/** 返回当前商品描述。 */
const prizeDescription = computed<string>(() => props.prize.description.trim() || "兑换后将同步扣减学生可用积分与商品库存。")

/** 返回当前商品单件所需积分。 */
const prizePoints = computed<number>(() => normalizeNumber(props.prize.points))

/** 返回当前商品库存。 */
const prizeStock = computed<number>(() => normalizeNumber(props.prize.stock, true))

/** 返回当前学生可用积分。 */
const selectedStudentAvailablePoints = computed<number>(() => {
    if (!props.form.studentId) {
        return 0
    }

    return normalizeNumber(props.availablePointsByStudentId[props.form.studentId], true)
})

/** 返回当前学生是否满足兑换条件。 */
const selectedStudentCanExchange = computed<boolean>(() => {
    if (!props.form.studentId) {
        return false
    }

    return selectedStudentAvailablePoints.value >= props.requiredPoints
})

/** 规范化数字展示值。 */
function normalizeNumber(value: unknown, allowZero = false): number {
    const parsedValue = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(parsedValue)) {
        return 0
    }

    if (allowZero) {
        return Math.max(0, parsedValue)
    }

    return Math.max(1, parsedValue)
}
</script>

<style scoped>
.exchange-layout {
    display: grid;
    grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1fr);
    gap: 18px;
}

.exchange-preview,
.exchange-form {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.14);
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.74);
}

.exchange-preview {
    display: grid;
    gap: 16px;
    align-content: start;
    background:
        radial-gradient(circle at top right, rgba(85, 104, 255, 0.12), transparent 28%),
        rgba(255, 255, 255, 0.84);
}

.exchange-preview__visual {
    height: 180px;
    border-radius: 24px;
    display: grid;
    place-items: center;
    gap: 10px;
    color: #ffffff;
}

.exchange-preview__visual :deep(svg) {
    width: 34px;
    height: 34px;
}

.exchange-preview__visual span {
    font-size: 26px;
    font-weight: 800;
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

.exchange-preview__meta strong,
.exchange-preview__meta p,
.exchange-preview__summary span,
.exchange-preview__summary strong,
.notice-card span,
.notice-card strong {
    margin: 0;
}

.exchange-preview__meta strong {
    display: block;
    color: #16213e;
    font-size: 22px;
}

.exchange-preview__meta p {
    margin-top: 8px;
    color: #627099;
    line-height: 1.7;
}

.exchange-preview__summary,
.exchange-notice {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.exchange-preview__summary > div,
.notice-card {
    padding: 16px;
    border-radius: 20px;
    background: rgba(22, 33, 62, 0.05);
}

.exchange-preview__summary span,
.notice-card span {
    display: block;
    color: #627099;
    font-size: 13px;
}

.exchange-preview__summary strong,
.notice-card strong {
    display: block;
    margin-top: 8px;
    color: #16213e;
    font-size: 22px;
}

.notice-card strong.is-enough {
    color: #067647;
}

.notice-card strong.is-insufficient {
    color: #d92d20;
}

.exchange-form {
    display: grid;
    gap: 16px;
    align-content: start;
}

.student-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.student-option__points {
    color: #067647;
    font-size: 13px;
    font-weight: 700;
}

.student-option__points.is-insufficient,
.is-insufficient {
    color: #d92d20;
}

.is-enough {
    color: #067647;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
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
    .exchange-layout,
    .exchange-preview__summary,
    .exchange-notice,
    .dialog-footer {
        grid-template-columns: 1fr;
        flex-direction: column;
    }

    .exchange-preview,
    .exchange-form {
        padding: 16px;
    }

    .dialog-button {
        width: 100%;
    }
}
</style>
