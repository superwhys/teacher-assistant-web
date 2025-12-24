<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { useStudentStore } from '@/stores/studentStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import { usePointsStore } from '@/stores/pointsStore'
import { usePointsItemStore } from '@/stores/pointsItemStore'

const props = defineProps<{
    activeClassId: string | null
    activeClassName: string
}>()

const studentStore = useStudentStore()
const groupStore = useStudentGroupStore()
const pointsStore = usePointsStore()
const pointsItemStore = usePointsItemStore()

const studentsOfActive = computed(() => {
    const id = props.activeClassId
    return id ? studentStore.listByClassId(id) : []
})

const groupsOfActive = computed(() => {
    const id = props.activeClassId
    return id ? groupStore.listByClassId(id) : []
})

const allPointsItems = computed(() => pointsItemStore.listItems('all'))

const exportVisible = ref(false)
const exportType = ref<'history' | 'final'>('final')
const exportScope = ref<'all' | 'group'>('all')
const exportGroupId = ref<string | ''>('')
const dateRange = ref<[Date, Date] | []>([])
const defaultTime: [Date, Date] = [
    new Date(2000, 1, 1, 0, 0, 0),
    new Date(2000, 1, 1, 23, 59, 59),
]

// 新增选项
const sortBy = ref<'default' | 'points-asc' | 'points-desc' | 'name-asc' | 'name-desc'>('default')
const filterItemIds = ref<string[]>([])

function openExportDialog() {
    if (!props.activeClassId) {
        ElMessage.error('请先选择班级')
        return
    }
    // 重置
    dateRange.value = []
    sortBy.value = 'default'
    filterItemIds.value = []
    exportVisible.value = true
}

function formatDateTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    return `${y}-${m}-${d} ${hh}:${mm}`
}

const exportData = computed(() => {
    const classId = props.activeClassId
    if (!classId) return { rows: [], sheetName: '', columns: [] as { prop: string, label: string }[] }

        if (exportType.value === 'history') {
        const list = pointsStore.getHistoryOf(classId)
        let filtered = list
        
        // 应用时间范围过滤
        if (dateRange.value.length === 2) {
            const [startDate, endDate] = dateRange.value
            const startTs = startDate.getTime()
            const endTs = endDate.getTime()
            filtered = filtered.filter(a => {
                return a.at >= startTs && a.at <= endTs
            })
        }
        
        // 应用积分项过滤
        if (filterItemIds.value.length > 0) {
            // 历史记录下，只要是选中的任意一个积分项即可
            filtered = filtered.filter(a => a.itemId && filterItemIds.value.includes(a.itemId))
        }
        
        if (exportScope.value === 'group' && exportGroupId.value) {
            const g = groupsOfActive.value.find(x => x.id === exportGroupId.value)
            const nameSet = new Set(g?.members ?? [])
            filtered = filtered.filter(a => a.studentNames.some(n => nameSet.has(n)))
        }
        
        // 历史记录通常按时间倒序，如果用户选择了排序方式，这里也可以支持
        // 但通常历史记录主要看时间。这里暂时保持时间倒序作为默认。
        // 如果需要支持按学生姓名排序，可以在这里加。
        
        const rows = filtered.map(a => ({
            '时间': formatDateTime(new Date(a.at)),
            '积分项': a.itemName || '未知',
            '分值': a.delta,
            '学生': a.studentNames.join('、'),
        }))

        return { 
            rows, 
            sheetName: '历史记录',
            columns: [
                { prop: '时间', label: '时间' },
                { prop: '积分项', label: '积分项' },
                { prop: '分值', label: '分值' },
                { prop: '学生', label: '学生' },
            ]
        }
    } else {
        const points = pointsStore.getPointsOf(classId)
        let names = studentsOfActive.value.map(s => s.studentName)
        
        // 分组过滤
        if (exportScope.value === 'group' && exportGroupId.value) {
            const g = groupsOfActive.value.find(x => x.id === exportGroupId.value)
            const nameSet = new Set(g?.members ?? [])
            names = names.filter(n => nameSet.has(n))
        }

        // 积分项过滤：
        // 1. 筛选出有过该积分项记录的学生
        // 2. 计算每个学生该积分项的分数总和
        let itemScoreMap: Record<string, Record<string, number>> = {} // student -> itemId -> score
        let totalFilteredScoreMap: Record<string, number> = {} // student -> total score of filtered items

        if (filterItemIds.value.length > 0) {
            const history = pointsStore.getHistoryOf(classId)
            const studentSet = new Set<string>()
            
            history.forEach(h => {
                if (h.itemId && filterItemIds.value.includes(h.itemId)) {
                    // 累加分数
                    h.studentNames.forEach(n => {
                        studentSet.add(n)
                        if (!itemScoreMap[n]) itemScoreMap[n] = {}
                        itemScoreMap[n][h.itemId!] = (itemScoreMap[n][h.itemId!] || 0) + h.delta
                        totalFilteredScoreMap[n] = (totalFilteredScoreMap[n] || 0) + h.delta
                    })
                }
            })
            
            // 仅保留有记录的学生
            names = names.filter(n => studentSet.has(n))
        }

        // 准备表头列
        const columns = [
            { prop: '姓名', label: '姓名' }
        ]
        
        if (filterItemIds.value.length > 0) {
            // 添加选中的积分项列
            filterItemIds.value.forEach(id => {
                const item = allPointsItems.value.find(i => i.id === id)
                if (item) {
                    columns.push({ 
                        prop: id, 
                        label: `${item.name} ${item.sign === 'plus' ? '(加分)' : '(扣分)'}` 
                    })
                }
            })
            // 如果选了多个，可以加一个合计列
            // if (filterItemIds.value.length > 1) {
            //     columns.push({ prop: '合计', label: '合计' })
            // }
        } else {
            if (dateRange.value.length === 2) {
                columns.push({ prop: '时段积分', label: '时段积分' })
            } else {
                columns.push(
                    { prop: '总积分', label: '总积分' },
                    { prop: '可用积分', label: '可用积分' }
                )
            }
        }

        // 构建行数据
        let rows = names.map(n => {
            // 如果有积分项过滤
            if (filterItemIds.value.length > 0) {
                const row: any = { '姓名': n }
                
                // 填充每个选中积分项的分数
                filterItemIds.value.forEach(id => {
                    row[id] = itemScoreMap[n]?.[id] || 0
                })
                
                // 填充合计
                // if (filterItemIds.value.length > 1) {
                //     row['合计'] = totalFilteredScoreMap[n] || 0
                // }
                
                // 增加一个用于排序的隐藏字段
                row._total = totalFilteredScoreMap[n] || 0
                
                return row
            }
            
            // 否则显示原来的总积分/可用积分
            // 如果选择了时间范围，则显示该时间段内的总积分
            if (dateRange.value.length === 2) {
                const history = pointsStore.getHistoryOf(classId)
                const [startDate, endDate] = dateRange.value
                const startTs = startDate.getTime()
                const endTs = endDate.getTime()
                
                const relevantHistory = history.filter(a => a.at >= startTs && a.at <= endTs)
                
                let total = 0
                relevantHistory.forEach(h => {
                    if (h.studentNames.includes(n)) {
                        total += h.delta
                    }
                })
                
                return {
                    '姓名': n,
                    '时段积分': total,
                }
            }

            const p = points[n]
            return {
                '姓名': n,
                '总积分': p?.total ?? 0,
                '可用积分': p?.available ?? 0
            }
        })

        // 排序
        if (sortBy.value !== 'default') {
            rows.sort((a, b) => {
                if (filterItemIds.value.length > 0) {
                    // 积分项模式下的排序
                    // 如果是单项，按该项分数排序
                    // 如果是多项，按合计排序（虽然不显示合计列，但排序逻辑依然可以是合计）
                    const firstId = filterItemIds.value[0] || ''
                    const sortKey = filterItemIds.value.length > 1 ? '_total' : firstId
                    
                    if (sortBy.value === 'points-asc') {
                        return ((a[sortKey] as number) || 0) - ((b[sortKey] as number) || 0)
                    } else if (sortBy.value === 'points-desc') {
                        return ((b[sortKey] as number) || 0) - ((a[sortKey] as number) || 0)
                    }
                } else if (dateRange.value.length === 2) {
                    // 时段积分排序
                    if (sortBy.value === 'points-asc') {
                        return (a['时段积分'] as number) - (b['时段积分'] as number)
                    } else if (sortBy.value === 'points-desc') {
                        return (b['时段积分'] as number) - (a['时段积分'] as number)
                    }
                } else {
                    // 常规模式下的排序
                    if (sortBy.value === 'points-asc') {
                        return (a['总积分'] as number) - (b['总积分'] as number)
                    } else if (sortBy.value === 'points-desc') {
                        return (b['总积分'] as number) - (a['总积分'] as number)
                    }
                }
                
                if (sortBy.value === 'name-asc') {
                    return a['姓名'].localeCompare(b['姓名'], 'zh-CN')
                } else if (sortBy.value === 'name-desc') {
                    return b['姓名'].localeCompare(a['姓名'], 'zh-CN')
                }
                return 0
            })
        }

        return { 
            rows, 
            sheetName: filterItemIds.value.length > 0 ? '单项积分统计' : '最终积分',
            columns
        }
    }
})

const previewRows = computed(() => {
    return exportData.value.rows // 预览显示所有，通过max-height控制滚动
})

function doExportExcel() {
    if (!props.activeClassId) return
    const { rows, sheetName } = exportData.value
    if (!rows.length) {
        ElMessage.info('没有可导出的数据')
        return
    }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    const cls = props.activeClassName || '未命名班级'
    const scopeSuffix = exportScope.value === 'group' ? `_${groupsOfActive.value.find(g => g.id === exportGroupId.value)?.name || '分组'}` : '_全部学生'
    const typeSuffix = exportType.value === 'history' ? '积分历史' : '最终积分'
    
    let dateSuffix = ''
    if (dateRange.value && dateRange.value.length === 2) {
        const [start, end] = dateRange.value
        const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
        dateSuffix = `_${fmt(start)}-${fmt(end)}`
    }

    let filterSuffix = ''
    if (filterItemIds.value.length > 0) {
        if (filterItemIds.value.length === 1) {
            const item = allPointsItems.value.find(i => i.id === filterItemIds.value[0])
            if (item) filterSuffix = `_${item.name}`
        } else {
            filterSuffix = `_选定${filterItemIds.value.length}项`
        }
    }

    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
    const filename = `${cls}_${typeSuffix}${scopeSuffix}${filterSuffix}${dateSuffix}_${ts}.xlsx`
    XLSX.writeFile(wb, filename)
    ElMessage.success('导出成功')
    exportVisible.value = false
}
</script>

<template>
    <el-button type="info" plain :disabled="!activeClassId" @click="openExportDialog">
        <i-ep-download /> 导出 Excel
    </el-button>

    <el-dialog v-model="exportVisible" title="导出 Excel" width="600px" top="5vh">
        <el-form label-position="top" class="export-form">
            <div class="form-row">
                <el-form-item label="导出类型" class="half-width">
                    <el-radio-group v-model="exportType" size="default">
                        <el-radio-button value="final">最终积分</el-radio-button>
                        <el-radio-button value="history">历史记录</el-radio-button>
                    </el-radio-group>
                </el-form-item>

                <el-form-item label="导出范围" class="half-width">
                    <el-radio-group v-model="exportScope" size="default">
                        <el-radio-button value="all">全部学生</el-radio-button>
                        <el-radio-button value="group">指定分组</el-radio-button>
                    </el-radio-group>
                </el-form-item>
            </div>

            <div class="form-row" v-if="exportScope === 'group'">
                <el-form-item label="选择分组" class="full-width">
                    <el-select v-model="exportGroupId" placeholder="请选择分组" size="default" class="full-width-select">
                        <el-option v-for="g in groupsOfActive" :key="g.id" :label="`${g.name}（${g.members.length}）`"
                            :value="g.id" />
                    </el-select>
                </el-form-item>
            </div>

            <div class="form-row">
                <el-form-item v-if="exportType === 'final'" label="排序方式" class="half-width">
                    <el-select v-model="sortBy" placeholder="默认排序" size="default">
                        <el-option label="默认排序" value="default" />
                        <el-option label="总积分 正序" value="points-asc" />
                        <el-option label="总积分 倒序" value="points-desc" />
                        <el-option label="姓名 正序" value="name-asc" />
                        <el-option label="姓名 倒序" value="name-desc" />
                    </el-select>
                </el-form-item>
                
                <el-form-item label="按积分项筛选" class="half-width">
                    <el-select v-model="filterItemIds" placeholder="全部积分项" clearable multiple collapse-tags collapse-tags-tooltip size="default">
                        <el-option v-for="item in allPointsItems" :key="item.id" 
                            :label="item.name + (item.sign === 'plus' ? ' (加分)' : ' (扣分)')" 
                            :value="item.id" />
                    </el-select>
                </el-form-item>
            </div>

            <el-form-item label="时间范围 (可选)" class="full-width">
                <el-date-picker
                    v-model="dateRange"
                    type="datetimerange"
                    range-separator="至"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                    :default-time="defaultTime"
                    size="default"
                    class="date-range-picker"
                />
            </el-form-item>

            <div class="preview-section">
                <div class="preview-header">
                    <span>数据预览 ({{ previewRows.length }} 条)</span>
                </div>
                <div class="preview-table-wrapper">
                    <el-table :data="previewRows" size="small" border stripe :style="{ width: '100%', height: '200px' }">
                        <el-table-column v-for="col in exportData.columns" :key="col.prop" :prop="col.prop" :label="col.label" />
                        <template #empty>
                            <div class="empty-preview">无数据</div>
                        </template>
                    </el-table>
                </div>
            </div>
        </el-form>

        <template #footer>
            <div class="dialog-footer">
                <el-button @click="exportVisible = false">取消</el-button>
                <el-button type="primary" @click="doExportExcel"
                    :disabled="(exportScope === 'group' && !exportGroupId) || exportData.rows.length === 0">
                    <i-ep-download /> 导出
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
.export-form {
    padding-top: 0;
}

.form-row {
    display: flex;
    gap: 16px;
    width: 100%;
}

.half-width {
    flex: 1;
    min-width: 0;
}

.full-width {
    width: 100%;
}

.full-width-select {
    width: 100%;
}

.group-select {
    width: 100%;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.date-range-picker {
    width: 100% !important;
}

.preview-section {
    margin-top: 10px;
    border: 1px solid #eee;
    border-radius: 4px;
    overflow: hidden;
}

.preview-header {
    padding: 8px 12px;
    background-color: #f5f7fa;
    border-bottom: 1px solid #eee;
    font-size: 13px;
    font-weight: 600;
    color: #606266;
}

.preview-table-wrapper {
    padding: 0;
}

.empty-preview {
    padding: 20px;
    color: #909399;
    text-align: center;
}
</style>


