<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRawFile, UploadFile, UploadInstance } from 'element-plus'
import * as XLSX from 'xlsx'
import type { UiStudent } from './ClassStudentList.vue'
import type { UiGroup } from './GroupManageDialog.vue'

export type ParsedGroupImport = {
    groupName: string
    members: Array<{ name: string, isInvalid: boolean, isDuplicateInImport: boolean }>
    isDuplicate: boolean
}

const props = defineProps<{
    modelValue: boolean
    active: boolean
    students: UiStudent[]
    groups: UiGroup[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'confirm', payload: { groups: Array<{ groupName: string, memberNames: string[] }> }): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const importing = ref(false)
const uploadRef = ref<UploadInstance>()
const excelFileName = ref('')
const parsedGroups = ref<ParsedGroupImport[]>([])
const skippedCount = ref(0)

function findFirst<T extends Record<string, any>>(row: T, keys: string[]): any {
    for (const key of keys) {
        const val = row[key]
        if (val !== undefined && String(val).trim() !== '') return val
    }
    return undefined
}

async function importFromFile(file: File) {
    if (!props.active) return false
    if (importing.value) return false
    importing.value = true

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

        const groupNameKeys = ['分组名称', 'groupname', 'GroupName', '分组', 'group', 'Group']
        const studentNameKeys = ['学生姓名', '姓名', 'studentname', 'StudentName', 'name', 'Name']

        const groupMap = new Map<string, Set<string>>()
        let skipped = 0

        for (const row of rows) {
            const groupNameVal = findFirst(row, groupNameKeys)
            const studentNameVal = findFirst(row, studentNameKeys)

            if (!groupNameVal || !studentNameVal) {
                skipped += 1
                continue
            }

            const groupName = String(groupNameVal).trim()
            const studentName = String(studentNameVal).trim()
            if (!groupName || !studentName) {
                skipped += 1
                continue
            }

            if (!groupMap.has(groupName)) groupMap.set(groupName, new Set())
            groupMap.get(groupName)!.add(studentName)
        }

        if (groupMap.size === 0) {
            ElMessage.warning('未解析到有效的分组记录，请检查表头是否包含"分组名称"和"学生姓名"')
            return false
        }

        const existingStudents = new Set(props.students.map(s => s.name))
        const existingGroups = new Set(props.groups.map(g => g.name))

        const studentGroupCount = new Map<string, number>()
        groupMap.forEach((members) => {
            members.forEach(studentName => {
                studentGroupCount.set(studentName, (studentGroupCount.get(studentName) || 0) + 1)
            })
        })

        const result: ParsedGroupImport[] = []
        groupMap.forEach((members, groupName) => {
            const isDuplicate = existingGroups.has(groupName)
            const membersList = Array.from(members).map(name => ({
                name,
                isInvalid: !existingStudents.has(name),
                isDuplicateInImport: (studentGroupCount.get(name) || 0) > 1
            }))
            result.push({ groupName, members: membersList, isDuplicate })
        })

        parsedGroups.value = result
        skippedCount.value = skipped

        const totalMembers = result.reduce((sum, g) => sum + g.members.length, 0)
        const invalidMembers = result.reduce((sum, g) => sum + g.members.filter(m => m.isInvalid).length, 0)
        const duplicateGroups = result.filter(g => g.isDuplicate).length
        const duplicateInImportMembers = new Set<string>()
        result.forEach(g => g.members.forEach(m => { if (m.isDuplicateInImport) duplicateInImportMembers.add(m.name) }))

        let msg = `解析成功：${result.length} 个分组，${totalMembers} 个成员`
        if (skipped > 0) msg += `，跳过 ${skipped} 条`
        if (duplicateGroups > 0) msg += `，${duplicateGroups} 个重复分组`
        if (invalidMembers > 0) msg += `，${invalidMembers} 个不存在的学生`
        if (duplicateInImportMembers.size > 0) msg += `，${duplicateInImportMembers.size} 个学生在多个分组中`
        ElMessage.success(msg)
    } catch (err: any) {
        ElMessage.error(`导入失败：${err?.message || '未知错误'}`)
    } finally {
        importing.value = false
    }
    return false
}

async function beforeUpload(file: UploadRawFile) {
    return importFromFile(file as unknown as File)
}

async function handleChange(file: UploadFile) {
    if (!file || !file.raw) return
    await importFromFile(file.raw)
    excelFileName.value = file.name || ''
}

function clearPreview() {
    parsedGroups.value = []
    skippedCount.value = 0
    excelFileName.value = ''
    uploadRef.value?.clearFiles()
}

function downloadTemplate() {
    const templateData = [
        { 分组名称: '第一组', 学生姓名: '张三' },
        { 分组名称: '第一组', 学生姓名: '李四' },
        { 分组名称: '第二组', 学生姓名: '王五' },
        { 分组名称: '第二组', 学生姓名: '赵六' },
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '分组导入模板')
    XLSX.writeFile(workbook, '分组导入模板.xlsx')
    ElMessage.success('模板下载成功')
}

function getStudentWarningText(member: { name: string, isInvalid: boolean, isDuplicateInImport: boolean }): string {
    const warnings: string[] = []
    if (member.isInvalid) warnings.push('学生不存在')
    if (member.isDuplicateInImport) warnings.push('在多个分组中')
    return warnings.join('，') + (warnings.length > 0 ? '，将被忽略' : '')
}

function getStudentTagType(member: { name: string, isInvalid: boolean, isDuplicateInImport: boolean }): 'info' | 'warning' | 'danger' {
    if (member.isInvalid) return 'danger'
    if (member.isDuplicateInImport) return 'warning'
    return 'info'
}

function confirmImport() {
    if (!props.active) return
    if (parsedGroups.value.length === 0) {
        ElMessage.warning('暂无可导入的数据')
        return
    }

    const groups = parsedGroups.value.map(g => ({
        groupName: g.groupName,
        memberNames: g.members
            .filter(m => !m.isInvalid && !m.isDuplicateInImport)
            .map(m => m.name)
    })).filter(g => g.memberNames.length > 0)

    emit('confirm', { groups })
    clearPreview()
    visible.value = false
}
</script>

<template>
    <el-dialog v-model="visible" title="导入分组" width="600px">
        <el-upload
            ref="uploadRef"
            class="upload-area"
            drag
            accept=".xls,.xlsx"
            :auto-upload="false"
            :show-file-list="false"
            :before-upload="beforeUpload"
            :on-change="handleChange"
            :disabled="!active"
        >
            <i-ep-upload-filled class="upload-icon" />
            <div v-if="!excelFileName" class="el-upload__text">将文件拖到此处，或点击上传</div>
            <div v-else class="upload-file-name">
                <i-ep-document class="file-icon" /> {{ excelFileName }}
                <span class="change-hint">（点击重新选择）</span>
            </div>
            <template #tip>
                <div class="el-upload__tip">支持 .xls/.xlsx，表头包含"分组名称"和"学生姓名"。</div>
            </template>
        </el-upload>

        <div class="excel-guide">
            <div class="guide-title">Excel 表头示例：</div>
            <ul class="guide-list">
                <li>必填：分组名称（或 GroupName/分组）</li>
                <li>必填：学生姓名（或 Name/姓名）</li>
                <li>相同分组名称的多行会自动归为一个分组</li>
                <li>只会导入已存在的学生（不存在的学生会被忽略）</li>
                <li>每个学生只能在一个分组中（在多个分组的学生会被忽略）</li>
                <li>如果分组已存在，则导入时由页面逻辑决定更新方式</li>
            </ul>
            <el-button type="primary" link :disabled="!active" @click="downloadTemplate" class="download-template-btn">
                <i-ep-download /> 下载模板
            </el-button>
        </div>

        <div v-if="parsedGroups.length" class="excel-preview">
            <div class="preview-header">
                <div class="preview-title">解析结果</div>
                <el-space class="preview-meta" wrap size="small">
                    <el-tag v-if="excelFileName" type="info" effect="light">文件：{{ excelFileName }}</el-tag>
                    <el-tag type="primary" effect="light">{{ parsedGroups.length }} 个分组</el-tag>
                    <el-tag type="success" effect="light">共 {{ parsedGroups.reduce((sum, g) => sum + g.members.length, 0) }} 个成员</el-tag>
                    <el-tag v-if="skippedCount" type="warning" effect="light">跳过 {{ skippedCount }} 条</el-tag>
                </el-space>
            </div>

            <el-table :data="parsedGroups" border size="small" class="preview-table" max-height="300">
                <el-table-column label="分组名称" min-width="120">
                    <template #default="{ row }">
                        <span :class="{ 'text-error': row.isDuplicate }">
                            {{ row.groupName }}
                            <el-tooltip v-if="row.isDuplicate" content="分组已存在，导入后可能会更新其成员" placement="top">
                                <i-ep-warning class="warning-icon" />
                            </el-tooltip>
                        </span>
                    </template>
                </el-table-column>
                <el-table-column label="成员" min-width="200">
                    <template #default="{ row }">
                        <el-space wrap :size="4">
                            <el-tag
                                v-for="member in row.members"
                                :key="member.name"
                                size="small"
                                :type="getStudentTagType(member)"
                                :effect="(member.isInvalid || member.isDuplicateInImport) ? 'dark' : 'light'"
                            >
                                {{ member.name }}
                                <el-tooltip v-if="member.isInvalid || member.isDuplicateInImport" :content="getStudentWarningText(member)" placement="top">
                                    <i-ep-warning-filled style="margin-left: 2px;" />
                                </el-tooltip>
                            </el-tag>
                        </el-space>
                    </template>
                </el-table-column>
                <el-table-column label="人数" width="80" align="center">
                    <template #default="{ row }">{{ row.members.length }}</template>
                </el-table-column>
            </el-table>

            <div class="preview-actions">
                <el-button type="primary" :disabled="!active || !parsedGroups.length" @click="confirmImport">确认导入</el-button>
                <el-button :disabled="!active" @click="clearPreview">清空</el-button>
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

.text-error {
    color: #f56c6c;
    font-weight: 600;
}

.warning-icon {
    margin-left: 4px;
    font-size: 14px;
    color: #e6a23c;
}
</style>
