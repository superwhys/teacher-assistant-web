<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import StudentCard from '@/components/StudentCard.vue'
import ClassManageCard from '@/components/ClassManageCard.vue'
import ClassPeopleStatCard from '@/components/ClassPeopleStatCard.vue'
import AddStudentCard from '@/components/AddStudentCard.vue'

const classStore = useClassStore()

const activeClass = computed(() => classStore.activeClass)
const activeClassId = computed({
    get: () => classStore.activeClassId,
    set: (val: string | null) => { if (val) classStore.setActiveClass(val) }
})
const studentStore = useStudentStore()
const groupStore = useStudentGroupStore()
const studentsOfActive = computed(() => {
    const id = activeClassId.value
    return id ? studentStore.listByClassId(id) : []
})


async function onRemoveStudent(name: string) {
    try {
        await ElMessageBox.confirm(`确定删除学生「${name}」吗？`, '删除确认', {
            type: 'warning',
            confirmButtonText: '删除',
            cancelButtonText: '取消',
        })
        if (!activeClassId.value) return
        studentStore.removeStudent(activeClassId.value, name)
        groupStore.removeStudentFromAll(activeClassId.value, name)
        ElMessage.success('已删除')
    } catch (e) {
        // 用户取消
    }
}

// 分组管理
const groupDialogVisible = ref(false)
const newGroupName = ref('')
const selectedGroupId = ref<string | null>(null)
const groupsOfActive = computed(() => activeClassId.value ? groupStore.listByClassId(activeClassId.value) : [])

const transferData = computed(() =>
    studentsOfActive.value.map(s => ({ key: s.studentName, label: s.studentName }))
)
const targetKeys = ref<string[]>([])

// 学生名单分组筛选
const selectedGroupFilter = ref<string>('') // 空代表全部
const filteredStudents = computed(() => {
    if (!activeClassId.value) return []
    if (!selectedGroupFilter.value) return studentsOfActive.value
    const g = groupsOfActive.value.find(x => x.id === selectedGroupFilter.value)
    if (!g) return studentsOfActive.value
    const memberSet = new Set(g.members)
    return studentsOfActive.value.filter(s => memberSet.has(s.studentName))
})

watch(selectedGroupId, (gid) => {
    if (!gid || !activeClassId.value) {
        targetKeys.value = []
        return
    }
    const g = groupsOfActive.value.find(x => x.id === gid)
    targetKeys.value = g ? [...g.members] : []
})

watch(groupDialogVisible, (visible) => {
    if (visible) {
        // 初次打开选择第一个分组
        selectedGroupId.value = groupsOfActive.value[0]?.id ?? null
    }
})

watch(activeClassId, () => {
    // 切换班级时重置筛选
    selectedGroupFilter.value = ''
})

watch(groupsOfActive, (gs) => {
    // 如果当前选中的分组被删除，则回退为全部
    if (selectedGroupFilter.value && !gs.some(g => g.id === selectedGroupFilter.value)) {
        selectedGroupFilter.value = ''
    }
})

function onAddGroup() {
    const name = newGroupName.value.trim()
    if (!name) {
        ElMessage.error('请输入分组名称')
        return
    }
    if (!activeClassId.value) return
    const g = groupStore.addGroup(activeClassId.value, name)
    newGroupName.value = ''
    selectedGroupId.value = g.id
    targetKeys.value = []
    ElMessage.success('已创建分组')
}

async function onRemoveGroup() {
    if (!activeClassId.value || !selectedGroupId.value) return
    const g = groupsOfActive.value.find(x => x.id === selectedGroupId.value)
    if (!g) return
    try {
        await ElMessageBox.confirm(`确定删除分组「${g.name}」吗？`, '删除确认', { type: 'warning' })
        groupStore.removeGroup(activeClassId.value, g.id)
        selectedGroupId.value = groupsOfActive.value[0]?.id ?? null
        ElMessage.success('已删除分组')
    } catch { }
}

function onSaveMembers() {
    if (!activeClassId.value || !selectedGroupId.value) return
    groupStore.setGroupMembers(activeClassId.value, selectedGroupId.value, targetKeys.value)
    ElMessage.success('已保存分组成员')
}

// 学生编辑
const editDialogVisible = ref(false)
const editOriginalName = ref('')
const editName = ref('')
const editGender = ref<'male' | 'female'>('male')

function onEditStudent(s: { studentName: string, gender: 'male' | 'female' }) {
    editOriginalName.value = s.studentName
    editName.value = s.studentName
    editGender.value = s.gender
    editDialogVisible.value = true
}

function onSaveStudentEdit() {
    if (!activeClassId.value) return
    const name = editName.value.trim()
    if (!name) {
        ElMessage.error('请输入学生姓名')
        return
    }
    const list = studentsOfActive.value
    const isRenaming = name !== editOriginalName.value
    if (isRenaming && list.some(s => s.studentName === name)) {
        ElMessage.error('该姓名已存在')
        return
    }
    studentStore.updateStudent(activeClassId.value, editOriginalName.value, { studentName: name, gender: editGender.value })
    if (isRenaming) {
        groupStore.renameStudentInAll(activeClassId.value, editOriginalName.value, name)
    }
    ElMessage.success('已保存')
    editDialogVisible.value = false
}
</script>

<template>
    <div class="class-page">
        <div class="grid">
            <div class="left">
                <ClassManageCard />
                <ClassPeopleStatCard />
                <AddStudentCard />
            </div>

            <div class="right">
                <el-card shadow="never" class="list-card">
                    <template #header>
                        <div class="list-header-row">
                            <div class="list-header">学生名单 <span v-if="activeClass">（{{ activeClass.name }}）</span></div>
                            <div class="header-actions">
                                <el-select v-model="selectedGroupFilter" size="large" placeholder="选择分组"
                                    class="group-filter" :disabled="!activeClassId">
                                    <el-option label="全部学生" value="" />
                                    <el-option v-for="g in groupsOfActive" :key="g.id" :label="g.name" :value="g.id" />
                                </el-select>
                                <el-button size="large" type="primary" plain :disabled="!activeClassId"
                                    @click="groupDialogVisible = true">
                                    <i-ep-user /> 分组管理
                                </el-button>
                            </div>
                        </div>
                    </template>

                    <div v-if="activeClass">
                        <div v-if="filteredStudents.length > 0" class="student-grid">
                            <StudentCard v-for="s in filteredStudents" :key="s.studentName" :student="s"
                                @remove="onRemoveStudent" @edit="onEditStudent" />
                        </div>
                        <div v-else class="empty empty-students">
                            <i-ep-user class="empty-icon" />
                            <div class="empty-title">{{ selectedGroupFilter ? '该分组暂无成员' : '还没有学生' }}</div>
                            <div class="empty-sub">
                                {{ selectedGroupFilter ? '可在分组管理中添加成员，或清除筛选查看全部学生' : '请在左侧添加学生，或导入 Excel' }}
                            </div>
                        </div>
                    </div>
                    <div v-else class="empty">
                        <i-ep-school class="empty-icon" />
                        <div class="empty-title">还没有班级</div>
                        <div class="empty-sub">请在左侧创建一个班级后开始管理学生</div>
                    </div>
                </el-card>
            </div>
        </div>
    </div>

    <el-dialog v-model="groupDialogVisible" title="分组管理" width="720px">
        <div class="group-manage">
            <div class="group-row">
                <el-input v-model="newGroupName" placeholder="新分组名称" class="group-name-input" />
                <el-button type="primary" @click="onAddGroup"><i-ep-plus /> 新建分组</el-button>
            </div>

            <div class="group-row">
                <el-select v-model="selectedGroupId" placeholder="选择要编辑的分组" class="group-select">
                    <el-option v-for="g in groupsOfActive" :key="g.id" :label="`${g.name}（${g.members.length}）`"
                        :value="g.id" />
                </el-select>
                <el-button type="danger" plain :disabled="!selectedGroupId" @click="onRemoveGroup">
                    <i-ep-delete /> 删除该组
                </el-button>
            </div>

            <div v-if="selectedGroupId" class="transfer-wrap">
                <el-transfer v-model="targetKeys" :data="transferData" :titles="['未分配', '本组成员']" filterable />
                <div class="transfer-actions">
                    <el-button type="primary" @click="onSaveMembers"><i-ep-check /> 保存成员</el-button>
                </div>
            </div>

            <div v-else class="empty-group">请选择或新建一个分组后编辑成员</div>
        </div>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="编辑学生" width="400px">
        <el-form label-position="top">
            <el-form-item label="姓名">
                <el-input v-model="editName" placeholder="请输入学生姓名" />
            </el-form-item>
            <el-form-item label="性别">
                <el-radio-group v-model="editGender">
                    <el-radio-button label="male">男</el-radio-button>
                    <el-radio-button label="female">女</el-radio-button>
                </el-radio-group>
            </el-form-item>
        </el-form>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="editDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="onSaveStudentEdit">保存</el-button>
            </span>
        </template>
    </el-dialog>

</template>

<style scoped>
.class-page {
    width: 100%;
    height: 100%;
}

.grid {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 20px;
}

.left {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.class-card {
    border-radius: 16px;
}

.class-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.class-title {
    font-size: 18px;
    font-weight: 700;
}

.class-manage {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
}

.current-class {
    flex: 1;
    min-width: 0;
    color: #666666;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.class-select {
    flex: 1;
}

.class-name {
    color: #333333;
    font-weight: 600;
}

.class-actions {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
}

.stat-card {
    border-radius: 16px;
}

.stat {
    display: flex;
    align-items: center;
    gap: 16px;
}

.stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    background: #f2f2f3;
}

.stat-content {
    display: flex;
    flex-direction: column;
}

.stat-label {
    color: #666;
}

.stat-value {
    margin-top: 4px;
    font-size: 32px;
    font-weight: 700;
}

.stat-people {
    background: linear-gradient(180deg, #eef6ff, #ffffff);
}

.stat-attendance {
    background: linear-gradient(180deg, #edf9f1, #ffffff);
}

.stat-score {
    background: linear-gradient(180deg, #f5edff, #ffffff);
}

.positive {
    color: #1db954;
}

.info {
    color: #3b82f6;
}

.add-card {
    border-radius: 16px;
}

.form-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
}

.add-form :deep(.el-form-item) {
    margin-bottom: 12px;
}

.add-btn {
    width: 100%;
}

.btn-icon {
    margin-right: 6px;
}

.right {
    min-width: 0;
}

.list-card {
    height: 100%;
    border-radius: 16px;
}

.list-header {
    font-size: 20px;
    font-weight: 700;
}

.list-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.group-filter {
    width: 220px;
}

.student-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
}

.student-card {
    position: relative;
    padding: 16px 12px;
    border: 1px solid #eee;
    border-radius: 14px;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.student-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 22px;
    box-shadow: var(--shadow-light);
}

.student-avatar.male {
    background: linear-gradient(135deg, #4f8df9, #6aa2ff);
}

.student-avatar.female {
    background: linear-gradient(135deg, #f975a8, #f9948a);
}

.student-info {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.student-name {
    font-size: 18px;
    font-weight: 600;
}


.delete-btn {
    color: #999;
    font-size: 18px;
    position: absolute;
    right: 8px;
    top: 8px;
    padding: 0;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: transparent;
}

.delete-btn:hover {
    background: rgba(0, 0, 0, 0.06);
}

.empty {
    padding: 48px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #888;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 8px;
    color: #c6c6c6;
}

.empty-students {
    padding: 64px 12px;
}

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

@media (max-width: 1024px) {
    .grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 600px) {
    .class-page {
        padding: 12px;
    }

    .student-item {
        padding: 12px;
    }

    .stat-value {
        font-size: 26px;
    }

    .list-header-row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }

    .list-header {
        font-size: 18px;
        line-height: 1.25;
        word-break: break-word;
    }

    .header-actions {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }

    .group-filter {
        width: 100%;
    }

    .header-actions .el-button {
        width: 100%;
    }

    .student-grid {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 12px;
    }
}
</style>
