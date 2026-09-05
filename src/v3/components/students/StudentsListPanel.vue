<template>
    <article class="students-list-panel">
        <div class="panel-head">
            <div>
                <h3>学生名册</h3>
                <p class="panel-description">
                    {{ layoutMode === "group"
                        ? "点击分组卡片可全选该组学生，再次点击可取消该组选择；组内学生仍支持单独选择。"
                        : "点击卡片可切换选中状态，支持单选或多选高亮，卡片右上角保留编辑与删除入口。" }}
                </p>
            </div>
            <div class="panel-head-actions">
                <button
                    type="button"
                    class="ghost-button ghost-button--small"
                    :class="{ 'is-active': multiSelectEnabled }"
                    :disabled="students.length === 0"
                    @click="emit('toggle-multi-select')"
                >
                    多选
                </button>
                <button type="button" class="ghost-button ghost-button--small" :class="{ 'is-active': isAllSelected }"
                    :disabled="students.length === 0" @click="emit('toggle-select-all')">
                    {{ isAllSelected ? "取消全选" : "全选" }}
                </button>
                <span class="panel-meta">当前显示 {{ students.length }} 人</span>
            </div>
        </div>

        <div v-if="!hasActiveClass" class="empty-state">
            <strong>请先选择班级</strong>
            <p>顶部已经提供了班级切换入口，选择后会自动加载当前班级的学生与分组信息。</p>
        </div>

        <div v-else-if="loading" class="empty-state">
            <strong>正在加载学生数据</strong>
            <p>请稍候，正在同步学生名册与分组信息。</p>
        </div>

        <div v-else-if="students.length === 0" class="empty-state">
            <strong>当前条件下暂无学生</strong>
            <p>你可以调整分组筛选、搜索关键字，或者直接新增学生。</p>
        </div>

        <div v-else-if="layoutMode === 'group'" class="group-card-grid">
            <section v-for="group in studentGroups" :key="group.id ?? 'ungrouped'" class="student-group-card"
                :class="{
                    'is-all-selected': isStudentGroupSelected(group.students),
                    'is-empty': group.students.length === 0
                }" @click="toggleStudentGroupSelection(group.students)">
                <div class="student-group-card__head">
                    <div>
                        <h4>{{ group.name }}</h4>
                        <div class="student-group-card__summary">
                            <span>成员 <strong>{{ group.students.length }}</strong></span>
                            <span>总积分 <strong>{{ group.totalPoints }}</strong></span>
                            <span>平均积分 <strong>{{ formatAveragePoints(group.averagePoints) }}</strong></span>
                        </div>
                    </div>
                    <span v-if="group.students.length > 0" class="student-group-card__selection-hint">
                        {{ isStudentGroupSelected(group.students) ? "已全选" : "点击全选" }}
                    </span>
                </div>

                <div v-if="group.students.length > 0" class="student-group-card__members">
                    <StudentsListCard v-for="student in group.students" :key="student.id" display-mode="group"
                        :selected="isStudentSelected(student.id)" :student="student"
                        @edit="emit('edit-student', $event)" @remove="emit('remove-student', $event)"
                        @select="emit('select-student', $event)" />
                </div>
                <p v-else class="student-group-card__empty">当前分组暂无学生</p>
            </section>
        </div>

        <div v-else-if="layoutMode === 'list'" class="list-column">
            <div v-if="shouldUseLetterGroups && studentsGroupedByLetter.length > 0" class="index-container">
                <div class="letter-index">
                    <button v-for="letter in availableLetters" :key="letter" type="button" class="index-item"
                        @click="scrollToLetter(letter)">
                        {{ letter }}
                    </button>
                </div>
            </div>

            <div class="list-content" :class="{ 'is-full-width': !shouldUseLetterGroups }">
                <template v-if="shouldUseLetterGroups">
                    <section v-for="group in studentsGroupedByLetter" :key="group.letter"
                        :id="`student-letter-group-${group.letter}`" class="letter-group">
                        <div class="letter-header">{{ group.letter }}</div>
                        <div class="student-group-stack" :class="{ 'is-single': group.students.length === 1 }">
                            <StudentsListCard v-for="student in group.students" :key="student.id"
                                :display-mode="layoutMode" :selected="isStudentSelected(student.id)" :student="student"
                                @edit="emit('edit-student', $event)" @remove="emit('remove-student', $event)"
                                @select="emit('select-student', $event)" />
                        </div>
                    </section>
                </template>

                <div v-else class="student-group-stack">
                    <StudentsListCard v-for="student in students" :key="student.id" :display-mode="layoutMode"
                        :selected="isStudentSelected(student.id)" :student="student"
                        @edit="emit('edit-student', $event)" @remove="emit('remove-student', $event)"
                        @select="emit('select-student', $event)" />
                </div>
            </div>
        </div>

        <div v-else class="student-grid">
            <StudentsListCard v-for="student in students" :key="student.id" :display-mode="layoutMode"
                :selected="isStudentSelected(student.id)" :student="student" @edit="emit('edit-student', $event)"
                @remove="emit('remove-student', $event)" @select="emit('select-student', $event)" />
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { pinyin } from "pinyin-pro";
import type { StudentsSortOption } from "@/types/student";
import StudentsListCard, { type StudentsListCardItem } from "@/v3/components/students/StudentsListCard.vue";

/** 定义学生列表面板布局模式。 */
export type StudentsListPanelLayoutMode = "card" | "list" | "group"

/** 定义学生列表卡片展示结构。 */
export type StudentsListPanelItem = StudentsListCardItem

/** 定义分组卡片的基础分组结构。 */
export interface StudentsListPanelGroupItem {
    id: number
    name: string
}

/** 定义学生列表面板属性结构。 */
interface StudentsListPanelProps {
    groups?: StudentsListPanelGroupItem[]
    hasActiveClass: boolean
    isAllSelected: boolean
    layoutMode: StudentsListPanelLayoutMode
    loading: boolean
    multiSelectEnabled: boolean
    selectedStudentIds: number[]
    sortBy: StudentsSortOption
    students: StudentsListPanelItem[]
}

/** 定义学生列表面板事件结构。 */
interface StudentsListPanelEmits {
    (event: "edit-student", student: StudentsListPanelItem): void
    (event: "remove-student", student: StudentsListPanelItem): void
    (event: "select-student", studentId: number): void
    (event: "toggle-group-selection", studentIds: number[]): void
    (event: "toggle-multi-select"): void
    (event: "toggle-select-all"): void
}

const props = withDefaults(defineProps<StudentsListPanelProps>(), {
    groups: () => []
})
const emit = defineEmits<StudentsListPanelEmits>()

/** 定义按首字母分组后的学生列表结构。 */
interface StudentLetterGroup {
    letter: string
    students: StudentsListPanelItem[]
}

/** 定义分组卡片展示结构。 */
interface StudentGroupCard {
    averagePoints: number
    id: number | null
    name: string
    students: StudentsListPanelItem[]
    totalPoints: number
}

/** 判断指定学生是否处于选中状态。 */
function isStudentSelected(studentId: number): boolean {
    return props.selectedStudentIds.includes(studentId)
}

/** 判断指定分组内的学生是否已全部选中。 */
function isStudentGroupSelected(students: StudentsListPanelItem[]): boolean {
    return students.length > 0 && students.every((student) => isStudentSelected(student.id))
}

/** 切换指定分组内全部学生的选中状态。 */
function toggleStudentGroupSelection(students: StudentsListPanelItem[]): void {
    if (students.length === 0) {
        return
    }

    emit("toggle-group-selection", students.map((student) => student.id))
}

/** 返回学生姓名的拼音首字母。 */
function getFirstLetter(name: string): string {
    if (!name) {
        return "#"
    }

    const firstChar = name.charAt(0)
    if (/[a-zA-Z]/.test(firstChar)) {
        return firstChar.toUpperCase()
    }

    try {
        const py = pinyin(firstChar, { toneType: "none", type: "array" })
        if (Array.isArray(py) && py.length > 0) {
            const firstPinyin = py[0]
            if (typeof firstPinyin === "string" && firstPinyin.length > 0) {
                return firstPinyin.charAt(0).toUpperCase()
            }
        }
    } catch {
        return "#"
    }

    return "#"
}

/** 判断当前列表视图是否需要展示姓名首字母分组。 */
const shouldUseLetterGroups = computed<boolean>(() => {
    return props.sortBy === "name-asc" || props.sortBy === "name-desc"
})

/** 返回列表视图下按首字母分组后的学生列表。 */
const studentsGroupedByLetter = computed<StudentLetterGroup[]>(() => {
    if (!shouldUseLetterGroups.value) {
        return []
    }

    const groups = new Map<string, StudentsListPanelItem[]>()

    props.students.forEach((student) => {
        const letter = getFirstLetter(student.name)
        const group = groups.get(letter) ?? []
        group.push(student)
        groups.set(letter, group)
    })

    return Array.from(groups.entries())
        .map(([letter, students]) => ({
            letter,
            students
        }))
})

/** 返回按学生分组组织后的卡片列表，并将未分组学生集中展示。 */
const studentGroups = computed<StudentGroupCard[]>(() => {
    const groupMap = new Map<number, StudentGroupCard>()

    props.groups.forEach((group) => {
        groupMap.set(group.id, {
            averagePoints: 0,
            id: group.id,
            name: group.name,
            students: [],
            totalPoints: 0
        })
    })

    const ungroupedStudents: StudentsListPanelItem[] = []
    props.students.forEach((student) => {
        if (student.groupId === null || !groupMap.has(student.groupId)) {
            ungroupedStudents.push(student)
            return
        }

        groupMap.get(student.groupId)?.students.push(student)
    })

    const result = Array.from(groupMap.values())
    if (ungroupedStudents.length > 0) {
        result.push({
            averagePoints: 0,
            id: null,
            name: "未分组",
            students: ungroupedStudents,
            totalPoints: 0
        })
    }

    return result.map((group) => {
        const totalPoints = group.students.reduce((total, student) => total + student.totalPoints, 0)
        return {
            ...group,
            averagePoints: group.students.length > 0 ? totalPoints / group.students.length : 0,
            totalPoints
        }
    })
})

/** 返回可用于跳转的首字母索引列表。 */
const availableLetters = computed<string[]>(() => {
    return studentsGroupedByLetter.value.map((group) => group.letter)
})

/** 滚动到指定首字母分组。 */
function scrollToLetter(letter: string): void {
    const element = document.getElementById(`student-letter-group-${letter}`)
    if (!element) {
        return
    }

    element.scrollIntoView({
        behavior: "smooth",
        block: "start"
    })
}

/** 将分组平均积分格式化为一位小数。 */
function formatAveragePoints(points: number): string {
    return points.toFixed(1)
}
</script>

<style scoped>
.students-list-panel {
    min-width: 0;
    padding: 20px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface);
    box-shadow: var(--ta-shadow-1);
    backdrop-filter: blur(18px) saturate(150%);
}

.panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
}

.panel-head h3 {
    margin: 0;
    font-size: 18px;
    letter-spacing: -0.015em;
}

.panel-description {
    margin: 5px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 14px;
    line-height: 1.5;
}

.panel-head-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 7px;
    flex-wrap: wrap;
}

.ghost-button {
    min-height: 36px;
    padding: 0 11px;
    border: 0;
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.ghost-button.is-active {
    color: #0065d1;
    background: #eaf4ff;
    box-shadow: inset 0 0 0 1px rgba(0, 122, 255, 0.18);
}

.panel-meta {
    color: var(--ta-text-tertiary);
    font-size: 12px;
    white-space: nowrap;
}

.student-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.group-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
    gap: 12px;
    align-items: start;
}

.student-group-card {
    min-width: 0;
    padding: 16px;
    border: 1px solid var(--ta-line);
    border-radius: 16px;
    background: #ffffff;
    cursor: pointer;
    transition: border-color 140ms ease, box-shadow 140ms ease, transform 100ms ease;
}

.student-group-card:hover {
    border-color: rgba(0, 122, 255, 0.28);
}

.student-group-card:active {
    transform: scale(0.995);
}

.student-group-card.is-all-selected {
    border-color: rgba(0, 122, 255, 0.62);
    box-shadow: inset 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.student-group-card.is-empty {
    cursor: default;
}

.student-group-card.is-empty:hover {
    border-color: var(--ta-line);
}

.student-group-card.is-empty:active {
    transform: none;
}

.student-group-card__head {
    padding-bottom: 12px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    border-bottom: 1px solid var(--ta-line);
}

.student-group-card h4 {
    margin: 0;
    font-size: 16px;
    letter-spacing: -0.01em;
}

.student-group-card__summary {
    margin-top: 7px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--ta-text-tertiary);
    font-size: 12px;
    flex-wrap: wrap;
}

.student-group-card__summary strong {
    color: var(--ta-text-secondary);
    font-variant-numeric: tabular-nums;
}

.student-group-card__selection-hint {
    min-height: 24px;
    padding: 0 8px;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
    font-size: 12px;
    font-weight: 620;
    white-space: nowrap;
}

.student-group-card.is-all-selected .student-group-card__selection-hint {
    color: #ffffff;
    background: var(--ta-blue);
}

.student-group-card__members {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(148px, 100%), 1fr));
    gap: 8px;
}

.student-group-card__empty {
    min-height: 72px;
    margin: 12px 0 0;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    font-size: 13px;
}

.list-column {
    min-width: 0;
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 12px;
}

.index-container {
    min-width: 0;
}

.letter-index {
    position: sticky;
    top: 96px;
    display: grid;
    gap: 3px;
}

.index-item {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 8px;
    color: var(--ta-text-tertiary);
    background: transparent;
    font-size: 12px;
    cursor: pointer;
}

.index-item:hover {
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.list-content.is-full-width {
    grid-column: 1 / -1;
}

.letter-group + .letter-group {
    margin-top: 18px;
}

.letter-header {
    margin-bottom: 7px;
    color: var(--ta-text-tertiary);
    font-size: 13px;
    font-weight: 650;
}

.student-group-stack {
    display: grid;
    gap: 8px;
}

.empty-state {
    min-height: 260px;
    padding: 28px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 7px;
    border-radius: 16px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    text-align: center;
}

.empty-state strong {
    color: var(--ta-text);
    font-size: 15px;
}

.empty-state p {
    max-width: 420px;
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
}

@media (min-width: 1800px) {
    .student-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (min-width: 2300px) {
    .student-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
    }
}

@media (max-width: 1180px) {
    .student-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 660px) {
    .students-list-panel {
        padding: 16px;
    }

    .panel-head {
        align-items: stretch;
        flex-direction: column;
    }

    .panel-head-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .panel-head-actions .ghost-button {
        width: 100%;
    }

    .panel-meta {
        grid-column: 1 / -1;
    }

    .student-grid {
        grid-template-columns: 1fr;
    }

    .list-column {
        grid-template-columns: 1fr;
    }

    .index-container {
        display: none;
    }
}
</style>
