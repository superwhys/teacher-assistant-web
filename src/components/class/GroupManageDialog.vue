<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { studentManager } from '@/managers/student'
import type { StudentDTO } from '@/types/student'

export type UiGroup = {
    id: number
    name: string
    memberIds: number[]
}

const props = defineProps<{
    modelValue: boolean
    active: boolean
    classId: number | null
    groups: UiGroup[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'create-group', payload: { name: string }): void
    (e: 'delete-group', payload: { groupId: number }): void
    (e: 'save-members', payload: { groupId: number, memberIds: number[] }): void
    (e: 'open-import'): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const newGroupName = ref('')
const selectedGroupId = ref<number | null>(null)
const targetKeys = ref<number[]>([])

const groupOptions = computed(() => props.groups.map(g => ({
    id: g.id,
    label: g.name
})))

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

function toUiItems(list: StudentDTO[]): Array<{ id: number; name: string }> {
    return (list ?? [])
        .map(s => ({
            id: toNumber(s.id, 0),
            name: (s.name ?? '').trim(),
        }))
        .filter(s => s.id > 0 && !!s.name)
}

const loading = ref(false)
const groupStudents = ref<Array<{ id: number; name: string }>>([])
const ungroupedStudents = ref<Array<{ id: number; name: string }>>([])

const transferData = computed(() => {
    const byId = new Map<number, string>()
    for (const s of ungroupedStudents.value) byId.set(s.id, s.name)
    for (const s of groupStudents.value) byId.set(s.id, s.name)
    return Array.from(byId.entries()).map(([id, name]) => ({ key: id, label: name }))
})

let lastLoadReqId = 0
async function loadStudentsForGroup() {
    if (!props.active || !props.classId || !selectedGroupId.value) {
        groupStudents.value = []
        ungroupedStudents.value = []
        targetKeys.value = []
        return
    }

    const reqId = ++lastLoadReqId
    loading.value = true
    try {
        const gid = selectedGroupId.value
        const clsId = props.classId
        const [groupInfo, ungrouped] = await Promise.all([
            studentManager.list(clsId, gid),
            studentManager.listUngrouped(clsId),
        ])

        if (reqId !== lastLoadReqId) return

        const members = toUiItems(groupInfo)
        const left = toUiItems(ungrouped)

        groupStudents.value = members
        ungroupedStudents.value = left
        targetKeys.value = members.map(s => s.id)
    } catch (err) {
        console.error(err)
        if (reqId !== lastLoadReqId) return
        groupStudents.value = []
        ungroupedStudents.value = []
        targetKeys.value = []
    } finally {
        if (reqId === lastLoadReqId) loading.value = false
    }
}

watch(visible, (val) => {
    if (!val) return
    const current = selectedGroupId.value
    const exists = current ? props.groups.some(g => g.id === current) : false
    selectedGroupId.value = exists ? current : (props.groups[0]?.id ?? null)
}, { immediate: false })

watch(() => props.groups, (next) => {
    if (!visible.value) return
    const list = next ?? []
    if (list.length === 0) {
        selectedGroupId.value = null
        return
    }
    const gid = selectedGroupId.value
    if (!gid || !list.some(g => g.id === gid)) {
        selectedGroupId.value = list[0]!.id
    }
})

watch([selectedGroupId, () => props.classId], async () => {
    await loadStudentsForGroup()
})

function onAddGroup() {
    if (!props.active) return
    const name = newGroupName.value.trim()
    if (!name) {
        ElMessage.error('请输入分组名称')
        return
    }
    emit('create-group', { name })
    newGroupName.value = ''
}

async function onRemoveGroup() {
    if (!props.active || !selectedGroupId.value) return
    const g = props.groups.find(x => x.id === selectedGroupId.value)
    if (!g) return
    try {
        await ElMessageBox.confirm(`确定删除分组「${g.name}」吗？`, '删除确认', { type: 'warning' })
        emit('delete-group', { groupId: g.id })
    } catch {
        // ignore
    }
}

function onSaveMembers() {
    if (!props.active || !selectedGroupId.value) return
    emit('save-members', { groupId: selectedGroupId.value, memberIds: targetKeys.value })
}
</script>

<template>
    <el-dialog v-model="visible" title="分组管理" width="720px">
        <div class="group-manage">
            <div class="group-row">
                <el-input v-model="newGroupName" placeholder="新分组名称" class="group-name-input" :disabled="!active" />
                <el-button type="primary" :disabled="!active" @click="onAddGroup"><i-ep-plus /> 新建分组</el-button>
                <el-button type="success" plain :disabled="!active" @click="emit('open-import')">
                    <i-ep-upload /> 导入分组
                </el-button>
            </div>

            <div class="group-row">
                <el-select v-model="selectedGroupId" placeholder="选择要编辑的分组" class="group-select" :disabled="!active">
                    <el-option v-for="g in groupOptions" :key="g.id" :label="g.label" :value="g.id" />
                </el-select>
                <el-button type="danger" plain :disabled="!active || !selectedGroupId" @click="onRemoveGroup">
                    <i-ep-delete /> 删除该组
                </el-button>
            </div>

            <div v-if="selectedGroupId" class="transfer-wrap">
                <el-transfer v-model="targetKeys" :data="transferData" :titles="['未分组', '本组成员']" filterable v-loading="loading" />
                <div class="transfer-actions">
                    <el-button type="primary" :disabled="!active" @click="onSaveMembers"><i-ep-check /> 保存成员</el-button>
                </div>
            </div>

            <div v-else class="empty-group">请选择或新建一个分组后编辑成员</div>
        </div>
    </el-dialog>
</template>

<style scoped>
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
</style>
