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
            <div v-if="studentsGroupedByLetter.length > 0" class="index-container">
                <div class="letter-index">
                    <button v-for="letter in availableLetters" :key="letter" type="button" class="index-item"
                        @click="scrollToLetter(letter)">
                        {{ letter }}
                    </button>
                </div>
            </div>

            <div class="list-content">
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

/** 返回列表视图下按首字母分组后的学生列表。 */
const studentsGroupedByLetter = computed<StudentLetterGroup[]>(() => {
    const groups = new Map<string, StudentsListPanelItem[]>()

    props.students.forEach((student) => {
        const letter = getFirstLetter(student.name)
        const group = groups.get(letter) ?? []
        group.push(student)
        groups.set(letter, group)
    })

    return Array.from(groups.entries())
        .sort(([left], [right]) => {
            if (left === right) {
                return 0
            }

            if (left === "#") {
                return 1
            }

            if (right === "#") {
                return -1
            }

            return left.localeCompare(right)
        })
        .map(([letter, students]) => ({
            letter,
            students: [...students].sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
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
    padding: 22px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.84);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    backdrop-filter: blur(16px);
}

.panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 18px;
}

.panel-head h3 {
    margin: 0;
}

.panel-description {
    margin: 6px 0 0;
    color: #627099;
    line-height: 1.7;
}

.panel-meta {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(22, 33, 62, 0.06);
    font-size: 13px;
    font-weight: 700;
}

.panel-head-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.empty-state {
    padding: 24px;
    border-radius: 24px;
    background: rgba(85, 104, 255, 0.06);
}

.empty-state strong {
    display: block;
    margin: 0;
    font-size: 18px;
}

.empty-state p {
    margin: 10px 0 0;
    line-height: 1.7;
    color: #627099;
}

.student-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
}

.list-column {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
}

.index-container {
    position: sticky;
    top: 12px;
}

.letter-index {
    display: grid;
    gap: 8px;
    padding: 10px 8px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 10px 24px rgba(71, 90, 150, 0.1);
}

.index-item {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #627099;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.index-item:hover {
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
    transform: translateX(2px);
}

.list-content {
    min-width: 0;
}

.letter-group+.letter-group {
    margin-top: 22px;
}

.letter-header {
    margin-bottom: 12px;
    color: #5568ff;
    font-size: 20px;
    font-weight: 800;
}

.student-group-stack {
    display: grid;
    gap: 14px;
    grid-template-columns: 1fr;
}

.ghost-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 46px;
    padding: 0 18px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button.is-active {
    border-color: rgba(85, 104, 255, 0.3);
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
    box-shadow: 0 10px 20px rgba(85, 104, 255, 0.12);
}

.ghost-button:hover {
    transform: translateY(-2px);
}

.ghost-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
}

.ghost-button--small {
    min-height: 42px;
    padding: 0 14px;
    border-radius: 14px;
}

@media (max-width: 1560px) {
    .student-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 1436px) {
    .student-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 1236px) {
    .students-list-panel {
        padding: 18px;
    }

    .list-column {
        grid-template-columns: 1fr;
    }

    .index-container {
        position: static;
        order: -1;
    }

    .letter-index {
        grid-template-columns: repeat(auto-fit, minmax(28px, 1fr));
    }

    .panel-head,
    .panel-head-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .student-grid {
        grid-template-columns: 1fr;
    }

    .student-group-stack {
        grid-template-columns: 1fr;
    }
}
</style>
