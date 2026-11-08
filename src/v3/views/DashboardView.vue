<template>
    <div class="dashboard-view">
        <PageHeader eyebrow="CLASS OVERVIEW" title="班级总览" description="查看当前班级的课堂数据与状态摘要。" />
        <section class="dashboard-context" aria-label="班级总览">
            <div class="hero-status">
                <span v-for="item in heroStatusChips" :key="item.id" class="status-chip" :class="item.toneClass">
                    {{ item.label }}
                </span>
            </div>
        </section>

        <section class="summary-grid">
            <article v-for="item in summaryItems" :key="item.id" class="summary-card" :class="item.toneClass">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.helper }}</small>
            </article>
        </section>

        <section :key="agentRefreshVersion" class="panel-grid">
            <DashboardRankingPanel :active-class-id="currentClassId" :current-semester-id="currentSemesterId" />
            <DashboardRecentRecordsPanel :active-class-id="currentClassId"
                :current-semester-id="currentSemesterId" />
        </section>
    </div>
</template>

<script setup lang="ts">
import DashboardRankingPanel from "@/v3/components/DashboardRankingPanel.vue";
import PageHeader from "@/components/common/PageHeader.vue";
import DashboardRecentRecordsPanel from "@/v3/components/DashboardRecentRecordsPanel.vue";
import { dashboardApi } from "@/api/dashboard";
import { useCacheStore } from "@/stores/cacheStore";
import type { DashboardStatisticsResp } from "@/types/dashboard";
import { AGENT_ACTION_SUCCEEDED_EVENT, type AgentActionSucceededDetail } from "@/utils/agentEvents";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

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
const agentRefreshVersion = ref(0)
let summaryRequestId = 0

function handleAgentActionSucceeded(event: CustomEvent<AgentActionSucceededDetail>): void {
    const scope = event.detail
    if (scope.userId !== cacheStore.profile?.id || scope.classId !== currentClassId.value
        || scope.semesterId !== currentSemesterId.value) return
    agentRefreshVersion.value += 1
    void loadDashboardSummary()
}

onMounted(() => window.addEventListener(AGENT_ACTION_SUCCEEDED_EVENT, handleAgentActionSucceeded))
onBeforeUnmount(() => {
    window.removeEventListener(AGENT_ACTION_SUCCEEDED_EVENT, handleAgentActionSucceeded)
    summaryRequestId += 1
})

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
    const requestId = ++summaryRequestId
    const scope = { userId: cacheStore.profile?.id, classId: currentClassId.value, semesterId: currentSemesterId.value }
    const isCurrent = () => requestId === summaryRequestId && scope.userId === cacheStore.profile?.id
        && scope.classId === currentClassId.value && scope.semesterId === currentSemesterId.value
    try {
        if (!scope.classId) {
            applyDashboardSummaryResponse(undefined)
            return
        }

        const response = await dashboardApi.getStatistics({
            class_id: scope.classId,
        })
        if (!isCurrent()) return
        applyDashboardSummaryResponse(response.data)
    } catch (error) {
        if (!isCurrent()) return
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

.dashboard-context {
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
}

.hero-status {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 7px;
    flex-wrap: wrap;
}

.status-chip {
    min-height: 26px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 6px;
    color: var(--ta-text-secondary);
    background: var(--ta-surface-muted);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}

.status-chip--sky {
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.status-chip--green {
    color: var(--ta-green);
    background: var(--ta-green-soft);
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
}

.summary-card {
    min-height: 112px;
    padding: 19px 22px;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-medium);
    background: var(--ta-surface-solid);
    box-shadow: var(--ta-shadow-1);
}

.summary-card span,
.summary-card small {
    display: block;
    position: relative;
    z-index: 1;
}

.summary-card span {
    color: var(--ta-text-tertiary);
    font-size: 13px;
}

.summary-card strong {
    display: block;
    position: relative;
    z-index: 1;
    margin-top: 8px;
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.025em;
    font-variant-numeric: tabular-nums;
}

.summary-card small {
    margin-top: 9px;
    color: var(--ta-text-secondary);
    font-size: 13px;
    line-height: 1.4;
}

.panel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
}

@media (max-width: 1080px) {
    .panel-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 760px) {
    .dashboard-context {
        align-items: flex-start;
        flex-direction: column;
    }

    .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>
