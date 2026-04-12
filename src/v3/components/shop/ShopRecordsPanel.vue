<template>
    <section class="shop-records-panel" :class="{ 'shop-records-panel--preview': preview }">
        <div class="panel-head">
            <div>
                <span class="panel-head__eyebrow">{{ preview ? "兑换信息" : "兑换记录" }}</span>
                <h3>{{ preview ? "最近兑换动态" : "班级兑换历史" }}</h3>
                <p>{{ preview ? "适合大屏快速播报兑换结果，也方便教师确认库存变化。" : "支持分页查看和撤销兑换记录，便于课堂奖励追踪。" }}</p>
            </div>
            <button
                v-if="preview"
                type="button"
                class="panel-head__link"
                @click="emit('openFull')"
            >
                查看全部
            </button>
        </div>

        <div v-loading="loading" class="shop-records-panel__body">
            <div v-if="records.length > 0" class="shop-records-panel__list">
                <article
                    v-for="(record, index) in records"
                    :key="record.id ?? `${record.student_id}-${record.prize_id}-${index}`"
                    class="record-card"
                >
                    <div class="record-card__main">
                        <div class="record-card__avatar">
                            {{ getStudentInitial(record) }}
                        </div>
                        <div class="record-card__info">
                            <div class="record-card__meta">
                                <strong>{{ getStudentName(record) }}</strong>
                                <span class="record-card__time">
                                    <i-ep-clock />
                                    {{ getRecordTimeLabel(record) }}
                                </span>
                            </div>
                            <div class="record-card__content">
                                <span class="record-card__badge">
                                    {{ getPrizeName(record) }}
                                </span>
                                <p>{{ getRecordSummary(record) }}</p>
                            </div>
                        </div>
                    </div>

                    <div class="record-card__aside">
                        <span class="record-card__points">{{ getRecordPoints(record) }} 积分</span>
                        <button type="button" class="record-card__undo" @click="emit('undo', record)">
                            撤销
                        </button>
                    </div>
                </article>
            </div>

            <div v-else class="shop-records-panel__empty">
                <i-ep-tickets class="shop-records-panel__empty-icon" />
                <strong>当前还没有兑换记录</strong>
                <p>学生完成商品兑换后，会在这里展示兑换信息。</p>
            </div>
        </div>

        <div v-if="!preview && total > pageSize" class="shop-records-panel__pagination">
            <el-pagination
                background
                layout="prev, pager, next, jumper, total"
                :current-page="currentPage"
                :page-size="pageSize"
                :total="total"
                @current-change="emit('pageChange', $event)"
            />
        </div>
    </section>
</template>

<script setup lang="ts">
import type { Prize, PrizeRecord } from "@/types/mall"
import { formatChineseDateTime } from "@/utils/date"

defineOptions({ name: "ShopRecordsPanel" })

/** 定义商城记录面板属性。 */
interface ShopRecordsPanelProps {
    currentPage: number
    loading: boolean
    pageSize: number
    preview?: boolean
    prizeIdMap: Record<number, Prize>
    records: PrizeRecord[]
    studentIdNameMap: Record<number, string>
    total: number
}

const props = withDefaults(defineProps<ShopRecordsPanelProps>(), {
    preview: false,
})

const emit = defineEmits<{
    (e: "openFull"): void
    (e: "pageChange", page: number): void
    (e: "undo", record: PrizeRecord): void
}>()

/** 将任意值转换为数字。 */
function toNumber(value: unknown, fallback = 0): number {
    const parsedValue = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}

/** 返回记录对应的学生名称。 */
function getStudentName(record: PrizeRecord): string {
    const rawStudentName = record.student_name?.trim()
    if (rawStudentName) {
        return rawStudentName
    }

    const studentId = toNumber(record.student_id, 0)
    return props.studentIdNameMap[studentId] ?? "未命名学生"
}

/** 返回记录对应的学生首字。 */
function getStudentInitial(record: PrizeRecord): string {
    return getStudentName(record).slice(0, 1) || "生"
}

/** 返回记录对应的商品名称。 */
function getPrizeName(record: PrizeRecord): string {
    const prizeId = toNumber(record.prize_id, 0)
    return props.prizeIdMap[prizeId]?.name?.trim() || "未知商品"
}

/** 返回记录对应的积分消耗。 */
function getRecordPoints(record: PrizeRecord): number {
    return toNumber(record.points, 0)
}

/** 返回记录摘要说明。 */
function getRecordSummary(record: PrizeRecord): string {
    const count = toNumber(record.count, 0)
    return `兑换了 ${count} 个奖品，共消耗 ${getRecordPoints(record)} 积分。`
}

/** 返回记录对应的兑换时间文案。 */
function getRecordTimeLabel(record: PrizeRecord): string {
    const rawValue = record.created_at
    if (!rawValue) {
        return "时间未知"
    }

    if (typeof rawValue === "number") {
        return formatChineseDateTime(new Date(rawValue))
    }

    const parsedTimestamp = Date.parse(String(rawValue))
    if (!Number.isFinite(parsedTimestamp)) {
        return "时间未知"
    }

    return formatChineseDateTime(new Date(parsedTimestamp))
}
</script>

<style scoped>
.shop-records-panel {
    padding: 24px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    backdrop-filter: blur(16px);
}

.shop-records-panel--preview {
    height: 100%;
}

.panel-head,
.record-card,
.record-card__main,
.record-card__info,
.record-card__content,
.record-card__aside,
.shop-records-panel__pagination {
    display: flex;
    align-items: center;
}

.panel-head,
.record-card,
.shop-records-panel__pagination {
    justify-content: space-between;
}

.panel-head {
    align-items: flex-start;
    gap: 14px;
}

.panel-head__eyebrow {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(18, 185, 129, 0.12);
    color: #067647;
    font-size: 12px;
    font-weight: 700;
}

.panel-head h3,
.panel-head p,
.record-card__content strong,
.record-card__content p,
.shop-records-panel__empty strong,
.shop-records-panel__empty p {
    margin: 0;
}

.panel-head h3 {
    margin-top: 12px;
    color: #16213e;
    font-size: 24px;
}

.panel-head p {
    margin-top: 8px;
    color: #627099;
    line-height: 1.7;
}

.panel-head__link {
    min-height: 42px;
    padding: 0 16px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.78);
    color: #16213e;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.shop-records-panel__body {
    min-height: 240px;
    margin-top: 20px;
}

.shop-records-panel__list {
    display: grid;
    gap: 14px;
}

.record-card {
    padding: 18px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.82);
    gap: 14px;
}

.record-card__main {
    min-width: 0;
    gap: 14px;
    flex: 1;
}

.record-card__info {
    min-width: 0;
    gap: 18px;
    flex: 1;
    align-items: stretch;
}

.record-card__meta {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    min-width: 148px;
}

.record-card__avatar {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(85, 104, 255, 0.9), rgba(142, 108, 255, 0.9));
    color: #ffffff;
    font-size: 18px;
    font-weight: 800;
    flex-shrink: 0;
}

.record-card__content {
    min-width: 0;
    flex: 1;
    padding: 12px 14px;
    border: 1px solid rgba(85, 104, 255, 0.08);
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(85, 104, 255, 0.05), rgba(142, 108, 255, 0.04));
    align-items: flex-start;
    gap: 10px;
}

.record-card__meta strong {
    color: #16213e;
    font-size: 17px;
    line-height: 1.4;
}

.record-card__content p {
    margin: 0;
    color: #627099;
    font-size: 14px;
    line-height: 1.75;
}

.record-card__time {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #8a94b3;
    font-size: 12px;
    line-height: 1.6;
}

.record-card__badge {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.12);
    color: #5b63f6;
    font-size: 11px;
    font-weight: 700;
}

.record-card__aside {
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.record-card__points {
    display: inline-flex;
    align-items: center;
    min-height: 38px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(255, 182, 72, 0.14);
    color: #b54708;
    font-size: 13px;
    font-weight: 700;
}

.record-card__undo {
    min-height: 38px;
    padding: 0 14px;
    border: none;
    border-radius: 14px;
    background: rgba(22, 33, 62, 0.08);
    color: #16213e;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.shop-records-panel__pagination {
    margin-top: 18px;
}

.shop-records-panel__empty {
    min-height: 240px;
    display: grid;
    place-items: center;
    text-align: center;
    gap: 10px;
    color: #627099;
}

.shop-records-panel__empty-icon {
    font-size: 54px;
    color: #5568ff;
}

@media (max-width: 768px) {
    .shop-records-panel {
        padding: 18px;
        border-radius: 28px;
    }

    .panel-head,
    .record-card,
    .record-card__main,
    .record-card__info,
    .record-card__content,
    .record-card__aside,
    .shop-records-panel__pagination {
        align-items: stretch;
        flex-direction: column;
    }

    .record-card__meta {
        min-width: 0;
    }

    .panel-head__link {
        width: 100%;
    }
}
</style>
