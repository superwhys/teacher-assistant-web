<template>
    <article class="panel-card">
        <div class="panel-head">
            <div>
                <h3>最近积分记录</h3>
            </div>
            <button class="text-button" type="button" @click="goToHistoryPage">查看积分历史</button>
        </div>

        <div v-if="recordPreview.length === 0" class="empty-state">
            <strong>暂无积分记录</strong>
            <p>当前班级还没有可展示的积分规则记录。</p>
        </div>

        <div v-else class="preview-list">
            <article v-for="item in recordPreview" :key="item.id" class="preview-item">
                <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.meta }}</p>
                </div>
                <span :class="item.valueToneClass">
                    {{ item.value }}
                </span>
            </article>
        </div>
    </article>
</template>

<script setup lang="ts">
import { pointsManager } from "@/managers/points"
import type { ListApplyRecordsQuery, Record as PointsApplyRecord } from "@/types/points"
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

/** 定义最近积分记录面板属性。 */
interface DashboardRecentRecordsPanelProps {
    activeClassId: number | null
    currentSemesterId: number | null
}

/** 定义积分记录展示结构。 */
interface RecordPreviewItem {
    id: number
    title: string
    meta: string
    value: string
    valueToneClass: string
}

const props = defineProps<DashboardRecentRecordsPanelProps>()

const router = useRouter()
const recordPreviewResponse = ref<PointsApplyRecord[]>([])

/** 返回最近积分记录预览展示数据。 */
const recordPreview = computed<RecordPreviewItem[]>(() => {
    return recordPreviewResponse.value.map((item) => {
        const deltaPoints = inferRecordDelta(item)

        return {
            id: toNumber(item.id, 0),
            title: item.student_name?.trim() || `学生 ${toNumber(item.student_id, 0) || "-"}`,
            meta: item.rule_desc?.trim() || "积分规则记录",
            value: formatDeltaValue(deltaPoints),
            valueToneClass: getDeltaToneClass(deltaPoints)
        }
    })
})

/** 跳转到积分历史页面。 */
function goToHistoryPage(): void {
    void router.push({ path: "/points", query: { tab: "records" } })
}

/** 格式化积分变动展示文本。 */
function formatDeltaValue(deltaPoints: number): string {
    return deltaPoints > 0 ? `+${deltaPoints}` : `${deltaPoints}`
}

/** 将任意值安全转换为数字。 */
function toNumber(value: unknown, fallback = 0): number {
    const parsedValue = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}

/** 推断积分记录的分值变化。 */
function inferRecordDelta(record: PointsApplyRecord): number {
    const amount = toNumber(record.amount, 0)
    if (amount !== 0 && amount !== Math.abs(amount)) {
        return amount
    }

    const type = toNumber(record.type, 0)
    if (type === 2) {
        return -Math.abs(amount)
    }
    if (type === 1) {
        return Math.abs(amount)
    }

    return amount
}

/** 返回积分变动对应的样式类名。 */
function getDeltaToneClass(deltaPoints: number): string {
    return deltaPoints < 0 ? "is-negative" : "is-positive"
}

/** 返回积分记录的排序时间戳。 */
function getRecordTimestamp(record: PointsApplyRecord): number {
    const rawValue = record.created_at
    if (!rawValue) {
        return toNumber(record.id, 0)
    }
    if (typeof rawValue === "number") {
        return rawValue
    }

    const timestamp = Date.parse(String(rawValue))
    return Number.isFinite(timestamp) ? timestamp : toNumber(record.id, 0)
}

/** 判断记录是否来自积分规则。 */
function isRuleApplyRecord(record: PointsApplyRecord): boolean {
    const source = toNumber(record.from, 0)
    if (source === 2) {
        return true
    }

    return source === 0 && toNumber(record.rule_id, 0) > 0
}

/** 构建最近积分记录的查询参数。 */
function buildRecordPreviewQuery(): ListApplyRecordsQuery {
    return {
        class_id: props.activeClassId ?? undefined,
        limit: 7,
        offset: 0
    }
}

/** 加载最近积分记录接口数据。 */
async function loadRecordPreview(): Promise<void> {
    if (!props.activeClassId) {
        recordPreviewResponse.value = []
        return
    }

    try {
        const response = await pointsManager.listApplyRecords(buildRecordPreviewQuery())
        recordPreviewResponse.value = (response.items ?? [])
            .filter((item) => isRuleApplyRecord(item))
            .sort((prev, next) => getRecordTimestamp(next) - getRecordTimestamp(prev))
            .slice(0, 7)
    } catch (error) {
        console.error("获取最近积分记录失败", error)
        recordPreviewResponse.value = []
    }
}

/** 监听班级与学期变化后重新加载最近积分记录。 */
watch(() => [props.activeClassId, props.currentSemesterId], () => {
    void loadRecordPreview()
}, { immediate: true })
</script>

<style scoped>
.panel-card {
    min-width: 0;
    padding: 20px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface);
    box-shadow: var(--ta-shadow-1);
    backdrop-filter: blur(18px) saturate(150%);
}

.panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
}

.panel-head h3 {
    margin: 0;
    font-size: 17px;
    letter-spacing: -0.015em;
}

.panel-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
}

.text-button {
    padding: 4px 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    color: var(--ta-blue);
    background: transparent;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
}

.text-button:hover {
    color: #005ecb;
}

.text-button svg {
    width: 16px;
    height: 16px;
}

.ranking-filter {
    margin-bottom: 10px;
}

.ranking-filter__group {
    min-height: 34px;
    padding: 3px;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    border-radius: 10px;
    background: #e9e9ed;
}

.ranking-filter__button {
    min-width: 58px;
    min-height: 28px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    color: var(--ta-text-secondary);
    background: transparent;
    font-size: 12px;
    cursor: pointer;
}

.ranking-filter__button.is-active {
    color: var(--ta-text);
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    font-weight: 620;
}

.preview-list {
    display: grid;
}

.preview-item {
    min-height: 54px;
    padding: 10px 2px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    border-top: 1px solid var(--ta-line);
}

.preview-item:first-child {
    border-top: 0;
}

.preview-item strong {
    display: block;
    font-size: 14px;
}

.preview-item p {
    margin: 3px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 12px;
    line-height: 1.4;
}

.preview-item > span {
    color: var(--ta-text-secondary);
    font-size: 14px;
    font-weight: 650;
    white-space: nowrap;
}

.preview-item > span.is-positive {
    color: var(--ta-green);
}

.preview-item > span.is-negative {
    color: var(--ta-red);
}

.ranking-empty-state,
.empty-state {
    min-height: 180px;
    padding: 24px;
    display: grid;
    place-items: center;
    gap: 7px;
    border-radius: 16px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    text-align: center;
}

.ranking-empty-state strong,
.empty-state strong {
    color: var(--ta-text);
    font-size: 14px;
}

.ranking-empty-state p,
.empty-state p {
    margin: 0;
    font-size: 12px;
}

@media (max-width: 660px) {
    .panel-head {
        align-items: stretch;
        flex-direction: column;
    }

    .panel-actions {
        justify-content: flex-start;
    }
}
</style>
