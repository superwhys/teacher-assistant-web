<template>
    <div class="dashboard-view">
        <section class="hero-grid">
            <article class="hero-card">
                <div class="hero-card__head">
                    <div class="hero-intro">
                        <span class="section-eyebrow">班级总览</span>
                        <p class="hero-intro__hint">当前班级的课堂核心数据与状态摘要</p>
                    </div>
                    <div class="hero-status">
                        <span v-for="item in heroStatusChips" :key="item.id" class="status-chip"
                            :class="item.toneClass">
                            {{ item.label }}
                        </span>
                    </div>
                </div>

                <div class="summary-grid">
                    <article v-for="item in summaryItems" :key="item.id" class="summary-card" :class="item.toneClass">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.value }}</strong>
                        <small>{{ item.helper }}</small>
                    </article>
                </div>
            </article>
        </section>

        <section class="panel-grid">
            <article class="panel-card">
                <div class="panel-head">
                    <div>
                        <h3>排行榜</h3>
                    </div>
                    <div class="panel-actions">
                        <button class="text-button" type="button" @click="toggleRankingPreviewMask">
                            {{ isRankingPreviewMasked ? "显示" : "隐藏" }}
                        </button>
                        <button class="text-button" type="button">查看完整排行榜</button>
                    </div>
                </div>

                <div class="ranking-filter">
                    <div class="ranking-filter__group" role="tablist" aria-label="排行榜周期">
                        <button
                            v-for="item in rankingTimeRangeOptions"
                            :key="item.value"
                            type="button"
                            class="ranking-filter__button"
                            :class="{ 'is-active': rankingTimeRange === item.value }"
                            @click="rankingTimeRange = item.value"
                        >
                            {{ item.label }}
                        </button>
                    </div>
                </div>

                <div v-if="rankingPreview.length === 0" class="ranking-empty-state">
                    <strong>暂无排行榜数据</strong>
                    <p>当前周期下还没有可展示的积分排名。</p>
                </div>

                <div v-else class="preview-list">
                    <article v-for="item in rankingPreview" :key="item.rank" class="preview-item">
                        <div>
                            <strong>{{ item.title }}</strong>
                        </div>
                        <span>{{ item.value }}</span>
                    </article>
                </div>
            </article>

            <article class="panel-card">
                <div class="panel-head">
                    <div>
                        <h3>最近积分记录</h3>
                    </div>
                    <button class="text-button" type="button">查看积分历史</button>
                </div>

                <div class="preview-list">
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
        </section>
    </div>
</template>

<script setup lang="ts">
import { dashboardApi } from "@/api/dashboard";
import { pointsManager } from "@/managers/points";
import { studentManager } from "@/managers/student";
import { useCacheStore } from "@/stores/cacheStore";
import type { DashboardStatisticsResp } from "@/types/dashboard";
import type { RankingTimeRange, StudentRankingItem } from "@/types/points";
import type { StudentDTO } from "@/types/student";
import { computed, reactive, ref, watch } from "vue";

/** 定义状态标签结构。 */
interface ChipItem {
    id: string
    label: string
    toneClass?: string
}

/** 定义摘要卡片结构。 */
interface SummaryItem {
    id: string
    label: string
    value: string
    helper: string
    toneClass: string
}

/** 定义预览列表项结构。 */
interface PreviewItem {
    rank: number
    title: string
    value: string
}

/** 定义积分摘要项的键名。 */
type SummaryMetricKey = "students" | "groups" | "records" | "shop"

/** 定义摘要卡片展示配置结构。 */
interface SummaryCardConfig {
    id: SummaryMetricKey
    label: string
    helper: string
    toneClass: string
}

/** 定义摘要接口数据结构。 */
interface SummaryMetricData {
    value: string | number
}

/** 定义积分记录接口数据结构。 */
interface RecordPreviewData {
    id: number
    student_name: string
    description: string
    delta_points: number
}

/** 定义首页接口数据结构。 */
interface DashboardSummaryResponseData {
    current_term_name: string
    operation_status_text: string
    summary: Record<SummaryMetricKey, SummaryMetricData>
}

/** 定义积分记录展示结构。 */
interface RecordPreviewItem {
    id: number
    title: string
    meta: string
    value: string
    valueToneClass: string
}

interface RankingTimeRangeOption {
    value: RankingTimeRange
    label: string
}

/** 提供摘要卡片的展示配置。 */
const summaryCardConfigs: SummaryCardConfig[] = [
    { id: "students", label: "学生人数", helper: "已完成名册导入", toneClass: "summary-card--blue" },
    { id: "groups", label: "分组数量", helper: "支持课堂筛选", toneClass: "summary-card--purple" },
    { id: "records", label: "积分记录", helper: "支持撤回最近一次", toneClass: "summary-card--gold" },
    { id: "shop", label: "商城奖品", helper: "可用于课堂激励", toneClass: "summary-card--green" }
]

const cacheStore = useCacheStore()
const currentClassId = computed<number | null>(() => cacheStore.getActiveClassId())
const currentSemesterId = computed<number | null>(() => cacheStore.getActiveSemesterId())
const rankingTimeRange = ref<RankingTimeRange>(cacheStore.getPointsRankingTimeRange())
const rankingStudents = ref<StudentDTO[]>([])
const rankingPreviewResponse = ref<StudentRankingItem[]>([])
const rankingTimeRangeOptions: RankingTimeRangeOption[] = [
    { value: "all", label: "全部" },
    { value: "weekly", label: "周榜" },
    { value: "monthly", label: "月榜" }
]

/** 创建首页空白摘要数据。 */
function createEmptyDashboardSummaryResponse(): DashboardSummaryResponseData {
    return {
        current_term_name: "未知学期",
        operation_status_text: "未知",
        summary: {
            students: { value: 0 },
            groups: { value: 0 },
            records: { value: 0 },
            shop: { value: 0 }
        }
    }
}

/** 提供首页空白摘要数据。 */
const dashboardSummaryResponse = reactive<DashboardSummaryResponseData>(createEmptyDashboardSummaryResponse())

/** 提供最近积分记录占位接口数据。 */
/** TODO: 替换为积分记录接口数据 */
const recordPreviewResponse = reactive<RecordPreviewData[]>([
    { id: 1, student_name: "赵思远", description: "小组展示加分", delta_points: 4 },
    { id: 2, student_name: "林若溪", description: "阅读测验优秀", delta_points: 3 },
    { id: 3, student_name: "周亦辰", description: "课堂走神提醒", delta_points: -1 }
])

/** 标记排行榜预览是否启用脱敏。 */
const isRankingPreviewMasked = ref(false)

/** 格式化排行榜积分展示文本。 */
function formatRankingValue(total_points: number): string {
    return `积分 ${total_points}`
}

/** 格式化积分变动展示文本。 */
function formatDeltaValue(delta_points: number): string {
    return delta_points > 0 ? `+${delta_points}` : `${delta_points}`
}

/** 返回积分变动对应的样式类名。 */
function getDeltaToneClass(delta_points: number): string {
    return delta_points < 0 ? "is-negative" : "is-positive"
}

/** 返回排行榜脱敏后的展示文本。 */
function getMaskedRankingText(): string {
    return "***"
}

/** 切换排行榜预览的脱敏状态。 */
function toggleRankingPreviewMask(): void {
    isRankingPreviewMasked.value = !isRankingPreviewMasked.value
}

/** 返回学生 ID 到姓名的映射表。 */
const studentIdNameMap = computed<Record<number, string>>(() => {
    const map: Record<number, string> = {}

    for (const student of rankingStudents.value) {
        const id = student.id ?? 0
        const name = student.name?.trim() ?? ""
        if (!id || !name) {
            continue
        }
        map[id] = name
    }

    return map
})

/** 将接口返回的首页摘要数据写入页面状态。 */
function applyDashboardSummaryResponse(data?: DashboardStatisticsResp): void {
    dashboardSummaryResponse.current_term_name = data?.current_term_name ?? "未知学期"
    dashboardSummaryResponse.operation_status_text = data?.operation_status_text ?? "未知"
    dashboardSummaryResponse.summary.students.value = data?.summary?.students?.value ?? 0
    dashboardSummaryResponse.summary.groups.value = data?.summary?.groups?.value ?? 0
    dashboardSummaryResponse.summary.records.value = data?.summary?.records?.value ?? 0
    dashboardSummaryResponse.summary.shop.value = data?.summary?.shop?.value ?? 0
}

/** 加载首页摘要接口数据。 */
async function loadDashboardSummary(): Promise<void> {
    try {
        const classId = currentClassId.value
        if (!classId) {
            applyDashboardSummaryResponse(undefined)
            return
        }

        const response = await dashboardApi.getStatistics({
            class_id: classId,
        })
        applyDashboardSummaryResponse(response.data)
    } catch (error) {
        console.error("获取首页统计数据失败", error)
    }
}

/** 加载排行榜所需的学生姓名映射。 */
async function loadRankingStudents(): Promise<void> {
    const classId = currentClassId.value
    if (!classId) {
        rankingStudents.value = []
        return
    }

    try {
        rankingStudents.value = await studentManager.list(classId)
    } catch (error) {
        console.error("获取排行榜学生数据失败", error)
        rankingStudents.value = []
    }
}

/** 加载排行榜接口数据。 */
async function loadRankingPreview(): Promise<void> {
    const classId = currentClassId.value
    if (!classId) {
        rankingPreviewResponse.value = []
        return
    }

    try {
        const response = await pointsManager.getClassRanking({
            class_id: classId,
            time_range: rankingTimeRange.value,
            limit: 10,
        })
        rankingPreviewResponse.value = response.items ?? []
    } catch (error) {
        console.error("获取排行榜数据失败", error)
        rankingPreviewResponse.value = []
    }
}

/** 同步保存排行榜时间维度。 */
watch(rankingTimeRange, (value) => {
    cacheStore.setPointsRankingTimeRange(value)
})

/** 顶部状态标签。 */
const heroStatusChips = computed<ChipItem[]>(() => [
    { id: "current-term", label: `当前学期：${dashboardSummaryResponse.current_term_name}`, toneClass: "status-chip--sky" },
    { id: "current-state", label: `当前状态：${dashboardSummaryResponse.operation_status_text}`, toneClass: "status-chip--green" }
])

/** 摘要卡片。 */
const summaryItems = computed<SummaryItem[]>(() => {
    return summaryCardConfigs.map((config) => {
        const summaryData = dashboardSummaryResponse.summary[config.id]

        return {
            id: config.id,
            label: config.label,
            value: String(summaryData.value),
            helper: config.helper,
            toneClass: config.toneClass
        }
    })
})

/** 排行榜预览。 */
const rankingPreview = computed<PreviewItem[]>(() => {
    return rankingPreviewResponse.value.map((item, index) => {
        const rank = typeof item.rank === "number" ? item.rank : index + 1
        const studentId = item.student_id ?? 0
        const studentName = studentIdNameMap.value[studentId] ?? `学生 ${rank}`
        const score = typeof item.score === "number" ? item.score : 0

        return {
            rank,
            title: isRankingPreviewMasked.value ? getMaskedRankingText() : studentName,
            value: isRankingPreviewMasked.value ? getMaskedRankingText() : formatRankingValue(score)
        }
    })
})

/** 基于接口数据生成最近积分记录预览。 */
const recordPreview = computed<RecordPreviewItem[]>(() => {
    return recordPreviewResponse.map((item) => ({
        id: item.id,
        title: item.student_name,
        meta: item.description,
        value: formatDeltaValue(item.delta_points),
        valueToneClass: getDeltaToneClass(item.delta_points)
    }))
})

/** 监听班级与学期变化后重新加载首页数据。 */
watch([currentClassId, currentSemesterId], async () => {
    await Promise.all([
        loadDashboardSummary(),
        loadRankingStudents(),
        loadRankingPreview(),
    ])
}, { immediate: true })

/** 监听排行榜时间维度变化后重新加载排行榜。 */
watch(rankingTimeRange, () => {
    void loadRankingPreview()
})
</script>

<style scoped>
.dashboard-view {
    display: grid;
    gap: 20px;
}

.hero-grid,
.panel-grid {
    display: grid;
    gap: 20px;
}

.hero-grid {
    grid-template-columns: minmax(0, 1fr);
}

.hero-card,
.panel-card,
.preview-item {
    border: 1px solid rgba(122, 141, 198, 0.18);
    box-shadow: 0 18px 36px rgba(71, 90, 150, 0.12);
}

.hero-card,
.panel-card {
    padding: 24px;
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(16px);
}

.hero-card {
    position: relative;
    overflow: hidden;
    background:
        radial-gradient(circle at top right, rgba(142, 108, 255, 0.12), transparent 24%),
        radial-gradient(circle at bottom left, rgba(85, 104, 255, 0.08), transparent 28%),
        rgba(255, 255, 255, 0.92);
}

.hero-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.5), transparent 45%);
    pointer-events: none;
}

.hero-card__head,
.panel-head {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 18px;
}

.hero-intro {
    max-width: 520px;
}

.section-eyebrow {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid rgba(85, 104, 255, 0.16);
    background: rgba(85, 104, 255, 0.1);
    font-size: 13px;
    font-weight: 700;
    color: #5568ff;
}

.panel-head h3 {
    margin: 0;
}

.panel-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 12px;
}

.ranking-filter {
    margin-bottom: 16px;
    display: flex;
    justify-content: center;
}

.ranking-filter__group {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.08);
    border: 1px solid rgba(122, 141, 198, 0.14);
}

.ranking-filter__button {
    min-width: 72px;
    min-height: 36px;
    padding: 0 16px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.ranking-filter__button:hover {
    color: #3c4fb0;
    transform: translateY(-1px);
}

.ranking-filter__button.is-active {
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 10px 18px rgba(85, 104, 255, 0.22);
}

.hero-intro__hint {
    margin: 10px 0 0;
    color: #627099;
    font-size: 14px;
    line-height: 1.7;
}

.preview-item p,
.summary-card small {
    margin: 0;
    color: #627099;
    line-height: 1.7;
}

.hero-status {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 12px;
}

.status-chip {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(122, 141, 198, 0.16);
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    box-shadow: 0 10px 18px rgba(71, 90, 150, 0.08);
}

.status-chip--sky {
    color: #2563eb;
    background: rgba(59, 130, 246, 0.12);
}

.status-chip--green {
    color: #067647;
    background: rgba(18, 185, 129, 0.12);
}

.summary-grid {
    position: relative;
    margin-top: 20px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
}

.summary-card {
    min-height: 124px;
    padding: 18px 20px;
    border: 1px solid rgba(122, 141, 198, 0.14);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.summary-card span {
    display: block;
    font-size: 13px;
    color: #627099;
}

.summary-card strong {
    display: block;
    margin-top: 10px;
    font-size: 20px;
}

.summary-card--blue {
    background: linear-gradient(180deg, rgba(85, 104, 255, 0.08), rgba(255, 255, 255, 0.96));
}

.summary-card--purple {
    background: linear-gradient(180deg, rgba(142, 108, 255, 0.16), rgba(255, 255, 255, 0.92));
}

.summary-card--gold {
    background: linear-gradient(180deg, rgba(255, 182, 72, 0.18), rgba(255, 255, 255, 0.92));
}

.summary-card--green {
    background: linear-gradient(180deg, rgba(18, 185, 129, 0.14), rgba(255, 255, 255, 0.92));
}

.summary-card,
.panel-card,
.preview-item,
.text-button {
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.summary-card:hover,
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

.ranking-empty-state {
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

.ranking-empty-state strong {
    color: #16213e;
    font-size: 16px;
}

.ranking-empty-state p {
    margin: 0;
    color: #627099;
    font-size: 14px;
    line-height: 1.7;
}

.panel-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 4px;
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

@media (max-width: 1280px) {

    .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 1080px) {

    .hero-grid,
    .panel-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .hero-card__head {
        flex-direction: column;
        align-items: stretch;
    }

    .panel-actions {
        justify-content: flex-start;
    }

    .hero-status {
        justify-content: flex-start;
    }

    .summary-grid {
        grid-template-columns: 1fr;
    }
}
</style>
