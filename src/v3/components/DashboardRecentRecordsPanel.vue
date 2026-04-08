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
    void router.push("/v3/points/history")
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
.panel-card,
.preview-item {
    border: 1px solid rgba(122, 141, 198, 0.18);
    box-shadow: 0 18px 36px rgba(71, 90, 150, 0.12);
}

.panel-card {
    padding: 24px;
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(16px);
}

.panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 18px;
}

.panel-head h3 {
    margin: 0;
}

.panel-card,
.preview-item,
.text-button {
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.panel-card:hover,
.preview-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 34px rgba(71, 90, 150, 0.14);
}

.text-button {
    cursor: pointer;
    padding: 0;
    border: none;
    background: transparent;
    color: #5568ff;
    font-weight: 700;
}

.text-button:hover {
    transform: translateX(2px);
}

.preview-list {
    display: grid;
    gap: 14px;
}

.empty-state {
    display: grid;
    place-items: center;
    gap: 8px;
    min-height: 180px;
    padding: 24px;
    border: 1px dashed rgba(122, 141, 198, 0.24);
    border-radius: 24px;
    background: rgba(247, 249, 255, 0.72);
    text-align: center;
}

.empty-state strong {
    color: #16213e;
    font-size: 16px;
}

.empty-state p,
.preview-item p {
    margin: 0;
    color: #627099;
    font-size: 14px;
    line-height: 1.7;
}

.preview-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    padding: 16px 18px;
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(247, 249, 255, 0.96), rgba(255, 255, 255, 0.9));
}

.preview-item strong {
    display: block;
    margin: 0;
    font-size: 17px;
}

.preview-item span {
    font-weight: 800;
    white-space: nowrap;
}

.is-positive {
    color: #12b981;
}

.is-negative {
    color: #ff6b81;
}
</style>
