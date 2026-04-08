<template>
    <StudentsDialogShell v-model="visible" title="添加学生" eyebrow="学生管理" description="支持单个添加、批量添加和 Excel 导入"
        width="860px">
        <div class="students-add-dialog">
            <div class="mode-switch">
                <button type="button" class="mode-switch__button" :class="{ 'is-active': addMode === 'single' }"
                    @click="addMode = 'single'">
                    单个添加
                </button>
                <button type="button" class="mode-switch__button" :class="{ 'is-active': addMode === 'batch' }"
                    @click="addMode = 'batch'">
                    批量添加
                </button>
                <button type="button" class="mode-switch__button" :class="{ 'is-active': addMode === 'excel' }"
                    @click="addMode = 'excel'">
                    Excel 导入
                </button>
            </div>

            <section v-if="addMode === 'single'" class="surface-card">
                <div class="form-grid">
                    <label class="field-block">
                        <span class="field-block__label">姓名</span>
                        <el-input v-model="singleName" size="large" placeholder="请输入学生姓名" :disabled="disabled" />
                    </label>

                    <div class="field-block">
                        <span class="field-block__label">性别</span>
                        <div class="gender-switch">
                            <button type="button" class="gender-switch__button"
                                :class="{ 'is-active': singleGender === 1 }" :disabled="disabled"
                                @click="singleGender = 1">
                                男
                            </button>
                            <button type="button" class="gender-switch__button"
                                :class="{ 'is-active': singleGender === 2 }" :disabled="disabled"
                                @click="singleGender = 2">
                                女
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section v-else-if="addMode === 'batch'" class="surface-card batch-card">
                <div class="form-grid">
                    <label class="field-block field-block--full">
                        <span class="field-block__label">姓名列表</span>
                        <el-input v-model="batchText" type="textarea" :rows="5" placeholder="例：张三:男, 李四:女&#10;王五 刘六"
                            :disabled="disabled" />
                    </label>

                    <div class="field-block">
                        <span class="field-block__label">默认性别</span>
                        <div class="gender-switch">
                            <button type="button" class="gender-switch__button"
                                :class="{ 'is-active': batchGender === 1 }" :disabled="disabled"
                                @click="batchGender = 1">
                                男
                            </button>
                            <button type="button" class="gender-switch__button"
                                :class="{ 'is-active': batchGender === 2 }" :disabled="disabled"
                                @click="batchGender = 2">
                                女
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="batchPreviewRows.length" class="surface-card surface-card--nested">
                    <div class="section-head">
                        <div>
                            <h4>预解析结果</h4>
                            <p>支持用逗号、空格、换行分隔，也支持 `姓名:性别` 的写法。</p>
                        </div>
                        <div class="meta-tags">
                            <span class="meta-tag">共 {{ batchPreviewRows.length }} 条</span>
                            <span v-if="batchDuplicateCount" class="meta-tag meta-tag--warn">重复 {{ batchDuplicateCount
                                }} 条</span>
                        </div>
                    </div>

                    <el-table :data="batchPreviewRows" class="v3-table" max-height="260">
                        <el-table-column prop="name" label="姓名" min-width="180" />
                        <el-table-column label="性别" min-width="100">
                            <template #default="{ row }">
                                {{ getGenderText(row.gender) }}
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </section>

            <section v-else class="surface-card excel-card">
                <el-upload ref="uploadRef" drag accept=".xls,.xlsx" :auto-upload="false" :show-file-list="false"
                    :before-upload="beforeExcelUpload" :on-change="handleExcelChange" :disabled="disabled"
                    class="v3-upload">
                    <i-ep-upload-filled class="v3-upload__icon" />
                    <strong class="v3-upload__title">{{ excelFileName || "拖拽或点击选择 Excel 文件" }}</strong>
                    <p class="v3-upload__hint">支持 `.xls`、`.xlsx`，表头包含“姓名”，性别列可选。</p>
                </el-upload>

                <div class="guide-list-card">
                    <div class="section-head">
                        <div>
                            <h4>导入说明</h4>
                            <p>推荐先下载模板再批量整理学生名单。</p>
                        </div>
                        <button type="button" class="text-button" :disabled="disabled" @click="downloadTemplate">
                            下载模板
                        </button>
                    </div>

                    <ul class="guide-list">
                        <li>必填列：`姓名`、`Name`、`学生姓名` 任选其一。</li>
                        <li>可选列：`性别`、`Gender`，支持 `男/女`、`male/female`、`1/2`。</li>
                    </ul>
                </div>

                <div v-if="excelParsedStudents.length" class="surface-card surface-card--nested">
                    <div class="section-head">
                        <div>
                            <h4>解析结果</h4>
                            <p>解析完成后可在下方确认并导入当前班级。</p>
                        </div>
                        <div class="meta-tags">
                            <span class="meta-tag">共 {{ excelParsedStudents.length }} 条</span>
                            <span class="meta-tag" :class="{ 'meta-tag--warn': excelSkippedCount > 0 }">
                                跳过 {{ excelSkippedCount }} 条
                            </span>
                        </div>
                    </div>

                    <el-table :data="excelParsedStudents" class="v3-table" max-height="260">
                        <el-table-column prop="name" label="姓名" min-width="180" />
                        <el-table-column label="性别" min-width="100">
                            <template #default="{ row }">
                                {{ getGenderText(row.gender) }}
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="visible = false">
                    取消
                </button>

                <button v-if="addMode === 'single'" type="button" class="primary-button" :disabled="disabled"
                    @click="addStudentSingle">
                    添加学生
                </button>

                <button v-else-if="addMode === 'batch'" type="button" class="primary-button" :disabled="disabled"
                    @click="addStudentBatch">
                    批量添加
                </button>

                <div v-else class="dialog-actions__group">
                    <button type="button" class="ghost-button" :disabled="disabled" @click="clearExcelPreview">
                        清空
                    </button>
                    <button type="button" class="primary-button"
                        :disabled="disabled || excelParsedStudents.length === 0" @click="confirmExcelImport">
                        确认导入
                    </button>
                </div>
            </div>
        </template>
    </StudentsDialogShell>
</template>

<script setup lang="ts">
import type { UploadFile, UploadInstance, UploadRawFile } from "element-plus";
import { ElMessage } from "element-plus";
import { computed, ref, watch } from "vue";
import type { ApiGender, CreateStudentReq } from "@/types/student";
import StudentsDialogShell from "@/v3/components/students/StudentsDialogShell.vue";

/** 定义学生新增弹窗的展示模式。 */
export type StudentAddMode = "single" | "batch" | "excel"

/** 定义学生新增弹窗属性结构。 */
interface StudentsAddDialogProps {
    defaultMode?: StudentAddMode
    disabled?: boolean
    modelValue: boolean
}

const props = withDefaults(defineProps<StudentsAddDialogProps>(), {
    defaultMode: "single",
    disabled: false
})

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void
    (e: "add-single", payload: { name: string, gender: ApiGender }): void
    (e: "add-batch", payload: { students: CreateStudentReq[] }): void
    (e: "add-excel", payload: { students: CreateStudentReq[] }): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

const addMode = ref<StudentAddMode>("single")
const singleName = ref("")
const singleGender = ref<ApiGender>(1)
const batchText = ref("")
const batchGender = ref<ApiGender>(1)
const excelImporting = ref(false)
const uploadRef = ref<UploadInstance>()
const excelParsedStudents = ref<CreateStudentReq[]>([])
const excelSkippedCount = ref(0)
const excelFileName = ref("")

/** 返回批量输入框解析后的学生列表。 */
const batchParsedStudents = computed<CreateStudentReq[]>(() => {
    const normalized = batchText.value
        .replace(/\s*[:：]\s*/g, ":")
        .replace(/，/g, ",")
    const tokens = normalized.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean)
    const students: CreateStudentReq[] = []

    for (const token of tokens) {
        const separatorIndex = token.indexOf(":")
        if (separatorIndex >= 0) {
            const name = token.slice(0, separatorIndex).trim()
            const genderText = token.slice(separatorIndex + 1).trim()
            if (!name) {
                continue
            }

            students.push({
                name,
                gender: parseGender(genderText, batchGender.value)
            })
            continue
        }

        students.push({
            name: token,
            gender: batchGender.value
        })
    }

    return students.filter((student) => (student.name?.trim()?.length ?? 0) > 0)
})

/** 返回批量输入中解析出的重复学生数量。 */
const batchDuplicateCount = computed<number>(() => {
    const nameCounter = new Map<string, number>()

    batchParsedStudents.value.forEach((student) => {
        const key = student.name?.trim() || ""
        if (!key) {
            return
        }

        nameCounter.set(key, (nameCounter.get(key) ?? 0) + 1)
    })

    let duplicateCount = 0
    nameCounter.forEach((count) => {
        if (count > 1) {
            duplicateCount += count - 1
        }
    })

    return duplicateCount
})

/** 直接返回批量解析后的预览数据。 */
const batchPreviewRows = computed<CreateStudentReq[]>(() => batchParsedStudents.value)

/** 根据弹窗可见状态同步默认打开模式。 */
watch(
    [() => props.modelValue, () => props.defaultMode],
    ([isVisible, defaultMode]) => {
        if (isVisible) {
            addMode.value = defaultMode
        }
    },
    { immediate: true }
)

/** 返回性别文本对应的后端枚举值。 */
function parseGender(value: unknown, fallback: ApiGender = 1): ApiGender {
    const text = String(value ?? "").trim().toLowerCase()
    if (!text) {
        return fallback
    }

    if (["男", "male", "m", "1", "boy", "♂"].includes(text)) {
        return 1
    }

    if (["女", "female", "f", "2", "girl", "♀"].includes(text)) {
        return 2
    }

    if (["0", "unknown", "u"].includes(text)) {
        return 0
    }

    return fallback
}

/** 从表格数据行中按候选列名获取首个有效值。 */
function findFirst<T extends Record<string, unknown>>(row: T, keys: string[]): unknown {
    for (const key of keys) {
        const value = row[key]
        if (value !== undefined && String(value).trim() !== "") {
            return value
        }
    }

    return undefined
}

/** 返回性别枚举对应的界面文本。 */
function getGenderText(gender?: ApiGender): string {
    if (gender === 1) {
        return "男"
    }

    if (gender === 2) {
        return "女"
    }

    return "未知"
}

/** 处理单个新增学生。 */
function addStudentSingle(): void {
    if (props.disabled) {
        return
    }

    const name = singleName.value.trim()
    if (!name) {
        ElMessage.error("请输入学生姓名")
        return
    }

    emit("add-single", { name, gender: singleGender.value })
    singleName.value = ""
    visible.value = false
}

/** 处理批量新增学生。 */
function addStudentBatch(): void {
    if (props.disabled) {
        return
    }

    if (batchParsedStudents.value.length === 0) {
        ElMessage.error("请输入要批量添加的学生姓名，使用逗号、空格或换行分隔")
        return
    }

    emit("add-batch", { students: batchParsedStudents.value })
    batchText.value = ""
    visible.value = false
}

/** 解析上传的 Excel 文件并生成学生预览数据。 */
async function importExcelFromFile(file: File): Promise<boolean> {
    if (props.disabled || excelImporting.value) {
        return false
    }

    excelImporting.value = true
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
        const nameKeys = ["姓名", "name", "Name", "学生姓名", "studentname", "StudentName"]
        const genderKeys = ["性别", "gender", "Gender"]
        const students: CreateStudentReq[] = []
        let skippedCount = 0

        for (const row of rows) {
            const nameValue = findFirst(row, nameKeys)
            if (!nameValue) {
                skippedCount += 1
                continue
            }

            const name = String(nameValue).trim()
            if (!name) {
                skippedCount += 1
                continue
            }

            const genderValue = findFirst(row, genderKeys)
            students.push({
                name,
                gender: parseGender(genderValue, 1)
            })
        }

        if (students.length === 0) {
            ElMessage.warning("未解析到有效的学生记录，请检查表头是否包含“姓名”")
            return false
        }

        excelParsedStudents.value = students
        excelSkippedCount.value = skippedCount
        ElMessage.success(`解析成功：${students.length} 条，跳过 ${skippedCount} 条`)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "未知错误"
        ElMessage.error(`导入失败：${errorMessage}`)
    } finally {
        excelImporting.value = false
    }

    return false
}

/** 在上传前拦截 Excel 并改为本地解析。 */
async function beforeExcelUpload(file: UploadRawFile): Promise<boolean> {
    return await importExcelFromFile(file as unknown as File)
}

/** 在上传文件变更时同步文件名和解析结果。 */
async function handleExcelChange(file: UploadFile): Promise<void> {
    if (!file.raw) {
        return
    }

    excelFileName.value = file.name || ""
    await importExcelFromFile(file.raw)
}

/** 清空当前 Excel 解析预览。 */
function clearExcelPreview(): void {
    excelParsedStudents.value = []
    excelSkippedCount.value = 0
    excelFileName.value = ""
    uploadRef.value?.clearFiles()
}

/** 确认导入解析后的 Excel 学生数据。 */
function confirmExcelImport(): void {
    if (props.disabled) {
        return
    }

    if (excelParsedStudents.value.length === 0) {
        ElMessage.warning("暂无可导入的数据")
        return
    }

    emit("add-excel", { students: excelParsedStudents.value })
    clearExcelPreview()
    visible.value = false
}

/** 下载学生 Excel 导入模板。 */
async function downloadTemplate(): Promise<void> {
    const templateData = [
        { 姓名: "张三", 性别: "男" },
        { 姓名: "李四", 性别: "女" },
        { 姓名: "王五", 性别: "男" },
        { 姓名: "赵六", 性别: "女" }
    ]

    const XLSX = await import("xlsx")
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "学生名单模板")
    XLSX.writeFile(workbook, "学生名单导入模板.xlsx")
    ElMessage.success("模板下载成功")
}
</script>

<style scoped>
.students-add-dialog {
    display: grid;
    gap: 18px;
}

.mode-switch,
.gender-switch,
.dialog-actions,
.dialog-actions__group,
.meta-tags {
    display: flex;
    align-items: center;
    gap: 10px;
}

.mode-switch {
    flex-wrap: wrap;
}

.mode-switch__button,
.gender-switch__button,
.ghost-button,
.primary-button,
.text-button {
    border: none;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.mode-switch__button,
.gender-switch__button,
.ghost-button,
.primary-button {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 16px;
}

.mode-switch__button,
.gender-switch__button,
.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
}

.mode-switch__button.is-active,
.gender-switch__button.is-active {
    border-color: rgba(85, 104, 255, 0.24);
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
}

.primary-button {
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.22);
}

.mode-switch__button:hover,
.gender-switch__button:hover,
.ghost-button:hover,
.primary-button:hover,
.text-button:hover {
    transform: translateY(-2px);
}

.mode-switch__button:disabled,
.gender-switch__button:disabled,
.ghost-button:disabled,
.primary-button:disabled,
.text-button:disabled {
    opacity: 0.56;
    cursor: not-allowed;
    transform: none;
}

.surface-card {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.surface-card--nested {
    margin-top: 16px;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
}

.field-block {
    display: grid;
    gap: 10px;
}

.field-block--full {
    grid-column: 1 / -1;
}

.field-block__label {
    display: block;
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.section-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 14px;
}

.section-head h4,
.section-head p {
    margin: 0;
}

.section-head h4 {
    color: #16213e;
    font-size: 18px;
}

.section-head p {
    margin-top: 6px;
    color: #627099;
    line-height: 1.7;
}

.meta-tags {
    flex-wrap: wrap;
    justify-content: flex-end;
}

.meta-tag {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font-size: 12px;
    font-weight: 700;
}

.meta-tag--warn {
    background: rgba(245, 158, 11, 0.16);
    color: #b45309;
}

.guide-list-card {
    padding: 18px 20px;
    border-radius: 22px;
    background: rgba(85, 104, 255, 0.06);
}

.guide-list {
    margin: 0;
    padding-left: 18px;
    color: #627099;
    line-height: 1.9;
}

.text-button {
    padding: 0;
    background: transparent;
    color: #5568ff;
    font-weight: 700;
}

.dialog-actions {
    justify-content: space-between;
}

.dialog-actions__group {
    justify-content: flex-end;
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
    font-size: 52px;
    color: #8a96b8;
}

.v3-upload__title,
.v3-upload__hint {
    display: block;
}

.v3-upload__title {
    margin-top: 12px;
    color: #16213e;
    font-size: 18px;
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

.students-add-dialog :deep(.el-input__wrapper),
.students-add-dialog :deep(.el-textarea__inner) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.students-add-dialog :deep(.el-input__wrapper.is-focus),
.students-add-dialog :deep(.el-textarea__inner:focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

@media (max-width: 768px) {
    .form-grid {
        grid-template-columns: 1fr;
    }

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
