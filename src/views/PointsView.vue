<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import { usePointsStore } from '@/stores/pointsStore'
import type { PointsItem } from '@/types/pointsItem'
import PointsItemSelectorDialog from '@/components/PointsItemSelectorDialog.vue'
import PointsHeaderActions from '@/components/PointsHeaderActions.vue'
import PointsRankingCard from '@/components/PointsRankingCard.vue'

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

const availablePointsMap = computed(() => {
    const map: Record<string, number> = {}
    const rawMap = pointsMap.value
    for (const name in rawMap) {
        const points = rawMap[name]
        if (points) {
            map[name] = points.available
        }
    }
    return map
})

const totalPointsMap = computed(() => {
    const map: Record<string, number> = {}
    const rawMap = pointsMap.value
    for (const name in rawMap) {
        const points = rawMap[name]
        if (points) {
            map[name] = points.total
        }
    }
    return map
})

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

</script>

<template>
    <div class="points-page">
        <div class="content-area">
            <div class="ranking-column">
                <PointsRankingCard 
                    :students="studentsOfActive" 
                    :points-map="totalPointsMap"
                    :max-display="10"
                />
            </div>
            
            <div class="list-column">
                <el-card shadow="never" class="list-card">
                    <template #header>
                        <div class="list-header">
                            <span v-if="activeClass" class="class-name">{{ activeClass.name }}</span>
                            <span v-else>学生积分</span>
                            <PointsHeaderActions 
                                :active-class-id="activeClassId" 
                                :active-class-name="activeClass?.name || '未命名班级'" 
                            />
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
                                        <div class="points-info">
                                            <div class="score available">{{ availablePointsMap[s.studentName] ?? 0 }}</div>
                                            <div class="score-label">可用</div>
                                            <div class="score total">{{ totalPointsMap[s.studentName] ?? 0 }}</div>
                                            <div class="score-label">总分</div>
                                        </div>
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
        </div>

        <div class="bottom-actions">
            <div class="filter-row">
                <el-select v-model="selectedGroupId" placeholder="全部学生" class="group-filter"
                    :disabled="!activeClassId" clearable size="large">
                    <el-option label="全部学生" value="" />
                    <el-option v-for="g in groupsOfActive" :key="g.id"
                        :label="`${g.name}（${g.members.length}）`" :value="g.id" />
                </el-select>
                <el-input v-model="studentKeyword" class="search-input" placeholder="搜索学生" clearable size="large">
                    <template #prefix>
                        <i-ep-search />
                    </template>
                </el-input>
            </div>

            <div class="main-actions-row">
                <el-button size="large" type="primary" class="action-btn" 
                    :disabled="!activeClassId || filteredStudents.length === 0"
                    @click="openSelectorForAll('plus')">
                    <template #icon>
                        <i-ep-plus />
                    </template>
                    全体加分
                </el-button>
                <el-button size="large" type="warning" plain class="undo-btn"
                    :disabled="!activeClassId" @click="undoOnce">
                    <template #icon>
                        <i-ep-refresh-left />
                    </template>
                    撤回
                </el-button>
                <el-button size="large" type="danger" class="action-btn"
                    :disabled="!activeClassId || filteredStudents.length === 0"
                    @click="openSelectorForAll('minus')">
                    <template #icon>
                        <i-ep-minus />
                    </template>
                    全体扣分
                </el-button>
            </div>
        </div>

        <PointsItemSelectorDialog v-model="selectorVisible" v-model:tab="selectorTab" :active-class-id="activeClassId"
            @select="onSelectItem" />
    </div>
</template>

<style scoped>
.points-page {
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
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 16px;
}

.ranking-column {
    height: 100%;
    overflow: hidden;
}

.list-column {
    height: 100%;
    overflow: hidden;
}

.list-card {
    height: 100%;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
}

.list-card :deep(.el-card__body) {
    flex: 1;
    overflow-y: auto;
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

.list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 18px;
    font-weight: 700;
}

.class-name {
    color: #333;
}

.bottom-actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
}

.filter-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.group-filter {
    flex: 1;
}

.search-input {
    flex: 1;
}

.main-actions-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
}

.action-btn {
    flex: 1;
    max-width: 280px;
    height: 56px;
    font-size: 18px;
    font-weight: 600;
    border-radius: 12px;
}

.undo-btn {
    width: 140px;
    height: 56px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
    flex-shrink: 0;
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
    flex-direction: column;
    gap: 8px;
    min-width: 0;
}

.name {
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.points-info {
    display: flex;
    align-items: center;
    gap: 6px;
}

.score {
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 14px;
}

.score.available {
    background: #f5f7ff;
    color: #2d5cf6;
}

.score.total {
    background: #fff7ed;
    color: #ea580c;
}

.score-label {
    font-size: 12px;
    color: #666;
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
    .content-area {
        grid-template-columns: 300px 1fr;
        gap: 12px;
    }
}

@media (max-width: 768px) {
    .content-area {
        grid-template-columns: 1fr;
        gap: 12px;
    }
    
    .ranking-column {
        max-height: 400px;
    }
    
    .bottom-actions {
        padding: 16px;
        gap: 10px;
    }

    .filter-row {
        gap: 8px;
    }

    .main-actions-row {
        gap: 10px;
    }

    .action-btn {
        max-width: 200px;
        height: 48px;
        font-size: 16px;
    }

    .undo-btn {
        width: 100px;
        height: 48px;
        font-size: 14px;
    }

    .student-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .filter-row {
        gap: 6px;
    }

    .group-filter {
        min-width: 0;
    }

    .search-input {
        min-width: 0;
    }

    .main-actions-row {
        gap: 8px;
    }

    .action-btn {
        flex: 1;
        max-width: none;
        height: 46px;
        font-size: 15px;
    }

    .undo-btn {
        width: 80px;
        height: 46px;
        font-size: 13px;
    }
}

@media (max-width: 480px) {
    .bottom-actions {
        padding: 12px;
    }

    .action-btn {
        height: 44px;
        font-size: 14px;
    }

    .undo-btn {
        width: 70px;
        height: 44px;
        font-size: 12px;
    }

    .student-row {
        grid-template-columns: 40px 1fr;
        grid-template-rows: auto auto;
        align-items: start;
    }

    .ops {
        grid-column: 1 / -1;
        display: flex;
        gap: 10px;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e6e8f0;
    }

    .op {
        flex: 1;
        height: 36px;
        border-radius: 24px;
        font-size: 13px;
    }
}
</style>
