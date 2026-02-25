<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCacheStore } from '@/stores/cacheStore'
import { studentManager } from '@/managers/student'
import { shopManager } from '@/managers/shop'
import type { StudentDTO } from '@/types/student'
import type { CreatePrizeReq, Prize, PrizeRecord } from '@/types/mall'
import { getShopIconComponent } from '@/components/shop/shopIcons'
import * as XLSX from 'xlsx'

import ShopHeaderRow from '@/components/shop/ShopHeaderRow.vue'
import ShopToolbar from '@/components/shop/ShopToolbar.vue'
import ShopPrizeGrid from '@/components/shop/ShopPrizeGrid.vue'
import ShopRecordsTable from '@/components/shop/ShopRecordsTable.vue'
import ShopPrizeEditorDialog from '@/components/shop/ShopPrizeEditorDialog.vue'
import ShopExchangeDialog from '@/components/shop/ShopExchangeDialog.vue'
import ShopImportDialog from '@/components/shop/ShopImportDialog.vue'

defineOptions({
    name: 'ShopView'
})

const cacheStore = useCacheStore()

const activeTab = ref<'shop' | 'records'>('shop')

const activeClassId = computed<number | null>(() => cacheStore.getActiveClassId())
const activeSemesterIsLatest = computed(() => cacheStore.getActiveSemesterIsLatest())
const isArchivedSemester = computed(() => !!activeClassId.value && activeSemesterIsLatest.value === false)

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

const students = ref<StudentDTO[]>([])
const prizes = ref<Prize[]>([])
const records = ref<PrizeRecord[]>([])
const recordsTotal = ref(0)
const recordsLoading = ref(false)
const recordsPageSize = ref(20)
const recordsCurrentPage = ref(1)

const shopItems = computed<Prize[]>(() => prizes.value ?? [])

const studentIdNameMap = computed<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    for (const s of students.value ?? []) {
        const id = toNumber(s.id, 0)
        const name = (s.name ?? '').trim()
        if (!id || !name) continue
        map[id] = name
    }
    return map
})

const availablePointsByStudentId = computed<Record<number, number>>(() => {
    const map: Record<number, number> = {}
    for (const s of students.value ?? []) {
        const id = toNumber(s.id, 0)
        if (!id) continue
        map[id] = toNumber(s.available_points, 0)
    }
    return map
})

const studentsForExchange = computed(() => {
    const list = (students.value ?? [])
        .map(s => ({
            id: toNumber(s.id, 0),
            name: (s.name ?? '').trim(),
            availablePoints: toNumber(s.available_points, 0),
        }))
        .filter(s => s.id > 0 && !!s.name)
    return list.sort((a, b) => b.availablePoints - a.availablePoints)
})

const prizeIdMap = computed<Record<number, Prize>>(() => {
    const map: Record<number, Prize> = {}
    for (const p of prizes.value ?? []) {
        const id = toNumber(p.id, 0)
        if (!id) continue
        map[id] = p
    }
    return map
})

const exchangeRecords = computed(() => records.value ?? [])

const itemDialogVisible = ref(false)
const itemDialogMode = ref<'add' | 'edit'>('add')
const itemForm = reactive({
    id: 0,
    name: '',
    points: 0,
    stock: 0,
    description: '',
    icon: 'goods-filled'
})

function openAddItemDialog() {
    itemDialogMode.value = 'add'
    itemForm.id = 0
    itemForm.name = ''
    itemForm.points = 0
    itemForm.stock = 0
    itemForm.description = ''
    itemForm.icon = 'goods-filled'
    itemDialogVisible.value = true
}

function openEditItemDialog(item: Prize) {
    itemDialogMode.value = 'edit'
    itemForm.id = toNumber(item.id, 0)
    itemForm.name = (item.name ?? '').trim()
    itemForm.points = toNumber(item.points, 0)
    itemForm.stock = toNumber(item.stock, 0)
    itemForm.description = (item.description ?? '').trim()
    itemForm.icon = (item.icon ?? 'goods-filled').trim() || 'goods-filled'
    itemDialogVisible.value = true
}

async function saveItem() {
    if (!itemForm.name.trim()) {
        ElMessage.warning('请输入商品名称')
        return
    }
    if (itemForm.points <= 0) {
        ElMessage.warning('积分必须大于0')
        return
    }
    if (itemForm.stock < 0) {
        ElMessage.warning('库存不能为负数')
        return
    }

    try {
        if (itemDialogMode.value === 'add') {
            const payload: CreatePrizeReq = {
                name: itemForm.name.trim(),
                points: itemForm.points,
                stock: itemForm.stock,
                description: itemForm.description,
                icon: itemForm.icon,
            }
            await shopManager.createPrize(payload)
            ElMessage.success('商品添加成功')
        } else {
            if (!itemForm.id) {
                ElMessage.error('商品 ID 异常')
                return
            }
            await shopManager.updatePrize(itemForm.id, {
                name: itemForm.name.trim(),
                points: itemForm.points,
                stock: itemForm.stock,
                description: itemForm.description,
                icon: itemForm.icon,
            })
            ElMessage.success('商品更新成功')
        }
        itemDialogVisible.value = false
        await refreshPrizes()
    } catch {
    }
}

function deleteItem(item: Prize) {
    ElMessageBox.confirm(`确定删除商品「${item.name ?? ''}」吗？`, '删除确认', {
        type: 'warning'
    }).then(() => {
        const id = toNumber(item.id, 0)
        if (!id) {
            ElMessage.error('商品 ID 异常')
            return
        }
        shopManager.deletePrize(id).then(async () => {
            ElMessage.success('商品已删除')
            await refreshPrizes()
        }).catch(() => { })
    }).catch(() => { })
}

const exchangeDialogVisible = ref(false)
const exchangeForm = reactive({
    prizeId: 0,
    studentId: null as number | null,
    count: 1
})

const selectedPrize = computed<Prize | null>(() => {
    const id = exchangeForm.prizeId
    if (!id) return null
    return prizeIdMap.value[id] ?? null
})

const requiredPoints = computed<number>(() => {
    const prize = selectedPrize.value
    if (!prize) return 0
    return toNumber(prize.points, 0) * toNumber(exchangeForm.count, 0)
})

async function openExchangeDialog(item: Prize) {
    if (!activeClassId.value) {
        ElMessage.error('请先选择班级')
        return
    }
    if (isArchivedSemester.value) {
        ElMessage.warning('归档学期不支持兑换奖品')
        return
    }
    if (toNumber(item.stock, 0) <= 0) {
        ElMessage.warning('商品库存不足')
        return
    }
    await ensureStudentsLoaded()
    if (students.value.length === 0) {
        ElMessage.warning('当前班级暂无学生')
    }
    exchangeForm.prizeId = toNumber(item.id, 0)
    exchangeForm.studentId = null
    exchangeForm.count = 1
    exchangeDialogVisible.value = true
}

async function confirmExchange() {
    if (!activeClassId.value) return
    if (isArchivedSemester.value) {
        ElMessage.warning('归档学期不支持兑换奖品')
        return
    }
    const studentId = exchangeForm.studentId
    if (!studentId) {
        ElMessage.warning('请选择学生')
        return
    }
    if (exchangeForm.count <= 0) {
        ElMessage.warning('兑换数量必须大于0')
        return
    }

    const prize = selectedPrize.value
    if (!prize) {
        ElMessage.error('商品不存在')
        return
    }

    const stock = toNumber(prize.stock, 0)
    if (stock < exchangeForm.count) {
        ElMessage.warning('商品库存不足')
        return
    }

    const totalPoints = requiredPoints.value
    const availablePoints = availablePointsByStudentId.value[studentId] ?? 0
    if (availablePoints < totalPoints) {
        ElMessage.warning(`学生可用积分不足（当前：${availablePoints}，需要：${totalPoints}）`)
        return
    }

    try {
        await shopManager.exchangePrize(activeClassId.value, toNumber(prize.id, 0), studentId, exchangeForm.count)
        const studentName = studentIdNameMap.value[studentId] ?? ''
        ElMessage.success(`兑换成功！${studentName || '学生'} 兑换了 ${exchangeForm.count} 个${prize.name}`)
        exchangeDialogVisible.value = false
        await refreshPrizes()
        if (activeTab.value === 'records') {
            await loadRecordsPage(recordsCurrentPage.value)
        }
    } catch {
    }
}

function undoExchange(record: PrizeRecord) {
    const studentName = (record.student_name ?? '').trim() || (studentIdNameMap.value[toNumber(record.student_id, 0)] ?? '')
    ElMessageBox.confirm(`确定撤销「${studentName || '该学生'}」的兑换记录吗？`, '撤销确认', {
        type: 'warning'
    }).then(() => {
        const orderId = toNumber(record.id, 0)
        if (!orderId) {
            ElMessage.error('记录 ID 异常')
            return
        }
        shopManager.undoExchangePrize(orderId).then(async () => {
            ElMessage.success('兑换记录已撤销')
            await refreshPrizes()
            await loadRecordsPage(recordsCurrentPage.value)
        }).catch(() => { })
    }).catch(() => { })
}
const importDialogVisible = ref(false)

async function confirmImport(items: CreatePrizeReq[]) {
    if (items.length === 0) {
        ElMessage.warning('没有可导入的商品')
        return
    }
    let successCount = 0
    for (const it of items) {
        try {
            await shopManager.createPrize(it)
            successCount += 1
        } catch (err) {
            console.error(err)
        }
    }
    ElMessage.success(`成功导入 ${successCount} 个商品`)
    await refreshPrizes()
}

function exportTemplate() {
    const template = [
        { '商品名称': '示例商品1', '积分': 100, '库存': 10, '描述': '这是一个示例商品' },
        { '商品名称': '示例商品2', '积分': 200, '库存': 5, '描述': '' }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '商品清单')
    XLSX.writeFile(wb, '积分商城商品模板.xlsx')
    ElMessage.success('模板下载成功')
}

let studentsLoadedForClassId: number | null = null
let lastStudentsReqId = 0
async function ensureStudentsLoaded(): Promise<void> {
    const clsId = activeClassId.value
    if (!clsId) {
        students.value = []
        studentsLoadedForClassId = null
        return
    }
    if (studentsLoadedForClassId === clsId && students.value.length > 0) return
    const reqId = ++lastStudentsReqId
    try {
        const list = await studentManager.list(clsId)
        if (reqId !== lastStudentsReqId) return
        students.value = list
        studentsLoadedForClassId = clsId
    } catch (err) {
        console.error(err)
        if (reqId !== lastStudentsReqId) return
        students.value = []
        studentsLoadedForClassId = null
    }
}

async function refreshPrizes(): Promise<void> {
    try {
        prizes.value = await shopManager.listPrizes()
    } catch (err) {
        console.error(err)
        prizes.value = []
    }
}

async function loadRecordsPage(page: number): Promise<void> {
    if (recordsLoading.value) return
    if (!activeClassId.value) {
        records.value = []
        recordsTotal.value = 0
        return
    }
    recordsLoading.value = true
    try {
        const nextPage = Math.max(1, toNumber(page, 1))
        recordsCurrentPage.value = nextPage
        const resp = await shopManager.listPrizeRecords({
            class_id: activeClassId.value,
            limit: recordsPageSize.value,
            offset: (nextPage - 1) * recordsPageSize.value,
        })
        records.value = (resp.items ?? []).sort((a, b) => toNumber(b.id, 0) - toNumber(a.id, 0))
        recordsTotal.value = toNumber(resp.total, 0)
    } catch (err) {
        console.error(err)
        records.value = []
        recordsTotal.value = 0
    } finally {
        recordsLoading.value = false
    }
}

onMounted(async () => {
    await refreshPrizes()
})

watch(activeClassId, async () => {
    students.value = []
    studentsLoadedForClassId = null
    await loadRecordsPage(1)
})

watch(activeTab, async (tab) => {
    if (tab !== 'records') return
    await loadRecordsPage(1)
})

async function onRecordsPageChange(page: number) {
    await loadRecordsPage(page)
}
</script>

<template>
    <div class="shop-page">
        <ShopHeaderRow />

        <el-tabs v-model="activeTab" class="shop-tabs">
            <el-tab-pane label="商品列表" name="shop">
                <div v-if="isArchivedSemester" class="shop-archived-tip">
                    <i-ep-warning-filled class="shop-archived-icon" />
                    <span>当前为归档学期，仅支持查看商品，不支持兑换奖品</span>
                </div>
                <ShopToolbar @add="openAddItemDialog" @open-import="importDialogVisible = true"
                    @download-template="exportTemplate" />

                <ShopPrizeGrid :items="shopItems" :active="!!activeClassId && !isArchivedSemester" :resolve-icon="getShopIconComponent"
                    @edit="openEditItemDialog" @delete="deleteItem" @exchange="openExchangeDialog" />
            </el-tab-pane>

            <el-tab-pane label="兑换记录" name="records">
                <ShopRecordsTable :records="exchangeRecords" :loading="recordsLoading" :total="recordsTotal"
                    :page-size="recordsPageSize" :current-page="recordsCurrentPage"
                    :student-id-name-map="studentIdNameMap" :prize-id-map="prizeIdMap" @undo="undoExchange"
                    @page-change="onRecordsPageChange" />
            </el-tab-pane>
        </el-tabs>

        <ShopPrizeEditorDialog v-model="itemDialogVisible" :mode="itemDialogMode" :form="itemForm" @save="saveItem" />

        <ShopExchangeDialog v-model="exchangeDialogVisible" :form="exchangeForm" :students="studentsForExchange"
            :required-points="requiredPoints" :available-points-by-student-id="availablePointsByStudentId"
            :max-count="selectedPrize?.stock || 1" @confirm="confirmExchange" />

        <ShopImportDialog v-model="importDialogVisible" @confirm="confirmImport" />
    </div>
</template>

<style scoped>
.shop-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow: hidden;
}

.shop-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.shop-tabs :deep(.el-tabs__content) {
    flex: 1;
    overflow: auto;
    min-height: 0;
}

.shop-tabs :deep(.el-tab-pane) {
    display: flex;
    flex-direction: column;
}

.shop-archived-tip {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #8a4b07;
    background: #fff7e6;
    border: 1px solid #ffe1b3;
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 13px;
}

.shop-archived-icon {
    font-size: 16px;
}
</style>
