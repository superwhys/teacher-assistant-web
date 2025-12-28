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
    } catch (err: any) {
        ElMessage.error(err?.message || '保存失败')
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
        }).catch((err: any) => {
            ElMessage.error(err?.message || '删除失败')
        })
    }).catch(() => {})
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
    } catch (err: any) {
        ElMessage.error(err.message || '兑换失败')
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
        }).catch((err: any) => {
            ElMessage.error(err?.message || '撤销失败')
        })
    }).catch(() => {})
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
                <ShopToolbar
                    @add="openAddItemDialog"
                    @open-import="importDialogVisible = true"
                    @download-template="exportTemplate"
                />

                <ShopPrizeGrid
                    :items="shopItems"
                    :active="!!activeClassId"
                    :resolve-icon="getShopIconComponent"
                    @edit="openEditItemDialog"
                    @delete="deleteItem"
                    @exchange="openExchangeDialog"
                />
            </el-tab-pane>

            <el-tab-pane label="兑换记录" name="records">
                <ShopRecordsTable
                    :records="exchangeRecords"
                    :loading="recordsLoading"
                    :total="recordsTotal"
                    :page-size="recordsPageSize"
                    :current-page="recordsCurrentPage"
                    :student-id-name-map="studentIdNameMap"
                    :prize-id-map="prizeIdMap"
                    @undo="undoExchange"
                    @page-change="onRecordsPageChange"
                />
            </el-tab-pane>
        </el-tabs>

        <ShopPrizeEditorDialog
            v-model="itemDialogVisible"
            :mode="itemDialogMode"
            :form="itemForm"
            @save="saveItem"
        />

        <ShopExchangeDialog
            v-model="exchangeDialogVisible"
            :form="exchangeForm"
            :students="studentsForExchange"
            :required-points="requiredPoints"
            :available-points-by-student-id="availablePointsByStudentId"
            :max-count="selectedPrize?.stock || 1"
            @confirm="confirmExchange"
        />

        <ShopImportDialog
            v-model="importDialogVisible"
            @confirm="confirmImport"
        />
                </div>
            </template>

<style>
.shop-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow: hidden;
}

.header-row {
    margin-bottom: 20px;
}

.title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 24px;
    font-weight: 700;
}

.title-icon {
    font-size: 28px;
    color: #2d5cf6;
}

.shop-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.shop-tabs .el-tabs__content {
    flex: 1;
    overflow: auto;
    min-height: 0;
}

.shop-tabs .el-tab-pane {
    display: flex;
    flex-direction: column;
}

.shop-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
    flex-shrink: 0;
}

.shop-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    padding-bottom: 20px;
    align-content: start;
}

.shop-item-card {
    position: relative;
    border: 2px solid #e6e8f0;
    border-radius: 16px;
    padding: 0;
    background: #fff;
    transition: all 0.3s;
    overflow: hidden;
}

.shop-item-card:hover {
    border-color: #2d5cf6;
    box-shadow: 0 6px 16px rgba(45, 92, 246, 0.12);
    transform: translateY(-4px);
}

.card-actions {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 2px;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.3s;
}

.card-actions .el-button {
    padding: 4px;
    background: transparent !important;
    border: none;
}

.card-actions .el-button:hover {
    background: rgba(0, 0, 0, 0.05) !important;
}

.card-actions .el-button.is-text {
    background: transparent !important;
}

.shop-item-card:hover .card-actions {
    opacity: 1;
}

.card-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.item-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.item-name {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    text-align: center;
    line-height: 1.4;
}

.item-desc {
    width: 100%;
    font-size: 12px;
    color: #999;
    text-align: center;
    line-height: 1.5;
    min-height: 36px;
    max-height: 48px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
}

.item-price-info {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0 8px;
}

.price-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: nowrap;
    gap: 4px;
}

.coin-icon {
    font-size: 20px;
    color: #f59e0b;
}

.points-number {
    font-size: 20px;
    font-weight: 700;
    color: #f59e0b;
    line-height: 1;
    white-space: nowrap;
}

.points-text {
    font-size: 14px;
    color: #f59e0b;
    font-weight: 500;
    white-space: nowrap;
}

.stock-info {
    font-size: 13px;
    color: #999;
    text-align: right;
}

.stock-info.out-of-stock {
    color: #ef4444;
    font-weight: 600;
}

.exchange-btn {
    width: 100%;
    height: 38px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
}

.records-wrapper {
    padding-bottom: 20px;
}

.records-pagination {
    display: flex;
    justify-content: flex-end;
    padding-top: 14px;
}

.empty-shop,
.empty-records {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    color: #888;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    color: #c6c6c6;
}

.empty-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
}

.empty-sub {
    font-size: 14px;
    color: #999;
}

.points-badge {
    padding: 4px 12px;
    background: #fff7ed;
    color: #ea580c;
    border-radius: 999px;
    font-weight: 600;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.item-form,
.exchange-form {
    padding-top: 10px;
}

.student-option-enough {
    color: #10b981;
    font-weight: 500;
}

.student-option-insufficient {
    color: #ef4444;
    font-weight: 500;
}

.select-insufficient .el-input__wrapper {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 1px #ef4444 inset !important;
}

.select-insufficient .el-input__wrapper:hover {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 1px #ef4444 inset !important;
}

.select-insufficient .el-input__wrapper.is-focus {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 1px #ef4444 inset !important;
}

.select-insufficient .el-input__inner {
    color: #ef4444 !important;
    font-weight: 500 !important;
}

.select-insufficient .el-select__placeholder {
    color: #ef4444 !important;
}

.select-insufficient .el-select__selected-item {
    color: #ef4444 !important;
}

.select-insufficient input {
    color: #ef4444 !important;
}

.select-enough .el-input__wrapper {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 1px #10b981 inset !important;
}

.select-enough .el-input__wrapper:hover {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 1px #10b981 inset !important;
}

.select-enough .el-input__wrapper.is-focus {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 1px #10b981 inset !important;
}

.select-enough .el-input__inner {
    color: #10b981 !important;
    font-weight: 500 !important;
}

.select-enough .el-select__placeholder {
    color: #10b981 !important;
}

.select-enough .el-select__selected-item {
    color: #10b981 !important;
}

.select-enough input {
    color: #10b981 !important;
}

.upload-area {
    margin-bottom: 16px;
}

.upload-icon {
    font-size: 48px;
    color: #2d5cf6;
    margin-bottom: 12px;
}

.upload-file-name {
    margin-top: 4px;
    color: var(--el-text-color-regular);
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.upload-file-name .file-icon {
    font-size: 16px;
}

.upload-file-name .change-hint {
    color: var(--el-text-color-secondary);
}

.excel-guide {
    margin-top: 8px;
    color: var(--el-text-color-regular);
    font-size: 13px;
}

.guide-title {
    font-weight: 600;
    margin-bottom: 4px;
}

.guide-list {
    padding-left: 18px;
    margin: 0;
}

.excel-preview {
    margin-top: 12px;
    padding: 12px;
    border: 1px dashed var(--el-border-color);
    border-radius: 8px;
}

.preview-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 8px;
}

.preview-title {
    font-weight: 600;
}

.preview-meta {
    width: 100%;
}

.preview-actions {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

@media (max-width: 1024px) {
    .shop-grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
}

@media (max-width: 768px) {
    .shop-page {
        padding: 12px;
    }

    .header-row {
        margin-bottom: 16px;
    }

    .title {
        font-size: 18px;
        gap: 6px;
    }

    .title-icon {
        font-size: 22px;
    }

    .shop-grid {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
    }

    .shop-toolbar {
        gap: 10px;
        margin-bottom: 16px;
    }

    .shop-toolbar .el-button {
        flex: 1;
        min-width: 0;
    }

    .card-actions {
        opacity: 1;
    }

    .card-content {
        padding: 14px;
        gap: 10px;
    }

    .item-icon {
        width: 44px;
        height: 44px;
        font-size: 22px;
    }

    .item-name {
        font-size: 15px;
    }

    .points-number {
        font-size: 18px;
    }

    .coin-icon {
        font-size: 18px;
    }
    
    .points-text {
        font-size: 12px;
    }

    .exchange-btn {
        height: 36px;
        font-size: 13px;
    }
}

@media (max-width: 480px) {
    .shop-page {
        padding: 10px;
    }

    .header-row {
        margin-bottom: 12px;
    }

    .title {
        font-size: 16px;
        gap: 4px;
    }

    .title-icon {
        font-size: 20px;
    }

    .shop-toolbar {
        gap: 8px;
        margin-bottom: 12px;
    }

    .shop-toolbar .el-button {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        padding: 8px 10px;
    }

    .shop-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 10px;
    }

    .card-content {
        padding: 12px;
        gap: 8px;
    }

    .item-icon {
        width: 40px;
        height: 40px;
        font-size: 20px;
    }

    .item-name {
        font-size: 14px;
    }

    .points-number {
        font-size: 16px;
    }
    
    .coin-icon {
        font-size: 16px;
    }
    
    .points-text {
        font-size: 11px;
    }
}

@media (max-width: 360px) {
    .title {
        font-size: 15px;
    }

    .shop-toolbar {
        gap: 6px;
    }

    .shop-toolbar .el-button {
        font-size: 12px;
        padding: 8px 8px;
    }

    .shop-toolbar .el-button span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>



