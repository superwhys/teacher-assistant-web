<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import AddStudentDialog from '@/components/class/AddStudentDialog.vue'
import ClassStudentList, { type UiStudent, type UiGender } from '@/components/class/ClassStudentList.vue'
import ClassBottomActions from '@/components/class/ClassBottomActions.vue'
import GroupManageDialog, { type UiGroup } from '@/components/class/GroupManageDialog.vue'
import GroupImportDialog from '@/components/class/GroupImportDialog.vue'
import EditStudentDialog from '@/components/class/EditStudentDialog.vue'

import type { ApiGender, CreateStudentReq, StudentDTO, StudentGroupDTO, StudentsSortOption } from '@/types/student'
import type { ClassDTO } from '@/types/class'
import { classManager } from '@/managers/class'
import { studentManager } from '@/managers/student'
import { useCacheStore } from '@/stores/cacheStore'

defineOptions({ name: 'ClassView' })

type LayoutMode = 'card' | 'list'

const loading = ref(false)

const classes = ref<ClassDTO[]>([])
const cacheStore = useCacheStore()

const activeClassId = computed<number | null>(() => cacheStore.getActiveClassId())

const students = ref<StudentDTO[]>([])
const allStudents = ref<StudentDTO[]>([])
const groups = ref<StudentGroupDTO[]>([])

const layoutMode = computed<LayoutMode>({
    get: () => cacheStore.getClassLayout() ?? 'card',
    set: (val) => cacheStore.setClassLayout(val)
})

const sortBy = computed<StudentsSortOption>({
    get: () => cacheStore.getStudentsSort() ?? 'default',
    set: (val) => cacheStore.setStudentsSort(val)
})

const keyword = ref('')
const selectedGroupId = ref<number | null>(null)

const activeClass = computed(() => {
    if (!activeClassId.value) return null
    return classes.value.find(c => c.id === activeClassId.value) ?? null
})

function toUiGender(gender?: ApiGender): UiGender {
    if (gender === 2) return 'female'
    if (gender === 1) return 'male'
    return 'unknown'
}

const uiStudents = computed<UiStudent[]>(() => {
    return (students.value ?? [])
        .map((s) => ({
            id: s.id ?? 0,
            name: s.name ?? '',
            gender: toUiGender(s.gender),
        }))
        .filter(s => s.id > 0 && !!s.name)
})

const uiAllStudents = computed<UiStudent[]>(() => {
    return (allStudents.value ?? [])
        .map((s) => ({
            id: s.id ?? 0,
            name: s.name ?? '',
            gender: toUiGender(s.gender),
        }))
        .filter(s => s.id > 0 && !!s.name)
})

const uiGroups = computed<UiGroup[]>(() => {
    return (groups.value ?? [])
        .map((g) => ({
            id: g.id ?? 0,
            name: g.name ?? '',
            memberIds: (g.students ?? []).map(s => s.id ?? 0).filter(id => id > 0),
        }))
        .filter(g => g.id > 0 && !!g.name)
})

const groupOptions = computed(() => uiGroups.value.map(g => ({
    id: g.id,
    name: g.name,
})))

const filteredStudents = computed<UiStudent[]>(() => {
    let list = uiStudents.value

    const kw = keyword.value.trim().toLowerCase()
    if (kw) {
        list = list.filter(s => s.name.toLowerCase().includes(kw))
    }

    const sort = sortBy.value
    if (sort === 'default') return list

    const sorted = [...list]
    if (sort === 'name-asc') {
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    } else if (sort === 'name-desc') {
        sorted.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'))
    }
    return sorted
})

async function loadClasses() {
    try {
        classes.value = await classManager.list()
    } catch (err) {
        console.error(err)
    }
}

async function refresh() {
    if (!activeClassId.value) {
        students.value = []
        allStudents.value = []
        groups.value = []
        return
    }

    loading.value = true
    try {
        const clsId = activeClassId.value
        const [all, grp] = await Promise.all([
            studentManager.list(clsId),
            studentManager.listGroups(clsId),
        ])
        allStudents.value = all
        groups.value = grp
        await refreshStudentsList()
    } catch (err) {
        console.error(err)
    } finally {
        loading.value = false
    }
}

let lastStudentsReqId = 0
async function refreshStudentsList() {
    if (!activeClassId.value) {
        students.value = []
        return
    }
    const reqId = ++lastStudentsReqId
    try {
        const clsId = activeClassId.value
        const groupId = selectedGroupId.value ?? undefined
        const list = await studentManager.list(clsId, groupId)
        if (reqId !== lastStudentsReqId) return
        students.value = list
    } catch (err) {
        console.error(err)
        if (reqId !== lastStudentsReqId) return
        students.value = []
    }
}

watch(activeClassId, async () => {
    selectedGroupId.value = null
    keyword.value = ''
    await refresh()
})

watch(selectedGroupId, async () => {
    keyword.value = ''
    await refreshStudentsList()
})

onMounted(async () => {
    await loadClasses()
    await refresh()
})

const addStudentDialogVisible = ref(false)
const groupManageVisible = ref(false)
const groupImportVisible = ref(false)
const editStudentVisible = ref(false)

const editingStudent = ref<UiStudent | null>(null)

function openEdit(student: UiStudent) {
    editingStudent.value = student
    editStudentVisible.value = true
}

async function removeStudent(student: UiStudent) {
    if (!activeClassId.value) return
    try {
        await ElMessageBox.confirm(`确定删除学生「${student.name}」吗？`, '删除确认', {
            type: 'warning',
            confirmButtonText: '删除',
            cancelButtonText: '取消',
        })
        await studentManager.delete(student.id)
        ElMessage.success('已删除')
        await refresh()
    } catch (err) {
        if (err) ElMessage.error('删除失败')
    }
}

async function handleAddSingle(payload: { name: string, gender: ApiGender }) {
    if (!activeClassId.value) {
        ElMessage.error('请先选择班级')
        return
    }
    try {
        await studentManager.create(activeClassId.value, payload.name, payload.gender)
        ElMessage.success('已添加学生')
        await refresh()
    } catch {
        ElMessage.error('添加学生失败')
    }
}

async function handleAddBatch(payload: { students: CreateStudentReq[] }) {
    if (!activeClassId.value) {
        ElMessage.error('请先选择班级')
        return
    }
    try {
        await studentManager.createBatch(activeClassId.value, payload.students)
        ElMessage.success('已批量添加')
        await refresh()
    } catch {
        ElMessage.error('批量添加学生失败')
    }
}

async function handleAddExcel(payload: { students: CreateStudentReq[] }) {
    return handleAddBatch(payload)
}

async function handleSaveStudentEdit(payload: { id: number, name: string, gender: ApiGender }) {
    if (!activeClassId.value) return
    try {
        await studentManager.update(payload.id, payload.name, payload.gender)
        ElMessage.success('已保存')
        editStudentVisible.value = false
        editingStudent.value = null
        await refresh()
    } catch {
        ElMessage.error('保存失败')
    }
}

async function handleCreateGroup(payload: { name: string }) {
    if (!activeClassId.value) return
    try {
        await studentManager.createGroup(activeClassId.value, payload.name)
        ElMessage.success('已创建分组')
        await refresh()
    } catch {
        ElMessage.error('创建分组失败')
    }
}

async function handleDeleteGroup(payload: { groupId: number }) {
    try {
        await studentManager.deleteGroup(payload.groupId)
        ElMessage.success('已删除分组')
        await refresh()
    } catch {
        ElMessage.error('删除分组失败')
    }
}

async function applyGroupMembers(groupId: number, targetMemberIds: number[]) {
    if (!activeClassId.value) return
    const currentStudents = await studentManager.list(activeClassId.value, groupId)
    const currentIds = (currentStudents ?? []).map(s => s.id ?? 0).filter(id => id > 0)
    const current = new Set(currentIds)
    const target = new Set(targetMemberIds.filter(id => id > 0))

    const toAdd: number[] = []
    const toRemove: number[] = []

    target.forEach(id => { if (!current.has(id)) toAdd.push(id) })
    current.forEach(id => { if (!target.has(id)) toRemove.push(id) })

    if (toAdd.length > 0) await studentManager.addStudentsToGroup(groupId, toAdd)
    if (toRemove.length > 0) await studentManager.removeStudentsFromGroup(groupId, toRemove)
}

async function handleSaveGroupMembers(payload: { groupId: number, memberIds: number[] }) {
    try {
        await applyGroupMembers(payload.groupId, payload.memberIds)
        ElMessage.success('已保存分组成员')
        await refresh()
    } catch {
        ElMessage.error('保存分组成员失败')
    }
}

async function handleConfirmGroupImport(payload: { groups: Array<{ groupName: string, memberNames: string[] }> }) {
    if (!activeClassId.value) return

    const nameToId = new Map<string, number>()
    uiAllStudents.value.forEach(s => nameToId.set(s.name, s.id))

    try {
        for (const g of payload.groups) {
            const memberIds = g.memberNames.map(n => nameToId.get(n) ?? 0).filter(id => id > 0)
            if (memberIds.length === 0) continue

            const existing = uiGroups.value.find(x => x.name === g.groupName)
            if (existing) {
                await applyGroupMembers(existing.id, memberIds)
            } else {
                const created = await studentManager.createGroup(activeClassId.value, g.groupName)
                if (created?.id) {
                    await studentManager.addStudentsToGroup(created.id, memberIds)
                }
            }
        }
        ElMessage.success('分组导入完成')
        await refresh()
    } catch {
        ElMessage.error('分组导入失败')
    }
}
</script>

<template>
    <div class="class-page">
        <div class="content-area">
            <ClassStudentList
                :active="!!activeClassId"
                :class-name="activeClass?.name || ''"
                :students="filteredStudents"
                :layout-mode="layoutMode"
                :loading="loading"
                @update:layout-mode="layoutMode = $event"
                @edit="openEdit"
                @remove="removeStudent"
            />
        </div>

        <ClassBottomActions
            :active="!!activeClassId"
            :groups="groupOptions"
            :selected-group-id="selectedGroupId"
            :sort-by="sortBy"
            :keyword="keyword"
            @update:selected-group-id="selectedGroupId = $event"
            @update:sort-by="sortBy = $event"
            @update:keyword="keyword = $event"
            @open-add-student="addStudentDialogVisible = true"
            @open-group-manage="groupManageVisible = true"
        />
    </div>

    <AddStudentDialog
        v-model="addStudentDialogVisible"
        :disabled="!activeClassId"
        @add-single="handleAddSingle"
        @add-batch="handleAddBatch"
        @add-excel="handleAddExcel"
    />

    <GroupManageDialog
        v-model="groupManageVisible"
        :active="!!activeClassId"
        :class-id="activeClassId"
        :groups="uiGroups"
        @create-group="handleCreateGroup"
        @delete-group="handleDeleteGroup"
        @save-members="handleSaveGroupMembers"
        @open-import="groupImportVisible = true"
    />

    <GroupImportDialog
        v-model="groupImportVisible"
        :active="!!activeClassId"
        :students="uiAllStudents"
        :groups="uiGroups"
        @confirm="handleConfirmGroupImport"
    />

    <EditStudentDialog v-model="editStudentVisible" :student="editingStudent" @save="handleSaveStudentEdit" />
</template>

<style scoped>
.class-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
}

.content-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
</style>
