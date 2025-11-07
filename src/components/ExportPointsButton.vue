<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { useStudentStore } from '@/stores/studentStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import { usePointsStore } from '@/stores/pointsStore'

const props = defineProps<{
    activeClassId: string | null
    activeClassName: string
}>()

const studentStore = useStudentStore()
const groupStore = useStudentGroupStore()
const pointsStore = usePointsStore()

const studentsOfActive = computed(() => {
    const id = props.activeClassId
    return id ? studentStore.listByClassId(id) : []
})

const groupsOfActive = computed(() => {
    const id = props.activeClassId
    return id ? groupStore.listByClassId(id) : []
})

const exportVisible = ref(false)
const exportType = ref<'history' | 'final'>('final')
const exportScope = ref<'all' | 'group'>('all')
const exportGroupId = ref<string | ''>('')

function openExportDialog() {
    if (!props.activeClassId) {
        ElMessage.error('请先选择班级')
        return
    }
    exportVisible.value = true
}

function formatDateTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    return `${y}-${m}-${d} ${hh}:${mm}`
}

function buildExportRows(): { rows: any[]; sheetName: string } {
    const classId = props.activeClassId
    if (!classId) return { rows: [], sheetName: '' }
    if (exportType.value === 'history') {
        const list = pointsStore.getHistoryOf(classId)
        let filtered = list
        if (exportScope.value === 'group' && exportGroupId.value) {
            const g = groupsOfActive.value.find(x => x.id === exportGroupId.value)
            const nameSet = new Set(g?.members ?? [])
            filtered = list.filter(a => a.studentNames.some(n => nameSet.has(n)))
        }
        const rows = filtered.map(a => ({
            '时间': formatDateTime(new Date(a.at)),
            '积分项': a.itemName || '未知',
            '分值': a.delta,
            '学生': a.studentNames.join('、'),
        }))
        return { rows, sheetName: '历史记录' }
    } else {
        const points = pointsStore.getPointsOf(classId)
        let names = studentsOfActive.value.map(s => s.studentName)
        if (exportScope.value === 'group' && exportGroupId.value) {
            const g = groupsOfActive.value.find(x => x.id === exportGroupId.value)
            const nameSet = new Set(g?.members ?? [])
            names = names.filter(n => nameSet.has(n))
        }
        const rows = names.map(n => ({ '姓名': n, '最终积分': points[n] ?? 0 }))
        return { rows, sheetName: '最终积分' }
    }
}

function doExportExcel() {
    if (!props.activeClassId) return
    const { rows, sheetName } = buildExportRows()
    if (!rows.length) {
        ElMessage.info('没有可导出的数据')
        return
    }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    const cls = props.activeClassName || '未命名班级'
    const scopeSuffix = exportScope.value === 'group' ? `_${groupsOfActive.value.find(g => g.id === exportGroupId.value)?.name || '分组'}` : '_全部学生'
    const typeSuffix = exportType.value === 'history' ? '积分历史' : '最终积分'
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
    const filename = `${cls}_${typeSuffix}${scopeSuffix}_${ts}.xlsx`
    XLSX.writeFile(wb, filename)
    ElMessage.success('导出成功')
    exportVisible.value = false
}
</script>

<template>
    <el-button type="info" plain :disabled="!activeClassId" @click="openExportDialog">
        <i-ep-download /> 导出 Excel
    </el-button>

    <el-dialog v-model="exportVisible" title="导出 Excel" width="500px">
        <el-form label-position="top" class="export-form">
            <el-form-item label="导出类型">
                <el-radio-group v-model="exportType" size="large">
                    <el-radio-button value="final">最终积分</el-radio-button>
                    <el-radio-button value="history">历史记录</el-radio-button>
                </el-radio-group>
            </el-form-item>

            <el-form-item label="导出范围">
                <el-radio-group v-model="exportScope" size="large">
                    <el-radio-button value="all">全部学生</el-radio-button>
                    <el-radio-button value="group">指定分组</el-radio-button>
                </el-radio-group>
            </el-form-item>

            <el-form-item v-if="exportScope === 'group'" label="选择分组">
                <el-select v-model="exportGroupId" placeholder="请选择分组" size="large" class="group-select">
                    <el-option v-for="g in groupsOfActive" :key="g.id" :label="`${g.name}（${g.members.length}）`"
                        :value="g.id" />
                </el-select>
            </el-form-item>
        </el-form>

        <template #footer>
            <div class="dialog-footer">
                <el-button @click="exportVisible = false">取消</el-button>
                <el-button type="primary" @click="doExportExcel"
                    :disabled="exportScope === 'group' && !exportGroupId">
                    <i-ep-download /> 导出
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
.export-form {
    padding-top: 10px;
}

.group-select {
    width: 100%;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
</style>

