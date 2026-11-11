<template>
    <AppDialogShell
        v-model="visible"
        eyebrow="商品兑换"
        title="确认课堂奖励兑换"
        description="请先选择兑换学生，再确认数量与所需积分，系统会自动校验库存和可用积分。"
        width="720px"
        :busy="busy"
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
                            v-model="selectedStudentId"
                            placeholder="请选择学生"
                            filterable
                            clearable
                            size="large"
                            style="width: 100%;"
                            :disabled="!canWrite || !canExchange || busy">
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
                            v-model="exchangeCount"
                            :min="1"
                            :max="Math.max(1, maxCount)"
                            style="width: 100%;"
                            :disabled="!canWrite || !canExchange || busy" />
                    </el-form-item>
                </el-form>

                <div class="exchange-notice">
                    <div class="notice-card">
                        <span>学生可用积分</span>
                        <strong>{{ hasSelectedStudent ? selectedStudentAvailablePoints : "—" }}</strong>
                    </div>
                    <div class="notice-card">
                        <span>兑换后剩余</span>
                        <strong :class="{ 'is-enough': remainingPoints !== null && remainingPoints >= 0 }">
                            {{ remainingPoints !== null && remainingPoints >= 0 ? remainingPoints : "—" }}
                        </strong>
                    </div>
                </div>
                <p class="exchange-status" :class="{ 'is-insufficient': hasSelectedStudent && !canConfirmExchange && !busy }"
                    role="status" aria-live="polite">{{ exchangeStatusText }}</p>
                <p v-if="error" class="exchange-error" role="alert">{{ error }}</p>
            </section>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <button type="button" class="dialog-button" :disabled="busy" @click="visible = false">
                    取消
                </button>
                <button type="button" class="dialog-button dialog-button--primary" @click="emit('confirm')"
                    :disabled="!canConfirmExchange" :aria-busy="busy">
                    {{ busy ? "兑换中..." : "确认兑换" }}
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { useBusinessAccess } from "@/composables/useBusinessAccess";
import { computed } from "vue"
import AppDialogShell from "@/v3/components/AppDialogShell.vue"
import { getShopIconComponent, getShopVisualClass } from "@/v3/components/shop/shopIcons"

const { canWrite } = useBusinessAccess()

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
    busy?: boolean
    canExchange?: boolean
    error?: string
}

const props = withDefaults(defineProps<ShopExchangeDialogProps>(), {
    busy: false,
    canExchange: true,
    error: ""
})

const emit = defineEmits<{
    (e: "confirm"): void
    (e: "update:modelValue", value: boolean): void
    (e: "update:studentId", value: number | null): void
    (e: "update:count", value: number): void
}>()

/** 返回弹窗显示状态。 */
const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value),
})

const selectedStudentId = computed({
    get: () => props.form.studentId,
    set: (value: number | null | undefined) => emit("update:studentId", value ?? null)
})

const exchangeCount = computed({
    get: () => props.form.count,
    set: (value: number | undefined) => emit("update:count", value ?? Number.NaN)
})

const hasSelectedStudent = computed(() => props.students.some(student => student.id === props.form.studentId))
const validCount = computed(() => Number.isInteger(props.form.count) && props.form.count > 0
    && props.form.count <= Math.min(prizeStock.value, props.maxCount))

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

const remainingPoints = computed(() => hasSelectedStudent.value && validCount.value
    && Number.isFinite(props.requiredPoints) ? selectedStudentAvailablePoints.value - props.requiredPoints : null)

const canConfirmExchange = computed(() => canWrite.value && props.canExchange && !props.busy
    && hasSelectedStudent.value && validCount.value && props.prize.points > 0
    && remainingPoints.value !== null && remainingPoints.value >= 0)

const exchangeStatusText = computed(() => {
    if (!canWrite.value || !props.canExchange) return "当前仅支持查看，暂不可兑换"
    if (!hasSelectedStudent.value) return "请选择学生"
    if (!Number.isInteger(props.form.count) || props.form.count <= 0) return "请输入大于 0 的整数数量"
    if (!validCount.value) return `库存不足，当前可兑换 ${prizeStock.value} 个`
    if (remainingPoints.value !== null && remainingPoints.value < 0) return `积分不足，还差 ${Math.abs(remainingPoints.value)} 分`
    return "可以兑换"
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
.exchange-status,
.exchange-error {
    margin: 12px 0 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
    line-height: 1.6;
}

.exchange-error {
    color: var(--ta-red);
}

.exchange-layout {
    display: grid;
    grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1fr);
    gap: 18px;
}

.exchange-preview,
.exchange-form {
    padding: 20px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface-solid);
}

.exchange-preview {
    display: grid;
    gap: 16px;
    align-content: start;
    background: var(--ta-surface-muted);
}

.exchange-preview__visual {
    height: 180px;
    border-radius: var(--ta-radius-large);
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
    font-size: 27px;
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
    color: var(--ta-text);
    font-size: 23px;
}

.exchange-preview__meta p {
    margin-top: 8px;
    color: var(--ta-text-secondary);
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
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface-muted);
}

.exchange-preview__summary span,
.notice-card span {
    display: block;
    color: var(--ta-text-secondary);
    font-size: 14px;
}

.exchange-preview__summary strong,
.notice-card strong {
    display: block;
    margin-top: 8px;
    color: var(--ta-text);
    font-size: 23px;
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
    font-size: 14px;
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
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-small);
    background: var(--ta-surface-solid);
    color: var(--ta-text);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.dialog-button--primary {
    border: none;
    background: var(--ta-blue);
    color: #ffffff;
}

@media (max-width: 768px) {
    .exchange-layout {
        grid-template-columns: 1fr;
        gap: 12px;
    }

    .exchange-preview,
    .exchange-form {
        padding: 12px;
    }

    .exchange-preview {
        grid-template-columns: 64px minmax(0, 1fr);
        gap: 12px;
        align-items: start;
    }

    .exchange-preview__visual {
        width: 64px;
        height: 64px;
        gap: 0;
        border-radius: 10px;
    }

    .exchange-preview__visual span {
        display: none;
    }

    .exchange-preview__meta {
        min-width: 0;
        overflow-wrap: anywhere;
    }

    .exchange-preview__meta strong {
        font-size: 16px;
        line-height: 1.4;
    }

    .exchange-preview__meta p {
        margin-top: 4px;
        font-size: 12px;
        line-height: 1.5;
    }

    .exchange-preview__summary {
        grid-column: 1 / -1;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
    }

    .exchange-preview__summary > div {
        padding: 8px 4px;
        border-radius: 8px;
    }

    .exchange-preview__summary span {
        font-size: 11px;
    }

    .exchange-preview__summary strong,
    .notice-card strong {
        margin-top: 3px;
        font-size: 18px;
        font-variant-numeric: tabular-nums;
        overflow-wrap: anywhere;
    }

    .exchange-form,
    .exchange-notice {
        gap: 8px;
    }

    .exchange-form :deep(.el-form-item) {
        margin-bottom: 12px;
    }

    .exchange-notice {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .notice-card {
        padding: 10px;
        border-radius: 8px;
    }

    .notice-card span,
    .exchange-status,
    .exchange-error {
        font-size: 12px;
    }

    .exchange-status,
    .exchange-error {
        margin-top: 0;
    }

    .dialog-footer {
        flex-direction: row;
        gap: 8px;
    }

    .dialog-button {
        width: auto;
        min-width: 0;
        min-height: 40px;
        flex: 1;
    }
}
</style>
