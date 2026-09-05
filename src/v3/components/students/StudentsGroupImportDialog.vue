<template>
    <AppDialogShell
        v-model="visible"
        title="导入分组"
        eyebrow="学生分组"
        description="支持使用 Excel 批量导入分组关系，导入前会自动校验分组名、学生名和重复归属。"
        width="860px"
    >
        <div class="group-import-dialog">
            <section
                v-loading="importing"
                class="surface-card"
                element-loading-text="正在解析分组文件..."
            >
                <el-upload
                    ref="uploadRef"
                    drag
                    accept=".xls,.xlsx"
                    :auto-upload="false"
                    :show-file-list="false"
                    :before-upload="beforeUpload"
                    :on-change="handleChange"
                    :disabled="!active || importing"
                    class="v3-upload"
                >
                    <i-ep-upload-filled class="v3-upload__icon" />
                    <strong class="v3-upload__title">
                        {{ importing ? "正在解析分组文件..." : (excelFileName || "拖拽或点击选择分组 Excel 文件") }}
                    </strong>
                    <p class="v3-upload__hint">
                        {{ importing ? "请稍候，系统正在读取 Excel 并校验分组成员。" : "支持 `.xls`、`.xlsx`，表头需包含“分组名称”和“学生姓名”。" }}
                    </p>
                </el-upload>
            </section>

            <section class="guide-card">
                <div class="section-head">
                    <div>
                        <h4>导入说明</h4>
                        <p>推荐先下载模板，再按“一个分组一行成员”的形式整理数据。</p>
                    </div>
                    <button type="button" class="text-button" :disabled="!active" @click="downloadTemplate">
                        下载模板
                    </button>
                </div>

                <ul class="guide-list">
                    <li>必填列：`分组名称`、`学生姓名`。</li>
                    <li>重复分组会被识别为更新已有分组。</li>
                    <li>不存在的学生和同一批导入中重复分组归属的学生会被忽略。</li>
                </ul>
            </section>

            <section v-if="parsedGroups.length" class="surface-card">
                <div class="section-head">
                    <div>
                        <h4>解析结果</h4>
                        <p>导入前先确认分组和成员状态，避免把无效数据写入当前班级。</p>
                    </div>
                    <div class="meta-tags">
                        <span class="meta-tag">{{ parsedGroups.length }} 个分组</span>
                        <span class="meta-tag">共 {{ totalMemberCount }} 个成员</span>
                        <span v-if="skippedCount" class="meta-tag meta-tag--warn">跳过 {{ skippedCount }} 条</span>
                    </div>
                </div>

                <el-table :data="parsedGroups" class="v3-table" max-height="360">
                    <el-table-column label="分组名称" min-width="180">
                        <template #default="{ row }">
                            <div class="group-name-cell">
                                <span>{{ row.groupName }}</span>
                                <span v-if="row.isDuplicate" class="member-status member-status--warn">已存在</span>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column label="成员" min-width="360">
                        <template #default="{ row }">
                            <div class="member-tags">
                                <el-tooltip
                                    v-for="member in row.members"
                                    :key="`${row.groupName}-${member.name}`"
                                    :content="getMemberTooltipContent(member)"
                                    :disabled="!member.isInvalid"
                                    placement="top"
                                >
                                    <span
                                        class="member-status"
                                        :class="getMemberStatusClass(member)"
                                    >
                                        {{ member.name }}
                                    </span>
                                </el-tooltip>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column label="人数" width="90" align="center">
                        <template #default="{ row }">{{ row.members.length }}</template>
                    </el-table-column>
                </el-table>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                    <button type="button" class="ghost-button" :disabled="importing" @click="visible = false">
                    取消
                </button>
                <div class="dialog-actions__group">
                    <button type="button" class="ghost-button" :disabled="!active || importing" @click="clearPreview">
                        清空
                    </button>
                    <button
                        type="button"
                        class="primary-button"
                        :disabled="!active || importing || parsedGroups.length === 0"
                        @click="confirmImport"
                    >
                        确认导入
                    </button>
                </div>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import type { UploadFile, UploadInstance, UploadRawFile } from "element-plus";
import { ElMessage } from "element-plus";
import { computed, ref } from "vue";
import type { UiStudent } from "@/components/class/ClassStudentList.vue";
import type { UiGroup } from "@/v3/components/students/StudentsGroupManageDialog.vue";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";

/** 定义分组导入解析成员结构。 */
interface ParsedGroupMember {
    isDuplicateInImport: boolean
    isInvalid: boolean
    name: string
}

/** 定义分组导入解析结果结构。 */
interface ParsedGroupImport {
    groupName: string
    isDuplicate: boolean
    members: ParsedGroupMember[]
}

/** 定义分组导入弹窗属性结构。 */
interface StudentsGroupImportDialogProps {
    active: boolean
    groups: UiGroup[]
    modelValue: boolean
    students: UiStudent[]
}

const props = defineProps<StudentsGroupImportDialogProps>()

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void
    (e: "confirm", payload: { groups: Array<{ groupName: string, memberNames: string[] }> }): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

const uploadRef = ref<UploadInstance>()
const excelFileName = ref("")
const parsedGroups = ref<ParsedGroupImport[]>([])
const skippedCount = ref(0)
const importing = ref(false)

/** 返回解析结果中的成员总数。 */
const totalMemberCount = computed<number>(() => {
    return parsedGroups.value.reduce((sum, group) => sum + group.members.length, 0)
})

/** 从 Excel 行数据中获取首个有效列值。 */
function findFirst<T extends Record<string, unknown>>(row: T, keys: string[]): unknown {
    for (const key of keys) {
        const value = row[key]
        if (value !== undefined && String(value).trim() !== "") {
            return value
        }
    }

    return undefined
}

/** 解析上传的分组 Excel 文件。 */
async function importFromFile(file: File): Promise<boolean> {
    if (!props.active || importing.value) {
        return false
    }

    importing.value = true
    try {
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as ArrayBuffer)
            reader.onerror = reject
            reader.readAsArrayBuffer(file)
        })

        const XLSX = await import("xlsx")
        const workbook = XLSX.read(arrayBuffer, { type: "array" })
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
            throw new Error("Excel 文件没有工作表")
        }

        const worksheet = workbook.Sheets[firstSheetName]!
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" })
        const groupNameKeys = ["分组名称", "groupname", "GroupName", "分组", "group", "Group"]
        const studentNameKeys = ["学生姓名", "姓名", "studentname", "StudentName", "name", "Name"]
        const groupMap = new Map<string, Set<string>>()
        let nextSkippedCount = 0

        for (const row of rows) {
            const groupNameValue = findFirst(row, groupNameKeys)
            const studentNameValue = findFirst(row, studentNameKeys)
            if (!groupNameValue || !studentNameValue) {
                nextSkippedCount += 1
                continue
            }

            const groupName = String(groupNameValue).trim()
            const studentName = String(studentNameValue).trim()
            if (!groupName || !studentName) {
                nextSkippedCount += 1
                continue
            }

            if (!groupMap.has(groupName)) {
                groupMap.set(groupName, new Set())
            }

            groupMap.get(groupName)!.add(studentName)
        }

        if (groupMap.size === 0) {
            ElMessage.warning("未解析到有效的分组记录，请检查表头是否包含“分组名称”和“学生姓名”")
            return false
        }

        const existingStudents = new Set(props.students.map((student) => student.name))
        const existingGroups = new Set(props.groups.map((group) => group.name))
        const studentGroupCount = new Map<string, number>()

        groupMap.forEach((members) => {
            members.forEach((studentName) => {
                studentGroupCount.set(studentName, (studentGroupCount.get(studentName) ?? 0) + 1)
            })
        })

        parsedGroups.value = Array.from(groupMap.entries()).map(([groupName, members]) => ({
            groupName,
            isDuplicate: existingGroups.has(groupName),
            members: Array.from(members).map((name) => ({
                name,
                isInvalid: !existingStudents.has(name),
                isDuplicateInImport: (studentGroupCount.get(name) ?? 0) > 1
            }))
        }))
        skippedCount.value = nextSkippedCount
        ElMessage.success(`解析成功：${parsedGroups.value.length} 个分组，${totalMemberCount.value} 个成员`)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "未知错误"
        ElMessage.error(`导入失败：${errorMessage}`)
    } finally {
        importing.value = false
    }

    return false
}

/** 在上传前拦截文件并改为本地解析。 */
async function beforeUpload(file: UploadRawFile): Promise<boolean> {
    return await importFromFile(file as unknown as File)
}

/** 在上传文件变化时同步文件名和解析结果。 */
async function handleChange(file: UploadFile): Promise<void> {
    if (!file.raw) {
        return
    }

    excelFileName.value = file.name || ""
    await importFromFile(file.raw)
}

/** 清空当前分组导入预览。 */
function clearPreview(): void {
    parsedGroups.value = []
    skippedCount.value = 0
    excelFileName.value = ""
    uploadRef.value?.clearFiles()
}

/** 下载分组导入模板文件。 */
async function downloadTemplate(): Promise<void> {
    const templateData = [
        { 分组名称: "第一组", 学生姓名: "张三" },
        { 分组名称: "第一组", 学生姓名: "李四" },
        { 分组名称: "第二组", 学生姓名: "王五" },
        { 分组名称: "第二组", 学生姓名: "赵六" }
    ]

    const XLSX = await import("xlsx")
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "分组导入模板")
    XLSX.writeFile(workbook, "分组导入模板.xlsx")
    ElMessage.success("模板下载成功")
}

/** 返回成员状态对应的样式类名。 */
function getMemberStatusClass(member: ParsedGroupMember): string {
    if (member.isInvalid) {
        return "member-status--danger"
    }

    if (member.isDuplicateInImport) {
        return "member-status--warn"
    }

    return "member-status--normal"
}

/** 返回成员标签的悬浮提示文案。 */
function getMemberTooltipContent(member: ParsedGroupMember): string {
    if (member.isInvalid) {
        return "学生不存在"
    }

    return ""
}

/** 确认提交当前解析后的分组导入结果。 */
function confirmImport(): void {
    if (!props.active || parsedGroups.value.length === 0) {
        return
    }

    const groups = parsedGroups.value
        .map((group) => ({
            groupName: group.groupName,
            memberNames: group.members
                .filter((member) => !member.isInvalid && !member.isDuplicateInImport)
                .map((member) => member.name)
        }))
        .filter((group) => group.memberNames.length > 0)

    emit("confirm", { groups })
    clearPreview()
    visible.value = false
}
</script>

<style scoped>
.group-import-dialog {
    display: grid;
    gap: 18px;
}

.surface-card,
.guide-card {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.78);
}

.guide-card {
    background: rgba(85, 104, 255, 0.06);
}

.section-head,
.dialog-actions,
.dialog-actions__group,
.meta-tags,
.group-name-cell {
    display: flex;
    align-items: center;
}

.section-head,
.dialog-actions {
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}

.section-head h4,
.section-head p {
    margin: 0;
}

.section-head h4 {
    color: #16213e;
    font-size: 19px;
}

.section-head p {
    margin-top: 6px;
    color: #627099;
    line-height: 1.7;
}

.meta-tags,
.dialog-actions__group,
.member-tags {
    gap: 10px;
    flex-wrap: wrap;
}

.meta-tag,
.member-status {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
}

.meta-tag,
.member-status--normal {
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
}

.meta-tag--warn,
.member-status--warn {
    background: rgba(245, 158, 11, 0.16);
    color: #b45309;
}

.member-status--danger {
    background: rgba(239, 68, 68, 0.14);
    color: #d92d20;
}

.guide-list {
    margin: 0;
    padding-left: 18px;
    color: #627099;
    line-height: 1.9;
}

.ghost-button,
.primary-button,
.text-button {
    border: none;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button,
.primary-button {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 16px;
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
}

.primary-button {
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.22);
}

.text-button {
    padding: 0;
    background: transparent;
    color: #5568ff;
    font-weight: 700;
}

.ghost-button:hover,
.primary-button:hover,
.text-button:hover {
    transform: translateY(-2px);
}

.ghost-button:disabled,
.primary-button:disabled,
.text-button:disabled {
    opacity: 0.56;
    cursor: not-allowed;
    transform: none;
}

.group-name-cell {
    justify-content: space-between;
    gap: 10px;
}

.member-tags {
    display: flex;
}

.v3-upload :deep(.el-upload) {
    width: 100%;
}

.v3-upload :deep(.el-upload-dragger) {
    width: 100%;
    padding: 28px 16px;
    border: 1px dashed rgba(122, 141, 198, 0.28);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.72);
}

.v3-upload__icon {
    font-size: 53px;
    color: #8a96b8;
}

.v3-upload__title,
.v3-upload__hint {
    display: block;
}

.v3-upload__title {
    margin-top: 12px;
    color: #16213e;
    font-size: 19px;
}

.v3-upload__hint {
    margin-top: 8px;
    color: #627099;
    line-height: 1.7;
}

.v3-table :deep(.el-table) {
    border-radius: 18px;
    overflow: hidden;
    --el-table-border-color: rgba(122, 141, 198, 0.16);
    --el-table-header-bg-color: rgba(85, 104, 255, 0.08);
    --el-table-row-hover-bg-color: rgba(85, 104, 255, 0.06);
}

@media (max-width: 768px) {
    .section-head,
    .dialog-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .dialog-actions__group,
    .meta-tags {
        justify-content: flex-start;
    }
}
</style>
