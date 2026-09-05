<template>
    <div class="points-view">
        <section class="metrics-grid">
            <article class="metric-card metric-card--blue">
                <span>积分规则组</span>
                <strong>{{ ruleGroups.length }}</strong>
                <small>支持直接新增、编辑、删除</small>
            </article>

            <article class="metric-card metric-card--gold">
                <span>积分项总数</span>
                <strong>{{ totalRuleCount }}</strong>
                <small>{{ `${plusRuleCount} 个加分项 / ${minusRuleCount} 个扣分项` }}</small>
            </article>

            <article class="metric-card metric-card--green">
                <span>积分记录</span>
                <strong>{{ hasLoadedHistoryRecords ? historyTotal : "--" }}</strong>
                <small>{{ hasLoadedHistoryRecords ? latestRecordSummary : "点击历史记录后加载" }}</small>
            </article>
        </section>

        <div v-if="isArchivedSemester" class="points-view__notice">
            <i-ep-warning-filled class="points-view__notice-icon" />
            <span>当前为归档学期，仅支持查看积分数据，不支持继续加分、扣分、导入和规则维护。</span>
        </div>

        <PointsRulesManagePanel :can-mutate-points="canMutatePoints" :has-active-class="hasActiveClass"
            :rule-groups="ruleGroups" :rule-groups-loading="ruleGroupsLoading" :selected-rule-group="selectedRuleGroup"
            :selected-rule-group-id="selectedRuleGroupId" :selected-rule-group-rules="selectedRuleGroupRules"
            @create-group="openCreateGroupDialog" @create-rule="openCreateRuleDialog" @delete-group="requestDeleteGroup"
            @delete-rule="requestDeleteRule" @edit-group="openEditGroupDialog" @edit-rule="openEditRuleDialog"
            @import-items="handleOpenImportItemsDialog" @import-records="handleOpenImportRecordsDialog"
            @open-export="handleOpenExportDialog" @update:selected-rule-group-id="selectedRuleGroupId = $event" />

        <PointsContentPanel :active-content-tab="activeContentTab" :active-ranking-tab="activeRankingTab"
            :can-mutate-points="canMutatePoints" :can-undo-record="canUndoRecord"
            :get-record-source-label="getRecordSourceLabel" :get-record-time-label="getRecordTimeLabel"
            :history-keyword="historyKeyword" :history-page="historyPage" :history-page-count="historyPageCount"
            :history-records="historyRecords" :history-sign="historySign" :history-sign-options="historySignOptions"
            :infer-record-delta="inferRecordDelta" :ranking-items="rankingItems" :ranking-loading="rankingLoading"
            :ranking-range-options="rankingRangeOptions" :ranking-time-range="rankingTimeRange"
            :records-loading="recordsLoading" :rule-options="flatRules"
            :selected-ranking-rule-id="selectedRankingRuleId" @go-next-history-page="goToNextHistoryPage"
            @go-prev-history-page="goToPrevHistoryPage" @refresh-records="loadHistoryRecords"
            @select-content-tab="handleSelectContentTab" @select-history-sign="handleSelectHistorySign"
            @select-ranking-tab="handleSelectRankingTab" @undo-latest-record="undoLatestRecord"
            @undo-record="undoRecord" @update:history-keyword="historyKeyword = $event"
            @update:ranking-time-range="rankingTimeRange = $event"
            @update:selected-ranking-rule-id="selectedRankingRuleId = $event" />

        <PointsImportItemsDialog v-model="importItemsDialogVisible" @changed="handleRulesChanged" />

        <PointsImportRecordsDialog v-model="importRecordsDialogVisible"
            :active-class-id="canMutatePoints ? activeClassId : null" @changed="handleRecordsChanged" />

        <PointsExportDialog v-model="exportDialogVisible" :active-class-id="activeClassId"
            :active-class-name="activeClassName" :group-options="studentGroupOptions" :rule-options="flatRules" />

        <PointsRuleGroupDialog v-model="groupDialogVisible" :initial-name="groupForm.name"
            :loading="ruleMutationLoading" :mode="groupDialogMode" @save="saveGroup" />

        <PointsRuleItemDialog v-model="ruleDialogVisible" :initial-value="ruleForm" :loading="ruleMutationLoading"
            :mode="ruleDialogMode" @save="saveRule" />

        <PointsDeleteConfirmDialog v-model="deleteDialogVisible" :target-name="deleteTargetName"
            :target-type="deleteTargetType" @confirm="confirmDelete" />
    </div>
</template>

<script setup lang="ts">
import { pointsManager } from "@/managers/points";
import { studentManager } from "@/managers/student";
import { useCacheStore } from "@/stores/cacheStore";
import type {
    RankingTimeRange,
    Record as PointsApplyRecord,
    Rule,
    RuleGroup,
    StudentRankingItem
} from "@/types/points";
import type { StudentGroupDTO } from "@/types/student";
import { formatChineseDateTime } from "@/utils/date";
import { ElMessage } from "element-plus";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import PointsDeleteConfirmDialog from "@/v3/components/points/PointsDeleteConfirmDialog.vue";
import PointsContentPanel from "@/v3/components/points/PointsContentPanel.vue";
import PointsExportDialog from "@/v3/components/points/PointsExportDialog.vue";
import PointsImportItemsDialog from "@/v3/components/points/PointsImportItemsDialog.vue";
import PointsImportRecordsDialog from "@/v3/components/points/PointsImportRecordsDialog.vue";
import PointsRuleGroupDialog from "@/v3/components/points/PointsRuleGroupDialog.vue";
import PointsRuleItemDialog from "@/v3/components/points/PointsRuleItemDialog.vue";
import PointsRulesManagePanel from "@/v3/components/points/PointsRulesManagePanel.vue";

defineOptions({ name: "PointsView" })

/** 定义排行榜时间范围选项。 */
interface RankingRangeOption {
    label: string
    value: RankingTimeRange
}

/** 定义记录类型筛选项。 */
interface HistorySignOption {
    label: string
    value: "all" | "plus" | "minus"
}

/** 定义规则平铺展示结构。 */
interface FlatRuleItem {
    groupName: string
    id: number
    name: string
    sign: "plus" | "minus"
}

/** 定义排行榜展示结构。 */
interface RankingDisplayItem {
    id: number
    name: string
    rankClass: string
    rankLabel: string
    scoreLabel: string
}

/** 定义积分页底部内容区域页签。 */
type PointsContentTab = "ranking" | "records"

/** 定义规则组表单结构。 */
interface RuleGroupFormState {
    id: number
    name: string
}

/** 定义积分项表单结构。 */
interface RuleFormState {
    id: number
    name: string
    points: number
    sign: "plus" | "minus"
}

/** 定义积分项弹窗保存载荷。 */
interface RuleFormSubmitPayload {
    name: string
    points: number
    sign: "plus" | "minus"
}

const cacheStore = useCacheStore()
const route = useRoute()

const studentGroups = ref<StudentGroupDTO[]>([])
const ruleGroups = ref<RuleGroup[]>([])
const historyRecords = ref<PointsApplyRecord[]>([])
const totalRankingItems = ref<StudentRankingItem[]>([])
const ruleRankingItems = ref<StudentRankingItem[]>([])

const pageLoading = ref(false)
const ruleGroupsLoading = ref(false)
const rankingLoading = ref(false)
const recordsLoading = ref(false)
const ruleMutationLoading = ref(false)
const recordMutationLoading = ref(false)
const hasLoadedTotalRanking = ref(false)
const hasLoadedRuleRanking = ref(false)
const hasLoadedHistoryRecords = ref(false)
const totalRankingDirty = ref(true)
const ruleRankingDirty = ref(true)
const historyRecordsDirty = ref(true)

const importItemsDialogVisible = ref(false)
const importRecordsDialogVisible = ref(false)
const exportDialogVisible = ref(false)
const groupDialogVisible = ref(false)
const ruleDialogVisible = ref(false)
const deleteDialogVisible = ref(false)

const selectedRuleGroupId = ref<number>(0)
const selectedRankingRuleId = ref<number>(0)
const activeContentTab = ref<PointsContentTab>(route.query.tab === "records" ? "records" : cacheStore.getPointsContentTab())
const activeRankingTab = ref<"total" | "item">(cacheStore.getPointsRankingTab())
const rankingTimeRange = ref<RankingTimeRange>(cacheStore.getPointsRankingTimeRange())
const historyKeyword = ref("")
const historySign = ref<"all" | "plus" | "minus">("all")
const historyPage = ref(1)
const historyPageSize = 6
const historyTotal = ref(0)
const groupDialogMode = ref<"create" | "edit">("create")
const ruleDialogMode = ref<"create" | "edit">("create")
const deleteTargetType = ref<"group" | "rule">("group")
const pendingDeleteGroupId = ref(0)
const pendingDeleteRuleId = ref(0)

const groupForm = ref<RuleGroupFormState>({
    id: 0,
    name: ""
})

const ruleForm = ref<RuleFormState>({
    id: 0,
    name: "",
    points: 1,
    sign: "plus"
})

const rankingRangeOptions: RankingRangeOption[] = [
    { label: "全部", value: "all" },
    { label: "周榜", value: "weekly" },
    { label: "月榜", value: "monthly" }
]

const historySignOptions: HistorySignOption[] = [
    { label: "全部", value: "all" },
    { label: "加分", value: "plus" },
    { label: "扣分", value: "minus" }
]

const activeClassId = computed<number | null>(() => cacheStore.getActiveClassId())
const activeClassName = computed<string>(() => cacheStore.getActiveClassName()?.trim() || "未选择班级")
const activeSemesterStatus = computed<number | null>(() => cacheStore.getActiveSemesterStatus())
const hasActiveClass = computed<boolean>(() => typeof activeClassId.value === "number")
const isArchivedSemester = computed<boolean>(() => hasActiveClass.value && activeSemesterStatus.value === 2)
const canMutatePoints = computed<boolean>(() => hasActiveClass.value && !isArchivedSemester.value)

const flatRules = computed<FlatRuleItem[]>(() => {
    return ruleGroups.value.flatMap((group) => {
        const groupName = group.name?.trim() || "未命名规则组"
        return (group.rules ?? [])
            .map((rule) => {
                const ruleId = toNumber(rule.id, 0)
                const ruleName = rule.name?.trim() || ""
                if (!ruleId || !ruleName) {
                    return null
                }

                return {
                    id: ruleId,
                    name: ruleName,
                    sign: inferRuleSign(rule),
                    groupName
                }
            })
            .filter((rule): rule is FlatRuleItem => rule !== null)
    })
})

const selectedRuleGroup = computed<RuleGroup | null>(() => {
    return ruleGroups.value.find((group) => toNumber(group.id, 0) === selectedRuleGroupId.value) ?? null
})

const selectedRuleGroupRules = computed<Rule[]>(() => {
    return (selectedRuleGroup.value?.rules ?? []) as Rule[]
})

const totalRuleCount = computed<number>(() => {
    return flatRules.value.length
})

const plusRuleCount = computed<number>(() => {
    return flatRules.value.filter((rule) => rule.sign === "plus").length
})

const minusRuleCount = computed<number>(() => {
    return flatRules.value.filter((rule) => rule.sign === "minus").length
})

const studentGroupOptions = computed(() => {
    return studentGroups.value
        .map((group) => ({
            id: toNumber(group.id, 0),
            name: group.name?.trim() || "未命名分组",
            count: group.students?.length ?? 0
        }))
        .filter((group) => group.id > 0)
})

const rankingItems = computed<RankingDisplayItem[]>(() => {
    const sourceItems = activeRankingTab.value === "item" ? ruleRankingItems.value : totalRankingItems.value
    if (sourceItems.length > 0) {
        return sourceItems.map((item, index) => {
            const studentId = toNumber(item.student_id, 0)
            const score = toNumber(item.score, 0)
            const rank = toNumber(item.rank, index + 1)
            const studentName = item.student_name?.trim() || `学生 ${rank}`

            return {
                id: studentId || index + 1,
                name: studentName,
                rankLabel: String(rank),
                rankClass: getRankingRankClass(rank),
                scoreLabel: `${score} 分`
            }
        })
    }

    return []
})

const latestRecordSummary = computed<string>(() => {
    const latestRecord = historyRecords.value[0]
    if (!latestRecord) {
        return "还没有课堂积分记录"
    }

    const studentName = latestRecord.student_name?.trim() || "未知学生"
    const ruleName = latestRecord.rule_desc?.trim() || "规则记录"
    return `${studentName} · ${ruleName}`
})

const historyPageCount = computed<number>(() => {
    return Math.max(1, Math.ceil(historyTotal.value / historyPageSize))
})

const deleteTargetName = computed<string>(() => {
    if (deleteTargetType.value === "group") {
        return selectedRuleGroup.value?.name?.trim() || "当前规则组"
    }

    return selectedRuleGroupRules.value.find((rule) => toNumber(rule.id, 0) === pendingDeleteRuleId.value)?.name?.trim()
        || "当前积分项"
})

/** 安全地将任意值转换为数字。 */
function toNumber(value: unknown, fallback = 0): number {
    const parsedValue = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}

/** 推断当前积分项是加分还是扣分。 */
function inferRuleSign(rule: Rule): "plus" | "minus" {
    const pointsType = toNumber(rule.points_type, 0)
    if (pointsType === 2) {
        return "minus"
    }
    if (pointsType === 1) {
        return "plus"
    }
    return toNumber(rule.points, 0) < 0 ? "minus" : "plus"
}

/** 推断积分记录的正负分值。 */
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

/** 获取排行榜名次对应的视觉类名。 */
function getRankingRankClass(rank: number): string {
    if (rank === 1) {
        return "is-top-1"
    }
    if (rank === 2) {
        return "is-top-2"
    }
    if (rank === 3) {
        return "is-top-3"
    }
    return ""
}

/** 获取积分记录来源标签。 */
function getRecordSourceLabel(record: PointsApplyRecord): string {
    const source = toNumber(record.from, 0)
    if (source === 1) {
        return "商城"
    }
    if (source === 2) {
        return "积分规则"
    }
    return "课堂记录"
}

/** 获取积分记录的时间展示文本。 */
function getRecordTimeLabel(record: PointsApplyRecord): string {
    const rawValue = record.created_at
    if (!rawValue) {
        return "未知时间"
    }

    if (typeof rawValue === "number") {
        return formatChineseDateTime(new Date(rawValue))
    }

    const timestamp = Date.parse(String(rawValue))
    if (!Number.isFinite(timestamp)) {
        return "未知时间"
    }

    return formatChineseDateTime(new Date(timestamp))
}

/** 判断指定积分记录是否允许撤回。 */
function canUndoRecord(record: PointsApplyRecord): boolean {
    if (!canMutatePoints.value || recordMutationLoading.value) {
        return false
    }

    return toNumber(record.from, 0) !== 1 && toNumber(record.id, 0) > 0
}

/** 重置积分页延迟加载状态。 */
function resetDeferredLoadState(): void {
    hasLoadedTotalRanking.value = false
    hasLoadedRuleRanking.value = false
    hasLoadedHistoryRecords.value = false
    totalRankingDirty.value = true
    ruleRankingDirty.value = true
    historyRecordsDirty.value = true
}

/** 标记排行榜数据需要刷新。 */
function markRankingDirty(target: "all" | "total" | "item" = "all"): void {
    if (target === "all" || target === "total") {
        totalRankingDirty.value = true
    }
    if (target === "all" || target === "item") {
        ruleRankingDirty.value = true
    }
}

/** 标记历史记录数据需要刷新。 */
function markHistoryDirty(): void {
    historyRecordsDirty.value = true
}

/** 同步规则组选中项与单项榜积分项选中值。 */
function syncRuleSelections(): void {
    const groupIds = ruleGroups.value.map((group) => toNumber(group.id, 0)).filter((groupId) => groupId > 0)
    if (!groupIds.includes(selectedRuleGroupId.value)) {
        selectedRuleGroupId.value = groupIds[0] ?? 0
    }

    const ruleIds = flatRules.value.map((rule) => rule.id)
    if (!ruleIds.includes(selectedRankingRuleId.value)) {
        selectedRankingRuleId.value = ruleIds[0] ?? 0
    }
}

/** 加载当前班级的学生分组数据。 */
async function loadStudentGroups(): Promise<void> {
    if (!activeClassId.value) {
        studentGroups.value = []
        return
    }

    try {
        studentGroups.value = await studentManager.listGroups(activeClassId.value)
    } catch (error) {
        console.error("加载学生分组失败", error)
        studentGroups.value = []
        ElMessage.error("加载学生分组失败")
    }
}

/** 加载积分规则组数据。 */
async function loadRuleGroups(): Promise<void> {
    ruleGroupsLoading.value = true
    try {
        ruleGroups.value = await pointsManager.listRuleGroups()
        syncRuleSelections()
    } catch (error) {
        console.error("加载积分规则失败", error)
        ruleGroups.value = []
        selectedRuleGroupId.value = 0
        selectedRankingRuleId.value = 0
        ElMessage.error("加载积分规则失败")
    } finally {
        ruleGroupsLoading.value = false
    }
}

/** 根据当前排行榜筛选条件加载数据。 */
async function loadRankingData(): Promise<void> {
    if (!activeClassId.value) {
        totalRankingItems.value = []
        ruleRankingItems.value = []
        return
    }

    rankingLoading.value = true
    try {
        if (activeRankingTab.value === "item") {
            if (!selectedRankingRuleId.value) {
                ruleRankingItems.value = []
                return
            }

            const response = await pointsManager.getRuleRanking({
                class_id: activeClassId.value,
                rule_id: selectedRankingRuleId.value,
                time_range: rankingTimeRange.value,
                limit: 10
            })
            ruleRankingItems.value = response.items ?? []
            hasLoadedRuleRanking.value = true
            ruleRankingDirty.value = false
            return
        }

        const response = await pointsManager.getClassRanking({
            class_id: activeClassId.value,
            time_range: rankingTimeRange.value,
            limit: 10
        })
        totalRankingItems.value = response.items ?? []
        hasLoadedTotalRanking.value = true
        totalRankingDirty.value = false
    } catch (error) {
        console.error("加载排行榜失败", error)
        if (activeRankingTab.value === "item") {
            ruleRankingItems.value = []
        } else {
            totalRankingItems.value = []
        }
        ElMessage.error("加载排行榜失败")
    } finally {
        rankingLoading.value = false
    }
}

/** 加载积分记录数据。 */
async function loadHistoryRecords(): Promise<void> {
    if (!activeClassId.value) {
        historyRecords.value = []
        historyTotal.value = 0
        return
    }

    recordsLoading.value = true
    try {
        const response = await pointsManager.listApplyRecords({
            class_id: activeClassId.value,
            name: historyKeyword.value.trim() || undefined,
            type: historySign.value === "plus" ? 1 : (historySign.value === "minus" ? 2 : undefined),
            offset: (historyPage.value - 1) * historyPageSize,
            limit: historyPageSize
        })
        historyRecords.value = (response.items ?? [])
            .slice()
            .sort((left, right) => getRecordTimestamp(right) - getRecordTimestamp(left))
        historyTotal.value = toNumber(response.total, 0)
        hasLoadedHistoryRecords.value = true
        historyRecordsDirty.value = false
    } catch (error) {
        console.error("加载积分记录失败", error)
        historyRecords.value = []
        historyTotal.value = 0
        ElMessage.error("加载积分记录失败")
    } finally {
        recordsLoading.value = false
    }
}

/** 获取积分记录排序时间戳。 */
function getRecordTimestamp(record: PointsApplyRecord): number {
    const rawValue = record.created_at
    if (typeof rawValue === "number") {
        return rawValue
    }
    if (rawValue) {
        const timestamp = Date.parse(String(rawValue))
        if (Number.isFinite(timestamp)) {
            return timestamp
        }
    }
    return toNumber(record.id, 0)
}

/** 按当前激活的排行榜页签按需加载数据。 */
async function ensureActiveRankingData(): Promise<void> {
    if (activeRankingTab.value === "item") {
        if (!selectedRankingRuleId.value) {
            ruleRankingItems.value = []
            return
        }

        if (!hasLoadedRuleRanking.value || ruleRankingDirty.value) {
            await loadRankingData()
        }
        return
    }

    if (!hasLoadedTotalRanking.value || totalRankingDirty.value) {
        await loadRankingData()
    }
}

/** 按当前激活的内容页签按需加载数据。 */
async function ensureActiveContentData(): Promise<void> {
    if (activeContentTab.value === "records") {
        if (!hasLoadedHistoryRecords.value || historyRecordsDirty.value) {
            await loadHistoryRecords()
        }
        return
    }

    await ensureActiveRankingData()
}

/** 刷新积分页的全部基础数据。 */
async function refreshPointsPage(): Promise<void> {
    if (!activeClassId.value) {
        studentGroups.value = []
        ruleGroups.value = []
        historyRecords.value = []
        historyTotal.value = 0
        totalRankingItems.value = []
        ruleRankingItems.value = []
        resetDeferredLoadState()
        return
    }

    pageLoading.value = true
    try {
        await loadRuleGroups()
        await ensureActiveContentData()
    } finally {
        pageLoading.value = false
    }
}

/** 打开积分导入弹窗，并在归档学期下进行提示。 */
function handleOpenImportItemsDialog(): void {
    if (!hasActiveClass.value) {
        ElMessage.warning("请先选择班级")
        return
    }
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持继续导入积分项")
        return
    }

    importItemsDialogVisible.value = true
}

/** 打开积分导入弹窗，并在归档学期下进行提示。 */
function handleOpenImportRecordsDialog(): void {
    if (!hasActiveClass.value) {
        ElMessage.warning("请先选择班级")
        return
    }
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持继续导入积分")
        return
    }

    importRecordsDialogVisible.value = true
}

/** 打开积分导出弹窗，并按需加载学生分组。 */
async function handleOpenExportDialog(): Promise<void> {
    if (!hasActiveClass.value) {
        ElMessage.warning("请先选择班级")
        return
    }

    await loadStudentGroups()
    exportDialogVisible.value = true
}

/** 切换积分页底部内容面板。 */
function handleSelectContentTab(tab: PointsContentTab): void {
    if (activeContentTab.value === tab) {
        return
    }

    activeContentTab.value = tab
}

/** 切换排行榜展示类型。 */
function handleSelectRankingTab(tab: "total" | "item"): void {
    if (activeRankingTab.value === tab) {
        return
    }

    activeRankingTab.value = tab
}

/** 打开新增规则组弹窗。 */
function openCreateGroupDialog(): void {
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持新增规则组")
        return
    }

    groupDialogMode.value = "create"
    groupForm.value = {
        id: 0,
        name: ""
    }
    groupDialogVisible.value = true
}

/** 打开编辑规则组弹窗。 */
function openEditGroupDialog(): void {
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持编辑规则组")
        return
    }

    if (!selectedRuleGroup.value) {
        ElMessage.warning("请先选择一个规则组")
        return
    }

    groupDialogMode.value = "edit"
    groupForm.value = {
        id: toNumber(selectedRuleGroup.value.id, 0),
        name: selectedRuleGroup.value.name?.trim() || ""
    }
    groupDialogVisible.value = true
}

/** 打开新增积分项弹窗。 */
function openCreateRuleDialog(): void {
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持新增积分项")
        return
    }

    if (!selectedRuleGroup.value) {
        ElMessage.warning("请先创建一个规则组")
        return
    }

    ruleDialogMode.value = "create"
    ruleForm.value = {
        id: 0,
        name: "",
        points: 1,
        sign: "plus"
    }
    ruleDialogVisible.value = true
}

/** 打开编辑积分项弹窗。 */
function openEditRuleDialog(rule: Rule): void {
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持编辑积分项")
        return
    }

    ruleDialogMode.value = "edit"
    ruleForm.value = {
        id: toNumber(rule.id, 0),
        name: rule.name?.trim() || "",
        points: Math.abs(toNumber(rule.points, 0)),
        sign: inferRuleSign(rule)
    }
    ruleDialogVisible.value = true
}

/** 保存规则组。 */
async function saveGroup(groupNameValue: string): Promise<void> {
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持保存规则组")
        return
    }

    const groupName = groupNameValue.trim()
    if (!groupName) {
        ElMessage.warning("请输入规则组名称")
        return
    }

    ruleMutationLoading.value = true
    try {
        if (groupDialogMode.value === "create") {
            await pointsManager.createRuleGroup({
                name: groupName,
                icon: ""
            })
            ElMessage.success("已新增规则组")
        } else {
            await pointsManager.updateRuleGroup(groupForm.value.id, {
                group_id: groupForm.value.id,
                name: groupName,
                icon: ""
            })
            ElMessage.success("已保存规则组")
        }

        groupDialogVisible.value = false
        await loadRuleGroups()
        markRankingDirty("item")
        if (activeContentTab.value === "ranking" && activeRankingTab.value === "item") {
            await ensureActiveRankingData()
        }
    } catch (error) {
        console.error("保存规则组失败", error)
        ElMessage.error("保存规则组失败")
    } finally {
        ruleMutationLoading.value = false
    }
}

/** 保存积分项。 */
async function saveRule(formValue: RuleFormSubmitPayload): Promise<void> {
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持保存积分项")
        return
    }

    if (!selectedRuleGroup.value && ruleDialogMode.value === "create") {
        ElMessage.warning("请先选择规则组")
        return
    }

    const ruleName = formValue.name.trim()
    if (!ruleName) {
        ElMessage.warning("请输入积分项名称")
        return
    }

    if (!Number.isInteger(formValue.points) || formValue.points <= 0) {
        ElMessage.warning("积分项分值必须为大于 0 的整数")
        return
    }

    ruleMutationLoading.value = true
    try {
        const type = formValue.sign === "minus" ? 2 : 1
        if (ruleDialogMode.value === "create") {
            await pointsManager.createRule({
                name: ruleName,
                points: formValue.points,
                type,
                rule_group_id: toNumber(selectedRuleGroup.value?.id, 0),
                icon: ""
            })
            ElMessage.success("已新增积分项")
        } else {
            await pointsManager.updateRule(ruleForm.value.id, {
                rule_id: ruleForm.value.id,
                name: ruleName,
                points: formValue.points,
                type,
                icon: ""
            })
            ElMessage.success("已保存积分项")
        }

        ruleDialogVisible.value = false
        await loadRuleGroups()
        markRankingDirty("item")
        if (activeContentTab.value === "ranking" && activeRankingTab.value === "item") {
            await ensureActiveRankingData()
        }
    } catch (error) {
        console.error("保存积分项失败", error)
        ElMessage.error("保存积分项失败")
    } finally {
        ruleMutationLoading.value = false
    }
}

/** 请求删除当前规则组。 */
function requestDeleteGroup(): void {
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持删除规则组")
        return
    }

    if (!selectedRuleGroup.value) {
        return
    }

    deleteTargetType.value = "group"
    pendingDeleteGroupId.value = toNumber(selectedRuleGroup.value.id, 0)
    deleteDialogVisible.value = true
}

/** 请求删除指定积分项。 */
function requestDeleteRule(rule: Rule): void {
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持删除积分项")
        return
    }

    deleteTargetType.value = "rule"
    pendingDeleteRuleId.value = toNumber(rule.id, 0)
    deleteDialogVisible.value = true
}

/** 确认执行删除动作。 */
async function confirmDelete(): Promise<void> {
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持删除积分规则")
        return
    }

    ruleMutationLoading.value = true
    try {
        if (deleteTargetType.value === "group") {
            await pointsManager.deleteRuleGroup(pendingDeleteGroupId.value)
            ElMessage.success("已删除规则组")
        } else {
            await pointsManager.deleteRule(pendingDeleteRuleId.value)
            ElMessage.success("已删除积分项")
        }

        deleteDialogVisible.value = false
        await loadRuleGroups()
        markRankingDirty("item")
        if (activeContentTab.value === "ranking" && activeRankingTab.value === "item") {
            await ensureActiveRankingData()
        }
    } catch (error) {
        console.error("删除规则失败", error)
        ElMessage.error("删除失败")
    } finally {
        ruleMutationLoading.value = false
    }
}

/** 处理积分规则变化后的刷新逻辑。 */
async function handleRulesChanged(): Promise<void> {
    await loadRuleGroups()
    markRankingDirty("item")
    if (activeContentTab.value === "ranking" && activeRankingTab.value === "item") {
        await ensureActiveRankingData()
    }
}

/** 处理积分记录变化后的刷新逻辑。 */
async function handleRecordsChanged(): Promise<void> {
    markRankingDirty()
    markHistoryDirty()

    const tasks: Promise<void>[] = []
    if (activeContentTab.value === "ranking") {
        tasks.push(ensureActiveRankingData())
    }
    if (activeContentTab.value === "records") {
        tasks.push(loadHistoryRecords())
    }
    await Promise.all(tasks)
}

/** 处理积分记录类型切换。 */
function handleSelectHistorySign(sign: "all" | "plus" | "minus"): void {
    historySign.value = sign
    historyPage.value = 1
}

/** 跳转到上一页积分记录。 */
function goToPrevHistoryPage(): void {
    if (historyPage.value <= 1) {
        return
    }
    historyPage.value -= 1
}

/** 跳转到下一页积分记录。 */
function goToNextHistoryPage(): void {
    if (historyPage.value >= historyPageCount.value) {
        return
    }
    historyPage.value += 1
}

/** 撤回指定积分记录。 */
async function undoRecord(record: PointsApplyRecord): Promise<void> {
    const recordId = toNumber(record.id, 0)
    if (!recordId || !canUndoRecord(record)) {
        return
    }

    recordMutationLoading.value = true
    try {
        await pointsManager.undoApply(recordId)
        ElMessage.success("已撤回该条记录")
        await handleRecordsChanged()
    } catch (error) {
        console.error("撤回积分记录失败", error)
        ElMessage.error("撤回失败")
    } finally {
        recordMutationLoading.value = false
    }
}

/** 撤回最近一次积分规则操作。 */
async function undoLatestRecord(): Promise<void> {
    if (!canMutatePoints.value || !activeClassId.value) {
        ElMessage.warning("当前状态不支持撤回积分记录")
        return
    }

    recordMutationLoading.value = true
    try {
        const response = await pointsManager.listApplyRecords({
            class_id: activeClassId.value,
            offset: 0,
            limit: 1
        })
        const latestRecordId = toNumber(response.items?.[0]?.id, 0)
        if (!latestRecordId) {
            ElMessage.info("没有可撤回的记录")
            return
        }

        await pointsManager.undoApply(latestRecordId)
        ElMessage.success("已撤回最近一次记录")
        await handleRecordsChanged()
    } catch (error) {
        console.error("撤回最近一次积分记录失败", error)
        ElMessage.error("撤回失败")
    } finally {
        recordMutationLoading.value = false
    }
}

watch(activeClassId, async () => {
    studentGroups.value = []
    resetDeferredLoadState()
    historyKeyword.value = ""
    historySign.value = "all"
    historyPage.value = 1
    await refreshPointsPage()
}, { immediate: true })

watch([activeRankingTab, rankingTimeRange], async () => {
    cacheStore.setPointsRankingTab(activeRankingTab.value)
    cacheStore.setPointsRankingTimeRange(rankingTimeRange.value)
    if (activeRankingTab.value === "item") {
        ruleRankingDirty.value = true
    } else {
        totalRankingDirty.value = true
    }

    if (activeContentTab.value !== "ranking") {
        return
    }

    await ensureActiveRankingData()
})

watch(selectedRankingRuleId, async () => {
    if (activeRankingTab.value !== "item") {
        return
    }

    ruleRankingDirty.value = true
    if (activeContentTab.value !== "ranking") {
        return
    }

    await ensureActiveRankingData()
})

watch(activeContentTab, async () => {
    cacheStore.setPointsContentTab(activeContentTab.value)
    await ensureActiveContentData()
})

let historyKeywordTimer: number | null = null
watch(historyKeyword, () => {
    historyPage.value = 1
    if (historyKeywordTimer) {
        window.clearTimeout(historyKeywordTimer)
    }

    historyKeywordTimer = window.setTimeout(() => {
        markHistoryDirty()
        if (activeContentTab.value !== "records") {
            return
        }
        void loadHistoryRecords()
    }, 280)
})

watch([historySign, historyPage], async () => {
    markHistoryDirty()
    if (activeContentTab.value !== "records") {
        return
    }
    await loadHistoryRecords()
})
</script>

<style scoped>
.points-view {
    display: grid;
    gap: 14px;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.metric-card {
    min-height: 112px;
    padding: 17px;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--ta-line);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.84);
    box-shadow: var(--ta-shadow-1);
}

.metric-card::after {
    content: "";
    position: absolute;
    width: 74px;
    height: 74px;
    right: -24px;
    bottom: -30px;
    border-radius: 50%;
    background: var(--metric-soft, var(--ta-blue-soft));
}

.metric-card span,
.metric-card strong,
.metric-card small {
    position: relative;
    z-index: 1;
    display: block;
}

.metric-card span {
    color: var(--ta-text-tertiary);
    font-size: 13px;
}

.metric-card strong {
    margin-top: 8px;
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.025em;
    font-variant-numeric: tabular-nums;
}

.metric-card small {
    margin-top: 9px;
    color: var(--ta-text-secondary);
    font-size: 13px;
    line-height: 1.4;
}

.metric-card--blue {
    --metric-soft: #dceeff;
}

.metric-card--gold {
    --metric-soft: #ffe6d6;
}

.metric-card--green {
    --metric-soft: #dcf2e1;
}

.points-view__notice {
    min-height: 44px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 9px;
    border: 1px solid #ffd8be;
    border-radius: 12px;
    color: #a53400;
    background: var(--ta-orange-soft);
    font-size: 13px;
}

.points-view__notice-icon {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
}

@media (max-width: 660px) {
    .metrics-grid {
        gap: 8px;
    }

    .metric-card {
        min-height: 104px;
        padding: 13px;
    }

    .metric-card strong {
        font-size: 25px;
    }

    .metric-card small {
        font-size: 11px;
    }
}
</style>
