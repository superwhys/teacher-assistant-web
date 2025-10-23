<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRawFile, UploadFile, UploadInstance } from 'element-plus'
import * as XLSX from 'xlsx'
import { parseExcelToImportRows, type ImportRow } from '@/utils/pointsImport'
import { useStudentStore } from '@/stores/studentStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import { usePointsStore } from '@/stores/pointsStore'

const props = defineProps<{
    activeClassId: string | null
    activeClassName: string
}>()

const studentStore = useStudentStore()
const groupStore = useStudentGroupStore()
const pointsStore = usePointsStore()

const studentsOfActive = computed(() => {
    const id = props.activeClassId
    return id ? studentStore.listByClassId(id) : []
})

const groupsOfActive = computed(() => {
    const id = props.activeClassId
    return id ? groupStore.listByClassId(id) : []
})

// 导入
const importVisible = ref(false)
const importLoading = ref(false)
const uploadRef = ref<UploadInstance>()
const importParsed = ref<ImportRow[]>([])
const importSkipped = ref(0)
const importFileName = ref('')

function openImportDialog() {
    if (!props.activeClassId) {
        ElMessage.error('请先选择班级')
        return
    }
    importVisible.value = true
}

async function handleExcelFile(file: File) {
    if (!props.activeClassId) {
        ElMessage.error('请先选择班级')
        return false
    }
    if (importLoading.value) return false
    importLoading.value = true
    try {
        const names = new Set(studentsOfActive.value.map(s => s.studentName))
        const { rows, skipped } = await parseExcelToImportRows(file, names)
        if (!rows.length) {
            ElMessage.warning('未解析到有效的记录，请检查表头是否包含“姓名/分值”')
            return false
        }
        importParsed.value = rows
        importSkipped.value = skipped
        ElMessage.success(`解析成功：${rows.length} 条，跳过 ${skipped} 条`)
    } catch (err: any) {
        ElMessage.error(`导入失败：${err?.message || '未知错误'}`)
    } finally {
        importLoading.value = false
    }
    return false
}

async function beforeImportUpload(file: UploadRawFile) {
    return handleExcelFile(file as unknown as File)
}

async function handleImportChange(file: UploadFile) {
    if (!file || !file.raw) return
    await handleExcelFile(file.raw)
    importFileName.value = file.name || ''
}

function clearImportPreview() {
    importParsed.value = []
    importSkipped.value = 0
    importFileName.value = ''
    uploadRef.value?.clearFiles()
}

function confirmImportPoints() {
    if (!props.activeClassId) return
    if (importParsed.value.length === 0) {
        ElMessage.warning('暂无可导入的数据')
        return
    }
    for (const r of importParsed.value) {
        pointsStore.addPoints(props.activeClassId, [r.studentName], r.delta, {
            itemName: r.itemName || '导入',
            itemSign: r.itemSign,
            itemValue: Math.abs(r.delta),
        })
    }
    ElMessage.success(`已导入 ${importParsed.value.length} 条积分变动`)
    clearImportPreview()
    importVisible.value = false
}

// 导出
const exportVisible = ref(false)
const exportType = ref<'history' | 'final'>('final')
const exportScope = ref<'all' | 'group'>('all')
const exportGroupId = ref<string | ''>('')

function openExportDialog() {
    if (!props.activeClassId) {
        ElMessage.error('请先选择班级')
        return
    }
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

function buildExportRows(): { rows: any[]; sheetName: string } {
    const classId = props.activeClassId
    if (!classId) return { rows: [], sheetName: '' }
    if (exportType.value === 'history') {
        const list = pointsStore.getHistoryOf(classId)
        let filtered = list
        if (exportScope.value === 'group' && exportGroupId.value) {
            const g = groupsOfActive.value.find(x => x.id === exportGroupId.value)
            const nameSet = new Set(g?.members ?? [])
            filtered = list.filter(a => a.studentNames.some(n => nameSet.has(n)))
        }
        const rows = filtered.map(a => ({
            '时间': formatDateTime(new Date(a.at)),
            '积分项': a.itemName || '未知',
            '分值': a.delta,
            '学生': a.studentNames.join('、'),
        }))
        return { rows, sheetName: '历史记录' }
    } else {
        const points = pointsStore.getPointsOf(classId)
        let names = studentsOfActive.value.map(s => s.studentName)
        if (exportScope.value === 'group' && exportGroupId.value) {
            const g = groupsOfActive.value.find(x => x.id === exportGroupId.value)
            const nameSet = new Set(g?.members ?? [])
            names = names.filter(n => nameSet.has(n))
        }
        const rows = names.map(n => ({ '姓名': n, '最终积分': points[n] ?? 0 }))
        return { rows, sheetName: '最终积分' }
    }
}

function doExportExcel() {
    if (!props.activeClassId) return
    const { rows, sheetName } = buildExportRows()
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
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
    const filename = `${cls}_${typeSuffix}${scopeSuffix}_${ts}.xlsx`
    XLSX.writeFile(wb, filename)
    ElMessage.success('导出成功')
    exportVisible.value = false
}
</script>

<template>
    <span class="points-import-export">
        <el-button type="success" plain :disabled="!activeClassId" @click="openImportDialog">
            <i-ep-upload-filled /> 导入积分
        </el-button>
        <el-button type="info" plain :disabled="!activeClassId" @click="openExportDialog">
            <i-ep-download /> 导出 Excel
        </el-button>

        <el-dialog v-model="importVisible" title="导入积分（Excel）" width="720px">
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
                    <div class="el-upload__tip">支持 .xls/.xlsx，表头包含“姓名、分值（可带正负）、可选 项目”。</div>
                </template>
            </el-upload>

            <div class="excel-guide">
                <div class="guide-title">可用的 Excel 表头示例：</div>
                <ul class="guide-list">
                    <li>必填：姓名（或 Name/学生姓名）</li>
                    <li>必填：分值（或 积分/Delta/Points，支持正负号）</li>
                    <li>可选：项目（item/原因/备注）</li>
                </ul>
            </div>

            <div v-if="importParsed.length" class="excel-preview">
                <div class="preview-header">
                    <div class="preview-title">解析结果</div>
                    <el-space class="preview-meta" wrap size="small">
                        <el-tag v-if="importFileName" type="info" effect="light">文件：{{ importFileName }}</el-tag>
                        <el-tag type="primary" effect="light">共 {{ importParsed.length }} 条</el-tag>
                        <el-tag :type="importSkipped ? 'warning' : 'success'" effect="light">跳过 {{ importSkipped }} 条</el-tag>
                    </el-space>
                </div>
                <el-table :data="importParsed" border size="small" class="preview-table" max-height="260">
                    <el-table-column prop="studentName" label="姓名" min-width="140" />
                    <el-table-column label="分值" min-width="120" align="center">
                        <template #default="{ row }">
                            <span :class="['badge', row.delta > 0 ? 'plus' : 'minus']">{{ row.delta > 0 ? '+' : '-' }}{{ Math.abs(row.delta) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="itemName" label="项目" min-width="160">
                        <template #default="{ row }">{{ row.itemName || '导入' }}</template>
                    </el-table-column>
                </el-table>
                <div class="preview-actions">
                    <el-button type="primary" :disabled="!importParsed.length" @click="confirmImportPoints">确认导入</el-button>
                    <el-button @click="clearImportPreview">清空</el-button>
                </div>
            </div>
        </el-dialog>

        <el-dialog v-model="exportVisible" title="导出积分（Excel）" width="560px">
            <el-form label-position="top">
                <el-form-item label="导出内容">
                    <el-radio-group v-model="exportType">
                        <el-radio-button label="final">最终积分</el-radio-button>
                        <el-radio-button label="history">历史记录</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="导出范围">
                    <el-radio-group v-model="exportScope">
                        <el-radio-button label="all">全部学生</el-radio-button>
                        <el-radio-button label="group">指定分组</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item v-if="exportScope === 'group'" label="选择分组">
                    <el-select v-model="exportGroupId" placeholder="请选择分组" class="group-filter">
                        <el-option v-for="g in groupsOfActive" :key="g.id" :label="`${g.name}（${g.members.length}）`" :value="g.id" />
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="exportVisible = false">取消</el-button>
                    <el-button type="primary" :disabled="exportScope === 'group' && !exportGroupId" @click="doExportExcel">导出</el-button>
                </span>
            </template>
        </el-dialog>
    </span>
    
</template>

<style scoped>
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

.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 10px;
    border-radius: 999px;
    font-weight: 700;
    background: #f5f7ff;
    color: #2d5cf6;
}

.badge.minus {
    background: #fff2f2;
    color: #ef4444;
}

.group-filter {
    width: 220px;
}
</style>


