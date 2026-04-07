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
            <DashboardRankingPanel
                :active-class-id="currentClassId"
                :current-semester-id="currentSemesterId"
            />
            <DashboardRecentRecordsPanel
                :active-class-id="currentClassId"
                :current-semester-id="currentSemesterId"
            />
        </section>
    </div>
</template>

<script setup lang="ts">
import DashboardRankingPanel from "@/v3/components/DashboardRankingPanel.vue";
import DashboardRecentRecordsPanel from "@/v3/components/DashboardRecentRecordsPanel.vue";
import { dashboardApi } from "@/api/dashboard";
import { useCacheStore } from "@/stores/cacheStore";
import type { DashboardStatisticsResp } from "@/types/dashboard";
import { computed, reactive, watch } from "vue";

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

/** 定义首页接口数据结构。 */
interface DashboardSummaryResponseData {
    current_term_name: string
    operation_status_text: string
    summary: Record<SummaryMetricKey, SummaryMetricData>
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

/** 监听班级与学期变化后重新加载首页数据。 */
watch([currentClassId, currentSemesterId], async () => {
    await loadDashboardSummary()
}, { immediate: true })
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

.hero-card {
    border: 1px solid rgba(122, 141, 198, 0.18);
    box-shadow: 0 18px 36px rgba(71, 90, 150, 0.12);
}

.hero-card {
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

.hero-card__head {
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

.hero-intro__hint {
    margin: 10px 0 0;
    color: #627099;
    font-size: 14px;
    line-height: 1.7;
}

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

.summary-card {
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.summary-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 34px rgba(71, 90, 150, 0.14);
}

.panel-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 4px;
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
