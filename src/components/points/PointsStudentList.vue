<script setup lang="ts">
import { computed } from 'vue'
import { pinyin } from 'pinyin-pro'

defineOptions({ name: 'PointsStudentList' })

export type UiPointsStudent = {
    id: number
    name: string
    gender: 'male' | 'female' | 'unknown'
}

type LayoutMode = 'card' | 'list'

interface Props {
    active: boolean
    className: string
    students: UiPointsStudent[]
    layoutMode: LayoutMode
    selectedIds: number[]
    availablePointsMap: Record<number, number>
    totalPointsMap: Record<number, number>
}

const props = defineProps<Props>()
const emit = defineEmits<{
    (e: 'update:layoutMode', v: LayoutMode): void
    (e: 'update:selectedIds', v: number[]): void
    (e: 'open-apply', payload: { studentIds: number[], tab: 'plus' | 'minus' }): void
    (e: 'open-history', payload: { studentName: string }): void
}>()

function setLayoutMode(mode: LayoutMode) {
    if (props.layoutMode !== mode) emit('update:layoutMode', mode)
}

const isIndeterminate = computed(() => {
    return props.selectedIds.length > 0 && props.selectedIds.length < props.students.length
})

const isAllSelected = computed({
    get: () => props.students.length > 0 && props.selectedIds.length === props.students.length,
    set: (val: boolean) => {
        if (val) emit('update:selectedIds', props.students.map(s => s.id))
        else emit('update:selectedIds', [])
    }
})

function toggleStudentSelection(studentId: number) {
    const next = [...props.selectedIds]
    const idx = next.indexOf(studentId)
    if (idx > -1) next.splice(idx, 1)
    else next.push(studentId)
    emit('update:selectedIds', next)
}

function isStudentSelected(studentId: number) {
    return props.selectedIds.includes(studentId)
}

function openApplyForStudents(studentIds: number[], tab: 'plus' | 'minus') {
    emit('open-apply', { studentIds, tab })
}

function getFirstLetter(name: string): string {
    if (!name || name.length === 0) return '#'

    const firstChar = name.charAt(0)
    if (/[a-zA-Z]/.test(firstChar)) return firstChar.toUpperCase()

    try {
        const py = pinyin(firstChar, { toneType: 'none', type: 'array' })
        if (Array.isArray(py) && py.length > 0) {
            const firstPinyin = py[0]
            if (typeof firstPinyin === 'string' && firstPinyin.length > 0) {
                return firstPinyin.charAt(0).toUpperCase()
            }
        }
    } catch {
        // ignore
    }
    return '#'
}

const studentsGroupedByLetter = computed(() => {
    if (props.layoutMode !== 'list') return []

    const groups: Record<string, UiPointsStudent[]> = {}
    const lettersInOrder: string[] = []

    props.students.forEach(student => {
        const letter = getFirstLetter(student.name)
        if (!groups[letter]) {
            groups[letter] = []
            lettersInOrder.push(letter)
        }
        groups[letter]!.push(student)
    })

    return lettersInOrder.map(letter => ({
        letter,
        students: groups[letter]!
    }))
})

const availableLetters = computed(() => {
    const letters = studentsGroupedByLetter.value.map(group => group.letter)
    return letters.slice().sort((a, b) => {
        if (a === b) return 0
        if (a === '#') return 1
        if (b === '#') return -1
        return a.localeCompare(b)
    })
})

function scrollToLetter(letter: string) {
    const element = document.getElementById(`letter-group-${letter}`)
    if (element) {
        const scrollContainer = element.closest('.list-card')?.querySelector('.el-card__body') as HTMLElement | null
        if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect()
            const elementRect = element.getBoundingClientRect()
            const scrollTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top) - 20
            scrollContainer.scrollTo({ top: scrollTop, behavior: 'smooth' })
        }
    }
}
</script>

<template>
    <div class="list-column">
        <div v-if="layoutMode === 'list' && studentsGroupedByLetter.length > 0" class="index-container">
            <div class="letter-index">
                <div v-for="letter in availableLetters" :key="letter" class="index-item" @click="scrollToLetter(letter)">
                    {{ letter }}
                </div>
            </div>
        </div>

        <el-card shadow="never" :class="['list-card', 'list-content', { 'is-list-mode': layoutMode === 'list' }]">
            <template #header>
                <div class="list-header">
                    <span v-if="active && className" class="class-name">{{ className }}</span>
                    <span v-else>学生积分</span>
                    <div class="header-actions">
                        <el-checkbox
                            v-if="active && students.length > 0"
                            v-model="isAllSelected"
                            :indeterminate="isIndeterminate"
                            class="select-all-checkbox"
                            border
                        >
                            全选
                        </el-checkbox>
                        <div class="layout-toggle">
                            <el-button-group>
                                <el-button
                                    :class="['layout-btn', { 'is-active': layoutMode === 'card' }]"
                                    size="small"
                                    :type="layoutMode === 'card' ? 'primary' : undefined"
                                    :plain="layoutMode !== 'card'"
                                    @click="setLayoutMode('card')"
                                >
                                    <i-ep-grid />
                                </el-button>
                                <el-button
                                    :class="['layout-btn', { 'is-active': layoutMode === 'list' }]"
                                    size="small"
                                    :type="layoutMode === 'list' ? 'primary' : undefined"
                                    :plain="layoutMode !== 'list'"
                                    @click="setLayoutMode('list')"
                                >
                                    <i-ep-list />
                                </el-button>
                            </el-button-group>
                        </div>
                        <el-button type="default" plain size="small" :disabled="!active" @click="$router.push('/points/history')">
                            <i-ep-document /> 记录
                        </el-button>
                    </div>
                </div>
            </template>

            <div v-if="active">
                <div v-if="students.length > 0">
                    <template v-if="layoutMode === 'list'">
                        <div
                            v-for="group in studentsGroupedByLetter"
                            :key="group.letter"
                            :id="`letter-group-${group.letter}`"
                            class="letter-group"
                        >
                            <div class="letter-header">{{ group.letter }}</div>
                            <div class="student-list">
                                <div
                                    v-for="s in group.students"
                                    :key="s.id"
                                    :class="['student-row', 'list-mode', { 'is-selected': isStudentSelected(s.id) }]"
                                    @click="toggleStudentSelection(s.id)"
                                >
                                    <div :class="['avatar', s.gender]">
                                        <i-ep-male v-if="s.gender === 'male'" />
                                        <i-ep-female v-else-if="s.gender === 'female'" />
                                        <i-ep-user v-else />
                                    </div>
                                    <div class="info">
                                        <div class="name">{{ s.name }}</div>
                                        <div class="points-info list">
                                            <div class="score available">{{ availablePointsMap[s.id] ?? 0 }}</div>
                                            <div class="score-label">可用</div>
                                            <div class="score total">{{ totalPointsMap[s.id] ?? 0 }}</div>
                                            <div class="score-label">总分</div>
                                        </div>
                                    </div>
                                    <div class="ops" @click.stop>
                                        <el-button class="op" type="primary" plain size="small" @click="openApplyForStudents([s.id], 'plus')">
                                            <i-ep-plus />
                                        </el-button>
                                        <el-button class="op" type="danger" plain size="small" @click="openApplyForStudents([s.id], 'minus')">
                                            <i-ep-minus />
                                        </el-button>
                                        <el-button class="op" type="default" plain size="small" @click="emit('open-history', { studentName: s.name })">
                                            <i-ep-document />
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>

                    <template v-else>
                        <div class="student-grid">
                            <div
                                v-for="s in students"
                                :key="s.id"
                                :class="['student-row', 'card-mode', { 'is-selected': isStudentSelected(s.id) }]"
                                @click="toggleStudentSelection(s.id)"
                            >
                                <div :class="['avatar', s.gender]">
                                    <i-ep-male v-if="s.gender === 'male'" />
                                    <i-ep-female v-else-if="s.gender === 'female'" />
                                    <i-ep-user v-else />
                                </div>
                                <div class="info">
                                    <div class="name">{{ s.name }}</div>
                                    <div class="points-info">
                                        <div class="score available">{{ availablePointsMap[s.id] ?? 0 }}</div>
                                        <div class="score-label">可用</div>
                                        <div class="score total">{{ totalPointsMap[s.id] ?? 0 }}</div>
                                        <div class="score-label">总分</div>
                                    </div>
                                </div>
                                <div class="ops" @click.stop>
                                    <el-button class="op" type="primary" plain size="small" @click="openApplyForStudents([s.id], 'plus')">
                                        <i-ep-plus /> 加分
                                    </el-button>
                                    <el-button class="op" type="danger" plain size="small" @click="openApplyForStudents([s.id], 'minus')">
                                        <i-ep-minus /> 扣分
                                    </el-button>
                                    <el-button class="op" type="default" plain size="small" @click="emit('open-history', { studentName: s.name })">
                                        <i-ep-document /> 记录
                                    </el-button>
                                </div>
                            </div>
                        </div>
                    </template>
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
</template>

<style scoped>
.list-column {
    height: 100%;
    overflow: hidden;
    margin-left: 12px;
    display: flex;
    flex-direction: row;
    min-width: 0;
}

.list-content {
    flex: 1;
    min-width: 0;
}

.index-container {
    width: 32px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-right: 12px;
}

.letter-index {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 0;
}

.index-item {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.index-item:hover {
    background-color: #f0f0f0;
    color: #333;
}

.letter-group {
    margin-bottom: 20px;
}

.letter-header {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e6e8f0;
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

.is-list-mode :deep(.el-card__body) {
    overflow-x: auto;
}

.is-list-mode .student-row.list-mode {
    min-width: 640px;
}

.list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 18px;
    font-weight: 700;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.layout-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
}

.select-all-checkbox {
    margin-right: 0 !important;
    height: 32px;
}

.layout-btn {
    font-weight: 600;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 32px;
    padding: 0;
}

.layout-btn.is-active {
    box-shadow: 0 0 0 1px rgba(102, 126, 234, 0.35);
}

.layout-btn :deep(.el-icon) {
    margin-right: 0;
    font-size: 18px;
}

.class-name {
    color: #333;
}

.student-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
}

.student-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.student-row {
    padding: 12px;
    border: 2px solid #eee;
    border-radius: 12px;
    background: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
}

.student-row.card-mode {
    display: grid;
    grid-template-columns: 40px 1fr;
    grid-template-rows: auto auto;
    align-items: start;
    gap: 10px;
}

.student-row.list-mode {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
}

.student-row:hover {
    border-color: #d0d0d0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.student-row.is-selected {
    border-color: #667eea;
    background: linear-gradient(135deg, #f5f7ff 0%, #eef2ff 100%);
    box-shadow: 0 2px 12px rgba(102, 126, 234, 0.2);
}

.student-row.is-selected .name {
    color: #667eea;
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

.avatar.unknown {
    background: linear-gradient(135deg, #9ca3af, #b6bcc6);
}

.info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
}

.student-row.list-mode .info {
    flex-direction: row;
    align-items: center;
    gap: 12px;
}

.student-row.list-mode .name {
    flex: 0 0 auto;
    min-width: 3em;
    max-width: 3em;
}

.student-row.list-mode .points-info.list {
    margin-left: 0;
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

.points-info.list {
    gap: 12px;
    white-space: nowrap;
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

.student-row.card-mode .ops {
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

.student-row.list-mode .ops {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    align-items: center;
}

.op {
    flex: 1;
    height: 40px;
    border-radius: 24px;
}

.student-row.list-mode .op {
    flex: none;
    min-width: 96px;
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

/* 列表模式下：操作按钮缩小为仅图标并保持胶囊外观 */
.student-row.list-mode .ops .op {
    min-width: 44px;
    width: 44px;
    height: 32px;
    padding: 0;
    border-radius: 999px;
}

.student-row.list-mode .ops .op :deep(.el-icon) {
    margin-right: 0;
    font-size: 16px;
}

@media (max-width: 640px) {
    .list-column {
        margin-left: 0;
    }

    /* 小屏下列表模式改为自适应换行，避免 min-width 导致横向溢出 */
    .is-list-mode :deep(.el-card__body) {
        overflow-x: hidden;
    }

    .is-list-mode .student-row.list-mode {
        min-width: 0;
        grid-template-columns: 40px 1fr;
        grid-template-rows: auto auto;
        align-items: start;
        gap: 10px 12px;
    }

    .student-row.list-mode .info {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        min-width: 0;
    }

    .student-row.list-mode .name {
        max-width: 100%;
        min-width: 0;
        flex: 1 1 auto;
    }

    .points-info.list {
        white-space: normal;
        flex-wrap: wrap;
        gap: 8px;
    }

    .student-row.list-mode .ops {
        grid-column: 1 / -1;
        justify-content: flex-end;
        gap: 10px;
    }
}

@media (max-width: 480px) {
    .student-row.list-mode .ops .op {
        min-width: 40px;
        width: 40px;
        height: 30px;
    }
}

@media (max-width: 390px) {
    .student-row.list-mode .ops .op {
        min-width: 36px;
        width: 36px;
        height: 28px;
    }
}
</style>


