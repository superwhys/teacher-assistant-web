<template>
    <article class="students-list-panel">
        <div class="panel-head">
            <div>
                <h3>学生名册</h3>
                <p class="panel-description">点击卡片可切换选中状态，支持单选或多选高亮，卡片右上角保留编辑与删除入口。</p>
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
export type StudentsListPanelLayoutMode = "card" | "list"

/** 定义学生列表卡片展示结构。 */
export type StudentsListPanelItem = StudentsListCardItem

/** 定义学生列表面板属性结构。 */
interface StudentsListPanelProps {
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
    (event: "toggle-multi-select"): void
    (event: "toggle-select-all"): void
}

const props = defineProps<StudentsListPanelProps>()
const emit = defineEmits<StudentsListPanelEmits>()

/** 定义按首字母分组后的学生列表结构。 */
interface StudentLetterGroup {
    letter: string
    students: StudentsListPanelItem[]
}

/** 判断指定学生是否处于选中状态。 */
function isStudentSelected(studentId: number): boolean {
    return props.selectedStudentIds.includes(studentId)
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
