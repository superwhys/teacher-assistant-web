<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadRawFile, UploadFile, UploadInstance } from 'element-plus'
import * as XLSX from 'xlsx'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import StudentCard from '@/components/StudentCard.vue'
import type { Student } from '@/types/student'

const classStore = useClassStore()

const activeClass = computed(() => classStore.activeClass)
const activeClassId = computed({
    get: () => classStore.activeClassId,
    set: (val: string | null) => { if (val) classStore.setActiveClass(val) }
})
const studentStore = useStudentStore()
const groupStore = useStudentGroupStore()
const studentsOfActive = computed(() => {
    const id = activeClassId.value
    return id ? studentStore.listByClassId(id) : []
})

const maleCount = computed(() => studentsOfActive.value.filter(s => s.gender === 'male').length)
const femaleCount = computed(() => studentsOfActive.value.filter(s => s.gender === 'female').length)
const totalCount = computed(() => studentsOfActive.value.length)

// 添加学生对话框
const addStudentDialogVisible = ref(false)
const addMode = ref<'single' | 'batch' | 'excel'>('single')
const singleName = ref('')
const singleGender = ref<'male' | 'female'>('male')
const batchText = ref('')
const batchGender = ref<'male' | 'female'>('male')

function addStudentSingle() {
    if (!activeClassId.value) {
        ElMessage.error('请先选择班级')
        return
    }
    const name = singleName.value.trim()
    if (!name) {
        ElMessage.error('请输入学生姓名')
        return
    }
    const student: Student = { studentName: name, gender: singleGender.value }
    studentStore.addStudent(activeClassId.value, student)
    singleName.value = ''
    ElMessage.success('已添加学生')
}

function addStudentBatch() {
    if (!activeClassId.value) {
        ElMessage.error('请先选择班级')
        return
    }
    const raw = batchText.value
    const tokens = raw.split(/[\s,]+/).map(t => t.trim()).filter(Boolean)
    if (tokens.length === 0) {
        ElMessage.error('请输入要批量添加的学生姓名，使用逗号/空格/换行分隔')
        return
    }
    const students: Student[] = tokens.map(n => ({ studentName: n, gender: batchGender.value }))
    studentStore.addStudentsBatch(activeClassId.value, students)
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
    if (!activeClassId.value) {
        ElMessage.error('请先选择班级')
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
    if (excelParsedStudents.value.length === 0) {
        ElMessage.warning('暂无可导入的数据')
        return
    }
    if (!activeClassId.value) return
    studentStore.addStudentsBatch(activeClassId.value, excelParsedStudents.value)
    ElMessage.success(`已导入 ${excelParsedStudents.value.length} 条`)
    clearExcelPreview()
}

async function onRemoveStudent(name: string) {
    try {
        await ElMessageBox.confirm(`确定删除学生「${name}」吗？`, '删除确认', {
            type: 'warning',
            confirmButtonText: '删除',
            cancelButtonText: '取消',
        })
        if (!activeClassId.value) return
        studentStore.removeStudent(activeClassId.value, name)
        groupStore.removeStudentFromAll(activeClassId.value, name)
        ElMessage.success('已删除')
    } catch (e) {
        // 用户取消
    }
}

// 分组管理
const groupDialogVisible = ref(false)
const newGroupName = ref('')
const selectedGroupId = ref<string | null>(null)
const groupsOfActive = computed(() => activeClassId.value ? groupStore.listByClassId(activeClassId.value) : [])

const transferData = computed(() =>
    studentsOfActive.value.map(s => ({ key: s.studentName, label: s.studentName }))
)
const targetKeys = ref<string[]>([])

// 学生名单分组筛选
const selectedGroupFilter = ref<string>('') // 空代表全部
const filteredStudents = computed(() => {
    if (!activeClassId.value) return []
    if (!selectedGroupFilter.value) return studentsOfActive.value
    const g = groupsOfActive.value.find(x => x.id === selectedGroupFilter.value)
    if (!g) return studentsOfActive.value
    const memberSet = new Set(g.members)
    return studentsOfActive.value.filter(s => memberSet.has(s.studentName))
})

watch(selectedGroupId, (gid) => {
    if (!gid || !activeClassId.value) {
        targetKeys.value = []
        return
    }
    const g = groupsOfActive.value.find(x => x.id === gid)
    targetKeys.value = g ? [...g.members] : []
})

watch(groupDialogVisible, (visible) => {
    if (visible) {
        // 初次打开选择第一个分组
        selectedGroupId.value = groupsOfActive.value[0]?.id ?? null
    }
})

watch(activeClassId, () => {
    // 切换班级时重置筛选
    selectedGroupFilter.value = ''
})

watch(groupsOfActive, (gs) => {
    // 如果当前选中的分组被删除，则回退为全部
    if (selectedGroupFilter.value && !gs.some(g => g.id === selectedGroupFilter.value)) {
        selectedGroupFilter.value = ''
    }
})

function onAddGroup() {
    const name = newGroupName.value.trim()
    if (!name) {
        ElMessage.error('请输入分组名称')
        return
    }
    if (!activeClassId.value) return
    const g = groupStore.addGroup(activeClassId.value, name)
    newGroupName.value = ''
    selectedGroupId.value = g.id
    targetKeys.value = []
    ElMessage.success('已创建分组')
}

async function onRemoveGroup() {
    if (!activeClassId.value || !selectedGroupId.value) return
    const g = groupsOfActive.value.find(x => x.id === selectedGroupId.value)
    if (!g) return
    try {
        await ElMessageBox.confirm(`确定删除分组「${g.name}」吗？`, '删除确认', { type: 'warning' })
        groupStore.removeGroup(activeClassId.value, g.id)
        selectedGroupId.value = groupsOfActive.value[0]?.id ?? null
        ElMessage.success('已删除分组')
    } catch { }
}

function onSaveMembers() {
    if (!activeClassId.value || !selectedGroupId.value) return
    groupStore.setGroupMembers(activeClassId.value, selectedGroupId.value, targetKeys.value)
    ElMessage.success('已保存分组成员')
}

// 学生编辑
const editDialogVisible = ref(false)
const editOriginalName = ref('')
const editName = ref('')
const editGender = ref<'male' | 'female'>('male')

function onEditStudent(s: { studentName: string, gender: 'male' | 'female' }) {
    editOriginalName.value = s.studentName
    editName.value = s.studentName
    editGender.value = s.gender
    editDialogVisible.value = true
}

function onSaveStudentEdit() {
    if (!activeClassId.value) return
    const name = editName.value.trim()
    if (!name) {
        ElMessage.error('请输入学生姓名')
        return
    }
    const list = studentsOfActive.value
    const isRenaming = name !== editOriginalName.value
    if (isRenaming && list.some(s => s.studentName === name)) {
        ElMessage.error('该姓名已存在')
        return
    }
    studentStore.updateStudent(activeClassId.value, editOriginalName.value, { studentName: name, gender: editGender.value })
    if (isRenaming) {
        groupStore.renameStudentInAll(activeClassId.value, editOriginalName.value, name)
    }
    ElMessage.success('已保存')
    editDialogVisible.value = false
}
</script>

<template>
    <div class="class-page">
        <div class="content-area">
            <el-card shadow="never" class="list-card">
                <template #header>
                    <div class="list-header">
                        <span v-if="activeClass" class="class-name">{{ activeClass.name }}</span>
                        <span v-else>学生名单</span>
                        <span v-if="activeClass" class="student-count">
                            共 {{ totalCount }} 人
                            <span class="count-detail">(男 {{ maleCount }} / 女 {{ femaleCount }})</span>
                        </span>
                    </div>
                </template>

                <div v-if="activeClass">
                    <div v-if="filteredStudents.length > 0" class="student-grid">
                        <StudentCard v-for="s in filteredStudents" :key="s.studentName" :student="s"
                            @remove="onRemoveStudent" @edit="onEditStudent" />
                    </div>
                    <div v-else class="empty empty-students">
                        <i-ep-user class="empty-icon" />
                        <div class="empty-title">{{ selectedGroupFilter ? '该分组暂无成员' : '还没有学生' }}</div>
                        <div class="empty-sub">
                            {{ selectedGroupFilter ? '可在分组管理中添加成员，或清除筛选查看全部学生' : '点击下方"添加学生"按钮开始添加学生' }}
                        </div>
                    </div>
                </div>
                <div v-else class="empty">
                    <i-ep-school class="empty-icon" />
                    <div class="empty-title">还没有班级</div>
                    <div class="empty-sub">请先创建或选择一个班级</div>
                </div>
            </el-card>
        </div>

        <div class="bottom-actions">
            <el-select v-if="activeClass" v-model="selectedGroupFilter" size="large" placeholder="全部学生"
                class="group-filter">
                <el-option label="全部学生" value="" />
                <el-option v-for="g in groupsOfActive" :key="g.id" :label="g.name" :value="g.id" />
            </el-select>
            
            <div class="action-buttons-row">
                <el-button size="large" type="primary" :disabled="!activeClassId"
                    @click="addStudentDialogVisible = true" class="action-btn">
                    <i-ep-plus /> 添加学生
                </el-button>
                <el-button size="large" type="primary" plain :disabled="!activeClassId"
                    @click="groupDialogVisible = true" class="action-btn">
                    <i-ep-user /> 分组管理
                </el-button>
            </div>
        </div>
    </div>

    <el-dialog v-model="addStudentDialogVisible" title="添加学生" width="600px">
        <el-tabs v-model="addMode" class="add-tabs">
            <el-tab-pane label="单个添加" name="single">
                <el-form label-position="top" class="add-form">
                    <el-form-item label="姓名">
                        <el-input v-model="singleName" placeholder="请输入学生姓名" size="large" />
                    </el-form-item>
                    <el-form-item label="性别">
                        <el-radio-group v-model="singleGender" size="large">
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
                        <el-input v-model="batchText" type="textarea" :rows="4" size="large"
                            placeholder="例：张三, 李四&#10;王五 刘六" />
                    </el-form-item>
                    <el-form-item label="默认性别">
                        <el-radio-group v-model="batchGender" size="large">
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
                <el-upload ref="uploadRef" class="upload-area" drag accept=".xls,.xlsx" :auto-upload="false"
                    :show-file-list="false" :before-upload="beforeExcelUpload" :on-change="handleExcelChange">
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
                        <li>可选：性别（或 Gender），支持值：男/女、male/female、m/f、1/0</li>
                    </ul>
                </div>
                <div v-if="excelParsedStudents.length" class="excel-preview">
                    <div class="preview-header">
                        <div class="preview-title">解析结果</div>
                        <el-space class="preview-meta" wrap size="small">
                            <el-tag v-if="excelFileName" type="info" effect="light">文件：{{ excelFileName }}</el-tag>
                            <el-tag type="primary" effect="light">共 {{ excelParsedStudents.length }} 条</el-tag>
                            <el-tag :type="excelSkippedCount ? 'warning' : 'success'" effect="light">跳过 {{
                                excelSkippedCount }} 条</el-tag>
                        </el-space>
                    </div>
                    <el-table :data="excelParsedStudents" border size="small" class="preview-table" max-height="260">
                        <el-table-column prop="studentName" label="姓名" min-width="140" />
                        <el-table-column label="性别" min-width="100">
                            <template #default="{ row }">{{ row.gender === 'male' ? '男' : '女' }}</template>
                        </el-table-column>
                    </el-table>
                    <div class="preview-actions">
                        <el-button type="primary" :disabled="!excelParsedStudents.length" @click="confirmExcelImport">
                            确认导入</el-button>
                        <el-button @click="clearExcelPreview">清空</el-button>
                    </div>
                </div>
            </el-tab-pane>
        </el-tabs>
    </el-dialog>

    <el-dialog v-model="groupDialogVisible" title="分组管理" width="720px">
        <div class="group-manage">
            <div class="group-row">
                <el-input v-model="newGroupName" placeholder="新分组名称" class="group-name-input" />
                <el-button type="primary" @click="onAddGroup"><i-ep-plus /> 新建分组</el-button>
            </div>

            <div class="group-row">
                <el-select v-model="selectedGroupId" placeholder="选择要编辑的分组" class="group-select">
                    <el-option v-for="g in groupsOfActive" :key="g.id" :label="`${g.name}（${g.members.length}）`"
                        :value="g.id" />
                </el-select>
                <el-button type="danger" plain :disabled="!selectedGroupId" @click="onRemoveGroup">
                    <i-ep-delete /> 删除该组
                </el-button>
            </div>

            <div v-if="selectedGroupId" class="transfer-wrap">
                <el-transfer v-model="targetKeys" :data="transferData" :titles="['未分配', '本组成员']" filterable />
                <div class="transfer-actions">
                    <el-button type="primary" @click="onSaveMembers"><i-ep-check /> 保存成员</el-button>
                </div>
            </div>

            <div v-else class="empty-group">请选择或新建一个分组后编辑成员</div>
        </div>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="编辑学生" width="400px">
        <el-form label-position="top">
            <el-form-item label="姓名">
                <el-input v-model="editName" placeholder="请输入学生姓名" />
            </el-form-item>
            <el-form-item label="性别">
                <el-radio-group v-model="editGender">
                    <el-radio-button label="male">男</el-radio-button>
                    <el-radio-button label="female">女</el-radio-button>
                </el-radio-group>
            </el-form-item>
        </el-form>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="editDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="onSaveStudentEdit">保存</el-button>
            </span>
        </template>
    </el-dialog>

</template>

<style scoped>
.class-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
}

.content-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding-bottom: 16px;
}

.list-card {
    height: 100%;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
}

.list-card :deep(.el-card__body) {
    flex: 1;
    overflow-y: auto;
}

.list-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.class-name {
    font-size: 24px;
    font-weight: 700;
    color: #333;
}

.student-count {
    font-size: 16px;
    color: #666;
    font-weight: 500;
}

.count-detail {
    color: #999;
    font-size: 14px;
    margin-left: 8px;
}

.bottom-actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
}

.group-filter {
    width: 100%;
}

.action-buttons-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    width: 100%;
}

.action-btn {
    flex: 1;
    height: 56px;
    font-size: 18px;
    font-weight: 600;
    border-radius: 12px;
}

.student-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
}

.student-card {
    position: relative;
    padding: 16px 12px;
    border: 1px solid #eee;
    border-radius: 14px;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.student-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 22px;
    box-shadow: var(--shadow-light);
}

.student-avatar.male {
    background: linear-gradient(135deg, #4f8df9, #6aa2ff);
}

.student-avatar.female {
    background: linear-gradient(135deg, #f975a8, #f9948a);
}

.student-info {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.student-name {
    font-size: 18px;
    font-weight: 600;
}


.delete-btn {
    color: #999;
    font-size: 18px;
    position: absolute;
    right: 8px;
    top: 8px;
    padding: 0;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: transparent;
}

.delete-btn:hover {
    background: rgba(0, 0, 0, 0.06);
}

.empty {
    padding: 48px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #888;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 8px;
    color: #c6c6c6;
}

.empty-students {
    padding: 64px 12px;
}

.group-manage {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.group-row {
    display: flex;
    gap: 10px;
    align-items: center;
}

.group-name-input {
    flex: 1;
}

.group-select {
    flex: 1;
}

.transfer-wrap {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.transfer-actions {
    display: flex;
    justify-content: flex-end;
}

.empty-group {
    color: #888;
}

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

@media (max-width: 768px) {
    .class-name {
        font-size: 20px;
    }

    .student-count {
        font-size: 14px;
    }

    .bottom-actions {
        padding: 16px;
        gap: 10px;
    }

    .action-buttons-row {
        gap: 12px;
    }

    .action-btn {
        height: 48px;
        font-size: 16px;
    }

    .student-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
    }
}

@media (max-width: 480px) {
    .class-name {
        font-size: 18px;
    }

    .student-count {
        font-size: 13px;
    }

    .count-detail {
        font-size: 12px;
    }

    .bottom-actions {
        padding: 12px;
        gap: 8px;
    }

    .action-buttons-row {
        gap: 10px;
    }

    .action-btn {
        height: 46px;
        font-size: 15px;
    }

    .student-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 10px;
    }
}
</style>
