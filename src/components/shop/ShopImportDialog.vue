<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadInstance } from 'element-plus'
import type { CreatePrizeReq } from '@/types/mall'
import * as XLSX from 'xlsx'

defineOptions({ name: 'ShopImportDialog' })

const props = defineProps<{
    modelValue: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void
    (e: 'confirm', items: CreatePrizeReq[]): void
}>()

const importFileName = ref('')
const importParsedItems = ref<CreatePrizeReq[]>([])
const uploadRef = ref<UploadInstance>()
const parsing = ref(false)

let lastParseReqId = 0
function handleBeforeClose(done: () => void) {
    if (parsing.value) return
    done()
}

async function handleImportFile(file: File) {
    const reqId = ++lastParseReqId
    parsing.value = true
    try {
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data)
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
            ElMessage.warning('Excel 文件中没有工作表')
            return
        }
        const firstSheet = workbook.Sheets[firstSheetName]
        if (!firstSheet) {
            ElMessage.warning('无法读取工作表内容')
            return
        }
        const rows = XLSX.utils.sheet_to_json<any>(firstSheet)

        const items: CreatePrizeReq[] = []
        for (const row of rows) {
            const name = row['商品名称'] || row['名称'] || row['name']
            const points = Number(row['积分'] || row['points'] || 0)
            const stock = Number(row['库存'] || row['数量'] || row['stock'] || 0)
            const description = row['描述'] || row['description'] || ''

            if (name && points > 0) {
                items.push({
                    name,
                    points,
                    stock,
                    description,
                    icon: 'goods-filled',
                })
            }
        }

        if (items.length === 0) {
            ElMessage.warning('未解析到有效的商品数据，请检查表头是否包含"商品名称/积分/库存"')
            return
        }

        if (reqId !== lastParseReqId) return
        importParsedItems.value = items
        importFileName.value = file.name
        ElMessage.success(`解析成功：${items.length} 个商品`)
    } catch (err: any) {
        if (reqId !== lastParseReqId) return
        ElMessage.error(`导入失败：${err?.message || '未知错误'}`)
    } finally {
        if (reqId === lastParseReqId) {
            parsing.value = false
        }
    }
}

async function beforeImportUpload(file: any) {
    await handleImportFile(file as File)
    return false
}

async function handleImportChange(file: any) {
    if (!file || !file.raw) return
    await handleImportFile(file.raw)
    importFileName.value = file.name || ''
}

function clearImport() {
    if (parsing.value) return
    importParsedItems.value = []
    importFileName.value = ''
    uploadRef.value?.clearFiles()
}

function close() {
    if (parsing.value) return
    emit('update:modelValue', false)
}

function confirmImport() {
    if (parsing.value) return
    if (importParsedItems.value.length === 0) {
        ElMessage.warning('没有可导入的商品')
        return
    }
    emit('confirm', [...importParsedItems.value])
    close()
    clearImport()
}
</script>

<template>
    <el-dialog
        :model-value="props.modelValue"
        title="导入商品（Excel）"
        width="720px"
        :close-on-click-modal="!parsing"
        :close-on-press-escape="!parsing"
        :show-close="!parsing"
        :before-close="handleBeforeClose"
        @update:model-value="(v: boolean) => { if (parsing && !v) return; emit('update:modelValue', v) }"
    >
        <div
            v-loading="parsing"
            element-loading-text="正在解析文件..."
            element-loading-background="rgba(255, 255, 255, 0.8)"
        >
            <el-upload
                ref="uploadRef"
                class="upload-area"
                drag
                accept=".xls,.xlsx"
                :auto-upload="false"
                :show-file-list="false"
                :before-upload="beforeImportUpload"
                :on-change="handleImportChange"
                :disabled="parsing"
            >
                <i-ep-upload-filled class="upload-icon" />
                <div v-if="!importFileName" class="el-upload__text">将文件拖到此处，或点击上传</div>
                <div v-else class="upload-file-name">
                    <i-ep-document class="file-icon" /> {{ importFileName }}
                    <span class="change-hint">（点击重新选择）</span>
                </div>
                <template #tip>
                    <div class="el-upload__tip">支持 .xls/.xlsx，表头包含"商品名称、积分、库存、描述（可选）"。</div>
                </template>
            </el-upload>

            <div class="excel-guide">
                <div class="guide-title">可用的 Excel 表头示例：</div>
                <ul class="guide-list">
                    <li>必填：商品名称（或 名称/name）</li>
                    <li>必填：积分（或 消耗积分/points）</li>
                    <li>必填：库存（或 数量/stock）</li>
                    <li>可选：描述（或 商品描述/description）</li>
                </ul>
            </div>

            <div v-if="importParsedItems.length > 0" class="excel-preview">
                <div class="preview-header">
                    <div class="preview-title">解析结果</div>
                    <el-space class="preview-meta" wrap size="small">
                        <el-tag v-if="importFileName" type="info" effect="light">文件：{{ importFileName }}</el-tag>
                        <el-tag type="primary" effect="light">共 {{ importParsedItems.length }} 个商品</el-tag>
                    </el-space>
                </div>
                <el-table :data="importParsedItems" border size="small" class="preview-table" max-height="300px">
                    <el-table-column label="商品名称" prop="name" min-width="140" />
                    <el-table-column label="积分" prop="points" width="100" align="center" />
                    <el-table-column label="库存" prop="stock" width="100" align="center" />
                    <el-table-column label="描述" prop="description" min-width="180" show-overflow-tooltip />
                </el-table>
                <div class="preview-actions">
                    <el-button
                        type="primary"
                        :disabled="importParsedItems.length === 0 || parsing"
                        :loading="parsing"
                        @click="confirmImport"
                    >
                        <i-ep-upload-filled /> 确认导入
                    </el-button>
                    <el-button :disabled="parsing" @click="clearImport">清空</el-button>
                </div>
            </div>
        </div>
    </el-dialog>
</template>


