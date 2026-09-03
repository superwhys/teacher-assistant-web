<template>
    <section class="shop-records-panel" :class="{ 'shop-records-panel--preview': preview }">
        <div class="panel-head">
            <div>
                <span class="panel-head__eyebrow">{{ preview ? "兑换信息" : "兑换记录" }}</span>
                <h3>{{ preview ? "最近兑换动态" : "班级兑换历史" }}</h3>
            </div>
            <button v-if="preview" type="button" class="panel-head__link" @click="emit('openFull')">
                查看全部
            </button>
        </div>

        <div v-loading="loading" class="shop-records-panel__body">
            <div v-if="records.length > 0" class="shop-records-panel__list">
                <article v-for="(record, index) in records"
                    :key="record.id ?? `${record.student_id}-${record.prize_id}-${index}`" class="record-card">
                    <div class="record-card__identity">
                        <div class="record-card__avatar">
                            {{ getStudentInitial(record) }}
                        </div>
                        <div class="record-card__meta">
                            <strong>{{ getStudentName(record) }}</strong>
                            <span class="record-card__time">
                                <i-ep-clock />
                                {{ getRecordTimeLabel(record) }}
                            </span>
                        </div>
                    </div>

                    <div class="record-card__footer">
                        <div class="record-card__content">
                            <el-tooltip :content="getRecordBadgeLabel(record)" placement="top">
                                <span class="record-card__badge">
                                    <span class="record-card__badge-name">{{ getPrizeName(record) }}</span>
                                    <span class="record-card__badge-count">X {{ getRecordCount(record) }}</span>
                                </span>
                            </el-tooltip>
                        </div>

                        <div class="record-card__aside">
                            <span class="record-card__points">{{ getRecordPoints(record) }} 积分</span>
                            <button type="button" class="record-card__undo" @click="emit('undo', record)">
                                撤销
                            </button>
                        </div>
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
            <el-pagination background layout="prev, pager, next, jumper, total" :current-page="currentPage"
                :page-size="pageSize" :total="total" @current-change="emit('pageChange', $event)" />
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

/** 返回记录对应的兑换数量。 */
function getRecordCount(record: PrizeRecord): number {
    return toNumber(record.count, 0)
}

/** 返回记录气泡展示文案。 */
function getRecordBadgeLabel(record: PrizeRecord): string {
    return `${getPrizeName(record)} X ${getRecordCount(record)}`
}

/** 返回记录对应的兑换时间文案。 */
function getRecordTimeLabel(record: PrizeRecord): string {
    const rawValue = record.created_at
    if (!rawValue) {
        return "时间未知"
    }

    const parsedTimestamp = typeof rawValue === "number"
        ? rawValue
        : Date.parse(String(rawValue))
    if (!Number.isFinite(parsedTimestamp)) {
        return "时间未知"
    }

    const recordDate = new Date(parsedTimestamp)
    return props.preview ? getCompactRecordTimeLabel(recordDate) : formatChineseDateTime(recordDate)
}

/** 返回预览态使用的紧凑时间文案。 */
function getCompactRecordTimeLabel(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hour = String(date.getHours()).padStart(2, "0")
    const minute = String(date.getMinutes()).padStart(2, "0")
    return `${month}-${day} ${hour}:${minute}`
}
</script>

<style scoped>
.shop-records-panel {
    min-width: 0;
    padding: 20px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface);
    box-shadow: var(--ta-shadow-1);
    backdrop-filter: blur(18px) saturate(150%);
}

.shop-records-panel--preview {
    height: 100%;
}

.panel-head,
.record-card__identity,
.record-card__footer,
.record-card__content,
.record-card__aside,
.shop-records-panel__pagination {
    display: flex;
    align-items: center;
}

.panel-head {
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.panel-head__eyebrow {
    color: var(--ta-green);
    font-size: 11px;
    font-weight: 650;
}

.panel-head h3 {
    margin: 5px 0 0;
    font-size: 17px;
    letter-spacing: -0.015em;
}

.panel-head__link,
.record-card__undo {
    border: 0;
    color: var(--ta-blue);
    background: transparent;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}

.shop-records-panel__body {
    min-height: 180px;
    margin-top: 12px;
}

.shop-records-panel__list {
    display: grid;
}

.record-card {
    min-height: 72px;
    padding: 10px 0;
    border-top: 1px solid var(--ta-line);
}

.record-card:first-child {
    border-top: 0;
}

.record-card__identity {
    min-width: 0;
    gap: 9px;
}

.record-card__avatar {
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: #0069d6;
    background: #e7f3ff;
    font-size: 13px;
    font-weight: 700;
}

.record-card__meta {
    min-width: 0;
}

.record-card__meta strong {
    display: block;
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.record-card__time {
    margin-top: 3px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--ta-text-tertiary);
    font-size: 10px;
}

.record-card__time svg {
    width: 12px;
    height: 12px;
}

.record-card__footer {
    margin-top: 8px;
    justify-content: space-between;
    gap: 8px;
}

.record-card__content {
    min-width: 0;
    flex: 1;
}

.record-card__badge {
    max-width: 100%;
    min-height: 27px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 8px;
    color: #0064cf;
    background: #e6f2ff;
    font-size: 10px;
}

.record-card__badge-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.record-card__badge-count {
    white-space: nowrap;
}

.record-card__aside {
    flex: 0 0 auto;
    justify-content: flex-end;
    gap: 6px;
}

.record-card__points {
    color: var(--ta-orange);
    font-size: 11px;
    font-weight: 650;
    white-space: nowrap;
}

.shop-records-panel__pagination {
    margin-top: 14px;
    justify-content: center;
}

.shop-records-panel__empty {
    min-height: 200px;
    padding: 24px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 8px;
    border-radius: 14px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    text-align: center;
}

.shop-records-panel__empty-icon {
    width: 40px;
    height: 40px;
    color: var(--ta-blue);
}

.shop-records-panel__empty strong {
    color: var(--ta-text);
    font-size: 14px;
}

.shop-records-panel__empty p {
    margin: 0;
    font-size: 12px;
}

@media (max-width: 660px) {
    .shop-records-panel {
        padding: 16px;
    }
}
</style>
