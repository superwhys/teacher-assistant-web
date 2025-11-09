<script setup lang="ts">
import { ref, computed, reactive, type Component } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadInstance } from 'element-plus'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'
import { useShopStore } from '@/stores/shopStore'
import { usePointsStore } from '@/stores/pointsStore'
import type { ShopItem, ExchangeRecord } from '@/types/shopItem'
import { formatTimeHHmm } from '@/utils/date'
import * as XLSX from 'xlsx'
import {
    GoodsFilled as IEpGoodsFilled,
    Trophy as IEpTrophy,
    StarFilled as IEpStarFilled,
    Coin as IEpCoin,
    Reading as IEpReading,
    EditPen as IEpEditPen,
    Coffee as IEpCoffee,
    Basketball as IEpBasketball
} from '@element-plus/icons-vue'

defineOptions({
    name: 'ShopView'
})

const classStore = useClassStore()
const studentStore = useStudentStore()
const shopStore = useShopStore()
const pointsStore = usePointsStore()

const activeTab = ref<'shop' | 'records'>('shop')

const activeClassId = computed(() => classStore.activeClassId)

const studentsForExchange = computed(() => {
    const id = activeClassId.value
    if (!id) return []
    
    const students = studentStore.listByClassId(id)
    return [...students].sort((a, b) => {
        const pointsA = pointsStore.getAvailablePoints(id, a.studentName)
        const pointsB = pointsStore.getAvailablePoints(id, b.studentName)
        return pointsB - pointsA
    })
})

const shopItems = computed(() => shopStore.getAllItems())
const exchangeRecords = computed(() => {
    const classId = activeClassId.value
    return classId ? shopStore.getRecordsByClass(classId) : []
})

const itemDialogVisible = ref(false)
const itemDialogMode = ref<'add' | 'edit'>('add')
const itemForm = reactive({
    id: '',
    name: '',
    points: 0,
    stock: 0,
    description: '',
    icon: 'goods-filled'
})

interface IconOption {
    label: string
    value: string
    icon: Component
}

const iconOptions: IconOption[] = [
    { label: '礼物', value: 'goods-filled', icon: IEpGoodsFilled },
    { label: '奖杯', value: 'trophy', icon: IEpTrophy },
    { label: '星星', value: 'star-filled', icon: IEpStarFilled },
    { label: '钻石', value: 'coin', icon: IEpCoin },
    { label: '书本', value: 'reading', icon: IEpReading },
    { label: '铅笔', value: 'edit-pen', icon: IEpEditPen },
    { label: '杯子', value: 'coffee', icon: IEpCoffee },
    { label: '足球', value: 'basketball', icon: IEpBasketball }
]

const iconComponentMap: Record<string, Component> = {
    'goods-filled': IEpGoodsFilled,
    'trophy': IEpTrophy,
    'star-filled': IEpStarFilled,
    'coin': IEpCoin,
    'reading': IEpReading,
    'edit-pen': IEpEditPen,
    'coffee': IEpCoffee,
    'basketball': IEpBasketball
}

function getIconComponent(iconName?: string): Component {
    if (!iconName) return IEpGoodsFilled
    return iconComponentMap[iconName] || IEpGoodsFilled
}

function openAddItemDialog() {
    itemDialogMode.value = 'add'
    itemForm.id = ''
    itemForm.name = ''
    itemForm.points = 0
    itemForm.stock = 0
    itemForm.description = ''
    itemForm.icon = 'goods-filled'
    itemDialogVisible.value = true
}

function openEditItemDialog(item: ShopItem) {
    itemDialogMode.value = 'edit'
    itemForm.id = item.id
    itemForm.name = item.name
    itemForm.points = item.points
    itemForm.stock = item.stock
    itemForm.description = item.description || ''
    itemForm.icon = item.icon || 'goods-filled'
    itemDialogVisible.value = true
}

function saveItem() {
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

    if (itemDialogMode.value === 'add') {
        shopStore.addItem({
            name: itemForm.name,
            points: itemForm.points,
            stock: itemForm.stock,
            description: itemForm.description,
            icon: itemForm.icon
        })
        ElMessage.success('商品添加成功')
    } else {
        shopStore.updateItem(itemForm.id, {
            name: itemForm.name,
            points: itemForm.points,
            stock: itemForm.stock,
            description: itemForm.description,
            icon: itemForm.icon
        })
        ElMessage.success('商品更新成功')
    }

    itemDialogVisible.value = false
}

function deleteItem(item: ShopItem) {
    ElMessageBox.confirm(`确定删除商品「${item.name}」吗？`, '删除确认', {
        type: 'warning'
    }).then(() => {
        shopStore.deleteItem(item.id)
        ElMessage.success('商品已删除')
    }).catch(() => {})
}

const exchangeDialogVisible = ref(false)
const exchangeForm = reactive({
    itemId: '',
    studentName: '',
    quantity: 1
})

function openExchangeDialog(item: ShopItem) {
    if (!activeClassId.value) {
        ElMessage.error('请先选择班级')
        return
    }
    if (item.stock <= 0) {
        ElMessage.warning('商品库存不足')
        return
    }
    exchangeForm.itemId = item.id
    exchangeForm.studentName = ''
    exchangeForm.quantity = 1
    exchangeDialogVisible.value = true
}

function confirmExchange() {
    if (!activeClassId.value) return
    if (!exchangeForm.studentName) {
        ElMessage.warning('请选择学生')
        return
    }
    if (exchangeForm.quantity <= 0) {
        ElMessage.warning('兑换数量必须大于0')
        return
    }

    const item = shopStore.getItemById(exchangeForm.itemId)
    if (!item) {
        ElMessage.error('商品不存在')
        return
    }

    if (item.stock < exchangeForm.quantity) {
        ElMessage.warning('商品库存不足')
        return
    }

    const totalPoints = exchangeForm.quantity * item.points
    const availablePoints = pointsStore.getAvailablePoints(activeClassId.value, exchangeForm.studentName)

    if (availablePoints < totalPoints) {
        ElMessage.warning(`学生可用积分不足（当前：${availablePoints}，需要：${totalPoints}）`)
        return
    }

    try {
        pointsStore.consumePoints(
            activeClassId.value,
            [exchangeForm.studentName],
            totalPoints,
            {
                itemId: item.id,
                itemName: item.name
            }
        )

        shopStore.addExchangeRecord({
            shopItemId: item.id,
            shopItemName: item.name,
            studentName: exchangeForm.studentName,
            classId: activeClassId.value,
            points: totalPoints,
            quantity: exchangeForm.quantity
        })

        ElMessage.success(`兑换成功！${exchangeForm.studentName} 兑换了 ${exchangeForm.quantity} 个${item.name}`)
        exchangeDialogVisible.value = false
    } catch (err: any) {
        ElMessage.error(err.message || '兑换失败')
    }
}

function undoExchange(record: ExchangeRecord) {
    ElMessageBox.confirm(`确定撤销「${record.studentName}」的兑换记录吗？`, '撤销确认', {
        type: 'warning'
    }).then(() => {
        const undoneRecord = shopStore.undoExchange(record.id)
        if (undoneRecord) {
            pointsStore.consumePoints(
                record.classId,
                [record.studentName],
                -record.points,
                {
                    itemId: record.shopItemId,
                    itemName: `撤销兑换-${record.shopItemName}`
                }
            )
            ElMessage.success('兑换记录已撤销')
        }
    }).catch(() => {})
}

function getStudentOptionClass(studentName: string): string {
    if (!activeClassId.value || !exchangeForm.itemId) return ''
    
    const item = shopStore.getItemById(exchangeForm.itemId)
    if (!item) return ''
    
    const totalPoints = exchangeForm.quantity * item.points
    const availablePoints = pointsStore.getAvailablePoints(activeClassId.value, studentName)
    
    if (availablePoints >= totalPoints) {
        return 'student-option-enough'
    } else {
        return 'student-option-insufficient'
    }
}

function getSelectedStudentClass(): string {
    if (!exchangeForm.studentName) return ''
    
    const studentClass = getStudentOptionClass(exchangeForm.studentName)
    if (studentClass === 'student-option-insufficient') {
        return 'select-insufficient'
    } else if (studentClass === 'student-option-enough') {
        return 'select-enough'
    }
    return ''
}

const importDialogVisible = ref(false)
const importFileName = ref('')
const importParsedItems = ref<Omit<ShopItem, 'id' | 'createdAt'>[]>([])
const uploadRef = ref<UploadInstance>()

async function handleImportFile(file: File) {
    try {
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data)
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
            ElMessage.warning('Excel 文件中没有工作表')
            return
        }
        const firstSheet = workbook.Sheets[firstSheetName]
        if (!firstSheet) {
            ElMessage.warning('无法读取工作表内容')
            return
        }
        const rows = XLSX.utils.sheet_to_json<any>(firstSheet)

        const items: Omit<ShopItem, 'id' | 'createdAt'>[] = []
        for (const row of rows) {
            const name = row['商品名称'] || row['名称'] || row['name']
            const points = Number(row['积分'] || row['points'] || 0)
            const stock = Number(row['库存'] || row['数量'] || row['stock'] || 0)
            const description = row['描述'] || row['description'] || ''

            if (name && points > 0) {
                items.push({
                    name,
                    points,
                    stock,
                    description,
                    icon: 'goods-filled'
                })
            }
        }

        if (items.length === 0) {
            ElMessage.warning('未解析到有效的商品数据，请检查表头是否包含"商品名称/积分/库存"')
            return
        }

        importParsedItems.value = items
        importFileName.value = file.name
        ElMessage.success(`解析成功：${items.length} 个商品`)
    } catch (err: any) {
        ElMessage.error(`导入失败：${err?.message || '未知错误'}`)
    }
}

async function beforeImportUpload(file: any) {
    await handleImportFile(file as File)
    return false
}

async function handleImportChange(file: any) {
    if (!file || !file.raw) return
    await handleImportFile(file.raw)
    importFileName.value = file.name || ''
}

function confirmImport() {
    if (importParsedItems.value.length === 0) {
        ElMessage.warning('没有可导入的商品')
        return
    }

    const count = shopStore.importItems(importParsedItems.value)
    ElMessage.success(`成功导入 ${count} 个商品`)
    importDialogVisible.value = false
    importParsedItems.value = []
    importFileName.value = ''
}

function clearImport() {
    importParsedItems.value = []
    importFileName.value = ''
    uploadRef.value?.clearFiles()
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
</script>

<template>
    <div class="shop-page">
        <div class="header-row">
            <div class="title">
                <i-ep-shop class="title-icon" />
                积分商城
            </div>
        </div>

        <el-tabs v-model="activeTab" class="shop-tabs">
            <el-tab-pane label="商品列表" name="shop">
                <div class="shop-toolbar">
                    <el-button type="primary" @click="openAddItemDialog">
                        <i-ep-plus /> 添加商品
                    </el-button>
                    <el-button type="success" plain @click="importDialogVisible = true">
                        <i-ep-upload-filled /> 导入商品
                    </el-button>
                    <el-button type="info" plain @click="exportTemplate">
                        <i-ep-download /> 下载模板
                    </el-button>
                </div>

                <div v-if="shopItems.length > 0" class="shop-grid">
                    <div v-for="item in shopItems" :key="item.id" class="shop-item-card">
                        <div class="card-actions">
                            <el-button type="primary" text @click="openEditItemDialog(item)">
                                <i-ep-edit />
                            </el-button>
                            <el-button type="danger" text @click="deleteItem(item)">
                                <i-ep-delete />
                            </el-button>
                        </div>
                        
                        <div class="card-content">
                            <div class="item-icon">
                                <component :is="getIconComponent(item.icon)" />
                            </div>
                            
                            <div class="item-name">{{ item.name }}</div>
                            
                            <div class="item-desc">
                                {{ item.description || '' }}
                            </div>
                            
                            <div class="item-price-info">
                                <div class="price-row">
                                    <i-ep-coin class="coin-icon" />
                                    <span class="points-number">{{ item.points }}</span>
                                    <span class="points-text">积分</span>
                                </div>
                                <div class="stock-info" :class="{ 'out-of-stock': item.stock === 0 }">
                                    库存: {{ item.stock }}
                                </div>
                            </div>
                            
                            <el-button
                                type="primary"
                                class="exchange-btn"
                                size="large"
                                :disabled="item.stock === 0 || !activeClassId"
                                @click="openExchangeDialog(item)"
                            >
                                <i-ep-shopping-cart /> 兑换
                            </el-button>
                        </div>
                    </div>
                </div>

                <div v-else class="empty-shop">
                    <i-ep-shopping-bag class="empty-icon" />
                    <div class="empty-title">还没有商品</div>
                    <div class="empty-sub">点击"添加商品"或"导入商品"开始添加</div>
                </div>
            </el-tab-pane>

            <el-tab-pane label="兑换记录" name="records">
                <div v-if="exchangeRecords.length > 0" class="records-wrapper">
                    <el-table :data="exchangeRecords" border size="large">
                        <el-table-column type="index" label="#" width="60" />
                        <el-table-column label="时间" width="120" align="center">
                            <template #default="{ row }">
                                {{ formatTimeHHmm(new Date(row.exchangedAt)) }}
                            </template>
                        </el-table-column>
                        <el-table-column label="学生" prop="studentName" min-width="100" />
                        <el-table-column label="商品" prop="shopItemName" min-width="150" />
                        <el-table-column label="数量" prop="quantity" width="80" align="center" />
                        <el-table-column label="消耗积分" width="120" align="center">
                            <template #default="{ row }">
                                <span class="points-badge">{{ row.points }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="100" align="center" fixed="right">
                            <template #default="{ row }">
                                <el-button type="warning" plain size="small" @click="undoExchange(row)">
                                    撤销
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>

                <div v-else class="empty-records">
                    <i-ep-document class="empty-icon" />
                    <div class="empty-title">还没有兑换记录</div>
                    <div class="empty-sub">学生兑换商品后，记录会显示在这里</div>
                </div>
            </el-tab-pane>
        </el-tabs>

        <el-dialog
            v-model="itemDialogVisible"
            :title="itemDialogMode === 'add' ? '添加商品' : '编辑商品'"
            width="500px"
        >
            <el-form :model="itemForm" label-position="top" class="item-form">
                <el-form-item label="商品名称" required>
                    <el-input v-model="itemForm.name" placeholder="请输入商品名称" />
                </el-form-item>
                <el-form-item label="消耗积分" required>
                    <el-input-number v-model="itemForm.points" :min="1" :step="10" style="width: 100%;" />
                </el-form-item>
                <el-form-item label="库存数量" required>
                    <el-input-number v-model="itemForm.stock" :min="0" style="width: 100%;" />
                </el-form-item>
                <el-form-item label="图标">
                    <el-select v-model="itemForm.icon" placeholder="选择图标" style="width: 100%;">
                        <el-option
                            v-for="opt in iconOptions"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                        >
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <component :is="opt.icon" />
                                <span>{{ opt.label }}</span>
                            </div>
                        </el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="商品描述">
                    <el-input
                        v-model="itemForm.description"
                        type="textarea"
                        :rows="3"
                        placeholder="请输入商品描述（可选）"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="itemDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="saveItem">保存</el-button>
                </div>
            </template>
        </el-dialog>

        <el-dialog v-model="exchangeDialogVisible" title="兑换商品" width="500px">
            <el-form :model="exchangeForm" label-position="top" class="exchange-form">
                <el-form-item label="选择学生" required>
                    <el-select
                        v-model="exchangeForm.studentName"
                        placeholder="请选择学生"
                        size="large"
                        filterable
                        style="width: 100%;"
                        :class="getSelectedStudentClass()"
                    >
                        <el-option
                            v-for="s in studentsForExchange"
                            :key="s.studentName"
                            :label="`${s.studentName}（可用积分：${pointsStore.getAvailablePoints(activeClassId, s.studentName)}）`"
                            :value="s.studentName"
                            :class="getStudentOptionClass(s.studentName)"
                        >
                            <div :class="getStudentOptionClass(s.studentName)">
                                {{ s.studentName }}（可用积分：{{ pointsStore.getAvailablePoints(activeClassId, s.studentName) }}）
                            </div>
                        </el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="兑换数量" required>
                    <el-input-number
                        v-model="exchangeForm.quantity"
                        :min="1"
                        :max="shopStore.getItemById(exchangeForm.itemId)?.stock || 1"
                        style="width: 100%;"
                    />
                </el-form-item>
                <el-alert
                    v-if="exchangeForm.studentName && exchangeForm.itemId"
                    :title="`需要消耗：${(shopStore.getItemById(exchangeForm.itemId)?.points || 0) * exchangeForm.quantity} 积分`"
                    type="info"
                    :closable="false"
                    style="margin-top: 12px;"
                />
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="exchangeDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="confirmExchange">确认兑换</el-button>
                </div>
            </template>
        </el-dialog>

        <el-dialog v-model="importDialogVisible" title="导入商品（Excel）" width="720px">
            <el-upload
                ref="uploadRef"
                class="upload-area"
                drag
                accept=".xls,.xlsx"
                :auto-upload="false"
                :show-file-list="false"
                :before-upload="beforeImportUpload"
                :on-change="handleImportChange"
            >
                <i-ep-upload-filled class="upload-icon" />
                <div v-if="!importFileName" class="el-upload__text">将文件拖到此处，或点击上传</div>
                <div v-else class="upload-file-name">
                    <i-ep-document class="file-icon" /> {{ importFileName }}
                    <span class="change-hint">（点击重新选择）</span>
                </div>
                <template #tip>
                    <div class="el-upload__tip">支持 .xls/.xlsx，表头包含"商品名称、积分、库存、描述（可选）"。</div>
                </template>
            </el-upload>

            <div class="excel-guide">
                <div class="guide-title">可用的 Excel 表头示例：</div>
                <ul class="guide-list">
                    <li>必填：商品名称（或 名称/name）</li>
                    <li>必填：积分（或 消耗积分/points）</li>
                    <li>必填：库存（或 数量/stock）</li>
                    <li>可选：描述（或 商品描述/description）</li>
                </ul>
            </div>

            <div v-if="importParsedItems.length > 0" class="excel-preview">
                <div class="preview-header">
                    <div class="preview-title">解析结果</div>
                    <el-space class="preview-meta" wrap size="small">
                        <el-tag v-if="importFileName" type="info" effect="light">文件：{{ importFileName }}</el-tag>
                        <el-tag type="primary" effect="light">共 {{ importParsedItems.length }} 个商品</el-tag>
                    </el-space>
                </div>
                <el-table :data="importParsedItems" border size="small" class="preview-table" max-height="300px">
                    <el-table-column label="商品名称" prop="name" min-width="140" />
                    <el-table-column label="积分" prop="points" width="100" align="center" />
                    <el-table-column label="库存" prop="stock" width="100" align="center" />
                    <el-table-column label="描述" prop="description" min-width="180" show-overflow-tooltip />
                </el-table>
                <div class="preview-actions">
                    <el-button type="primary" :disabled="importParsedItems.length === 0" @click="confirmImport">
                        <i-ep-upload-filled /> 确认导入
                    </el-button>
                    <el-button @click="clearImport">清空</el-button>
                </div>
            </div>
        </el-dialog>
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

.shop-tabs :deep(.el-tabs__content) {
    flex: 1;
    overflow: auto;
    min-height: 0;
}

.shop-tabs :deep(.el-tab-pane) {
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

.card-actions :deep(.el-button) {
    padding: 4px;
    background: transparent !important;
    border: none;
}

.card-actions :deep(.el-button:hover) {
    background: rgba(0, 0, 0, 0.05) !important;
}

.card-actions :deep(.el-button.is-text) {
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

.select-insufficient :deep(.el-input__wrapper) {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 1px #ef4444 inset !important;
}

.select-insufficient :deep(.el-input__wrapper:hover) {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 1px #ef4444 inset !important;
}

.select-insufficient :deep(.el-input__wrapper.is-focus) {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 1px #ef4444 inset !important;
}

.select-insufficient :deep(.el-input__inner) {
    color: #ef4444 !important;
    font-weight: 500 !important;
}

.select-insufficient :deep(.el-select__placeholder) {
    color: #ef4444 !important;
}

.select-insufficient :deep(.el-select__selected-item) {
    color: #ef4444 !important;
}

.select-insufficient :deep(input) {
    color: #ef4444 !important;
}

.select-enough :deep(.el-input__wrapper) {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 1px #10b981 inset !important;
}

.select-enough :deep(.el-input__wrapper:hover) {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 1px #10b981 inset !important;
}

.select-enough :deep(.el-input__wrapper.is-focus) {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 1px #10b981 inset !important;
}

.select-enough :deep(.el-input__inner) {
    color: #10b981 !important;
    font-weight: 500 !important;
}

.select-enough :deep(.el-select__placeholder) {
    color: #10b981 !important;
}

.select-enough :deep(.el-select__selected-item) {
    color: #10b981 !important;
}

.select-enough :deep(input) {
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

    .shop-toolbar :deep(.el-button) {
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

    .shop-toolbar :deep(.el-button) {
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

    .shop-toolbar :deep(.el-button) {
        font-size: 12px;
        padding: 8px 8px;
    }

    .shop-toolbar :deep(.el-button span) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>


