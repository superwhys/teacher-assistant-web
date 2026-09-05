<template>
    <AppDialogShell
        v-model="visible"
        title="导入积分项"
        eyebrow="Excel 导入"
        description="支持通过 Excel 批量导入积分组与积分项，便于开学快速初始化课堂规则。"
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
                        {{ loading ? "请稍候，系统正在读取并整理积分项数据。" : "表头支持“组名 / 项目名 / 分值”" }}
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
                    <li>组名：例如“课堂表现”“作业表现”。</li>
                    <li>项目名：例如“主动发言”“课堂违纪”。</li>
                    <li>分值：正数代表加分，负数代表扣分。</li>
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
                    <el-table-column prop="groupName" label="积分组" min-width="140" />
                    <el-table-column prop="itemName" label="积分项" min-width="180" />
                    <el-table-column label="分值" width="120" align="center">
                        <template #default="{ row }">
                            <span class="points-pill" :class="row.sign === 'minus' ? 'is-minus' : 'is-plus'">
                                {{ row.sign === "minus" ? "-" : "+" }}{{ row.value }}
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
                        :disabled="loading || parsedRows.length === 0"
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
import { parseItemsExcelToRows, type ImportItemRow } from "@/utils/pointsImport";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";
import { ElMessage } from "element-plus";
import type { UploadFile, UploadInstance, UploadRawFile } from "element-plus";
import { computed, ref, watch } from "vue";

defineOptions({ name: "PointsImportItemsDialog" })

/** 定义弹窗组件属性。 */
interface PointsImportItemsDialogProps {
    modelValue: boolean
}

const props = defineProps<PointsImportItemsDialogProps>()

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void
    (e: "changed"): void
}>()

const uploadRef = ref<UploadInstance>()
const loading = ref(false)
const loadingText = ref("正在处理中...")
const parsedRows = ref<ImportItemRow[]>([])
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

/** 规范化名称字段，便于进行去重匹配。 */
function normalizeName(value: unknown): string {
    return String(value ?? "").trim()
}

/** 构建积分组名称到 ID 的映射。 */
function buildGroupNameToId(groups: Array<{ id?: number, name?: string }>): Map<string, number> {
    const map = new Map<string, number>()
    groups.forEach((group) => {
        const groupId = toNumber(group.id, 0)
        const groupName = normalizeName(group.name)
        if (groupId > 0 && groupName && !map.has(groupName)) {
            map.set(groupName, groupId)
        }
    })
    return map
}

/** 构建指定积分组下已有积分项名称集合。 */
function buildRuleNameSetByGroupId(
    groups: Array<{ id?: number, rules?: Array<{ name?: string }> }>
): Map<number, Set<string>> {
    const map = new Map<number, Set<string>>()
    groups.forEach((group) => {
        const groupId = toNumber(group.id, 0)
        if (groupId <= 0) {
            return
        }

        const nameSet = new Set<string>()
        ;(group.rules ?? []).forEach((rule) => {
            const ruleName = normalizeName(rule.name)
            if (ruleName) {
                nameSet.add(ruleName)
            }
        })
        map.set(groupId, nameSet)
    })
    return map
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
    if (loading.value) {
        return false
    }

    loadingText.value = "正在解析 Excel..."
    loading.value = true
    try {
        const result = await parseItemsExcelToRows(file)
        if (result.rows.length === 0) {
            ElMessage.warning("未解析到有效记录，请检查表头是否为“组名 / 项目名 / 分值”")
            return false
        }

        parsedRows.value = result.rows
        skippedCount.value = result.skipped
        ElMessage.success(`解析完成，共 ${result.rows.length} 条，跳过 ${result.skipped} 条`)
    } catch (error) {
        if (!isApiRequestError(error)) {
            console.error("解析积分项导入文件失败", error)
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

/** 执行积分项导入。 */
async function confirmImport(): Promise<void> {
    if (parsedRows.value.length === 0) {
        ElMessage.warning("暂无可导入的数据")
        return
    }

    loadingText.value = "正在导入积分项..."
    loading.value = true
    try {
        let groups = await pointsManager.listRuleGroups()
        let groupNameToId = buildGroupNameToId(groups)

        const allGroupNames = Array.from(new Set(parsedRows.value.map((row) => normalizeName(row.groupName)).filter(Boolean)))
        const missingGroupNames = allGroupNames.filter((groupName) => !groupNameToId.has(groupName))

        if (missingGroupNames.length > 0) {
            await pointsManager.createRuleGroups(
                missingGroupNames.map((groupName) => ({
                    name: groupName,
                    icon: ""
                }))
            )
            groups = await pointsManager.listRuleGroups()
            groupNameToId = buildGroupNameToId(groups)
        }

        const ruleNameSetByGroupId = buildRuleNameSetByGroupId(groups)
        const createRulesPayload: Array<{
            name: string
            points: number
            rule_group_id: number
            type: number
            icon: string
        }> = []
        let duplicateCount = 0

        parsedRows.value.forEach((row) => {
            const groupName = normalizeName(row.groupName)
            const itemName = normalizeName(row.itemName)
            const groupId = groupNameToId.get(groupName) ?? 0
            if (!groupName || !itemName || groupId <= 0) {
                return
            }

            const nameSet = ruleNameSetByGroupId.get(groupId) ?? new Set<string>()
            if (nameSet.has(itemName)) {
                duplicateCount += 1
                return
            }

            nameSet.add(itemName)
            ruleNameSetByGroupId.set(groupId, nameSet)
            createRulesPayload.push({
                name: itemName,
                points: Math.abs(toNumber(row.value, 0)),
                rule_group_id: groupId,
                type: row.sign === "minus" ? 2 : 1,
                icon: ""
            })
        })

        if (createRulesPayload.length > 0) {
            await pointsManager.createRules(createRulesPayload)
        }

        ElMessage.success(
            `导入完成：新增积分组 ${missingGroupNames.length} 个，新增积分项 ${createRulesPayload.length} 个，重复跳过 ${duplicateCount} 条`
        )
        emit("changed")
        handleCancel()
    } catch (error: any) {
        ElMessage.error(`导入失败：${error?.message || "未知错误"}`)
    } finally {
        loading.value = false
    }
}

/** 下载积分项导入模板。 */
async function downloadTemplate(): Promise<void> {
    const templateRows = [
        { 组名: "课堂表现", 项目名: "主动发言", 分值: 2 },
        { 组名: "课堂表现", 项目名: "课堂违纪", 分值: -2 },
        { 组名: "作业表现", 项目名: "作业优秀", 分值: 3 }
    ]

    const XLSX = await import("xlsx")
    const worksheet = XLSX.utils.json_to_sheet(templateRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "积分项导入模板")
    XLSX.writeFile(workbook, "积分项导入模板.xlsx")
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
