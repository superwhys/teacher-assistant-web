<template>
    <AppDialogShell
        v-model="visible"
        title="导入积分"
        eyebrow="批量录入"
        description="支持通过 Excel 批量导入学生积分变动，适合期初导入历史分值或集中补录课堂结果。"
        width="760px"
    >
        <div
            v-loading="loading"
            class="dialog-layout"
            :element-loading-text="loadingText"
            element-loading-background="rgba(255, 255, 255, 0.68)"
        >
            <section class="upload-panel">
                <el-upload
                    ref="uploadRef"
                    class="upload-panel__control"
                    drag
                    accept=".xls,.xlsx"
                    :auto-upload="false"
                    :show-file-list="false"
                    :before-upload="handleBeforeUpload"
                    :on-change="handleUploadChange"
                    :disabled="loading"
                >
                    <i-ep-upload-filled class="upload-panel__icon" />
                    <p class="upload-panel__title">
                        {{ loading ? loadingText : (fileName || "将 Excel 拖到此处，或点击选择文件") }}
                    </p>
                    <p class="upload-panel__hint">
                        {{ loading ? "请稍候，系统正在读取并校验积分记录。" : "表头支持“姓名 / 分值”，可选“项目”列" }}
                    </p>
                </el-upload>
            </section>

            <section class="guide-card">
                <div class="guide-card__head">
                    <strong>导入说明</strong>
                    <button type="button" class="text-button" :disabled="loading" @click="downloadTemplate">
                        下载模板
                    </button>
                </div>
                <ul class="guide-list">
                    <li>姓名：必须与当前班级学生姓名一致。</li>
                    <li>分值：正数加分，负数扣分。</li>
                    <li>导入会直接写入当前班级积分结果，不匹配的学生会自动跳过。</li>
                </ul>
            </section>

            <section v-if="parsedRows.length > 0" class="preview-card">
                <div class="preview-card__head">
                    <div>
                        <strong>解析预览</strong>
                        <p>已解析 {{ parsedRows.length }} 条，跳过 {{ skippedCount }} 条。</p>
                    </div>
                    <span class="preview-tag">{{ fileName || "未命名文件" }}</span>
                </div>

                <el-table :data="parsedRows" border class="preview-table" max-height="320">
                    <el-table-column prop="studentName" label="学生姓名" min-width="160" />
                    <el-table-column label="分值" width="120" align="center">
                        <template #default="{ row }">
                            <span class="points-pill" :class="row.delta < 0 ? 'is-minus' : 'is-plus'">
                                {{ row.delta > 0 ? "+" : "" }}{{ row.delta }}
                            </span>
                        </template>
                    </el-table-column>
                </el-table>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" :disabled="loading" @click="handleCancel">
                    取消
                </button>
                <div class="dialog-actions__right">
                    <button type="button" class="ghost-button" :disabled="loading" @click="clearPreview">
                        清空
                    </button>
                    <button
                        type="button"
                        class="primary-button"
                        :disabled="loading || parsedRows.length === 0 || !activeClassId"
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
import { pointsManager } from "@/managers/points";
import { isApiRequestError } from "@/types/api";
import { parseExcelToImportRowsSimple, type ImportRow } from "@/utils/pointsImport";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";
import { ElMessage } from "element-plus";
import type { UploadFile, UploadInstance, UploadRawFile } from "element-plus";
import { computed, ref, watch } from "vue";

defineOptions({ name: "PointsImportRecordsDialog" })

/** 定义弹窗组件属性。 */
interface PointsImportRecordsDialogProps {
    activeClassId: number | null
    modelValue: boolean
}

const props = defineProps<PointsImportRecordsDialogProps>()

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void
    (e: "changed"): void
}>()

const uploadRef = ref<UploadInstance>()
const loading = ref(false)
const loadingText = ref("正在处理中...")
const parsedRows = ref<ImportRow[]>([])
const skippedCount = ref(0)
const fileName = ref("")

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

/** 安全地将任意值转换为数字。 */
function toNumber(value: unknown, fallback = 0): number {
    const parsedValue = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}

/** 清空当前导入预览数据。 */
function clearPreview(): void {
    parsedRows.value = []
    skippedCount.value = 0
    fileName.value = ""
    uploadRef.value?.clearFiles()
}

/** 关闭弹窗并清空临时状态。 */
function handleCancel(): void {
    clearPreview()
    visible.value = false
}

/** 解析上传的 Excel 文件。 */
async function parseImportFile(file: File): Promise<boolean> {
    if (!props.activeClassId) {
        ElMessage.warning("请先选择班级")
        return false
    }

    if (loading.value) {
        return false
    }

    loadingText.value = "正在解析 Excel..."
    loading.value = true
    try {
        const result = await parseExcelToImportRowsSimple(file)
        if (result.rows.length === 0) {
            ElMessage.warning("未解析到有效记录，请检查表头是否为“姓名 / 分值”")
            return false
        }

        parsedRows.value = result.rows
        skippedCount.value = result.skipped
        ElMessage.success(`解析完成，共 ${result.rows.length} 条，跳过 ${result.skipped} 条`)
    } catch (error) {
        if (!isApiRequestError(error)) {
            console.error("解析积分导入文件失败", error)
            ElMessage.error("解析文件失败")
        }
    } finally {
        loading.value = false
    }
    return false
}

/** 处理上传前的文件校验与解析。 */
async function handleBeforeUpload(file: UploadRawFile): Promise<boolean> {
    return await parseImportFile(file as File)
}

/** 处理上传文件变更事件。 */
async function handleUploadChange(file: UploadFile): Promise<void> {
    if (!file.raw) {
        return
    }

    fileName.value = file.name || ""
    await parseImportFile(file.raw)
}

/** 执行积分记录导入。 */
async function confirmImport(): Promise<void> {
    if (!props.activeClassId) {
        ElMessage.warning("请先选择班级")
        return
    }

    if (parsedRows.value.length === 0) {
        ElMessage.warning("暂无可导入的数据")
        return
    }

    loadingText.value = "正在导入积分..."
    loading.value = true
    try {
        const records = parsedRows.value
            .map((row) => ({
                name: String(row.studentName ?? "").trim(),
                points: toNumber(row.delta, 0)
            }))
            .filter((row) => row.name && row.points !== 0)

        if (records.length === 0) {
            ElMessage.warning("没有有效记录可导入")
            return
        }

        const missingStudents = await pointsManager.importRuleRecords({
            class_id: props.activeClassId,
            records
        })

        const uniqueMissingStudents = Array.from(
            new Set((missingStudents ?? []).map((studentName) => String(studentName ?? "").trim()).filter(Boolean))
        )
        if (uniqueMissingStudents.length > 0) {
            const previewNames = uniqueMissingStudents.slice(0, 8).join("、")
            const moreText = uniqueMissingStudents.length > 8 ? ` 等 ${uniqueMissingStudents.length} 人` : ""
            ElMessage.warning(`以下学生不存在，已自动跳过：${previewNames}${moreText}`)
        }

        const successCount = Math.max(0, records.length - uniqueMissingStudents.length)
        ElMessage.success(`导入完成：提交 ${records.length} 条，成功 ${successCount} 条`)
        emit("changed")
        handleCancel()
    } catch (error: any) {
        ElMessage.error(`导入失败：${error?.message || "未知错误"}`)
    } finally {
        loading.value = false
    }
}

/** 下载积分导入模板。 */
async function downloadTemplate(): Promise<void> {
    const templateRows = [
        { 姓名: "张三", 分值: 5 },
        { 姓名: "李四", 分值: -2 },
        { 姓名: "王五", 分值: 3 }
    ]

    const XLSX = await import("xlsx")
    const worksheet = XLSX.utils.json_to_sheet(templateRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "积分导入模板")
    XLSX.writeFile(workbook, "积分导入模板.xlsx")
    ElMessage.success("模板下载成功")
}

watch(visible, (value) => {
    if (!value) {
        clearPreview()
    }
})
</script>

<style scoped>
.dialog-layout {
    display: grid;
    gap: 16px;
}

.upload-panel,
.guide-card,
.preview-card {
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.82);
}

.upload-panel {
    padding: 18px;
}

.upload-panel__control :deep(.el-upload) {
    width: 100%;
}

.upload-panel__control :deep(.el-upload-dragger) {
    width: 100%;
    padding: 26px 16px;
    border-radius: 20px;
    border: 1px dashed rgba(122, 141, 198, 0.26);
    background: linear-gradient(180deg, rgba(85, 104, 255, 0.05), rgba(255, 255, 255, 0.96));
}

.upload-panel__icon {
    font-size: 55px;
    color: #5568ff;
}

.upload-panel__title,
.upload-panel__hint,
.preview-card__head p {
    margin: 0;
}

.upload-panel__title {
    margin-top: 10px;
    color: #16213e;
    font-size: 17px;
    font-weight: 700;
}

.upload-panel__hint {
    margin-top: 8px;
    color: #627099;
    font-size: 14px;
}

.guide-card,
.preview-card {
    padding: 18px;
}

.guide-card__head,
.preview-card__head,
.dialog-actions,
.dialog-actions__right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.guide-card__head,
.preview-card__head,
.dialog-actions {
    justify-content: space-between;
}

.guide-card__head strong,
.preview-card__head strong {
    color: #16213e;
    font-size: 17px;
}

.guide-list {
    margin: 12px 0 0;
    padding-left: 18px;
    color: #627099;
    line-height: 1.8;
}

.preview-card__head {
    margin-bottom: 14px;
}

.preview-card__head p {
    margin-top: 6px;
    color: #627099;
    font-size: 14px;
}

.preview-tag,
.points-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
}

.preview-tag {
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
}

.preview-table :deep(.el-table__inner-wrapper) {
    border-radius: 18px;
    overflow: hidden;
}

.points-pill.is-plus {
    color: #067647;
    background: rgba(18, 185, 129, 0.12);
}

.points-pill.is-minus {
    color: #d92d20;
    background: rgba(239, 68, 68, 0.12);
}

.text-button,
.ghost-button,
.primary-button {
    border: none;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.text-button:hover,
.ghost-button:hover,
.primary-button:hover {
    transform: translateY(-2px);
}

.text-button {
    padding: 0;
    background: transparent;
    color: #5568ff;
    font-weight: 700;
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
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.26);
}

.ghost-button:disabled,
.primary-button:disabled,
.text-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
}

@media (max-width: 768px) {
    .preview-card__head,
    .dialog-actions,
    .dialog-actions__right {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
