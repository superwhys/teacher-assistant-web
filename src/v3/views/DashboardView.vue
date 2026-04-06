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
                        <h3>排行榜预览</h3>
                    </div>
                    <button class="text-button" type="button">查看完整排行榜</button>
                </div>

                <div class="preview-list">
                    <article v-for="item in rankingPreview" :key="item.title" class="preview-item">
                        <div>
                            <strong>{{ item.title }}</strong>
                            <p>{{ item.meta }}</p>
                        </div>
                        <span>{{ item.value }}</span>
                    </article>
                </div>
            </article>

            <article class="panel-card">
                <div class="panel-head">
                    <div>
                        <h3>最近积分记录预览</h3>
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
import { computed, reactive } from "vue";

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
    meta: string
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

/** 定义排行榜接口数据结构。 */
interface RankingPreviewData {
    rank: number
    studentName: string
    description: string
    totalPoints: number
}

/** 定义积分记录接口数据结构。 */
interface RecordPreviewData {
    id: number
    studentName: string
    description: string
    deltaPoints: number
}

/** 定义首页接口数据结构。 */
interface DashboardResponseData {
    currentTermName: string
    operationStatusText: string
    summary: Record<SummaryMetricKey, SummaryMetricData>
    rankingPreview: RankingPreviewData[]
    recordPreview: RecordPreviewData[]
}

/** 定义积分记录展示结构。 */
interface RecordPreviewItem {
    id: number
    title: string
    meta: string
    value: string
    valueToneClass: string
}

/** 提供摘要卡片的展示配置。 */
const summaryCardConfigs: SummaryCardConfig[] = [
    { id: "students", label: "学生人数", helper: "已完成名册导入", toneClass: "summary-card--blue" },
    { id: "groups", label: "分组数量", helper: "支持课堂筛选", toneClass: "summary-card--purple" },
    { id: "records", label: "积分记录", helper: "支持撤回最近一次", toneClass: "summary-card--gold" },
    { id: "shop", label: "商城奖品", helper: "可用于课堂激励", toneClass: "summary-card--green" }
]

/** 提供首页占位接口数据。 */
/** TODO: 替换为接口数据 */
const dashboardResponse = reactive<DashboardResponseData>({
    currentTermName: "春季学期",
    operationStatusText: "可积分操作",
    summary: {
        students: { value: 6 },
        groups: { value: 3 },
        records: { value: 4 },
        shop: { value: "3 个" }
    },
    rankingPreview: [
        { rank: 1, studentName: "赵思远", description: "14 组课堂互动后领先", totalPoints: 144 },
        { rank: 2, studentName: "林若溪", description: "课堂反馈稳定", totalPoints: 138 },
        { rank: 3, studentName: "李嘉禾", description: "最近两次均有加分", totalPoints: 126 }
    ],
    recordPreview: [
        { id: 1, studentName: "赵思远", description: "小组展示加分", deltaPoints: 4 },
        { id: 2, studentName: "林若溪", description: "阅读测验优秀", deltaPoints: 3 },
        { id: 3, studentName: "周亦辰", description: "课堂走神提醒", deltaPoints: -1 }
    ]
})

/** 格式化排行榜积分展示文本。 */
function formatRankingValue(totalPoints: number): string {
    return `积分 ${totalPoints}`
}

/** 格式化积分变动展示文本。 */
function formatDeltaValue(deltaPoints: number): string {
    return deltaPoints > 0 ? `+${deltaPoints}` : `${deltaPoints}`
}

/** 返回积分变动对应的样式类名。 */
function getDeltaToneClass(deltaPoints: number): string {
    return deltaPoints < 0 ? "is-negative" : "is-positive"
}

/** 顶部状态标签。 */
const heroStatusChips = computed<ChipItem[]>(() => [
    { id: "current-term", label: `当前学期：${dashboardResponse.currentTermName}`, toneClass: "status-chip--sky" },
    { id: "current-state", label: `当前状态：${dashboardResponse.operationStatusText}`, toneClass: "status-chip--green" }
])

/** 摘要卡片。 */
const summaryItems = computed<SummaryItem[]>(() => {
    return summaryCardConfigs.map((config) => {
        const summaryData = dashboardResponse.summary[config.id]

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
    return dashboardResponse.rankingPreview.map((item) => ({
        rank: item.rank,
        title: item.studentName,
        meta: item.description,
        value: formatRankingValue(item.totalPoints)
    }))
})

/** 基于接口数据生成最近积分记录预览。 */
const recordPreview = computed<RecordPreviewItem[]>(() => {
    return dashboardResponse.recordPreview.map((item) => ({
        id: item.id,
        title: item.studentName,
        meta: item.description,
        value: formatDeltaValue(item.deltaPoints),
        valueToneClass: getDeltaToneClass(item.deltaPoints)
    }))
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

    .hero-status {
        justify-content: flex-start;
    }

    .summary-grid {
        grid-template-columns: 1fr;
    }
}
</style>
