<template>
    <div class="students-view">
        <section class="panel-surface control-panel">
            <div class="control-toolbar">
                <label class="control-block control-block--search">
                    <span class="control-label">快速搜索</span>
                    <div class="search-box">
                        <i-ep-search class="search-box__icon" />
                        <input v-model="keyword" type="search" class="search-box__input"
                            placeholder="支持姓名、拼音首字母；可用逗号隔开">
                    </div>
                </label>

                <div class="control-actions">
                    <div class="control-block">
                        <span class="control-label">展示方式</span>
                        <div class="segmented-control">
                            <button type="button" class="chip-button" :class="{ 'is-active': layoutMode === 'card' }"
                                @click="layoutMode = 'card'">
                                <i-ep-grid aria-hidden="true" />
                                卡片视图
                            </button>
                            <button type="button" class="chip-button" :class="{ 'is-active': layoutMode === 'list' }"
                                @click="layoutMode = 'list'">
                                <i-ep-list aria-hidden="true" />
                                列表视图
                            </button>
                            <button type="button" class="chip-button" :class="{ 'is-active': layoutMode === 'group' }"
                                @click="layoutMode = 'group'">
                                <i-ep-user-filled aria-hidden="true" />
                                分组卡片
                            </button>
                        </div>
                    </div>

                    <div class="control-block">
                        <span class="control-label">排序方式</span>
                        <div class="segmented-control sort-control">
                            <button type="button" class="chip-button" :class="{ 'is-active': isSortFieldActive('points') }"
                                @click="handleSelectSortField('points')">
                                按积分
                            </button>
                            <button type="button" class="chip-button" :class="{ 'is-active': isSortFieldActive('name') }"
                                @click="handleSelectSortField('name')">
                                按姓名
                            </button>
                            <span class="sort-divider" aria-hidden="true" />
                            <button type="button" class="chip-button" :class="{ 'is-active': isSortDescending }"
                                @click="toggleSortDirection">
                                倒序
                            </button>
                        </div>
                    </div>

                    <div class="control-block">
                        <span class="control-label">分组入口</span>
                        <div class="toolbar-row">
                            <button type="button" class="ghost-button ghost-button--small" :disabled="!hasActiveClass"
                                @click="openGroupManageDialog">
                                管理分组
                            </button>
                            <button type="button" class="ghost-button ghost-button--small" :disabled="!hasActiveClass"
                                @click="openGroupImportDialog">
                                <i-ep-upload-filled aria-hidden="true" />
                                Excel 导入分组
                            </button>
                        </div>
                    </div>

                    <div class="control-block">
                        <span class="control-label">学生操作</span>
                        <div class="toolbar-row">
                            <button type="button" class="primary-button primary-button--small" :disabled="!hasActiveClass"
                                @click="openAddStudentDialog('single')">
                                <i-ep-plus />
                                <span>添加学生</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="group-filter">
                <span class="control-label">筛选分组</span>
                <div class="group-chip-row">
                    <button type="button" class="chip-button group-chip" :class="{ 'is-active': selectedGroupId === null }"
                        @click="handleSelectGroup(null)">
                        全部学生
                        <span>{{ studentCards.length }}</span>
                    </button>
                    <button v-for="group in groupChips" :key="group.id" type="button" class="chip-button group-chip"
                        :class="{ 'is-active': selectedGroupId === group.id }" @click="handleSelectGroup(group.id)">
                        {{ group.name }}
                        <span>{{ group.count }}</span>
                    </button>
                </div>
            </div>
        </section>

        <div v-if="isArchivedSemester" class="students-view__notice">
            <i-ep-warning-filled class="students-view__notice-icon" />
            <span>当前为归档学期，可继续查看学生与分组信息，积分相关操作暂不可用。</span>
        </div>

        <section class="students-layout">
            <StudentsListPanel class="student-panel" :has-active-class="hasActiveClass"
                :groups="visibleGroupChips" :is-all-selected="isAllFilteredStudentsSelected" :layout-mode="layoutMode"
                :loading="loading" :multi-select-enabled="multiSelectEnabled" :selected-student-ids="selectedStudentIds"
                :sort-by="sortBy" :students="filteredStudents" @edit-student="openEdit"
                @remove-student="requestRemoveStudent" @select-student="handleSelectStudent"
                @toggle-group-selection="handleToggleGroupSelection" @toggle-multi-select="toggleMultiSelectEnabled"
                @toggle-select-all="toggleSelectAllStudents" />

            <aside class="side-column">
                <StudentsSelectionPanel :class-id="activeClassId" :is-archived-semester="isArchivedSemester"
                    :points-applying="pointsApplying" :selected-student="selectedStudent"
                    :selected-students="selectedStudents" :status-label="selectionStatusLabel"
                    :title="selectedPanelTitle" @locate-student="handleLocateStudent"
                    @clear-selected-students="handleClearSelectedStudents" @open-points="openPointsSelectorForSelected"
                    @remove-selected-student="handleRemoveSelectedStudent" />
            </aside>
        </section>

        <StudentsAddDialog v-model="addStudentDialogVisible" :default-mode="addStudentDialogMode"
            :disabled="!hasActiveClass" @add-single="handleAddSingle" @add-batch="handleAddBatch"
            @add-excel="handleAddExcel" />

        <StudentsGroupManageDialog v-model="groupManageVisible" :active="hasActiveClass" :class-id="activeClassId"
            :groups="uiGroups" @create-group="handleCreateGroup" @delete-group="handleDeleteGroup"
            @save-members="handleSaveGroupMembers" @open-import="groupImportVisible = true" />

        <StudentsGroupImportDialog v-model="groupImportVisible" :active="hasActiveClass" :students="uiAllStudents"
            :groups="uiGroups" @confirm="handleConfirmGroupImport" />

        <StudentsEditDialog v-model="editStudentVisible" :student="editingStudent" @save="handleSaveStudentEdit" />

        <StudentsConfirmDialog v-model="deleteStudentDialogVisible" title="删除学生" eyebrow="风险操作"
            description="删除学生后将同步移除其相关分组关系，请确认当前操作。" :message="deleteStudentMessage" confirm-text="确认删除"
            @confirm="confirmRemoveStudent" />

        <StudentsPointsRuleDialog v-model="selectorVisible" v-model:tab="selectorTab" :groups="ruleGroups"
            :loading="pointsApplying || ruleGroupsLoading" @select="handleSelectRule" />
    </div>
</template>

<script setup lang="ts">
import type { UiGender, UiStudent } from "@/components/class/ClassStudentList.vue";
import { pointsManager } from "@/managers/points";
import { studentManager } from "@/managers/student";
import { useCacheStore } from "@/stores/cacheStore";
import type { RuleGroup } from "@/types/points";
import type {
    ApiGender,
    CreateStudentReq,
    StudentDTO,
    StudentGroupDTO,
    StudentsSortOption
} from "@/types/student";
import { ElMessage } from "element-plus";
import { pinyin } from "pinyin-pro";
import StudentsAddDialog, { type StudentAddMode } from "@/v3/components/students/StudentsAddDialog.vue";
import StudentsConfirmDialog from "@/v3/components/students/StudentsConfirmDialog.vue";
import StudentsEditDialog from "@/v3/components/students/StudentsEditDialog.vue";
import StudentsGroupImportDialog from "@/v3/components/students/StudentsGroupImportDialog.vue";
import StudentsGroupManageDialog, { type UiGroup } from "@/v3/components/students/StudentsGroupManageDialog.vue";
import StudentsListPanel, {
    type StudentsListPanelItem,
    type StudentsListPanelLayoutMode
} from "@/v3/components/students/StudentsListPanel.vue";
import StudentsPointsRuleDialog from "@/v3/components/students/StudentsPointsRuleDialog.vue";
import StudentsSelectionPanel from "@/v3/components/students/StudentsSelectionPanel.vue";
import { computed, nextTick, ref, watch } from "vue";

/** 定义学生页展示布局模式。 */
type LayoutMode = StudentsListPanelLayoutMode

/** 定义分组筛选标签结构。 */
interface GroupChipItem {
    id: number
    name: string
    count: number
}

/** 定义学生卡片展示结构。 */
type StudentCardItem = StudentsListPanelItem

/** 定义积分规则选择弹窗页签。 */
type PointsSelectorTab = "all" | "plus" | "minus"

/** 定义学生搜索索引结构。 */
interface StudentSearchIndexItem {
    groupNameLower: string
    initialsLower: string
    nameLower: string
    tagsLower: string
}

const cacheStore = useCacheStore()
const loading = ref(false)
const students = ref<StudentDTO[]>([])
const groups = ref<StudentGroupDTO[]>([])
const keyword = ref("")
const selectedGroupId = ref<number | null>(null)
const selectedStudentIds = ref<number[]>([])
const multiSelectEnabled = ref(false)
const studentSearchIndexMap = ref<Map<number, StudentSearchIndexItem>>(new Map())
const addStudentDialogVisible = ref(false)
const addStudentDialogMode = ref<StudentAddMode>("single")
const groupManageVisible = ref(false)
const groupImportVisible = ref(false)
const editStudentVisible = ref(false)
const deleteStudentDialogVisible = ref(false)
const editingStudent = ref<UiStudent | null>(null)
const pendingDeleteStudent = ref<StudentCardItem | null>(null)
const ruleGroups = ref<RuleGroup[]>([])
const selectorVisible = ref(false)
const selectorTab = ref<PointsSelectorTab>("plus")
const selectorTargets = ref<number[]>([])
const pointsApplying = ref(false)
const ruleGroupsLoading = ref(false)

const activeClassId = computed<number | null>(() => cacheStore.getActiveClassId())
const hasActiveClass = computed<boolean>(() => typeof activeClassId.value === "number")
const activeSemesterStatus = computed<number | null>(() => cacheStore.getActiveSemesterStatus())
const isArchivedSemester = computed<boolean>(() => hasActiveClass.value && activeSemesterStatus.value === 2)

/** 返回当前学生页的布局缓存值。 */
const layoutMode = computed<LayoutMode>({
    get: () => cacheStore.getClassLayout() ?? "card",
    set: (value) => cacheStore.setClassLayout(value)
})

/** 返回当前学生页的排序缓存值。 */
const sortBy = computed<StudentsSortOption>({
    get: () => cacheStore.getStudentsSort() ?? "points-desc",
    set: (value) => cacheStore.setStudentsSort(value)
})

/** 返回当前激活的排序字段。 */
const activeSortField = computed<"points" | "name">(() => {
    if (sortBy.value === "name-asc" || sortBy.value === "name-desc") {
        return "name"
    }

    return "points"
})

/** 返回当前是否为倒序排序。 */
const isSortDescending = computed<boolean>(() => {
    return sortBy.value === "name-desc" || sortBy.value === "points-desc"
})

/** 判断指定排序字段是否处于激活状态。 */
function isSortFieldActive(field: "points" | "name"): boolean {
    return activeSortField.value === field
}

/** 切换当前排序字段，并默认使用正序。 */
function handleSelectSortField(field: "points" | "name"): void {
    sortBy.value = field === "name" ? "name-asc" : "points-asc"
}

/** 切换当前排序方向。 */
function toggleSortDirection(): void {
    if (activeSortField.value === "name") {
        sortBy.value = isSortDescending.value ? "name-asc" : "name-desc"
        return
    }

    sortBy.value = isSortDescending.value ? "points-asc" : "points-desc"
}

/** 将后端性别枚举转换为前端展示性别。 */
function toUiGender(gender?: ApiGender): UiGender {
    if (gender === 2) {
        return "female"
    }

    if (gender === 1) {
        return "male"
    }

    return "unknown"
}

/** 返回指定学生的分组信息。 */
function getGroupInfo(student: StudentDTO): { groupId: number | null, groupName: string } {
    const studentId = typeof student.id === "number" ? student.id : 0

    for (const group of groups.value) {
        const memberExists = (group.students ?? []).some((item) => item.id === studentId)
        if (memberExists) {
            return {
                groupId: typeof group.id === "number" ? group.id : null,
                groupName: group.name?.trim() || "未命名分组"
            }
        }
    }

    const rawGroupId = typeof student.group_id === "number" ? student.group_id : null
    const matchedGroup = groups.value.find((item) => item.id === rawGroupId)
    if (matchedGroup) {
        return {
            groupId: rawGroupId,
            groupName: matchedGroup.name?.trim() || "未命名分组"
        }
    }

    return {
        groupId: null,
        groupName: "未分组"
    }
}

/** 返回学生姓名的首字展示。 */
function getStudentInitials(name?: string): string {
    const safeName = name?.trim() || "生"
    return safeName.slice(0, 1)
}

/** 返回学生姓名的拼音首字母串。 */
function getStudentPinyinInitials(name?: string): string {
    const safeName = name?.trim() || ""
    if (!safeName) {
        return ""
    }

    try {
        return pinyin(safeName, {
            pattern: "first",
            toneType: "none",
            type: "string"
        }).replace(/\s+/g, "").toLowerCase()
    } catch {
        return ""
    }
}

/** 返回学生姓名对应的姓氏字符。 */
function getStudentSurname(name?: string): string {
    const safeName = name?.trim() || ""
    if (!safeName) {
        return "#"
    }

    return safeName.charAt(0) || "#"
}

/** 返回姓氏用于排序的拼音键。 */
function getStudentSurnameSortKey(surname: string): string {
    const safeSurname = surname.trim()
    if (!safeSurname || safeSurname === "#") {
        return "#"
    }

    if (/[a-zA-Z]/.test(safeSurname)) {
        return safeSurname.toLowerCase()
    }

    try {
        return pinyin(safeSurname, {
            toneType: "none",
            type: "string"
        }).replace(/\s+/g, "").toLowerCase() || "#"
    } catch {
        return "#"
    }
}

/** 返回学生的标签集合。 */
function getStudentTags(student: StudentDTO, groupName: string): string[] {
    const tags = new Set<string>()
    const availablePoints = typeof student.available_points === "number" ? student.available_points : 0
    const totalPoints = typeof student.total_points === "number" ? student.total_points : 0

    if (groupName === "未分组") {
        tags.add("待分组")
    }

    if (availablePoints >= 120) {
        tags.add("高积分")
    } else if (availablePoints >= 90) {
        tags.add("可兑换")
    } else {
        tags.add("待鼓励")
    }

    if (totalPoints >= 140) {
        tags.add("榜单领先")
    }

    return Array.from(tags)
}

/** 重建学生姓名与拼音的搜索索引表。 */
function rebuildStudentSearchIndexMap(): void {
    const nextSearchIndexMap = new Map<number, StudentSearchIndexItem>()

    students.value.forEach((student) => {
        const studentId = typeof student.id === "number" ? student.id : 0
        const studentName = student.name?.trim() || ""
        if (!studentId || !studentName) {
            return
        }

        const groupInfo = getGroupInfo(student)
        const tags = getStudentTags(student, groupInfo.groupName)
        nextSearchIndexMap.set(studentId, {
            nameLower: studentName.toLowerCase(),
            initialsLower: getStudentPinyinInitials(studentName),
            groupNameLower: groupInfo.groupName.toLowerCase(),
            tagsLower: tags.join(" ").toLowerCase()
        })
    })

    studentSearchIndexMap.value = nextSearchIndexMap
}

/** 判断指定学生是否匹配当前搜索关键字。 */
function matchesStudentKeyword(studentId: number, token: string): boolean {
    const normalizedToken = token.trim().toLowerCase()
    if (!normalizedToken) {
        return true
    }

    const searchIndex = studentSearchIndexMap.value.get(studentId)
    if (!searchIndex) {
        return false
    }

    return searchIndex.nameLower.includes(normalizedToken)
        || searchIndex.initialsLower.includes(normalizedToken)
        || searchIndex.groupNameLower.includes(normalizedToken)
        || searchIndex.tagsLower.includes(normalizedToken)
}

/** 返回当前学生姓氏到卡片颜色的映射表。 */
const surnameToneClassMap = computed<Map<string, string>>(() => {
    const palette = ["tone-blue", "tone-orange", "tone-emerald", "tone-violet"] as const
    const uniqueSurnames = Array.from(new Set(
        students.value
            .map((student) => getStudentSurname(student.name))
            .filter((surname) => Boolean(surname))
    ))
        .sort((left, right) => {
            const leftKey = getStudentSurnameSortKey(left)
            const rightKey = getStudentSurnameSortKey(right)

            if (leftKey === rightKey) {
                return left.localeCompare(right, "zh-CN")
            }

            if (leftKey === "#") {
                return 1
            }

            if (rightKey === "#") {
                return -1
            }

            return leftKey.localeCompare(rightKey, "en")
        })

    return new Map(uniqueSurnames.map((surname, index) => [
        surname,
        palette[index % palette.length] ?? "tone-slate"
    ]))
})

/** 将接口学生数据转换为页面卡片结构。 */
function createStudentCardItem(student: StudentDTO): StudentCardItem | null {
    const studentId = typeof student.id === "number" ? student.id : 0
    const studentName = student.name?.trim() || ""

    if (!studentId || !studentName) {
        return null
    }

    const groupInfo = getGroupInfo(student)
    const surname = getStudentSurname(studentName)

    return {
        id: studentId,
        name: studentName,
        gender: toUiGender(student.gender),
        availablePoints: typeof student.available_points === "number" ? student.available_points : 0,
        groupId: groupInfo.groupId,
        groupName: groupInfo.groupName,
        initials: getStudentInitials(studentName),
        tags: getStudentTags(student, groupInfo.groupName),
        toneClass: surnameToneClassMap.value.get(surname) ?? "tone-slate",
        totalPoints: typeof student.total_points === "number" ? student.total_points : 0
    }
}

/** 返回全部学生的卡片数据。 */
const studentCards = computed<StudentCardItem[]>(() => {
    return students.value
        .map((item) => createStudentCardItem(item))
        .filter((item): item is StudentCardItem => item !== null)
})

/** 返回当前分组筛选标签列表。 */
const groupChips = computed<GroupChipItem[]>(() => {
    return groups.value
        .map((group) => {
            const groupId = typeof group.id === "number" ? group.id : 0
            const count = studentCards.value.filter((student) => student.groupId === groupId).length

            return {
                id: groupId,
                name: group.name?.trim() || "未命名分组",
                count
            }
        })
        .filter((item) => item.id > 0)
})

/** 返回当前筛选条件下需要展示的分组卡片列表。 */
const visibleGroupChips = computed<GroupChipItem[]>(() => {
    if (selectedGroupId.value === null) {
        return groupChips.value
    }

    return groupChips.value.filter((group) => group.id === selectedGroupId.value)
})

/** 返回筛选并排序后的学生列表。 */
const filteredStudents = computed<StudentCardItem[]>(() => {
    const normalizedKeyword = keyword.value.trim().toLowerCase()
    const keywordTokens = normalizedKeyword
        .split(/[，,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    const useMultiNameSearch = keywordTokens.length > 1

    const filteredList = studentCards.value.filter((student) => {
        const matchGroup = selectedGroupId.value === null || student.groupId === selectedGroupId.value
        const matchKeyword = !normalizedKeyword
            || (useMultiNameSearch
                ? keywordTokens.some((token) => matchesStudentKeyword(student.id, token))
                : matchesStudentKeyword(student.id, normalizedKeyword))

        return matchGroup && matchKeyword
    })

    const sortedList = [...filteredList]

    if (sortBy.value === "name-asc") {
        sortedList.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
        return sortedList
    }

    if (sortBy.value === "name-desc") {
        sortedList.sort((left, right) => right.name.localeCompare(left.name, "zh-CN"))
        return sortedList
    }

    if (sortBy.value === "points-asc") {
        sortedList.sort((left, right) => left.totalPoints - right.totalPoints)
        return sortedList
    }

    if (sortBy.value === "default") {
        return sortedList
    }

    sortedList.sort((left, right) => right.totalPoints - left.totalPoints)
    return sortedList
})

/** 返回当前全部已选中的学生。 */
const selectedStudents = computed<StudentCardItem[]>(() => {
    const studentMap = new Map<number, StudentCardItem>()

    studentCards.value.forEach((student) => {
        studentMap.set(student.id, student)
    })

    return selectedStudentIds.value
        .map((studentId) => studentMap.get(studentId) ?? null)
        .filter((student): student is StudentCardItem => student !== null)
})

/** 返回当前学生映射表。 */
const studentCardMap = computed<Map<number, StudentCardItem>>(() => {
    return new Map(studentCards.value.map((student) => [student.id, student]))
})

/** 返回当前筛选结果是否已全部选中。 */
const isAllFilteredStudentsSelected = computed<boolean>(() => {
    if (filteredStudents.value.length === 0) {
        return false
    }

    const selectedIdSet = new Set(selectedStudentIds.value)
    return filteredStudents.value.every((student) => selectedIdSet.has(student.id))
})

/** 返回当前单个选中的学生。 */
const selectedStudent = computed<StudentCardItem | null>(() => {
    if (selectedStudents.value.length !== 1) {
        return null
    }

    return selectedStudents.value[0] ?? null
})

/** 返回右侧面板标题。 */
const selectedPanelTitle = computed<string>(() => {
    if (selectedStudents.value.length > 1) {
        return "已选学生"
    }

    return "当前学生详情"
})

/** 返回右侧面板状态标签文案。 */
const selectionStatusLabel = computed<string>(() => {
    if (selectedStudents.value.length > 1) {
        return `已选 ${selectedStudents.value.length} 人`
    }

    if (selectedStudent.value) {
        return selectedStudent.value.groupName
    }

    if (selectedGroupId.value === null) {
        return "全部学生"
    }

    return groupChips.value.find((group) => group.id === selectedGroupId.value)?.name ?? "当前分组"
})

/** 返回学生删除确认弹窗的提示文案。 */
const deleteStudentMessage = computed<string>(() => {
    const studentName = pendingDeleteStudent.value?.name?.trim() || "当前学生"
    return `确定删除学生「${studentName}」吗？`
})

/** 返回全部学生的旧版弹窗展示结构。 */
const uiAllStudents = computed<UiStudent[]>(() => {
    return studentCards.value.map((student) => ({
        id: student.id,
        name: student.name,
        gender: student.gender
    }))
})

/** 返回全部分组的旧版弹窗展示结构。 */
const uiGroups = computed<UiGroup[]>(() => {
    return groups.value
        .map((group) => {
            const groupId = typeof group.id === "number" ? group.id : 0
            const memberIds = (group.students ?? [])
                .map((student) => student.id ?? 0)
                .filter((studentId): studentId is number => studentId > 0)

            return {
                id: groupId,
                name: group.name?.trim() || "",
                memberIds
            }
        })
        .filter((group) => group.id > 0 && group.name)
})

/** 根据当前过滤结果同步多选状态。 */
function syncSelectedStudents(): void {
    const visibleStudentIds = new Set(filteredStudents.value.map((student) => student.id))
    selectedStudentIds.value = selectedStudentIds.value.filter((studentId) => visibleStudentIds.has(studentId))
}

/** 加载当前班级的学生与分组数据。 */
async function loadStudentData(): Promise<void> {
    if (!activeClassId.value) {
        students.value = []
        groups.value = []
        selectedStudentIds.value = []
        studentSearchIndexMap.value = new Map()
        return
    }

    loading.value = true
    try {
        const [studentList, groupList] = await Promise.all([
            studentManager.list(activeClassId.value),
            studentManager.listGroups(activeClassId.value)
        ])

        students.value = studentList
        groups.value = groupList

        if (selectedGroupId.value !== null) {
            const groupExists = groupList.some((group) => group.id === selectedGroupId.value)
            if (!groupExists) {
                selectedGroupId.value = null
            }
        }

        rebuildStudentSearchIndexMap()
        syncSelectedStudents()
    } catch (error) {
        console.error("加载学生管理数据失败", error)
        ElMessage.error("加载学生管理数据失败")
    } finally {
        loading.value = false
    }
}

/** 确保积分规则组已加载。 */
async function ensureRuleGroupsLoaded(): Promise<void> {
    if (ruleGroups.value.length > 0 || ruleGroupsLoading.value) {
        return
    }

    ruleGroupsLoading.value = true
    try {
        ruleGroups.value = await pointsManager.listRuleGroups()
    } catch (error) {
        console.error("加载积分规则失败", error)
        ruleGroups.value = []
        ElMessage.error("加载积分规则失败")
    } finally {
        ruleGroupsLoading.value = false
    }
}

/** 返回积分操作目标的展示文案。 */
function getPointsTargetLabel(studentIds: number[]): string {
    const studentNames = studentIds
        .map((studentId) => studentCardMap.value.get(studentId)?.name?.trim() || "")
        .filter((studentName) => Boolean(studentName))

    if (studentNames.length === 0) {
        return "所选学生"
    }

    if (studentNames.length > 3) {
        return `${studentNames.slice(0, 3).join("、")} 等${studentNames.length}人`
    }

    return studentNames.join("、")
}

/** 打开积分规则选择弹窗。 */
async function openPointsSelector(studentIds: number[], tab: Exclude<PointsSelectorTab, "all">): Promise<void> {
    if (isArchivedSemester.value) {
        ElMessage.warning("归档学期不支持积分操作")
        return
    }

    if (!activeClassId.value) {
        ElMessage.warning("请先选择班级")
        return
    }

    const validStudentIds = studentIds.filter((studentId) => studentId > 0)
    if (validStudentIds.length === 0) {
        ElMessage.info("请先选择学生")
        return
    }

    await ensureRuleGroupsLoaded()
    if (ruleGroups.value.length === 0) {
        ElMessage.warning("暂无可用积分规则")
        return
    }

    selectorTargets.value = validStudentIds
    selectorTab.value = tab
    selectorVisible.value = true
}

/** 打开当前选中学生的积分操作。 */
async function openPointsSelectorForSelected(payload: { tab: Exclude<PointsSelectorTab, "all"> }): Promise<void> {
    await openPointsSelector(selectedStudentIds.value, payload.tab)
}

/** 定位到当前学生在列表中的位置。 */
async function handleLocateStudent(studentId: number): Promise<void> {
    if (studentId <= 0) {
        return
    }

    await nextTick()
    const targetElement = document.getElementById(`student-card-${studentId}`)
    if (!targetElement) {
        ElMessage.info("当前学生不在筛选结果中")
        return
    }

    targetElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
    })
}

/** 处理积分规则选择。 */
async function handleSelectRule(rule: { id: number, name: string, sign: "plus" | "minus", points: number }): Promise<void> {
    if (!activeClassId.value || selectorTargets.value.length === 0 || pointsApplying.value) {
        return
    }

    pointsApplying.value = true
    try {
        await pointsManager.applyRuleBatch(activeClassId.value, rule.id, selectorTargets.value)
        await loadStudentData()
        selectorVisible.value = false
        ElMessage.success(`已对「${getPointsTargetLabel(selectorTargets.value)}」${rule.sign === "plus" ? "加" : "减"}${Math.abs(rule.points)} 分（${rule.name}）`)
    } catch (error) {
        console.error("执行积分操作失败", error)
        ElMessage.error("执行积分操作失败")
    } finally {
        pointsApplying.value = false
    }
}

/** 处理学生卡片选中。 */
function handleSelectStudent(studentId: number): void {
    if (!multiSelectEnabled.value) {
        if (selectedStudentIds.value[0] === studentId && selectedStudentIds.value.length === 1) {
            selectedStudentIds.value = []
            return
        }

        selectedStudentIds.value = [studentId]
        return
    }

    if (selectedStudentIds.value.includes(studentId)) {
        selectedStudentIds.value = selectedStudentIds.value.filter((id) => id !== studentId)
        return
    }

    selectedStudentIds.value = [...selectedStudentIds.value, studentId]
}

/** 切换指定分组内全部学生的选中状态，并保留其他分组的选择。 */
function handleToggleGroupSelection(studentIds: number[]): void {
    const validStudentIds = Array.from(new Set(
        studentIds.filter((studentId) => studentCardMap.value.has(studentId))
    ))
    if (validStudentIds.length === 0) {
        return
    }

    const selectedIdSet = new Set(selectedStudentIds.value)
    const isGroupSelected = validStudentIds.every((studentId) => selectedIdSet.has(studentId))

    multiSelectEnabled.value = true
    if (isGroupSelected) {
        const groupIdSet = new Set(validStudentIds)
        selectedStudentIds.value = selectedStudentIds.value.filter((studentId) => !groupIdSet.has(studentId))
        return
    }

    selectedStudentIds.value = [
        ...selectedStudentIds.value,
        ...validStudentIds.filter((studentId) => !selectedIdSet.has(studentId))
    ]
}

/** 从已选列表中移除指定学生。 */
function handleRemoveSelectedStudent(studentId: number): void {
    selectedStudentIds.value = selectedStudentIds.value.filter((id) => id !== studentId)
}

/** 清空当前已选中的学生列表。 */
function handleClearSelectedStudents(): void {
    selectedStudentIds.value = []
}

/** 切换当前是否启用多选模式。 */
function toggleMultiSelectEnabled(): void {
    multiSelectEnabled.value = !multiSelectEnabled.value
    if (!multiSelectEnabled.value) {
        selectedStudentIds.value = []
    }
}

/** 切换当前筛选结果的全选状态。 */
function toggleSelectAllStudents(): void {
    if (isAllFilteredStudentsSelected.value) {
        selectedStudentIds.value = []
        return
    }

    multiSelectEnabled.value = true
    selectedStudentIds.value = filteredStudents.value.map((student) => student.id)
}

/** 处理分组筛选切换。 */
function handleSelectGroup(groupId: number | null): void {
    selectedGroupId.value = groupId
    syncSelectedStudents()
}

/** 打开新增学生弹窗并设置默认模式。 */
function openAddStudentDialog(mode: StudentAddMode): void {
    addStudentDialogMode.value = mode
    addStudentDialogVisible.value = true
}

/** 打开分组管理弹窗。 */
function openGroupManageDialog(): void {
    groupManageVisible.value = true
}

/** 打开分组导入弹窗。 */
function openGroupImportDialog(): void {
    groupImportVisible.value = true
}

/** 打开编辑学生弹窗。 */
function openEdit(student: StudentCardItem): void {
    editingStudent.value = {
        id: student.id,
        name: student.name,
        gender: student.gender
    }
    editStudentVisible.value = true
}

/** 打开删除学生确认弹窗。 */
function requestRemoveStudent(student: StudentCardItem): void {
    pendingDeleteStudent.value = student
    deleteStudentDialogVisible.value = true
}

/** 确认删除当前待删除学生。 */
async function confirmRemoveStudent(): Promise<void> {
    if (!pendingDeleteStudent.value) {
        return
    }

    try {
        await studentManager.delete(pendingDeleteStudent.value.id)
        ElMessage.success("已删除学生")
        deleteStudentDialogVisible.value = false
        pendingDeleteStudent.value = null
        await loadStudentData()
    } catch (error) {
        console.error("删除学生失败", error)
        ElMessage.error("删除学生失败")
    }
}

/** 处理单个新增学生。 */
async function handleAddSingle(payload: { name: string, gender: ApiGender }): Promise<void> {
    if (!activeClassId.value) {
        ElMessage.error("请先选择班级")
        return
    }

    await studentManager.create(activeClassId.value, payload.name, payload.gender)
    ElMessage.success("已添加学生")
    await loadStudentData()
}

/** 处理批量新增学生。 */
async function handleAddBatch(payload: { students: CreateStudentReq[] }): Promise<void> {
    if (!activeClassId.value) {
        ElMessage.error("请先选择班级")
        return
    }

    await studentManager.createBatch(activeClassId.value, payload.students)
    ElMessage.success("已批量添加学生")
    await loadStudentData()
}

/** 处理 Excel 导入学生。 */
async function handleAddExcel(payload: { students: CreateStudentReq[] }): Promise<void> {
    await handleAddBatch(payload)
}

/** 处理保存学生编辑。 */
async function handleSaveStudentEdit(payload: { id: number, name: string, gender: ApiGender }): Promise<void> {
    await studentManager.update(payload.id, payload.name, payload.gender)
    editStudentVisible.value = false
    editingStudent.value = null
    ElMessage.success("已保存学生信息")
    await loadStudentData()
}

/** 处理创建学生分组。 */
async function handleCreateGroup(payload: { name: string }): Promise<void> {
    if (!activeClassId.value) {
        return
    }

    await studentManager.createGroup(activeClassId.value, payload.name)
    ElMessage.success("已创建分组")
    await loadStudentData()
}

/** 处理删除学生分组。 */
async function handleDeleteGroup(payload: { groupId: number }): Promise<void> {
    await studentManager.deleteGroup(payload.groupId)
    ElMessage.success("已删除分组")
    await loadStudentData()
}

/** 将分组成员变更应用到接口层。 */
async function applyGroupMembers(groupId: number, targetMemberIds: number[]): Promise<void> {
    if (!activeClassId.value) {
        return
    }

    const currentStudents = await studentManager.list(activeClassId.value, groupId)
    const currentIds = (currentStudents ?? [])
        .map((student) => student.id ?? 0)
        .filter((studentId): studentId is number => studentId > 0)
    const currentSet = new Set(currentIds)
    const targetSet = new Set(targetMemberIds.filter((studentId) => studentId > 0))
    const addIds: number[] = []
    const removeIds: number[] = []

    targetSet.forEach((studentId) => {
        if (!currentSet.has(studentId)) {
            addIds.push(studentId)
        }
    })

    currentSet.forEach((studentId) => {
        if (!targetSet.has(studentId)) {
            removeIds.push(studentId)
        }
    })

    if (addIds.length > 0) {
        await studentManager.addStudentsToGroup(groupId, addIds)
    }

    if (removeIds.length > 0) {
        await studentManager.removeStudentsFromGroup(groupId, removeIds)
    }
}

/** 处理保存分组成员。 */
async function handleSaveGroupMembers(payload: { groupId: number, memberIds: number[] }): Promise<void> {
    await applyGroupMembers(payload.groupId, payload.memberIds)
    ElMessage.success("已保存分组成员")
    await loadStudentData()
}

/** 处理 Excel 分组导入确认。 */
async function handleConfirmGroupImport(payload: { groups: Array<{ groupName: string, memberNames: string[] }> }): Promise<void> {
    if (!activeClassId.value) {
        return
    }

    const nameToId = new Map<string, number>()
    uiAllStudents.value.forEach((student) => {
        nameToId.set(student.name, student.id)
    })

    for (const group of payload.groups) {
        const memberIds = group.memberNames
            .map((name) => nameToId.get(name) ?? 0)
            .filter((studentId) => studentId > 0)

        if (memberIds.length === 0) {
            continue
        }

        const existingGroup = uiGroups.value.find((item) => item.name === group.groupName)
        if (existingGroup) {
            await applyGroupMembers(existingGroup.id, memberIds)
            continue
        }

        const createdGroup = await studentManager.createGroup(activeClassId.value, group.groupName)
        if (createdGroup?.id) {
            await studentManager.addStudentsToGroup(createdGroup.id, memberIds)
        }
    }

    ElMessage.success("分组导入完成")
    await loadStudentData()
}

watch(activeClassId, async () => {
    keyword.value = ""
    selectedGroupId.value = null
    await loadStudentData()
}, { immediate: true })

watch(filteredStudents, () => {
    syncSelectedStudents()
}, { immediate: true })
</script>

<style scoped>
.students-view {
    display: grid;
    gap: 14px;
}

.control-panel {
    display: grid;
    gap: 14px;
}

.control-toolbar,
.group-filter {
    padding: 14px;
    border: 1px solid var(--ta-line);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.76);
    box-shadow: var(--ta-shadow-1);
}

.control-toolbar {
    display: flex;
    align-items: stretch;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
}

.control-actions,
.toolbar-row,
.segmented-control,
.group-chip-row {
    display: flex;
    align-items: center;
}

.control-actions {
    align-items: flex-end;
    justify-content: flex-start;
    gap: 10px;
    flex-wrap: wrap;
}

.control-actions .control-label {
    font-size: 14px;
}

.control-actions .chip-button {
    font-size: 15px !important;
}

.control-actions :is(.ghost-button, .primary-button) {
    font-size: 15px !important;
}

.control-block {
    min-width: 0;
    display: grid;
    gap: 6px;
}

.control-block--search {
    min-width: min(320px, 100%);
    flex: 1;
}

.control-label {
    color: var(--ta-text-tertiary);
    font-size: 12px;
    line-height: 1;
}

.control-actions .control-block:nth-child(n + 3) > .control-label {
    visibility: hidden;
}

.search-box {
    position: relative;
    border-radius: 10px;
    background: #eeeeF2;
    transition: background-color 140ms ease, box-shadow 140ms ease;
}

.search-box:hover {
    background: #e9e9ed;
}

.search-box:focus-within {
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.search-box__icon {
    position: absolute;
    left: 11px;
    top: 50%;
    z-index: 1;
    width: 16px;
    height: 16px;
    color: var(--ta-text-tertiary);
    transform: translateY(-50%);
    pointer-events: none;
}

.search-box__input {
    width: 100%;
    min-height: 38px;
    padding: 0 12px 0 36px;
    border: 1px solid transparent;
    border-radius: 10px;
    color: var(--ta-text);
    background: transparent;
    font-size: 14px;
    outline: 0;
    -webkit-appearance: none;
}

.search-box__input::placeholder {
    color: var(--ta-text-tertiary);
}

.search-box__input:focus {
    border-color: rgba(0, 122, 255, 0.5);
    box-shadow: none;
}

.segmented-control {
    min-height: 34px;
    padding: 3px;
    gap: 2px;
    border-radius: 10px;
    background: #e9e9ed;
}

.chip-button {
    min-height: 28px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    border-radius: 8px;
    color: var(--ta-text-secondary);
    background: transparent;
    font-size: 13px;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 140ms ease, color 140ms ease, transform 100ms ease, box-shadow 140ms ease;
}

.chip-button svg {
    width: 15px;
    height: 15px;
}

.chip-button.is-active {
    color: var(--ta-text);
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    font-weight: 620;
}

.sort-divider {
    width: 1px;
    height: 18px;
    margin: 0 1px;
    background: rgba(60, 60, 67, 0.14);
}

.toolbar-row {
    gap: 7px;
}

.ghost-button,
.primary-button {
    min-height: 38px;
    padding: 0 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 620;
    white-space: nowrap;
    cursor: pointer;
    transition: transform 100ms ease, background-color 140ms ease, box-shadow 140ms ease;
}

.ghost-button {
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
}

.primary-button {
    color: #ffffff;
    background: var(--ta-blue);
    box-shadow: 0 5px 14px rgba(0, 122, 255, 0.18);
}

.ghost-button:active,
.primary-button:active,
.chip-button:active {
    transform: scale(0.97);
}

.ghost-button:disabled,
.primary-button:disabled {
    opacity: 0.42;
}

.group-filter {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    overflow-x: auto;
    scrollbar-width: none;
}

.group-filter::-webkit-scrollbar {
    display: none;
}

.group-filter > .control-label {
    flex: 0 0 auto;
    font-size: 13px;
    white-space: nowrap;
}

.group-chip-row {
    gap: 7px;
    flex-wrap: nowrap;
}

.group-chip {
    min-height: 32px !important;
    padding: 0 11px;
    border-radius: 999px;
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line);
    font-size: 14px !important;
}

.group-chip.is-active {
    color: #0065d1;
    background: #eaf4ff;
    box-shadow: inset 0 0 0 1px rgba(0, 122, 255, 0.18);
}

.group-chip span {
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    font-size: 12px;
}

.students-view__notice {
    min-height: 44px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 9px;
    border: 1px solid #ffd8be;
    border-radius: 12px;
    color: #a53400;
    background: var(--ta-orange-soft);
    font-size: 13px;
}

.students-view__notice-icon {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
}

.students-layout {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 350px;
    gap: 14px;
    align-items: start;
}

.student-panel,
.side-column {
    min-width: 0;
}

.side-column {
    position: sticky;
    top: 84px;
}

@media (min-width: 1800px) {
    .students-layout {
        grid-template-columns: minmax(0, 1fr) 400px;
    }
}

@media (min-width: 2300px) {
    .students-layout {
        grid-template-columns: minmax(0, 1fr) 450px;
    }
}

@media (max-width: 1180px) {
    .students-layout {
        grid-template-columns: minmax(0, 1fr) 310px;
    }
}

@media (max-width: 920px) {
    .students-layout {
        grid-template-columns: 1fr;
    }

    .side-column {
        position: static;
    }
}

@media (max-width: 660px) {
    .control-toolbar {
        padding: 12px;
    }

    .control-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }

    .control-actions .control-block:nth-child(-n + 2) {
        grid-column: 1 / -1;
    }

    .control-actions .control-block {
        width: 100%;
    }

    .control-actions .control-block:nth-child(n + 3) > .control-label {
        display: none;
    }

    .control-actions .control-block:nth-child(3),
    .control-actions .control-block:nth-child(4) {
        grid-column: span 1;
    }

    .control-actions .segmented-control,
    .control-actions .toolbar-row,
    .control-actions .ghost-button,
    .control-actions .primary-button {
        width: 100%;
    }

    .control-actions .chip-button,
    .control-actions .toolbar-row > button {
        min-width: 0;
        flex: 1 1 0;
    }

    .control-actions .control-block:nth-child(3) {
        grid-column: 1 / -1;
    }

    .control-actions .control-block:nth-child(3) .toolbar-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .control-actions .control-block:nth-child(4) {
        grid-column: 1 / -1;
    }

    .group-filter {
        margin-inline: -14px;
        padding-inline: 14px;
        border-left: 0;
        border-right: 0;
        border-radius: 0;
    }
}
</style>
