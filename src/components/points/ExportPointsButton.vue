<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { studentManager } from '@/managers/student'
import { pointsManager, type UiPointsRule } from '@/managers/points'
import type { StudentGroupDTO } from '@/types/student'
import type { ExportPointsRecordsPreviewReq, ExportSort, ExportType } from '@/types/points'
import { isApiRequestError } from '@/types/api'

const props = defineProps<{
    activeClassId: string | null
    activeClassName: string
}>()

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

const exportVisible = ref(false)
const exportType = ref<ExportType>('final')
const exportScope = ref<'all' | 'group'>('all')
const exportGroupId = ref<number | null>(null)
const dateRange = ref<[Date, Date] | []>([])
const defaultTime: [Date, Date] = [
    new Date(2000, 1, 1, 0, 0, 0),
    new Date(2000, 1, 1, 23, 59, 59),
]

// 排序（仅保留积分正序/倒序）
const sortBy = ref<'points-asc' | 'points-desc'>('points-desc')
const filterItemIds = ref<number[]>([])

const groupsOfActive = ref<StudentGroupDTO[]>([])
const rulesOfActive = ref<UiPointsRule[]>([])
const baseLoading = ref(false)

function addMonths(date: Date, months: number): Date {
    const d = new Date(date)
    d.setMonth(d.getMonth() + months)
    return d
}

function buildDefaultRecent3MonthsRange(): [Date, Date] {
    const end = new Date()
    end.setHours(23, 59, 59, 0)
    const start = new Date(end)
    start.setMonth(start.getMonth() - 3)
    start.setHours(23, 59, 59, 0)
    return [start, end]
}

const MAX_RANGE_MONTHS = 3
const rangeLimitWarned = ref(false)

const groupOptions = computed(() => {
    return (groupsOfActive.value ?? [])
        .map(g => ({
            id: toNumber(g.id, 0),
            name: String(g.name ?? '').trim(),
            count: (g.students || []).length,
        }))
        .filter(g => g.id > 0 && !!g.name)
})

async function ensureBaseLoaded(classId: number) {
    if (!classId) return
    if (baseLoading.value) return
    baseLoading.value = true
    try {
        const [groups, rules] = await Promise.all([
            studentManager.listGroups(classId),
            pointsManager.listRulesFlat(),
        ])
        groupsOfActive.value = groups ?? []
        rulesOfActive.value = rules ?? []
    } catch (err) {
        groupsOfActive.value = []
        rulesOfActive.value = []

        if (!isApiRequestError(err)) {
            console.error(err)
            ElMessage.error('加载导出选项失败')
        }
    } finally {
        baseLoading.value = false
    }
}

function openExportDialog() {
    if (!props.activeClassId) {
        ElMessage.error('请先选择班级')
        return
    }
    // 重置
    dateRange.value = buildDefaultRecent3MonthsRange()
    sortBy.value = 'points-desc'
    filterItemIds.value = []
    exportScope.value = 'all'
    exportGroupId.value = null
    rangeLimitWarned.value = false
    exportVisible.value = true
    const classId = toNumber(props.activeClassId, 0)
    void ensureBaseLoaded(classId)
    schedulePreview()
}

function mapSortToApi(sort: typeof sortBy.value): ExportSort {
    return sort === 'points-asc' ? 'points_asc' : 'points_desc'
}

const previewKey = ref('')
const previewHeaders = ref<string[]>([])
const previewValues = ref<string[][]>([])
const previewLoading = ref(false)
const exportLoading = ref(false)

function buildPreviewReq(): ExportPointsRecordsPreviewReq | null {
    if (!props.activeClassId) return null
    const classId = toNumber(props.activeClassId, 0)
    if (!classId) return null

    const req: ExportPointsRecordsPreviewReq = {
        class_id: classId,
        export_type: exportType.value,
    }

    if (exportScope.value === 'group') {
        req.student_group_id = exportGroupId.value || 0
    } else {
        req.student_group_id = 0
    }

    if (filterItemIds.value.length > 0) {
        req.rule_ids = filterItemIds.value
    }

    req.sort = mapSortToApi(sortBy.value)

    if (dateRange.value.length === 2) {
        const [start, end] = dateRange.value
        req.from = start.toISOString()
        req.to = end.toISOString()
    }

    return req
}

async function refreshPreview() {
    const req = buildPreviewReq()
    if (!req) {
        previewKey.value = ''
        previewHeaders.value = []
        previewValues.value = []
        return
    }
    if (previewLoading.value) return
    previewLoading.value = true
    try {
        const resp = await pointsManager.exportRuleRecordsPreview(req)
        previewKey.value = String(resp.key ?? '')
        previewHeaders.value = resp.headers ?? []
        previewValues.value = resp.values ?? []
    } catch {
        previewKey.value = ''
        previewHeaders.value = []
        previewValues.value = []
    } finally {
        previewLoading.value = false
    }
}

let previewTimer: number | null = null
function schedulePreview() {
    if (!exportVisible.value) return
    if (previewTimer) window.clearTimeout(previewTimer)
    previewTimer = window.setTimeout(() => {
        void refreshPreview()
    }, 250)
}

watch(() => exportScope.value, (v) => {
    if (v !== 'group') exportGroupId.value = null
    schedulePreview()
})

watch([exportType, exportGroupId, dateRange, sortBy, filterItemIds], () => {
    schedulePreview()
}, { deep: true })

watch(() => dateRange.value, (v) => {
    if (!Array.isArray(v) || v.length !== 2) return
    const [start, end] = v
    if (!(start instanceof Date) || !(end instanceof Date)) return
    if (start.getTime() > end.getTime()) return

    const limitEnd = addMonths(start, MAX_RANGE_MONTHS)
    limitEnd.setHours(23, 59, 59, 0)
    if (end.getTime() > limitEnd.getTime()) {
        dateRange.value = [start, limitEnd]
        if (!rangeLimitWarned.value) {
            rangeLimitWarned.value = true
            ElMessage.warning(`时间范围最多只能选择${MAX_RANGE_MONTHS}个月`)
        }
    }
}, { deep: true })

const allPointsItems = computed(() => {
    return (rulesOfActive.value ?? []).map(r => ({
        id: r.id,
        name: r.name,
        sign: r.sign,
        groupName: r.groupName,
    }))
})

const previewColumns = computed(() => {
    return (previewHeaders.value ?? []).map((h, idx) => ({
        prop: `c${idx}`,
        label: h,
    }))
})

const previewRows = computed(() => {
    const headers = previewHeaders.value ?? []
    const values = previewValues.value ?? []
    if (headers.length === 0 || values.length === 0) return []
    return values.map(row => {
        const obj: Record<string, string> = {}
        headers.forEach((_, idx) => {
            obj[`c${idx}`] = String(row?.[idx] ?? '')
        })
        return obj
    })
})

function buildExportFileName(): string {
    const cls = props.activeClassName || '未命名班级'
    const groupName = exportScope.value === 'group'
        ? (groupOptions.value.find(g => g.id === (exportGroupId.value || 0))?.name || '分组')
        : '全部学生'
    const scopeSuffix = `_${groupName}`
    const typeSuffix = exportType.value === 'records' ? '积分历史' : '最终积分'

    let dateSuffix = ''
    if (dateRange.value.length === 2) {
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
    return `${cls}_${typeSuffix}${scopeSuffix}${filterSuffix}${dateSuffix}_${ts}.xlsx`
}

async function doExportExcel() {
    const key = String(previewKey.value ?? '').trim()
    if (!key) {
        ElMessage.info('请先获取预览数据')
        return
    }
    if (exportLoading.value) return
    exportLoading.value = true
    try {
        const blob = await pointsManager.exportRuleRecords(key)
        const filename = buildExportFileName()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
        ElMessage.success('导出成功')
        exportVisible.value = false
    } catch {
    } finally {
        exportLoading.value = false
    }
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
                        <el-radio-button value="records">历史记录</el-radio-button>
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
                        <el-option v-for="g in groupOptions" :key="g.id" :label="`${g.name}（${g.count}）`"
                            :value="g.id" />
                    </el-select>
                </el-form-item>
            </div>

            <div class="form-row">
                <el-form-item v-if="exportType === 'final'" label="排序方式" class="half-width">
                    <el-select v-model="sortBy" size="default">
                        <el-option label="积分正序" value="points-asc" />
                        <el-option label="积分倒序" value="points-desc" />
                    </el-select>
                </el-form-item>

                <el-form-item label="按积分项筛选" class="half-width">
                    <el-select v-model="filterItemIds" placeholder="全部积分项" clearable multiple collapse-tags
                        collapse-tags-tooltip size="default">
                        <el-option v-for="item in allPointsItems" :key="item.id"
                            :label="`${item.groupName ? item.groupName + ' / ' : ''}${item.name}${item.sign === 'plus' ? ' (加分)' : ' (扣分)'}`"
                            :value="item.id" />
                    </el-select>
                </el-form-item>
            </div>

            <el-form-item label="时间范围 (可选)" class="full-width">
                <el-date-picker v-model="dateRange" type="datetimerange" range-separator="至" start-placeholder="开始时间"
                    end-placeholder="结束时间" :default-time="defaultTime" size="default" class="date-range-picker" />
            </el-form-item>

            <div class="preview-section">
                <div class="preview-header">
                    <span>数据预览 ({{ previewRows.length }} 条)</span>
                </div>
                <div class="preview-table-wrapper" v-loading="previewLoading" element-loading-text="预览生成中..."
                    element-loading-background="rgba(255, 255, 255, 0.65)">
                    <el-table :data="previewRows" size="small" border stripe
                        :style="{ width: '100%', height: '200px' }">
                        <el-table-column v-for="col in previewColumns" :key="col.prop" :prop="col.prop"
                            :label="col.label" />
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
                    :disabled="(exportScope === 'group' && !exportGroupId) || previewRows.length === 0 || !previewKey || previewLoading || exportLoading">
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
