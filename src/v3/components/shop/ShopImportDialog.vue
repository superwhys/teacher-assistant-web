<template>
    <AppDialogShell
        v-model="visible"
        eyebrow="Excel 导入"
        title="批量导入商城奖品"
        description="支持拖拽上传 `.xls/.xlsx` 文件，系统会自动识别商品名称、积分、库存和描述字段。"
        width="860px"
        :show-close="!parsing"
    >
        <div
            v-loading="parsing"
            class="import-layout"
            element-loading-text="正在解析文件..."
            element-loading-background="rgba(255, 255, 255, 0.8)"
        >
            <section class="import-dropzone">
                <el-upload
                    ref="uploadRef"
                    drag
                    accept=".xls,.xlsx"
                    :auto-upload="false"
                    :show-file-list="false"
                    :before-upload="beforeImportUpload"
                    :disabled="parsing"
                    :on-change="handleImportChange"
                >
                    <i-ep-upload-filled class="import-dropzone__icon" />
                    <strong>{{ importFileName || "将文件拖到此处，或点击上传" }}</strong>
                    <p>支持 Excel 批量导入，适合开学初始化奖品库。</p>
                </el-upload>
            </section>

            <aside class="import-guide">
                <div class="import-guide__head">
                    <span class="import-guide__eyebrow">推荐表头</span>
                    <button type="button" class="text-button" :disabled="parsing" @click="downloadTemplate">
                        下载模板
                    </button>
                </div>
                <ul>
                    <li>商品名称 / 名称 / `name`</li>
                    <li>积分 / 消耗积分 / `points`</li>
                    <li>库存 / 数量 / `stock`</li>
                    <li>描述 / 商品描述 / `description`</li>
                </ul>
                <p>当未填写图标时，系统会自动使用默认奖品图标。</p>
            </aside>
        </div>

        <section v-if="importParsedItems.length > 0" class="import-preview">
            <div class="import-preview__head">
                <div>
                    <span class="import-preview__eyebrow">解析结果</span>
                    <h4>共识别 {{ importParsedItems.length }} 个奖品</h4>
                </div>
                <button type="button" class="ghost-button" :disabled="parsing" @click="clearImport">
                    清空结果
                </button>
            </div>

            <el-table :data="importParsedItems" class="import-preview__table" max-height="320">
                <el-table-column prop="name" label="商品名称" min-width="180" />
                <el-table-column prop="points" label="积分" width="100" align="center" />
                <el-table-column prop="stock" label="库存" width="100" align="center" />
                <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
            </el-table>
        </section>

        <template #footer>
            <div class="dialog-footer">
                <button type="button" class="dialog-button" :disabled="parsing" @click="visible = false">
                    关闭
                </button>
                <button
                    type="button"
                    class="dialog-button dialog-button--primary"
                    :disabled="importParsedItems.length === 0 || parsing"
                    @click="confirmImport"
                >
                    确认导入
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { ElMessage } from "element-plus"
import type { UploadInstance } from "element-plus"
import type { CreatePrizeReq } from "@/types/mall"
import AppDialogShell from "@/v3/components/AppDialogShell.vue"

defineOptions({ name: "ShopImportDialog" })

/** 定义商城导入弹窗属性。 */
interface ShopImportDialogProps {
    modelValue: boolean
}

const props = defineProps<ShopImportDialogProps>()

const emit = defineEmits<{
    (e: "confirm", items: CreatePrizeReq[]): void
    (e: "update:modelValue", value: boolean): void
}>()

const importFileName = ref("")
const importParsedItems = ref<CreatePrizeReq[]>([])
const uploadRef = ref<UploadInstance>()
const parsing = ref(false)

let lastParseRequestId = 0

/** 返回弹窗显示状态。 */
const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => {
        if (parsing.value && !value) {
            return
        }

        emit("update:modelValue", value)
    },
})

/** 处理 Excel 文件解析逻辑。 */
async function handleImportFile(file: File): Promise<void> {
    const requestId = ++lastParseRequestId
    parsing.value = true

    try {
        const fileBuffer = await file.arrayBuffer()
        const XLSX = await import("xlsx")
        const workbook = XLSX.read(fileBuffer)
        const firstSheetName = workbook.SheetNames[0]

        if (!firstSheetName) {
            ElMessage.warning("Excel 文件中没有工作表")
            return
        }

        const firstSheet = workbook.Sheets[firstSheetName]
        if (!firstSheet) {
            ElMessage.warning("无法读取工作表内容")
            return
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet)
        const parsedItems: CreatePrizeReq[] = []

        for (const row of rows) {
            const name = String(row["商品名称"] || row["名称"] || row["name"] || "").trim()
            const points = Number(row["积分"] || row["消耗积分"] || row["points"] || 0)
            const stock = Number(row["库存"] || row["数量"] || row["stock"] || 0)
            const description = String(row["描述"] || row["商品描述"] || row["description"] || "").trim()

            if (!name || points <= 0) {
                continue
            }

            parsedItems.push({
                description,
                icon: "goods-filled",
                name,
                points,
                stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
            })
        }

        if (parsedItems.length === 0) {
            ElMessage.warning("未解析到有效商品，请检查表头是否包含商品名称与积分字段")
            return
        }

        if (requestId !== lastParseRequestId) {
            return
        }

        importFileName.value = file.name
        importParsedItems.value = parsedItems
        ElMessage.success(`已解析 ${parsedItems.length} 个奖品`)
    } catch (error) {
        if (requestId !== lastParseRequestId) {
            return
        }

        console.error(error)
        ElMessage.error("导入失败，请检查文件格式后重试")
    } finally {
        if (requestId === lastParseRequestId) {
            parsing.value = false
        }
    }
}

/** 在上传前拦截文件并执行本地解析。 */
async function beforeImportUpload(file: File): Promise<boolean> {
    await handleImportFile(file)
    return false
}

/** 处理上传组件文件变更。 */
async function handleImportChange(file: { raw?: File }): Promise<void> {
    if (!file.raw) {
        return
    }

    await handleImportFile(file.raw)
}

/** 清空已解析的导入结果。 */
function clearImport(): void {
    if (parsing.value) {
        return
    }

    importFileName.value = ""
    importParsedItems.value = []
    uploadRef.value?.clearFiles()
}

/** 下载商城导入模板。 */
async function downloadTemplate(): Promise<void> {
    if (parsing.value) {
        return
    }

    const template = [
        { "商品名称": "免作业券", "积分": 120, "库存": 3, "描述": "可免一次书面作业" },
        { "商品名称": "阅读优先位", "积分": 80, "库存": 6, "描述": "课堂展示优先选择" },
    ]
    const XLSX = await import("xlsx")
    const worksheet = XLSX.utils.json_to_sheet(template)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "商品清单")
    XLSX.writeFile(workbook, "积分商城商品模板.xlsx")
    ElMessage.success("模板下载成功")
}

/** 确认提交导入结果。 */
function confirmImport(): void {
    if (parsing.value) {
        return
    }

    if (importParsedItems.value.length === 0) {
        ElMessage.warning("当前没有可导入的商品")
        return
    }

    emit("confirm", [...importParsedItems.value])
    emit("update:modelValue", false)
    clearImport()
}
</script>

<style scoped>
.import-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
}

.import-dropzone,
.import-guide,
.import-preview {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.14);
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.72);
}

.import-dropzone :deep(.el-upload) {
    width: 100%;
}

.import-dropzone :deep(.el-upload-dragger) {
    width: 100%;
    padding: 36px 20px;
    border: 1px dashed rgba(85, 104, 255, 0.26);
    border-radius: 22px;
    background: rgba(85, 104, 255, 0.04);
}

.import-dropzone__icon {
    font-size: 52px;
    color: #5568ff;
    margin-bottom: 12px;
}

.import-dropzone strong,
.import-dropzone p,
.import-guide p,
.import-preview__head h4 {
    margin: 0;
}

.import-dropzone p {
    margin-top: 8px;
    color: #627099;
}

.import-guide {
    display: grid;
    gap: 14px;
    align-content: start;
    background:
        radial-gradient(circle at top right, rgba(142, 108, 255, 0.12), transparent 28%),
        rgba(255, 255, 255, 0.82);
}

.import-guide ul {
    display: grid;
    gap: 6px;
}

.import-guide__head,
.import-guide__eyebrow,
.import-preview__eyebrow {
    display: inline-flex;
    align-items: center;
}

.import-guide__head {
    justify-content: space-between;
    gap: 12px;
}

.import-guide__eyebrow,
.import-preview__eyebrow {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font-size: 12px;
    font-weight: 700;
}

.text-button {
    border: none;
    background: transparent;
    color: #5568ff;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.text-button:disabled {
    opacity: 0.46;
    cursor: not-allowed;
}

.import-guide ul {
    margin: 0;
    padding-left: 18px;
    color: #16213e;
    line-height: 1.8;
}

.import-guide p {
    color: #627099;
    line-height: 1.7;
}

.import-preview {
    margin-top: 18px;
}

.import-preview__head,
.dialog-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.import-preview__head h4 {
    margin-top: 10px;
    color: #16213e;
    font-size: 22px;
}

.ghost-button,
.dialog-button {
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.dialog-footer {
    justify-content: flex-end;
}

.dialog-button--primary {
    border: none;
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
}

.dialog-button:disabled,
.ghost-button:disabled {
    opacity: 0.46;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .import-preview__head,
    .dialog-footer {
        grid-template-columns: 1fr;
        flex-direction: column;
    }

    .import-dropzone,
    .import-guide,
    .import-preview {
        padding: 16px;
    }

    .ghost-button,
    .dialog-button {
        width: 100%;
    }
}
</style>
