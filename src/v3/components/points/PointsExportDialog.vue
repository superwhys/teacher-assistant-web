<template>
    <AppDialogShell
        v-model="visible"
        title="导出积分结果"
        eyebrow="Excel 导出"
        description="支持导出最终积分或积分记录，并在导出前先预览当前筛选结果。"
        width="960px"
    >
        <div class="dialog-layout">
            <section class="filters-card">
                <div class="filters-grid">
                    <label class="field-block">
                        <span class="field-label">导出类型</span>
                        <el-radio-group v-model="exportType" class="field-full export-radio-group" size="large">
                            <el-radio-button value="final">最终积分</el-radio-button>
                            <el-radio-button value="records">积分记录</el-radio-button>
                        </el-radio-group>
                    </label>

                    <label class="field-block">
                        <span class="field-label">导出范围</span>
                        <el-radio-group v-model="exportScope" class="field-full export-radio-group" size="large">
                            <el-radio-button value="all">全部学生</el-radio-button>
                            <el-radio-button value="group">指定分组</el-radio-button>
                        </el-radio-group>
                    </label>

                    <label v-if="exportScope === 'group'" class="field-block">
                        <span class="field-label">选择分组</span>
                        <el-select v-model="exportGroupId" placeholder="请选择分组" class="field-full" size="large">
                            <el-option
                                v-for="group in groupOptions"
                                :key="group.id"
                                :label="`${group.name}（${group.count}）`"
                                :value="group.id"
                            />
                        </el-select>
                    </label>

                    <label v-if="exportType === 'final'" class="field-block">
                        <span class="field-label">排序方式</span>
                        <el-select v-model="sortBy" class="field-full" size="large">
                            <el-option label="积分倒序" value="points-desc" />
                            <el-option label="积分正序" value="points-asc" />
                        </el-select>
                    </label>

                    <label class="field-block field-block--wide">
                        <span class="field-label">按积分项筛选</span>
                        <el-select
                            v-model="filterRuleIds"
                            class="field-full"
                            clearable
                            collapse-tags
                            collapse-tags-tooltip
                            multiple
                            placeholder="全部积分项"
                            size="large"
                        >
                            <el-option
                                v-for="rule in ruleOptions"
                                :key="rule.id"
                                :label="`${rule.groupName ? `${rule.groupName} / ` : ''}${rule.name}${rule.sign === 'minus' ? '（扣分）' : '（加分）'}`"
                                :value="rule.id"
                            />
                        </el-select>
                    </label>

                    <label class="field-block field-block--wide">
                        <span class="field-label">时间范围</span>
                        <el-date-picker
                            v-model="dateRange"
                            type="datetimerange"
                            range-separator="至"
                            start-placeholder="开始时间"
                            end-placeholder="结束时间"
                            class="field-full"
                            :default-time="defaultTime"
                            size="large"
                        />
                    </label>
                </div>
            </section>

            <section class="preview-card">
                <div class="preview-card__head">
                    <div>
                        <strong>数据预览</strong>
                        <p>当前共预览 {{ previewRows.length }} 条数据，可确认后导出为 Excel。</p>
                    </div>
                    <button type="button" class="ghost-button ghost-button--small" :disabled="previewBusy" @click="refreshPreview">
                        刷新预览
                    </button>
                </div>

                <div
                    v-loading="previewBusy"
                    class="preview-table-wrap"
                    element-loading-text="正在生成预览..."
                    element-loading-background="rgba(255, 255, 255, 0.68)"
                >
                    <el-table :data="previewRows" border class="preview-table" height="340">
                        <el-table-column
                            v-for="column in previewColumns"
                            :key="column.prop"
                            :prop="column.prop"
                            :label="column.label"
                            min-width="120"
                        />
                        <template #empty>
                            <div class="empty-state">
                                <strong>暂无可导出数据</strong>
                                <p>请调整筛选条件后重新预览。</p>
                            </div>
                        </template>
                    </el-table>
                </div>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" :disabled="exportLoading" @click="visible = false">
                    取消
                </button>
                <button
                    type="button"
                    class="primary-button"
                    :disabled="!canExport || exportLoading"
                    @click="handleExport"
                >
                    {{ exportLoading ? "正在导出..." : "确认导出" }}
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { pointsManager } from "@/managers/points";
import type { ExportPointsRecordsPreviewReq, ExportSort, ExportType } from "@/types/points";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";
import { ElMessage } from "element-plus";
import { computed, ref, watch } from "vue";

defineOptions({ name: "PointsExportDialog" })

/** 定义分组选项结构。 */
interface GroupOption {
    count: number
    id: number
    name: string
}

/** 定义积分项选项结构。 */
interface RuleOption {
    groupName: string
    id: number
    name: string
    sign: "plus" | "minus"
}

/** 定义导出弹窗属性。 */
interface PointsExportDialogProps {
    activeClassId: number | null
    activeClassName: string
    groupOptions: GroupOption[]
    modelValue: boolean
    ruleOptions: RuleOption[]
}

const props = defineProps<PointsExportDialogProps>()

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void
}>()

const exportType = ref<ExportType>("final")
const exportScope = ref<"all" | "group">("all")
const exportGroupId = ref<number | null>(null)
const sortBy = ref<"points-asc" | "points-desc">("points-desc")
const filterRuleIds = ref<number[]>([])
const previewKey = ref("")
const previewHeaders = ref<string[]>([])
const previewValues = ref<string[][]>([])
const previewLoading = ref(false)
const previewPending = ref(false)
const exportLoading = ref(false)
const dateRange = ref<[Date, Date] | []>([])
const defaultTime: [Date, Date] = [
    new Date(2000, 0, 1, 0, 0, 0),
    new Date(2000, 0, 1, 23, 59, 59)
]

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

const previewBusy = computed<boolean>(() => previewPending.value || previewLoading.value)

const previewColumns = computed(() => {
    return previewHeaders.value.map((label, index) => ({
        label,
        prop: `column_${index}`
    }))
})

const previewRows = computed(() => {
    return previewValues.value.map((row) => {
        const formattedRow: Record<string, string> = {}
        previewHeaders.value.forEach((_, index) => {
            formattedRow[`column_${index}`] = String(row?.[index] ?? "")
        })
        return formattedRow
    })
})

const canExport = computed(() => {
    if (!props.activeClassId) {
        return false
    }

    if (exportScope.value === "group" && !exportGroupId.value) {
        return false
    }

    return Boolean(previewKey.value) && previewRows.value.length > 0 && !previewLoading.value
})

/** 为导出弹窗重置默认筛选项。 */
function resetDialogState(): void {
    exportType.value = "final"
    exportScope.value = "all"
    exportGroupId.value = null
    sortBy.value = "points-desc"
    filterRuleIds.value = []

    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date(end)
    start.setMonth(start.getMonth() - 3)
    start.setHours(0, 0, 0, 0)
    dateRange.value = [start, end]
}

/** 将前端排序字段映射为接口排序枚举。 */
function mapSortToApi(sort: "points-asc" | "points-desc"): ExportSort {
    return sort === "points-asc" ? "points_asc" : "points_desc"
}

/** 构建当前导出预览请求参数。 */
function buildPreviewRequest(): ExportPointsRecordsPreviewReq | null {
    if (!props.activeClassId) {
        return null
    }

    const request: ExportPointsRecordsPreviewReq = {
        class_id: props.activeClassId,
        export_type: exportType.value,
        sort: mapSortToApi(sortBy.value),
        student_group_id: exportScope.value === "group" ? (exportGroupId.value ?? 0) : 0
    }

    if (filterRuleIds.value.length > 0) {
        request.rule_ids = filterRuleIds.value
    }

    if (dateRange.value.length === 2) {
        request.from = dateRange.value[0].toISOString()
        request.to = dateRange.value[1].toISOString()
    }

    return request
}

/** 刷新导出预览数据。 */
async function refreshPreview(): Promise<void> {
    const request = buildPreviewRequest()
    if (!request) {
        previewKey.value = ""
        previewHeaders.value = []
        previewValues.value = []
        previewPending.value = false
        return
    }

    if (previewLoading.value) {
        return
    }

    previewPending.value = false
    previewLoading.value = true
    try {
        const response = await pointsManager.exportRuleRecordsPreview(request)
        previewKey.value = String(response.key ?? "")
        previewHeaders.value = response.headers ?? []
        previewValues.value = response.values ?? []
    } catch (error) {
        console.error("刷新导出预览失败", error)
        previewKey.value = ""
        previewHeaders.value = []
        previewValues.value = []
        ElMessage.error("生成导出预览失败")
    } finally {
        previewLoading.value = false
        previewPending.value = false
    }
}

/** 构建导出文件名。 */
function buildExportFileName(): string {
    const className = props.activeClassName?.trim() || "未命名班级"
    const exportTypeLabel = exportType.value === "records" ? "积分记录" : "积分结果"
    const groupLabel = exportScope.value === "group"
        ? props.groupOptions.find((group) => group.id === exportGroupId.value)?.name || "指定分组"
        : "全部学生"
    const now = new Date()
    const twoDigits = (value: number) => String(value).padStart(2, "0")
    const timestamp = `${now.getFullYear()}${twoDigits(now.getMonth() + 1)}${twoDigits(now.getDate())}_${twoDigits(now.getHours())}${twoDigits(now.getMinutes())}`

    return `${className}_${exportTypeLabel}_${groupLabel}_${timestamp}.xlsx`
}

/** 执行最终 Excel 导出。 */
async function handleExport(): Promise<void> {
    if (!canExport.value) {
        ElMessage.warning("请先生成可导出的预览数据")
        return
    }

    exportLoading.value = true
    try {
        const blob = await pointsManager.exportRuleRecords(previewKey.value)
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = buildExportFileName()
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        ElMessage.success("导出成功")
        visible.value = false
    } catch (error) {
        console.error("导出积分结果失败", error)
        ElMessage.error("导出失败")
    } finally {
        exportLoading.value = false
    }
}

let previewTimer: number | null = null

/** 为预览刷新增加轻量防抖，减少接口请求频率。 */
function schedulePreviewRefresh(): void {
    if (!visible.value) {
        return
    }

    previewPending.value = true

    if (previewTimer) {
        window.clearTimeout(previewTimer)
    }

    previewTimer = window.setTimeout(() => {
        void refreshPreview()
    }, 240)
}

watch(visible, (value) => {
    if (value) {
        resetDialogState()
        schedulePreviewRefresh()
        return
    }

    previewPending.value = false

    if (previewTimer) {
        window.clearTimeout(previewTimer)
        previewTimer = null
    }
})

watch([exportType, exportScope, exportGroupId, sortBy, filterRuleIds, dateRange], () => {
    schedulePreviewRefresh()
}, { deep: true })
</script>

<style scoped>
.dialog-layout {
    display: grid;
    gap: 18px;
}

.filters-card,
.preview-card {
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.82);
    padding: 18px;
    min-width: 0;
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
}

.field-block {
    display: grid;
    gap: 10px;
}

.field-block--wide {
    grid-column: span 2;
}

.field-label {
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.field-full {
    width: 100%;
}

.dialog-layout :deep(.el-input__wrapper),
.dialog-layout :deep(.el-select__wrapper),
.dialog-layout :deep(.el-date-editor.el-input__wrapper),
.dialog-layout :deep(.el-date-editor .el-input__wrapper) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.dialog-layout :deep(.el-input__wrapper.is-focus),
.dialog-layout :deep(.el-select__wrapper.is-focused),
.dialog-layout :deep(.el-date-editor.el-input__wrapper.is-focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

.dialog-layout :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.dialog-layout :deep(.el-radio-button__inner) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 16px;
    border-radius: 16px;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
    line-height: 1;
    text-align: center;
    box-shadow: none;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.dialog-layout :deep(.el-radio-button:first-child .el-radio-button__inner),
.dialog-layout :deep(.el-radio-button:last-child .el-radio-button__inner) {
    border-radius: 16px;
}

.dialog-layout :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    border-color: rgba(85, 104, 255, 0.24);
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
    box-shadow: none;
}

.dialog-layout :deep(.el-select__tags .el-tag),
.dialog-layout :deep(.el-date-editor .el-range-separator) {
    color: #627099;
}

.preview-card__head,
.dialog-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.preview-card__head {
    margin-bottom: 14px;
}

.preview-card__head strong,
.empty-state strong {
    color: #16213e;
    font-size: 16px;
}

.preview-card__head p,
.empty-state p {
    margin: 6px 0 0;
    color: #627099;
    font-size: 13px;
    line-height: 1.7;
}

.preview-table :deep(.el-table__inner-wrapper) {
    border-radius: 18px;
    overflow: hidden;
}

.preview-table-wrap {
    min-width: 0;
    overflow-x: auto;
}

.preview-table {
    width: 100%;
    min-width: 100%;
}

.empty-state {
    display: grid;
    place-items: center;
    gap: 6px;
    min-height: 180px;
    text-align: center;
}

.ghost-button,
.primary-button {
    min-height: 44px;
    padding: 0 16px;
    border: none;
    border-radius: 16px;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button:hover,
.primary-button:hover {
    transform: translateY(-2px);
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
}

.ghost-button--small {
    min-height: 40px;
    padding: 0 14px;
    border-radius: 14px;
}

.primary-button {
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.26);
}

.ghost-button:disabled,
.primary-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
}

@media (max-width: 768px) {
    .filters-grid {
        grid-template-columns: 1fr;
    }

    .field-block--wide {
        grid-column: span 1;
    }

    .preview-card__head,
    .dialog-actions {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
