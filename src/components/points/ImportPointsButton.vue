<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRawFile, UploadFile, UploadInstance } from 'element-plus'
import { parseExcelToImportRowsSimple, type ImportRow } from '@/utils/pointsImport'
import { pointsManager } from '@/managers/points'
import * as XLSX from 'xlsx'
import { isApiRequestError } from '@/types/api'

const props = defineProps<{
    activeClassId: string | null
    activeClassName: string
}>()

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

const importVisible = ref(false)
const importLoading = ref(false)
const importLoadingText = ref('正在处理中...')
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
    importLoadingText.value = '正在解析 Excel...'
    importLoading.value = true
    try {
        const { rows, skipped } = await parseExcelToImportRowsSimple(file)
        if (!rows.length) {
            ElMessage.warning('未解析到有效的记录，请检查表头是否包含"姓名/分值"')
            return false
        }
        importParsed.value = rows
        importSkipped.value = skipped
        let msg = `解析成功：${rows.length} 条，跳过 ${skipped} 条`
        ElMessage.success(msg)
    } catch (err) {
        if (!isApiRequestError(err)) {
            console.error(err)
            ElMessage.error('导入失败')
        }
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

async function confirmImportPoints() {
    if (!props.activeClassId) return
    if (importParsed.value.length === 0) {
        ElMessage.warning('暂无可导入的数据')
        return
    }

    const classId = toNumber(props.activeClassId, 0)
    if (!classId) {
        ElMessage.error('班级 ID 无效')
        return
    }

    if (importLoading.value) return
    importLoadingText.value = '正在导入积分...'
    importLoading.value = true
    try {
        const records = importParsed.value
            .map(r => ({
                name: String(r.studentName ?? '').trim(),
                points: toNumber(r.delta, 0),
            }))
            .filter(r => !!r.name && !!r.points)

        if (records.length === 0) {
            ElMessage.warning('没有有效的记录可以导入')
            return
        }

        const missingStudents = await pointsManager.importRuleRecords({
            class_id: classId,
            records,
        })

        const uniqueMissing = Array.from(new Set((missingStudents ?? []).map(s => String(s ?? '').trim()).filter(Boolean)))
        if (uniqueMissing.length > 0) {
            const head = uniqueMissing.slice(0, 8).join('、')
            const more = uniqueMissing.length > 8 ? ` 等 ${uniqueMissing.length} 人` : ''
            ElMessage.warning(`学生不存在，已跳过：${head}${more}`)
        }

        const imported = Math.max(0, records.length - uniqueMissing.length)
        let msg = `导入完成：提交 ${records.length} 条，成功 ${imported} 条`
        if (importSkipped.value > 0) msg += `，解析跳过 ${importSkipped.value} 条`
        ElMessage.success(msg)

    clearImportPreview()
    importVisible.value = false
    } catch (err: any) {
        ElMessage.error(`导入失败：${err?.message || '未知错误'}`)
    } finally {
        importLoading.value = false
    }
}

function downloadTemplate() {
    const templateData = [
        { 姓名: '张三', 分值: 5 },
        { 姓名: '李四', 分值: -3 },
        { 姓名: '王五', 分值: 3 }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '积分导入模板')
    XLSX.writeFile(workbook, '积分导入模板.xlsx')
    ElMessage.success('模板下载成功')
}
</script>

<template>
    <el-button type="success" plain :disabled="!activeClassId" @click="openImportDialog">
        <i-ep-upload-filled /> 导入积分
    </el-button>

    <el-dialog
        v-model="importVisible"
        title="导入积分（Excel）"
        width="720px"
        :close-on-click-modal="!importLoading"
        :close-on-press-escape="!importLoading"
        :show-close="!importLoading"
    >
        <div v-loading="importLoading" :element-loading-text="importLoadingText" class="import-dialog-body">
            <el-upload
                ref="uploadRef"
                class="upload-area"
                drag
                accept=".xls,.xlsx"
                :auto-upload="false"
                :show-file-list="false"
                :before-upload="beforeImportUpload"
                :on-change="handleImportChange"
                :disabled="importLoading"
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
                    <li>姓名（必填）：学生姓名</li>
                    <li>分值（必填）：正数加分、负数扣分（例如：5、-3）</li>
                </ul>
                <el-alert
                    class="import-notice"
                    type="warning"
                    :closable="false"
                    show-icon
                    title="说明：导入会在学生积分基础上进行计算(包括总积分和可用积分)；如果学生不存在则会自动跳过。"
                />
                <el-button type="primary" link :disabled="importLoading" @click="downloadTemplate" class="download-template-btn">
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
                    <el-table-column label="姓名" width="140">
                        <template #default="{ row }">
                            {{ row.studentName }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="delta" label="分值" width="80" align="center">
                        <template #default="{ row }">
                            <span :style="{ color: row.delta > 0 ? '#67c23a' : '#f56c6c' }">
                                {{ row.delta > 0 ? '+' : '' }}{{ row.delta }}
                            </span>
                        </template>
                    </el-table-column>
                </el-table>
                <div class="preview-actions">
                    <el-button type="primary" :loading="importLoading" :disabled="!importParsed.length" @click="confirmImportPoints">确认导入</el-button>
                    <el-button :disabled="importLoading" @click="clearImportPreview">清空</el-button>
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<style scoped>
.import-dialog-body {
    position: relative;
}

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

.import-notice {
    margin-top: 8px;
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


