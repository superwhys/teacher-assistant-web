<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRawFile, UploadFile, UploadInstance } from 'element-plus'
import { parseExcelToImportRows, type ImportRow } from '@/utils/pointsImport'
import { useStudentStore } from '@/stores/studentStore'
import { usePointsStore } from '@/stores/pointsStore'
import * as XLSX from 'xlsx'

const props = defineProps<{
    activeClassId: string | null
    activeClassName: string
}>()

const studentStore = useStudentStore()
const pointsStore = usePointsStore()

const studentsOfActive = computed(() => {
    const id = props.activeClassId
    return id ? studentStore.listByClassId(id) : []
})

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
            ElMessage.warning('未解析到有效的记录，请检查表头是否包含"姓名/分值"')
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

function downloadTemplate() {
    const students = studentsOfActive.value
    const templateData = students.length > 0
        ? students.slice(0, 3).map((student, index) => ({
            姓名: student.studentName,
            分值: index === 0 ? 5 : index === 1 ? -3 : 3,
            项目: index === 0 ? '作业完成' : index === 1 ? '迟到' : '主动发言'
        }))
        : [
            { 姓名: '张三', 分值: 5, 项目: '作业完成' },
            { 姓名: '李四', 分值: -3, 项目: '迟到' },
            { 姓名: '王五', 分值: 3, 项目: '主动发言' }
        ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '积分导入模板')
    const fileName = props.activeClassName ? `${props.activeClassName}-积分导入模板.xlsx` : '积分导入模板.xlsx'
    XLSX.writeFile(workbook, fileName)
    ElMessage.success('模板下载成功')
}
</script>

<template>
    <el-button type="success" plain :disabled="!activeClassId" @click="openImportDialog">
        <i-ep-upload-filled /> 导入积分
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
                <div class="el-upload__tip">支持 .xls/.xlsx，表头包含"姓名/分值"，可选"项目"列。</div>
            </template>
        </el-upload>

        <div class="excel-guide">
            <div class="guide-title">Excel 表头示例：</div>
            <ul class="guide-list">
                <li>姓名（必填）：学生姓名，必须在当前班级中存在</li>
                <li>分值（必填）：正数加分、负数扣分（例如：5、-3）</li>
                <li>项目（可选）：积分项名称（例如：作业完成、课堂表现）</li>
            </ul>
            <el-button type="primary" link @click="downloadTemplate" class="download-template-btn">
                <i-ep-download /> 下载模板
            </el-button>
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
            <el-table :data="importParsed" border size="small" class="preview-table" max-height="300">
                <el-table-column prop="studentName" label="姓名" width="120" />
                <el-table-column prop="itemName" label="项目" min-width="120" />
                <el-table-column prop="delta" label="分值" width="80" align="center">
                    <template #default="{ row }">
                        <span :style="{ color: row.delta > 0 ? '#67c23a' : '#f56c6c' }">
                            {{ row.delta > 0 ? '+' : '' }}{{ row.delta }}
                        </span>
                    </template>
                </el-table-column>
            </el-table>
            <div class="preview-actions">
                <el-button type="primary" :disabled="!importParsed.length" @click="confirmImportPoints">确认导入</el-button>
                <el-button @click="clearImportPreview">清空</el-button>
            </div>
        </div>
    </el-dialog>
</template>

<style scoped>
.upload-area {
    margin-bottom: 12px;
}

.upload-icon {
    font-size: 56px;
    color: var(--el-text-color-secondary);
    margin-bottom: 12px;
}

.upload-file-name {
    margin-top: 4px;
    color: var(--el-text-color-regular);
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
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
    margin-bottom: 8px;
}

.download-template-btn {
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.excel-preview {
    margin-top: 16px;
    padding: 12px;
    border: 1px dashed var(--el-border-color);
    border-radius: 8px;
}

.preview-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 12px;
}

.preview-title {
    font-weight: 600;
}

.preview-meta {
    width: 100%;
}

.preview-table {
    margin-bottom: 10px;
}

.preview-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}
</style>

