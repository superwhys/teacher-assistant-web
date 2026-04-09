<template>
    <div class="shop-view">
        <ShopOverviewBanner
            :active-class-name="activeClassName"
            :active-semester-name="activeSemesterName"
            :can-mutate-shop="canMutateShop"
            :is-archived-semester="isArchivedSemester"
            :metric-items="overviewMetrics"
            :prize-count="prizes.length"
            @add-prize="openAddPrizeDialog"
            @open-import="importDialogVisible = true"
            @view-records="handleViewRecords"
        />

        <div v-if="isArchivedSemester" class="shop-view__notice">
            <i-ep-warning-filled class="shop-view__notice-icon" />
            <span>当前为归档学期，仅支持浏览奖品，不支持学生兑换。</span>
        </div>

        <section class="shop-view__tabs">
            <button
                type="button"
                class="shop-view__tab-button"
                :class="{ 'is-active': activeTab === 'overview' }"
                @click="activeTab = 'overview'"
            >
                商品总览
            </button>
            <button
                type="button"
                class="shop-view__tab-button"
                :class="{ 'is-active': activeTab === 'records' }"
                @click="activeTab = 'records'"
            >
                兑换记录
            </button>
        </section>

        <Transition name="content-panel" mode="out-in">
            <div v-if="activeTab === 'overview'" key="overview" class="shop-view__content-grid">
                <ShopPrizeShelf
                    :items="prizes"
                    :can-exchange="canMutateShop"
                    @delete="requestDeletePrize"
                    @edit="openEditPrizeDialog"
                    @exchange="openExchangeDialog"
                />

                <ShopRecordsPanel
                    :records="recentRecords"
                    :loading="recordsLoading"
                    :total="recordsTotal"
                    :page-size="recordsPageSize"
                    :current-page="recordsCurrentPage"
                    :student-id-name-map="studentIdNameMap"
                    :prize-id-map="prizeIdMap"
                    preview
                    @open-full="handleViewRecords"
                    @undo="requestUndoExchange"
                />
            </div>

            <ShopRecordsPanel
                v-else
                key="records"
                :records="records"
                :loading="recordsLoading"
                :total="recordsTotal"
                :page-size="recordsPageSize"
                :current-page="recordsCurrentPage"
                :student-id-name-map="studentIdNameMap"
                :prize-id-map="prizeIdMap"
                @page-change="handleRecordsPageChange"
                @undo="requestUndoExchange"
            />
        </Transition>

        <ShopPrizeEditorDialog
            v-model="itemDialogVisible"
            :form="itemForm"
            :mode="itemDialogMode"
            @save="savePrize"
        />

        <ShopExchangeDialog
            v-model="exchangeDialogVisible"
            :available-points-by-student-id="availablePointsByStudentId"
            :form="exchangeForm"
            :max-count="Math.max(1, selectedPrizeInfo.stock)"
            :prize="selectedPrizeInfo"
            :required-points="requiredPoints"
            :students="studentsForExchange"
            @confirm="confirmExchange"
        />

        <ShopImportDialog
            v-model="importDialogVisible"
            @confirm="confirmImport"
        />

        <StudentsConfirmDialog
            v-model="deleteDialogVisible"
            title="删除商品"
            eyebrow="风险操作"
            description="删除后该商品会从当前商城中移除，已有兑换记录不会被自动删除，请确认后再执行。"
            :message="deleteDialogMessage"
            confirm-text="确认删除"
            @confirm="confirmDeletePrize"
        />

        <StudentsConfirmDialog
            v-model="undoDialogVisible"
            title="撤销兑换"
            eyebrow="风险操作"
            description="撤销后会回退本次兑换产生的库存和积分变更，请确认这条记录确实需要撤销。"
            :message="undoDialogMessage"
            confirm-text="确认撤销"
            @confirm="confirmUndoExchange"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue"
import { ElMessage } from "element-plus"
import { studentManager } from "@/managers/student"
import { shopManager } from "@/managers/shop"
import { useCacheStore } from "@/stores/cacheStore"
import type { CreatePrizeReq, Prize, PrizeRecord } from "@/types/mall"
import type { StudentDTO } from "@/types/student"
import StudentsConfirmDialog from "@/v3/components/students/StudentsConfirmDialog.vue"
import ShopExchangeDialog from "@/v3/components/shop/ShopExchangeDialog.vue"
import ShopImportDialog from "@/v3/components/shop/ShopImportDialog.vue"
import ShopOverviewBanner from "@/v3/components/shop/ShopOverviewBanner.vue"
import ShopPrizeEditorDialog from "@/v3/components/shop/ShopPrizeEditorDialog.vue"
import ShopPrizeShelf from "@/v3/components/shop/ShopPrizeShelf.vue"
import ShopRecordsPanel from "@/v3/components/shop/ShopRecordsPanel.vue"

defineOptions({ name: "ShopView" })

/** 定义商城页签结构。 */
type ShopViewTab = "overview" | "records"

/** 定义商城概览指标结构。 */
interface ShopOverviewMetricItem {
    detail: string
    id: string
    label: string
    toneClass: string
    value: string
}

/** 定义商品编辑表单结构。 */
interface ShopPrizeFormState {
    description: string
    icon: string
    id: number
    name: string
    points: number
    stock: number
}

/** 定义兑换表单结构。 */
interface ShopExchangeFormState {
    count: number
    prizeId: number
    studentId: number | null
}

/** 定义兑换学生选项结构。 */
interface ShopExchangeStudentOption {
    availablePoints: number
    id: number
    name: string
}

/** 定义兑换商品预览结构。 */
interface ShopExchangePrizeInfo {
    description: string
    icon: string
    name: string
    points: number
    stock: number
}

const cacheStore = useCacheStore()

const activeTab = ref<ShopViewTab>("overview")
const students = ref<StudentDTO[]>([])
const prizes = ref<Prize[]>([])
const records = ref<PrizeRecord[]>([])
const recordsTotal = ref(0)
const recordsLoading = ref(false)
const recordsPageSize = ref(6)
const recordsCurrentPage = ref(1)

const itemDialogVisible = ref(false)
const itemDialogMode = ref<"add" | "edit">("add")
const importDialogVisible = ref(false)
const exchangeDialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const pendingDeletePrize = ref<Prize | null>(null)
const undoDialogVisible = ref(false)
const pendingUndoRecord = ref<PrizeRecord | null>(null)

const itemForm = reactive<ShopPrizeFormState>({
    description: "",
    icon: "goods-filled",
    id: 0,
    name: "",
    points: 0,
    stock: 1,
})

const exchangeForm = reactive<ShopExchangeFormState>({
    count: 1,
    prizeId: 0,
    studentId: null,
})

let studentsLoadedForClassId: number | null = null
let lastStudentsRequestId = 0

/** 返回当前激活的班级 ID。 */
const activeClassId = computed<number | null>(() => cacheStore.getActiveClassId())

/** 返回当前班级名称。 */
const activeClassName = computed<string>(() => cacheStore.getActiveClassName()?.trim() || "未选择班级")

/** 返回当前学期名称。 */
const activeSemesterName = computed<string>(() => cacheStore.getActiveSemesterName()?.trim() || "当前学期")

/** 返回当前学期状态值。 */
const activeSemesterStatus = computed<number | null>(() => cacheStore.getActiveSemesterStatus())

/** 返回是否已选择班级。 */
const hasActiveClass = computed<boolean>(() => typeof activeClassId.value === "number")

/** 返回当前是否为归档学期。 */
const isArchivedSemester = computed<boolean>(() => hasActiveClass.value && activeSemesterStatus.value === 2)

/** 返回商城当前是否允许兑换。 */
const canMutateShop = computed<boolean>(() => hasActiveClass.value && !isArchivedSemester.value)

/** 返回商品 ID 映射表。 */
const prizeIdMap = computed<Record<number, Prize>>(() => {
    const prizeMap: Record<number, Prize> = {}

    for (const prize of prizes.value) {
        const prizeId = toNumber(prize.id, 0)
        if (!prizeId) {
            continue
        }

        prizeMap[prizeId] = prize
    }

    return prizeMap
})

/** 返回学生名称映射表。 */
const studentIdNameMap = computed<Record<number, string>>(() => {
    const studentMap: Record<number, string> = {}

    for (const student of students.value) {
        const studentId = toNumber(student.id, 0)
        const studentName = student.name?.trim() || ""

        if (!studentId || !studentName) {
            continue
        }

        studentMap[studentId] = studentName
    }

    return studentMap
})

/** 返回学生可用积分映射表。 */
const availablePointsByStudentId = computed<Record<number, number>>(() => {
    const pointsMap: Record<number, number> = {}

    for (const student of students.value) {
        const studentId = toNumber(student.id, 0)
        if (!studentId) {
            continue
        }

        pointsMap[studentId] = toNumber(student.available_points, 0)
    }

    return pointsMap
})

/** 返回兑换弹窗使用的学生选项。 */
const studentsForExchange = computed<ShopExchangeStudentOption[]>(() => {
    return students.value
        .map((student) => ({
            availablePoints: toNumber(student.available_points, 0),
            id: toNumber(student.id, 0),
            name: student.name?.trim() || "",
        }))
        .filter((student) => student.id > 0 && student.name)
        .sort((currentItem, nextItem) => nextItem.availablePoints - currentItem.availablePoints)
})

/** 返回当前选中的商品。 */
const selectedPrize = computed<Prize | null>(() => {
    if (!exchangeForm.prizeId) {
        return null
    }

    return prizeIdMap.value[exchangeForm.prizeId] ?? null
})

/** 返回兑换弹窗的商品预览信息。 */
const selectedPrizeInfo = computed<ShopExchangePrizeInfo>(() => ({
    description: selectedPrize.value?.description?.trim() || "",
    icon: selectedPrize.value?.icon?.trim() || "goods-filled",
    name: selectedPrize.value?.name?.trim() || "课堂奖励",
    points: toNumber(selectedPrize.value?.points, 0),
    stock: toNumber(selectedPrize.value?.stock, 0),
}))

/** 返回当前兑换需要消耗的总积分。 */
const requiredPoints = computed<number>(() => {
    return Math.max(1, toNumber(exchangeForm.count, 1)) * toNumber(selectedPrize.value?.points, 0)
})

/** 返回最近兑换记录。 */
const recentRecords = computed<PrizeRecord[]>(() => records.value.slice(0, 5))

/** 返回删除商品确认弹窗文案。 */
const deleteDialogMessage = computed<string>(() => {
    const prizeName = pendingDeletePrize.value?.name?.trim() || "未命名商品"
    return `确定删除商品“${prizeName}”吗？`
})

/** 返回撤销兑换确认弹窗文案。 */
const undoDialogMessage = computed<string>(() => {
    const record = pendingUndoRecord.value
    if (!record) {
        return "确定撤销这条兑换记录吗？"
    }

    const studentName = record.student_name?.trim()
        || studentIdNameMap.value[toNumber(record.student_id, 0)]
        || "该学生"

    return `确定撤销“${studentName}”的兑换记录吗？`
})

/** 返回商品库存总量。 */
const totalPrizeStock = computed<number>(() => {
    return prizes.value.reduce((total, prize) => total + toNumber(prize.stock, 0), 0)
})

/** 返回可兑换商品数量。 */
const exchangeablePrizeCount = computed<number>(() => {
    return prizes.value.filter((prize) => toNumber(prize.stock, 0) > 0).length
})

/** 返回最近一次兑换摘要。 */
const latestRecordSummary = computed<string>(() => {
    const latestRecord = records.value[0]
    if (!latestRecord) {
        return "当前班级还没有兑换记录"
    }

    const studentName = latestRecord.student_name?.trim()
        || studentIdNameMap.value[toNumber(latestRecord.student_id, 0)]
        || "某位同学"
    const prizeName = prizeIdMap.value[toNumber(latestRecord.prize_id, 0)]?.name?.trim() || "奖励商品"
    const recordCount = toNumber(latestRecord.count, 0)

    return `${studentName} 最近兑换了 ${recordCount} 个 ${prizeName}`
})

/** 返回商城顶部概览指标。 */
const overviewMetrics = computed<ShopOverviewMetricItem[]>(() => [
    {
        detail: prizes.value.length > 0 ? "支持新增、编辑、删除和 Excel 导入" : "点击右上角按钮开始配置奖品",
        id: "prize-count",
        label: "商城奖品",
        toneClass: "metric-card--violet",
        value: `${prizes.value.length} 个`,
    },
    {
        detail: `${exchangeablePrizeCount.value} 个商品可立即兑换`,
        id: "stock-count",
        label: "当前库存",
        toneClass: "metric-card--amber",
        value: `${totalPrizeStock.value}`,
    },
    {
        detail: latestRecordSummary.value,
        id: "record-count",
        label: "兑换记录",
        toneClass: "metric-card--emerald",
        value: `${recordsTotal.value} 条`,
    },
])

/** 将任意值转换为数字。 */
function toNumber(value: unknown, fallback = 0): number {
    const parsedValue = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}

/** 打开新增商品弹窗。 */
function openAddPrizeDialog(): void {
    itemDialogMode.value = "add"
    itemForm.id = 0
    itemForm.name = ""
    itemForm.points = 0
    itemForm.stock = 1
    itemForm.description = ""
    itemForm.icon = "goods-filled"
    itemDialogVisible.value = true
}

/** 打开编辑商品弹窗。 */
function openEditPrizeDialog(prize: Prize): void {
    itemDialogMode.value = "edit"
    itemForm.id = toNumber(prize.id, 0)
    itemForm.name = prize.name?.trim() || ""
    itemForm.points = toNumber(prize.points, 0)
    itemForm.stock = toNumber(prize.stock, 0)
    itemForm.description = prize.description?.trim() || ""
    itemForm.icon = prize.icon?.trim() || "goods-filled"
    itemDialogVisible.value = true
}

/** 保存商品新增或编辑结果。 */
async function savePrize(): Promise<void> {
    if (!itemForm.name.trim()) {
        ElMessage.warning("请输入商品名称")
        return
    }

    if (itemForm.points <= 0) {
        ElMessage.warning("兑换积分必须大于 0")
        return
    }

    if (itemDialogMode.value === "add" && itemForm.stock <= 0) {
        ElMessage.warning("新建商品时库存必须大于 0")
        return
    }

    if (itemDialogMode.value === "edit" && itemForm.stock < 0) {
        ElMessage.warning("库存不能小于 0")
        return
    }

    try {
        if (itemDialogMode.value === "add") {
            const createPayload: CreatePrizeReq = {
                description: itemForm.description.trim(),
                icon: itemForm.icon,
                name: itemForm.name.trim(),
                points: itemForm.points,
                stock: itemForm.stock,
            }

            await shopManager.createPrize(createPayload)
            ElMessage.success("商品添加成功")
        } else {
            if (!itemForm.id) {
                ElMessage.error("商品 ID 异常")
                return
            }

            await shopManager.updatePrize(itemForm.id, {
                description: itemForm.description.trim(),
                icon: itemForm.icon,
                name: itemForm.name.trim(),
                points: itemForm.points,
                stock: itemForm.stock,
            })
            ElMessage.success("商品更新成功")
        }

        itemDialogVisible.value = false
        await refreshPrizes()
    } catch (error) {
        console.error(error)
    }
}

/** 请求删除指定商品。 */
function requestDeletePrize(prize: Prize): void {
    pendingDeletePrize.value = prize
    deleteDialogVisible.value = true
}

/** 确认删除当前商品。 */
async function confirmDeletePrize(): Promise<void> {
    const prize = pendingDeletePrize.value
    deleteDialogVisible.value = false
    if (!prize) {
        return
    }

    const prizeId = toNumber(prize.id, 0)
    if (!prizeId) {
        ElMessage.error("商品 ID 异常")
        pendingDeletePrize.value = null
        return
    }

    try {
        await shopManager.deletePrize(prizeId)
        ElMessage.success("商品已删除")
        await refreshPrizes()
    } catch (error) {
        console.error(error)
    } finally {
        pendingDeletePrize.value = null
    }
}

/** 打开兑换弹窗。 */
async function openExchangeDialog(prize: Prize): Promise<void> {
    if (!activeClassId.value) {
        ElMessage.warning("请先选择班级")
        return
    }

    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持兑换奖品")
        return
    }

    if (toNumber(prize.stock, 0) <= 0) {
        ElMessage.warning("当前商品库存不足")
        return
    }

    await ensureStudentsLoaded()
    if (students.value.length === 0) {
        ElMessage.warning("当前班级暂无学生")
        return
    }

    exchangeForm.prizeId = toNumber(prize.id, 0)
    exchangeForm.studentId = null
    exchangeForm.count = 1
    exchangeDialogVisible.value = true
}

/** 确认提交兑换请求。 */
async function confirmExchange(): Promise<void> {
    if (!activeClassId.value) {
        ElMessage.warning("请先选择班级")
        return
    }

    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持兑换奖品")
        return
    }

    if (!exchangeForm.studentId) {
        ElMessage.warning("请选择兑换学生")
        return
    }

    if (exchangeForm.count <= 0) {
        ElMessage.warning("兑换数量必须大于 0")
        return
    }

    if (!selectedPrize.value) {
        ElMessage.error("商品不存在")
        return
    }

    const prizeStock = toNumber(selectedPrize.value.stock, 0)
    if (prizeStock < exchangeForm.count) {
        ElMessage.warning("商品库存不足")
        return
    }

    const availablePoints = availablePointsByStudentId.value[exchangeForm.studentId] ?? 0
    if (availablePoints < requiredPoints.value) {
        ElMessage.warning(`学生可用积分不足，当前 ${availablePoints}，需要 ${requiredPoints.value}`)
        return
    }

    try {
        await shopManager.exchangePrize(
            activeClassId.value,
            toNumber(selectedPrize.value.id, 0),
            exchangeForm.studentId,
            exchangeForm.count
        )

        const studentName = studentIdNameMap.value[exchangeForm.studentId] || "该学生"
        ElMessage.success(`${studentName} 已成功兑换 ${exchangeForm.count} 个 ${selectedPrize.value.name?.trim() || "商品"}`)
        exchangeDialogVisible.value = false
        await refreshPrizes()
        await loadRecordsPage(1)
    } catch (error) {
        console.error(error)
    }
}

/** 请求撤销兑换记录。 */
function requestUndoExchange(record: PrizeRecord): void {
    pendingUndoRecord.value = record
    undoDialogVisible.value = true
}

/** 确认撤销当前兑换记录。 */
async function confirmUndoExchange(): Promise<void> {
    const record = pendingUndoRecord.value
    undoDialogVisible.value = false
    if (!record) {
        return
    }

    const orderId = toNumber(record.id, 0)
    if (!orderId) {
        ElMessage.error("记录 ID 异常")
        pendingUndoRecord.value = null
        return
    }

    try {
        await shopManager.undoExchangePrize(orderId)
        ElMessage.success("兑换记录已撤销")
        await refreshPrizes()
        await loadRecordsPage(recordsCurrentPage.value)
    } catch (error) {
        console.error(error)
    } finally {
        pendingUndoRecord.value = null
    }
}

/** 批量导入商品。 */
async function confirmImport(items: CreatePrizeReq[]): Promise<void> {
    if (items.length === 0) {
        ElMessage.warning("当前没有可导入的商品")
        return
    }

    let successCount = 0
    for (const item of items) {
        try {
            await shopManager.createPrize(item)
            successCount += 1
        } catch (error) {
            console.error(error)
        }
    }

    ElMessage.success(`成功导入 ${successCount} 个奖品`)
    await refreshPrizes()
}

/** 按需加载当前班级学生数据。 */
async function ensureStudentsLoaded(): Promise<void> {
    const classId = activeClassId.value
    if (!classId) {
        students.value = []
        studentsLoadedForClassId = null
        return
    }

    if (studentsLoadedForClassId === classId && students.value.length > 0) {
        return
    }

    const requestId = ++lastStudentsRequestId

    try {
        const studentList = await studentManager.list(classId)
        if (requestId !== lastStudentsRequestId) {
            return
        }

        students.value = studentList
        studentsLoadedForClassId = classId
    } catch (error) {
        console.error(error)
        if (requestId !== lastStudentsRequestId) {
            return
        }

        students.value = []
        studentsLoadedForClassId = null
    }
}

/** 刷新商品列表。 */
async function refreshPrizes(): Promise<void> {
    try {
        prizes.value = await shopManager.listPrizes()
    } catch (error) {
        console.error(error)
        prizes.value = []
    }
}

/** 按页加载兑换记录。 */
async function loadRecordsPage(page: number): Promise<void> {
    if (recordsLoading.value) {
        return
    }

    if (!activeClassId.value) {
        records.value = []
        recordsTotal.value = 0
        recordsCurrentPage.value = 1
        return
    }

    recordsLoading.value = true

    try {
        const nextPage = Math.max(1, toNumber(page, 1))
        recordsCurrentPage.value = nextPage

        const response = await shopManager.listPrizeRecords({
            class_id: activeClassId.value,
            limit: recordsPageSize.value,
            offset: (nextPage - 1) * recordsPageSize.value,
        })

        records.value = [...(response.items ?? [])].sort((currentItem, nextItem) => {
            return toNumber(nextItem.id, 0) - toNumber(currentItem.id, 0)
        })
        recordsTotal.value = toNumber(response.total, 0)
    } catch (error) {
        console.error(error)
        records.value = []
        recordsTotal.value = 0
    } finally {
        recordsLoading.value = false
    }
}

/** 切换到兑换记录视图。 */
function handleViewRecords(): void {
    activeTab.value = "records"
}

/** 处理兑换记录分页切换。 */
async function handleRecordsPageChange(page: number): Promise<void> {
    await loadRecordsPage(page)
}

onMounted(async () => {
    await Promise.all([
        refreshPrizes(),
        loadRecordsPage(1),
    ])
})

watch(activeClassId, async () => {
    students.value = []
    studentsLoadedForClassId = null
    await loadRecordsPage(1)
})

watch(activeTab, async (tab) => {
    if (tab === "overview" && recordsCurrentPage.value !== 1) {
        await loadRecordsPage(1)
    }
})
</script>

<style scoped>
.shop-view {
    display: grid;
    gap: 18px;
}

.shop-view__notice,
.shop-view__tabs,
.shop-view__content-grid {
    display: flex;
    gap: 12px;
}

.shop-view__notice {
    align-items: center;
    padding: 14px 16px;
    border-radius: 22px;
    border: 1px solid rgba(247, 144, 9, 0.22);
    background: rgba(255, 247, 230, 0.88);
    color: #8a4b07;
    font-size: 14px;
    font-weight: 600;
}

.shop-view__notice-icon {
    font-size: 18px;
}

.shop-view__tabs {
    padding: 8px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
}

.shop-view__tab-button {
    min-height: 46px;
    padding: 0 18px;
    border: none;
    border-radius: 18px;
    background: transparent;
    color: #627099;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.shop-view__tab-button.is-active {
    background: linear-gradient(135deg, rgba(85, 104, 255, 0.14), rgba(142, 108, 255, 0.16));
    color: #16213e;
}

.shop-view__tab-button:hover {
    transform: translateY(-1px);
}

.shop-view__content-grid {
    align-items: stretch;
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
}

.content-panel-enter-active,
.content-panel-leave-active {
    transition: opacity 0.22s ease, transform 0.22s ease;
}

.content-panel-enter-from,
.content-panel-leave-to {
    opacity: 0;
    transform: translateY(8px);
}

@media (max-width: 1200px) {
    .shop-view__content-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .shop-view__tabs {
        flex-direction: column;
    }

    .shop-view__tab-button {
        width: 100%;
    }
}
</style>
