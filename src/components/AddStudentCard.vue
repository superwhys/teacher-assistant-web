<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRawFile, UploadFile, UploadInstance } from 'element-plus'
import * as XLSX from 'xlsx'
import BaseCard from '@/components/BaseCard.vue'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'
import type { Student } from '@/types/student'

const classStore = useClassStore()
const studentStore = useStudentStore()

const addMode = ref<'single' | 'batch' | 'excel'>('single')
const singleName = ref('')
const singleGender = ref<'male' | 'female'>('male')

const batchText = ref('')
const batchGender = ref<'male' | 'female'>('male')

function addStudentSingle() {
    const activeClass = classStore.activeClass
    if (!activeClass) {
        ElMessage.error('请先创建并选择一个班级')
        return
    }
    const name = singleName.value.trim()
    if (!name) {
        ElMessage.error('请输入学生姓名')
        return
    }
    const student: Student = { studentName: name, gender: singleGender.value }
    const classId = classStore.activeClassId!
    studentStore.addStudent(classId, student)
    singleName.value = ''
    ElMessage.success('已添加学生')
}

function addStudentBatch() {
    const activeClass = classStore.activeClass
    if (!activeClass) {
        ElMessage.error('请先创建并选择一个班级')
        return
    }
    const raw = batchText.value
    const tokens = raw.split(/[\s,]+/).map(t => t.trim()).filter(Boolean)
    if (tokens.length === 0) {
        ElMessage.error('请输入要批量添加的学生姓名，使用逗号/空格/换行分隔')
        return
    }
    const students: Student[] = tokens.map(n => ({ studentName: n, gender: batchGender.value }))
    const classId = classStore.activeClassId!
    studentStore.addStudentsBatch(classId, students)
    batchText.value = ''
    ElMessage.success('已批量添加')
}

const excelImporting = ref(false)
const uploadRef = ref<UploadInstance>()
const excelParsedStudents = ref<Student[]>([])
const excelSkippedCount = ref(0)
const excelFileName = ref('')

function parseGender(value: unknown, fallback: 'male' | 'female' = 'male'): 'male' | 'female' {
    const text = String(value ?? '').trim().toLowerCase()
    if (!text) return fallback
    if (['男', 'male', 'm', '1', 'boy', '♂'].includes(text)) return 'male'
    if (['女', 'female', 'f', '0', 'girl', '♀'].includes(text)) return 'female'
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
    const activeClass = classStore.activeClass
    if (!activeClass) {
        ElMessage.error('请先创建并选择一个班级')
        return false
    }
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
        const students: Student[] = []
        for (const row of rows) {
            const nameVal = findFirst(row, nameKeys)
            if (!nameVal) {
                skipped += 1
                continue
            }
            const genderVal = findFirst(row, genderKeys)
            const student: Student = {
                studentName: String(nameVal).trim(),
                gender: parseGender(genderVal, 'male')
            }
            students.push(student)
        }

        if (students.length === 0) {
            ElMessage.warning('未解析到有效的学生记录，请检查表头是否包含“姓名/性别”')
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
    if (excelParsedStudents.value.length === 0) {
        ElMessage.warning('暂无可导入的数据')
        return
    }
    const classId = classStore.activeClassId!
    studentStore.addStudentsBatch(classId, excelParsedStudents.value)
    ElMessage.success(`已导入 ${excelParsedStudents.value.length} 条`)
    clearExcelPreview()
}
</script>

<template>
    <BaseCard title="添加学生" shadow="never" cardClass="add-card">
        <el-tabs v-model="addMode" class="add-tabs">
            <el-tab-pane label="单个添加" name="single">
                <el-form label-position="top" class="add-form">
                    <el-form-item label="姓名">
                        <el-input v-model="singleName" placeholder="请输入学生姓名" />
                    </el-form-item>
                    <el-form-item label="性别">
                        <el-radio-group v-model="singleGender">
                            <el-radio-button label="male">男</el-radio-button>
                            <el-radio-button label="female">女</el-radio-button>
                        </el-radio-group>
                    </el-form-item>
                    <el-button class="add-btn" type="primary" size="large" @click="addStudentSingle">
                        <i-ep-plus class="btn-icon" /> 添加
                    </el-button>
                </el-form>
            </el-tab-pane>
            <el-tab-pane label="批量添加" name="batch">
                <el-form label-position="top" class="add-form">
                    <el-form-item label="姓名列表（逗号/空格/换行分隔）">
                        <el-input v-model="batchText" type="textarea" :rows="4" placeholder="例：张三, 李四\n王五 刘六" />
                    </el-form-item>
                    <el-form-item label="默认性别">
                        <el-radio-group v-model="batchGender">
                            <el-radio-button label="male">男</el-radio-button>
                            <el-radio-button label="female">女</el-radio-button>
                        </el-radio-group>
                    </el-form-item>
                    <el-button class="add-btn" type="primary" size="large" @click="addStudentBatch">
                        <i-ep-plus class="btn-icon" /> 批量添加
                    </el-button>
                </el-form>
            </el-tab-pane>
            <el-tab-pane label="导入 Excel" name="excel">
                <el-upload ref="uploadRef" class="upload-area" drag accept=".xls,.xlsx" :auto-upload="false" :show-file-list="false"
                    :before-upload="beforeExcelUpload" :on-change="handleExcelChange">
                    <i-ep-upload-filled class="upload-icon" />
                    <div v-if="!excelFileName" class="el-upload__text">将文件拖到此处，或点击上传</div>
                    <div v-else class="upload-file-name">
                        <i-ep-document class="file-icon" /> {{ excelFileName }}
                        <span class="change-hint">（点击重新选择）</span>
                    </div>
                    <template #tip>
                        <div class="el-upload__tip">支持 .xls/.xlsx，表头包含“姓名”和可选“性别”。</div>
                    </template>
                </el-upload>
                <div class="excel-guide">
                    <div class="guide-title">可用的 Excel 表头示例：</div>
                    <ul class="guide-list">
                        <li>必填：姓名（或 Name/学生姓名）</li>
                        <li>可选：性别（或 Gender），支持值：男/女、male/female、m/f、1/0</li>
                    </ul>
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
                        <el-table-column prop="studentName" label="姓名" min-width="140" />
                        <el-table-column label="性别" min-width="100">
                            <template #default="{ row }">{{ row.gender === 'male' ? '男' : '女' }}</template>
                        </el-table-column>
                    </el-table>
                    <div class="preview-actions">
                        <el-button type="primary" :disabled="!excelParsedStudents.length" @click="confirmExcelImport">确认导入</el-button>
                        <el-button @click="clearExcelPreview">清空</el-button>
                    </div>
                </div>
            </el-tab-pane>
        </el-tabs>
    </BaseCard>
</template>

<style scoped>
.add-card {
    border-radius: 16px;
}

.form-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
}

.add-form :deep(.el-form-item) {
    margin-bottom: 12px;
}

.add-btn {
    width: 100%;
}

.btn-icon {
    margin-right: 6px;
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
</style>
