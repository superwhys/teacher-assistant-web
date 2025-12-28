<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRawFile, UploadFile, UploadInstance } from 'element-plus'
import * as XLSX from 'xlsx'
import type { ApiGender, CreateStudentReq } from '@/types/student'

const props = defineProps<{
    modelValue: boolean
    disabled?: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'add-single', payload: { name: string, gender: ApiGender }): void
    (e: 'add-batch', payload: { students: CreateStudentReq[] }): void
    (e: 'add-excel', payload: { students: CreateStudentReq[] }): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

type AddMode = 'single' | 'batch' | 'excel'
const addMode = ref<AddMode>('single')
const singleName = ref('')
const singleGender = ref<ApiGender>(1)
const batchText = ref('')
const batchGender = ref<ApiGender>(1)

const batchParsedStudents = computed<CreateStudentReq[]>(() => {
    const raw = batchText.value
    const normalized = raw
        .replace(/\s*[:：]\s*/g, ':')
        .replace(/，/g, ',')
    const tokens = normalized.split(/[\s,]+/).map(t => t.trim()).filter(Boolean)

    const students: CreateStudentReq[] = []
    for (const token of tokens) {
        const idx = token.indexOf(':')
        if (idx >= 0) {
            const name = token.slice(0, idx).trim()
            const genderPart = token.slice(idx + 1).trim()
            if (!name) continue
            students.push({
                name,
                gender: parseGender(genderPart, batchGender.value)
            })
        } else {
            const name = token.trim()
            if (!name) continue
            students.push({
                name,
                gender: batchGender.value
            })
        }
    }
    return students
})

const batchParsedNames = computed(() => {
    return batchParsedStudents.value
        .map(s => s.name)
        .filter((v): v is string => Boolean(v))
})

const batchPreviewRows = computed(() => batchParsedStudents.value)

const batchDuplicateCount = computed(() => {
    const map = new Map<string, number>()
    for (const name of batchParsedNames.value) {
        map.set(name, (map.get(name) ?? 0) + 1)
    }
    let dup = 0
    for (const count of map.values()) {
        if (count > 1) dup += (count - 1)
    }
    return dup
})

function addStudentSingle() {
    if (props.disabled) return

    const name = singleName.value.trim()
    if (!name) {
        ElMessage.error('请输入学生姓名')
        return
    }

    emit('add-single', { name, gender: singleGender.value })
    singleName.value = ''
}

function addStudentBatch() {
    if (props.disabled) return

    const students = batchParsedStudents.value
    if (students.length === 0) {
        ElMessage.error('请输入要批量添加的学生姓名，使用逗号/空格/换行分隔')
        return
    }

    emit('add-batch', {
        students
    })
    batchText.value = ''
}

const excelImporting = ref(false)
const uploadRef = ref<UploadInstance>()
const excelParsedStudents = ref<CreateStudentReq[]>([])
const excelSkippedCount = ref(0)
const excelFileName = ref('')

function parseGender(value: unknown, fallback: ApiGender = 1): ApiGender {
    const text = String(value ?? '').trim().toLowerCase()
    if (!text) return fallback
    if (['男', 'male', 'm', '1', 'boy', '♂'].includes(text)) return 1
    if (['女', 'female', 'f', '2', 'girl', '♀'].includes(text)) return 2
    if (['0', 'unknown', 'u'].includes(text)) return 0
    return fallback
}

function findFirst<T extends Record<string, any>>(row: T, keys: string[]): any {
    for (const key of keys) {
        const val = row[key]
        if (val !== undefined && String(val).trim() !== '') return val
    }
    return undefined
}

async function importExcelFromFile(file: File) {
    if (props.disabled) return false
    if (excelImporting.value) return false

    excelImporting.value = true
    try {
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as ArrayBuffer)
            reader.onerror = reject
            reader.readAsArrayBuffer(file)
        })

        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) throw new Error('Excel 文件没有工作表')
        const worksheet = workbook.Sheets[firstSheetName]!
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

        const nameKeys = ['姓名', 'name', 'Name', '学生姓名', 'studentname', 'StudentName']
        const genderKeys = ['性别', 'gender', 'Gender']

        let skipped = 0
        const students: CreateStudentReq[] = []
        for (const row of rows) {
            const nameVal = findFirst(row, nameKeys)
            if (!nameVal) {
                skipped += 1
                continue
            }
            const genderVal = findFirst(row, genderKeys)
            const name = String(nameVal).trim()
            if (!name) {
                skipped += 1
                continue
            }
            students.push({
                name,
                gender: parseGender(genderVal, 1)
            })
        }

        if (students.length === 0) {
            ElMessage.warning('未解析到有效的学生记录，请检查表头是否包含"姓名/性别"')
            return false
        }

        excelParsedStudents.value = students
        excelSkippedCount.value = skipped
        ElMessage.success(`解析成功：${students.length} 条，跳过 ${skipped} 条`)
    } catch (err: any) {
        ElMessage.error(`导入失败：${err?.message || '未知错误'}`)
    } finally {
        excelImporting.value = false
    }
    return false
}

async function beforeExcelUpload(file: UploadRawFile) {
    return importExcelFromFile(file as unknown as File)
}

async function handleExcelChange(file: UploadFile) {
    if (!file || !file.raw) return
    await importExcelFromFile(file.raw)
    excelFileName.value = file.name || ''
}

function clearExcelPreview() {
    excelParsedStudents.value = []
    excelSkippedCount.value = 0
    excelFileName.value = ''
    uploadRef.value?.clearFiles()
}

function confirmExcelImport() {
    if (props.disabled) return
    if (excelParsedStudents.value.length === 0) {
        ElMessage.warning('暂无可导入的数据')
        return
    }

    emit('add-excel', { students: excelParsedStudents.value })
    clearExcelPreview()
}

function downloadTemplate() {
    const templateData = [
        { 姓名: '张三', 性别: '男' },
        { 姓名: '李四', 性别: '女' },
        { 姓名: '王五', 性别: '男' },
        { 姓名: '赵六', 性别: '女' },
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '学生名单模板')
    XLSX.writeFile(workbook, '学生名单导入模板.xlsx')
    ElMessage.success('模板下载成功')
}

function genderText(gender?: ApiGender): string {
    if (gender === 1) return '男'
    if (gender === 2) return '女'
    return '未知'
}
</script>

<template>
    <el-dialog v-model="visible" title="添加学生" width="600px">
        <el-tabs v-model="addMode" class="add-tabs">
            <el-tab-pane label="单个添加" name="single">
                <el-form label-position="top" class="add-form">
                    <el-form-item label="姓名">
                        <el-input v-model="singleName" placeholder="请输入学生姓名" size="large" :disabled="disabled" />
                    </el-form-item>
                    <el-form-item label="性别">
                        <el-radio-group v-model="singleGender" size="large" :disabled="disabled">
                            <el-radio-button :label="1">男</el-radio-button>
                            <el-radio-button :label="2">女</el-radio-button>
                        </el-radio-group>
                    </el-form-item>
                    <el-button class="add-btn" type="primary" size="large" :disabled="disabled" @click="addStudentSingle">
                        <i-ep-plus class="btn-icon" /> 添加
                    </el-button>
                </el-form>
            </el-tab-pane>

            <el-tab-pane label="批量添加" name="batch">
                <el-form label-position="top" class="add-form">
                    <el-form-item label="姓名列表（逗号/空格/换行分隔）">
                        <el-input
                            v-model="batchText"
                            type="textarea"
                            :rows="4"
                            size="large"
                            placeholder="例：张三:男, 李四:女&#10;王五 刘六"
                            :disabled="disabled"
                        />
                    </el-form-item>

                    <div v-if="batchPreviewRows.length" class="batch-preview">
                        <div class="preview-header">
                            <div class="preview-title">预解析结果</div>
                            <el-space class="preview-meta" wrap size="small">
                                <el-tag type="primary" effect="light">共 {{ batchPreviewRows.length }} 条</el-tag>
                                <el-tag v-if="batchDuplicateCount" type="warning" effect="light">重复 {{ batchDuplicateCount }} 条</el-tag>
                            </el-space>
                        </div>

                        <el-table :data="batchPreviewRows" border size="small" class="preview-table" max-height="220">
                            <el-table-column prop="name" label="姓名" min-width="140" />
                            <el-table-column label="性别" min-width="100">
                                <template #default="{ row }">{{ genderText(row.gender) }}</template>
                            </el-table-column>
                        </el-table>
                    </div>

                    <el-form-item label="默认性别">
                        <el-radio-group v-model="batchGender" size="large" :disabled="disabled">
                            <el-radio-button :label="1">男</el-radio-button>
                            <el-radio-button :label="2">女</el-radio-button>
                        </el-radio-group>
                    </el-form-item>
                    <el-button class="add-btn" type="primary" size="large" :disabled="disabled" @click="addStudentBatch">
                        <i-ep-plus class="btn-icon" /> 批量添加
                    </el-button>
                </el-form>
            </el-tab-pane>

            <el-tab-pane label="导入 Excel" name="excel">
                <el-upload
                    ref="uploadRef"
                    class="upload-area"
                    drag
                    accept=".xls,.xlsx"
                    :auto-upload="false"
                    :show-file-list="false"
                    :before-upload="beforeExcelUpload"
                    :on-change="handleExcelChange"
                    :disabled="disabled"
                >
                    <i-ep-upload-filled class="upload-icon" />
                    <div v-if="!excelFileName" class="el-upload__text">将文件拖到此处，或点击上传</div>
                    <div v-else class="upload-file-name">
                        <i-ep-document class="file-icon" /> {{ excelFileName }}
                        <span class="change-hint">（点击重新选择）</span>
                    </div>
                    <template #tip>
                        <div class="el-upload__tip">支持 .xls/.xlsx，表头包含"姓名"和可选"性别"。</div>
                    </template>
                </el-upload>

                <div class="excel-guide">
                    <div class="guide-title">可用的 Excel 表头示例：</div>
                    <ul class="guide-list">
                        <li>必填：姓名（或 Name/学生姓名）</li>
                        <li>可选：性别（或 Gender），支持值：男/女、male/female、m/f、1/2</li>
                    </ul>
                    <el-button type="primary" link :disabled="disabled" @click="downloadTemplate" class="download-template-btn">
                        <i-ep-download /> 下载模板
                    </el-button>
                </div>

                <div v-if="excelParsedStudents.length" class="excel-preview">
                    <div class="preview-header">
                        <div class="preview-title">解析结果</div>
                        <el-space class="preview-meta" wrap size="small">
                            <el-tag v-if="excelFileName" type="info" effect="light">文件：{{ excelFileName }}</el-tag>
                            <el-tag type="primary" effect="light">共 {{ excelParsedStudents.length }} 条</el-tag>
                            <el-tag :type="excelSkippedCount ? 'warning' : 'success'" effect="light">跳过 {{ excelSkippedCount }} 条</el-tag>
                        </el-space>
                    </div>

                    <el-table :data="excelParsedStudents" border size="small" class="preview-table" max-height="260">
                        <el-table-column prop="name" label="姓名" min-width="140" />
                        <el-table-column label="性别" min-width="100">
                            <template #default="{ row }">{{ genderText(row.gender) }}</template>
                        </el-table-column>
                    </el-table>

                    <div class="preview-actions">
                        <el-button type="primary" :disabled="disabled || !excelParsedStudents.length" @click="confirmExcelImport">
                            确认导入
                        </el-button>
                        <el-button :disabled="disabled" @click="clearExcelPreview">清空</el-button>
                    </div>
                </div>
            </el-tab-pane>
        </el-tabs>
    </el-dialog>
</template>

<style scoped>
.add-tabs {
    margin-top: -10px;
}

.add-form :deep(.el-form-item) {
    margin-bottom: 16px;
}

.add-btn {
    width: 100%;
}

.btn-icon {
    margin-right: 6px;
}

.batch-preview {
    margin-top: -4px;
    margin-bottom: 16px;
    padding: 12px;
    border: 1px dashed var(--el-border-color);
    border-radius: 8px;
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
