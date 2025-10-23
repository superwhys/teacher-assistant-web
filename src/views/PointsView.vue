<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import { usePointsStore } from '@/stores/pointsStore'
import type { PointsItem } from '@/types/pointsItem'
import PointsItemManageDialog from '@/components/PointsItemManageDialog.vue'
import PointsItemSelectorDialog from '@/components/PointsItemSelectorDialog.vue'
import PointsImportExport from '@/components/PointsImportExport.vue'
import PointsItemsImport from '@/components/PointsItemsImport.vue'

const classStore = useClassStore()
const studentStore = useStudentStore()
const groupStore = useStudentGroupStore()
const pointsStore = usePointsStore()

const activeClass = computed(() => classStore.activeClass)
const activeClassId = computed({
    get: () => classStore.activeClassId,
    set: (val: string | null) => { if (val) classStore.setActiveClass(val) }
})

const studentsOfActive = computed(() => {
    const id = activeClassId.value
    return id ? studentStore.listByClassId(id) : []
})

const groupsOfActive = computed(() => {
    const id = activeClassId.value
    return id ? groupStore.listByClassId(id) : []
})

const pointsMap = computed(() => pointsStore.getPointsOf(activeClassId.value))

// 学生搜索
const studentKeyword = ref('')
const filteredStudents = computed(() => {
    const keyword = studentKeyword.value.trim().toLowerCase()
    const gid = selectedGroupId.value
    let list = studentsOfActive.value
    if (gid) {
        const g = groupsOfActive.value.find(x => x.id === gid)
        const nameSet = new Set(g?.members ?? [])
        list = list.filter(s => nameSet.has(s.studentName))
    }
    if (!keyword) return list
    return list.filter(s => s.studentName.toLowerCase().includes(keyword))
})

// 分值项选择弹窗
type SelectorTab = 'all' | 'plus' | 'minus'
const selectorVisible = ref(false)
const selectorTab = ref<SelectorTab>('plus')
const selectorTargets = ref<string[]>([])


function openSelectorForStudents(studentNames: string[], tab: SelectorTab) {
    selectorTargets.value = studentNames
    selectorTab.value = tab
    selectorVisible.value = true
}

function openSelectorForAll(tab: SelectorTab) {
    const names = filteredStudents.value.map(s => s.studentName)
    if (!activeClassId.value || names.length === 0) {
        ElMessage.info('没有可操作的学生')
        return
    }
    openSelectorForStudents(names, tab)
}

function onSelectItem(item: PointsItem) {
    if (!activeClassId.value) return
    const delta = item.sign === 'minus' ? -Math.abs(item.value) : Math.abs(item.value)
    pointsStore.addPoints(activeClassId.value, selectorTargets.value, delta, {
        itemId: item.id,
        itemName: item.name,
        itemSign: item.sign,
        itemValue: item.value,
    })
    selectorVisible.value = false
    const target = selectorTargets.value.length > 3
        ? `${selectorTargets.value.slice(0, 3).join('、')} 等${selectorTargets.value.length}人`
        : selectorTargets.value.join('、')
    ElMessage.success(`已对「${target}」${delta > 0 ? '加' : '减'}${Math.abs(delta)} 分（${item.name}）`)
}

// 分组操作
const selectedGroupId = ref<string | ''>('')
watch(activeClassId, () => {
    selectedGroupId.value = ''
})

// 撤回最近一次操作
function undoOnce() {
    if (!activeClassId.value) return
    const action = pointsStore.undoLast(activeClassId.value)
    if (!action) {
        ElMessage.info('没有可撤回的操作')
        return
    }
    const target = action.studentNames.length > 3
        ? `${action.studentNames.slice(0, 3).join('、')} 等${action.studentNames.length}人`
        : action.studentNames.join('、')
    ElMessage.success(`已撤回对「${target}」${action.delta > 0 ? '加' : '减'}${Math.abs(action.delta)} 分`)
}

// 分值项管理（新增分组与积分项）
const manageVisible = ref(false)

function openManageDialog() {
    manageVisible.value = true
}

</script>

<template>
    <div class="points-page">
        <div class="header-row">
            <div class="title">积分管理 <span v-if="activeClass">（{{ activeClass.name }}）</span></div>
            <div class="header-actions">
                <el-button type="primary" plain :disabled="!activeClassId" @click="openManageDialog">
                    <i-ep-setting /> 管理分值项
                </el-button>
                <PointsItemsImport :active-class-id="activeClassId" />
                <el-divider direction="vertical" />
                <el-button type="default" plain :disabled="!activeClassId" @click="$router.push('/points/history')">
                    <i-ep-document /> 积分记录
                </el-button>
                <PointsImportExport :active-class-id="activeClassId" :active-class-name="activeClass?.name || '未命名班级'" />
                <el-button type="warning" plain :disabled="!activeClassId" @click="undoOnce">
                    <i-ep-refresh-left /> 撤回
                </el-button>
            </div>
        </div>

        <div class="grid">
            <el-card shadow="never" class="right-card">
                <template #header>
                    <div class="list-header-row">
                        <div class="list-header">学生积分</div>
                        <div class="row-actions">
                            <el-button type="primary" plain :disabled="!activeClassId || filteredStudents.length === 0"
                                @click="openSelectorForAll('plus')">
                                <i-ep-plus /> 全体加分
                            </el-button>
                            <el-button type="danger" plain :disabled="!activeClassId || filteredStudents.length === 0"
                                @click="openSelectorForAll('minus')">
                                <i-ep-minus /> 全体扣分
                            </el-button>
                            <el-select v-model="selectedGroupId" placeholder="全部学生" class="group-filter"
                                :disabled="!activeClassId" clearable>
                                <el-option label="全部学生" value="" />
                                <el-option v-for="g in groupsOfActive" :key="g.id"
                                    :label="`${g.name}（${g.members.length}）`" :value="g.id" />
                            </el-select>
                            <el-input v-model="studentKeyword" class="search-input" placeholder="搜索学生姓名" clearable>
                                <template #prefix>
                                    <i-ep-search />
                                </template>
                            </el-input>
                        </div>
                    </div>
                </template>

                <div v-if="activeClass">
                    <div v-if="studentsOfActive.length > 0">
                        <div v-if="filteredStudents.length > 0" class="student-grid">
                            <div v-for="s in filteredStudents" :key="s.studentName" class="student-row">
                                <div :class="['avatar', s.gender]">
                                    <i-ep-male v-if="s.gender === 'male'" />
                                    <i-ep-female v-else />
                                </div>
                                <div class="info">
                                    <div class="name">{{ s.studentName }}</div>
                                    <div class="score">{{ pointsMap[s.studentName] ?? 0 }}</div>
                                </div>
                                <div class="ops">
                                    <el-button class="op" type="primary" plain size="small"
                                        @click="openSelectorForStudents([s.studentName], 'plus')"><i-ep-plus />
                                        加分</el-button>
                                    <el-button class="op" type="danger" plain size="small"
                                        @click="openSelectorForStudents([s.studentName], 'minus')"><i-ep-minus />
                                        扣分</el-button>
                                    <el-button class="op" type="default" plain size="small"
                                        @click="$router.push({ path: '/points/history', query: { q: s.studentName } })"><i-ep-document />
                                        记录</el-button>
                                </div>
                            </div>
                        </div>
                        <div v-else class="empty empty-students">
                            <i-ep-user class="empty-icon" />
                            <div class="empty-title">没有匹配的学生</div>
                            <div class="empty-sub">请修改搜索关键词</div>
                        </div>
                    </div>
                    <div v-else class="empty empty-students">
                        <i-ep-user class="empty-icon" />
                        <div class="empty-title">还没有学生</div>
                        <div class="empty-sub">请先在班级管理中添加学生</div>
                    </div>
                </div>
                <div v-else class="empty">
                    <i-ep-school class="empty-icon" />
                    <div class="empty-title">还没有班级</div>
                    <div class="empty-sub">请先创建一个班级</div>
                </div>
            </el-card>
        </div>

        <PointsItemSelectorDialog v-model="selectorVisible" v-model:tab="selectorTab" :active-class-id="activeClassId"
            @select="onSelectItem" />

        <PointsItemManageDialog v-model="manageVisible" :active-class-id="activeClassId" />
    </div>
</template>

<style scoped>
.points-page {
    width: 100%;
    height: 100%;
}

.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.title {
    font-size: 20px;
    font-weight: 700;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    height: calc(100% - 44px);
}


.left-card,
.right-card {
    border-radius: 16px;
}

.card-title {
    font-size: 18px;
    font-weight: 700;
}

.group-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.group-select {
    width: 100%;
}

.group-actions {
    display: flex;
    gap: 10px;
}

.selector-tabs {
    margin-bottom: 8px;
}

.item-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: 60vh;
    overflow: auto;
}

.group-block {
    border-top: 1px solid #f0f0f0;
    padding-top: 8px;
}

.group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    padding: 6px 2px;
}

.group-icon {
    font-size: 18px;
}

.items {
    display: flex;
    flex-direction: column;
}

.item-row {
    display: grid;
    grid-template-columns: 1fr auto 16px;
    align-items: center;
    padding: 10px 6px;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;
    border-radius: 8px;
}

.item-row:hover {
    background: rgba(0, 0, 0, 0.03);
}

.item-name {
    font-size: 15px;
}

.item-value {
    font-weight: 700;
}

.item-value.plus {
    color: #1db954;
}

.item-value.minus {
    color: #ef4444;
}

.item-arrow {
    color: #bbb;
}

.item-empty {
    color: #999;
    font-size: 13px;
    padding: 6px;
}

.manage-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
}

.manage-left,
.manage-right {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.manage-block {
    border-radius: 12px;
    padding: 12px;
    background: #fff;
}

.manage-title {
    font-weight: 700;
    margin-bottom: 10px;
}

.manage-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.icon-input {
    width: 120px;
}

.group-name-input {
    flex: 1;
}

.group-radio-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.manage-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 10px;
    border-radius: 999px;
    font-weight: 700;
    background: #f5f7ff;
    color: #2d5cf6;
}

.badge.minus {
    background: #fff2f2;
    color: #ef4444;
}

/* group list */
.group-list {
    border: 1px solid #e6e8f0;
    border-radius: 12px;
    overflow: hidden;
    max-height: 52vh;
    overflow-y: auto;
}

.group-list-header {
    padding: 10px 14px;
    font-weight: 700;
    background: #fafbff;
    border-bottom: 1px solid #eef0f6;
}

.group-item {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    cursor: pointer;
}

.group-item-main {
    display: flex;
    align-items: center;
    gap: 10px;
}

.group-item-ops {
    visibility: visible;
}

.group-item:hover {
    background: #fafafa;
}

.group-item.is-active {
    background: #edf5ff;
}

.group-item+.group-item {
    border-top: 1px solid #f2f2f2;
}

.group-name {
    font-size: 15px;
}

@media (max-width: 900px) {
    .manage-grid {
        grid-template-columns: 1fr;
    }
}

.list-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.list-header {
    font-size: 18px;
    font-weight: 700;
    white-space: nowrap;
}

.row-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.row-actions :deep(.el-button + .el-button) {
    margin-left: 0;
}

.search-input {
    width: 260px;
}

.group-filter {
    width: 220px;
}


.delta-label {
    color: #666;
    font-size: 13px;
}

/* 导入弹窗样式，与添加学生保持一致风格 */
.upload-file-name {
    margin-top: 4px;
    color: var(--el-text-color-regular);
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.upload-file-name .file-icon {
    font-size: 16px;
}

.upload-file-name .change-hint {
    color: var(--el-text-color-secondary);
}

.excel-guide {
    margin-top: 8px;
    color: var(--el-text-color-regular);
    font-size: 13px;
}

.guide-title {
    font-weight: 600;
    margin-bottom: 4px;
}

.guide-list {
    padding-left: 18px;
    margin: 0;
}

.excel-preview {
    margin-top: 12px;
    padding: 12px;
    border: 1px dashed var(--el-border-color);
    border-radius: 8px;
}

.preview-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 8px;
}

.preview-title {
    font-weight: 600;
}

.preview-meta {
    width: 100%;
}

.preview-actions {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.student-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
}

.student-row {
    display: grid;
    grid-template-columns: 40px 1fr;
    grid-template-rows: auto auto;
    align-items: start;
    gap: 10px;
    padding: 12px;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fff;
}

.avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 20px;
    box-shadow: var(--shadow-light);
}

.avatar.male {
    background: linear-gradient(135deg, #4f8df9, #6aa2ff);
}

.avatar.female {
    background: linear-gradient(135deg, #f975a8, #f9948a);
}

.info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.name {
    font-size: 16px;
    font-weight: 600;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.score {
    padding: 2px 8px;
    background: #f5f7ff;
    color: #2d5cf6;
    border-radius: 999px;
    font-weight: 700;
}

.ops {
    grid-column: 1 / -1;
    display: flex;
    gap: 14px;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e6e8f0;
}

.op {
    flex: 1;
    height: 40px;
    border-radius: 24px;
}

.op :deep(.el-icon) {
    margin-right: 4px;
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

@media (max-width: 1024px) {
    .grid {
        grid-template-columns: 1fr;
        height: auto;
    }
}

/* 提前在 930px 下收缩操作区为两行布局 */
@media (max-width: 930px) {
    .list-header-row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }
    .row-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 100%;
        gap: 8px;
    }
    .row-actions :deep(.el-button),
    .row-actions :deep(.el-select),
    .row-actions :deep(.el-input) {
        width: 100%;
    }
    .search-input {
        width: 100%;
    }
    .group-filter {
        width: 100%;
    }
}

@media (max-width: 600px) {
    .points-page {
        padding: 12px;
    }

    .header-row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }

    .header-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        width: 100%;
        gap: 8px;
    }

    .header-actions :deep(.el-button) {
        width: 100%;
    }

    .list-header-row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }

    .row-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 100%;
        gap: 8px;
    }

    .row-actions :deep(.el-button),
    .row-actions :deep(.el-select),
    .row-actions :deep(.el-input) {
        width: 100%;
    }

    .search-input {
        width: 100%;
    }

    .group-filter {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .student-row {
        grid-template-columns: 40px 1fr;
        grid-template-rows: auto auto;
        align-items: start;
    }

    .ops {
        grid-column: 1 / -1;
        display: flex;
        gap: 14px;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e6e8f0;
    }

    .op {
        flex: 1;
        height: 40px;
        border-radius: 24px;
    }
}
</style>
