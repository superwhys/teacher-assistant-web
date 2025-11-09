<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRawFile, UploadFile, UploadInstance } from 'element-plus'
import { parseItemsExcelToRows, type ImportItemRow } from '@/utils/pointsImport'
import { usePointsItemStore } from '@/stores/pointsItemStore'
import * as XLSX from 'xlsx'

const pointsItemStore = usePointsItemStore()

const importVisible = ref(false)
const importLoading = ref(false)
const uploadRef = ref<UploadInstance>()
const importParsed = ref<ImportItemRow[]>([])
const importSkipped = ref(0)
const importFileName = ref('')

function openDialog() {
    importVisible.value = true
}

async function handleExcelFile(file: File) {
    if (importLoading.value) return false
    importLoading.value = true
    try {
        const { rows, skipped } = await parseItemsExcelToRows(file)
        if (!rows.length) {
            ElMessage.warning('未解析到有效的记录，请检查表头是否为"组名/项目名/分值"')
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

function confirmImport() {
    if (!importParsed.value.length) {
        ElMessage.warning('暂无可导入的数据')
        return
    }

    const existingGroups = pointsItemStore.listGroups()
    const groupNameToId = new Map<string, string>()
    for (const g of existingGroups) groupNameToId.set(g.name, g.id)

    let createdGroups = 0
    let createdItems = 0

    for (const row of importParsed.value) {
        let gid = groupNameToId.get(row.groupName)
        if (!gid) {
            const g = pointsItemStore.addGroup(row.groupName)
            gid = g.id
            groupNameToId.set(row.groupName, gid)
            createdGroups += 1
        }
        pointsItemStore.addItem(gid, row.itemName, row.value, row.sign)
        createdItems += 1
    }

    ElMessage.success(`导入成功：新增分组 ${createdGroups} 个，新增项目 ${createdItems} 个，跳过 ${importSkipped.value} 条`)
    clearImportPreview()
    importVisible.value = false
}

function downloadTemplate() {
    const templateData = [
        { 组名: '常规操作', 项目名: '作业完成', 分值: 5 },
        { 组名: '常规操作', 项目名: '忘带作业', 分值: -3 },
        { 组名: '课堂表现', 项目名: '主动发言', 分值: 3 },
        { 组名: '课堂表现', 项目名: '课堂违纪', 分值: -5 },
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '积分项模板')
    XLSX.writeFile(workbook, '积分项导入模板.xlsx')
    ElMessage.success('模板下载成功')
}
</script>

<template>
    <el-button type="success" plain @click="openDialog">
        <i-ep-upload-filled /> 导入积分项
    </el-button>

    <el-dialog v-model="importVisible" title="导入积分项（Excel）" width="720px">
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
                <div class="el-upload__tip">支持 .xls/.xlsx，表头包含"组名/项目名/分值"</div>
            </template>
        </el-upload>

        <div class="excel-guide">
            <div class="guide-title">Excel 表头示例：</div>
            <ul class="guide-list">
                <li>组名：分组名称（例如：常规操作、课堂表现）</li>
                <li>项目名：积分项名称（例如：作业完成、主动发言）</li>
                <li>分值：正数为加分，负数为扣分（例如：5、-3）</li>
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
                <el-table-column prop="groupName" label="分组" width="120" />
                <el-table-column prop="itemName" label="项目名" min-width="140" />
                <el-table-column prop="value" label="分值" width="80" align="center">
                    <template #default="{ row }">
                        <span :style="{ color: row.sign === 'plus' ? '#67c23a' : '#f56c6c' }">
                            {{ row.sign === 'plus' ? '+' : '' }}{{ row.value }}
                        </span>
                    </template>
                </el-table-column>
            </el-table>
            <div class="preview-actions">
                <el-button type="primary" :disabled="!importParsed.length" @click="confirmImport">确认导入</el-button>
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

