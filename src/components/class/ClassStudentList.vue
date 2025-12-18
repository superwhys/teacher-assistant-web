<script setup lang="ts">
import { computed } from 'vue'
import { pinyin } from 'pinyin-pro'

type LayoutMode = 'card' | 'list'
export type UiGender = 'male' | 'female' | 'unknown'
export type UiStudent = {
    id: number
    name: string
    gender: UiGender
}

const props = defineProps<{
    active: boolean
    className?: string
    students: UiStudent[]
    layoutMode: LayoutMode
    loading?: boolean
}>()

const emit = defineEmits<{
    (e: 'update:layoutMode', mode: LayoutMode): void
    (e: 'edit', student: UiStudent): void
    (e: 'remove', student: UiStudent): void
}>()

const totalCount = computed(() => props.students.length)
const maleCount = computed(() => props.students.filter(s => s.gender === 'male').length)
const femaleCount = computed(() => props.students.filter(s => s.gender === 'female').length)

function setLayoutMode(mode: LayoutMode) {
    emit('update:layoutMode', mode)
}

function getFirstLetter(name: string): string {
    if (!name) return '#'

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

    const groups: Record<string, UiStudent[]> = {}
    const order: string[] = []

    props.students.forEach((student) => {
        const letter = getFirstLetter(student.name)
        if (!groups[letter]) {
            groups[letter] = []
            order.push(letter)
        }
        groups[letter]!.push(student)
    })

    return order.map(letter => ({
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
    if (!element) return

    const scrollContainer = element.closest('.list-card')?.querySelector('.el-card__body') as HTMLElement | null
    if (!scrollContainer) return

    const containerRect = scrollContainer.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const scrollTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top) - 20

    scrollContainer.scrollTo({ top: scrollTop, behavior: 'smooth' })
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

        <el-card
            v-loading="!!loading"
            shadow="never"
            :class="['list-card', 'list-content', { 'is-list-mode': layoutMode === 'list' }]"
        >
            <template #header>
                <div class="list-header">
                    <div class="header-left">
                        <span v-if="active" class="class-name">{{ className || '班级' }}</span>
                        <span v-else>学生名单</span>
                        <span v-if="active" class="student-count">
                            共 {{ totalCount }} 人
                            <span class="count-detail">(男 {{ maleCount }} / 女 {{ femaleCount }})</span>
                        </span>
                    </div>
                    <div class="header-actions">
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
                                <div v-for="s in group.students" :key="s.id" class="student-row list-mode">
                                    <div :class="['avatar', s.gender]">
                                        <i-ep-male v-if="s.gender === 'male'" />
                                        <i-ep-female v-else-if="s.gender === 'female'" />
                                        <i-ep-user-filled v-else />
                                    </div>

                                    <div class="info">
                                        <div class="name">
                                            {{ s.name }}
                                        </div>
                                    </div>

                                    <div class="ops">
                                        <el-button class="op" type="default" plain size="small" title="编辑" @click="emit('edit', s)">
                                            <i-ep-edit />
                                        </el-button>
                                        <el-button class="op" type="danger" plain size="small" title="删除" @click="emit('remove', s)">
                                            <i-ep-delete />
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>

                    <template v-else>
                        <div class="student-grid">
                            <div v-for="s in students" :key="s.id" class="student-card">
                                <div class="card-overlay-actions">
                                    <el-button text class="overlay-btn" title="编辑" @click.stop="emit('edit', s)">
                                        <i-ep-edit />
                                    </el-button>
                                    <el-button text class="overlay-btn danger" title="删除" @click.stop="emit('remove', s)">
                                        <i-ep-delete />
                                    </el-button>
                                </div>

                                <div :class="['student-avatar', s.gender]">
                                    <i-ep-male v-if="s.gender === 'male'" />
                                    <i-ep-female v-else-if="s.gender === 'female'" />
                                    <i-ep-user-filled v-else />
                                </div>
                                <div class="student-info">
                                    <div class="student-name">{{ s.name }}</div>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>

                <div v-else class="empty empty-students">
                    <i-ep-user class="empty-icon" />
                    <div class="empty-title">还没有学生</div>
                    <div class="empty-sub">点击下方"添加学生"按钮开始添加学生</div>
                </div>
            </div>

            <div v-else class="empty">
                <i-ep-school class="empty-icon" />
                <div class="empty-title">还没有班级</div>
                <div class="empty-sub">请先创建或选择一个班级</div>
            </div>
        </el-card>
    </div>
</template>

<style scoped>
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

.list-column {
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: row;
    min-width: 0;
    width: 100%;
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
    flex-shrink: 0;
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

.list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
}

.header-left {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.header-actions {
    display: flex;
    align-items: center;
}

.layout-toggle {
    display: flex;
    align-items: center;
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
    font-size: 24px;
    font-weight: 700;
    color: #333;
}

.student-count {
    font-size: 16px;
    color: #666;
    font-weight: 500;
}

.count-detail {
    color: #999;
    font-size: 14px;
    margin-left: 8px;
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
    transition: all 0.2s ease;
}

.student-row:hover {
    border-color: #d0d0d0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.student-row.list-mode {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
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
    background: linear-gradient(135deg, #909399, #a6a9ad);
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
    display: flex;
    align-items: center;
    gap: 8px;
}

.ops {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    align-items: center;
}

.op {
    width: 40px;
    height: 32px;
    padding: 0;
    border-radius: 999px;
}

.op :deep(.el-icon) {
    margin-right: 0;
    font-size: 16px;
}

.student-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 18px;
}

.student-card {
    position: relative;
    padding: 22px 16px;
    border: 1px solid #e8e8e8;
    border-radius: 16px;
    background: linear-gradient(180deg, #ffffff, #fbfbfb);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    min-height: 170px;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.student-card:hover {
    transform: translateY(-2px);
    border-color: rgba(64, 158, 255, 0.28);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
}

.card-overlay-actions {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.88);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s ease;
    z-index: 2;
    backdrop-filter: blur(2px);
}

.student-card:hover .card-overlay-actions,
.student-card:focus-within .card-overlay-actions,
.student-card:active .card-overlay-actions {
    opacity: 1;
    pointer-events: auto;
}

.overlay-btn {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.04);
    color: #606266;
    font-size: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
}

.overlay-btn:hover {
    background: rgba(0, 0, 0, 0.08);
}

.overlay-btn.danger {
    color: #e24a4a;
}

.student-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 26px;
    box-shadow: var(--shadow-light);
}

.student-avatar.male {
    background: linear-gradient(135deg, #4f8df9, #6aa2ff);
}

.student-avatar.female {
    background: linear-gradient(135deg, #f975a8, #f9948a);
}

.student-avatar.unknown {
    background: linear-gradient(135deg, #909399, #a6a9ad);
}

.student-info {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.student-name {
    font-size: 20px;
    font-weight: 700;
    text-align: center;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

.empty-title {
    font-size: 18px;
    font-weight: 700;
    color: #555;
    margin-top: 8px;
}

.empty-sub {
    margin-top: 6px;
    font-size: 13px;
    color: #999;
    text-align: center;
}

@media (max-width: 768px) {
    .list-header {
        height: auto;
        align-items: flex-start;
    }

    .class-name {
        font-size: 20px;
    }

    .student-count {
        font-size: 14px;
    }

    .index-container {
        width: 28px;
        margin-right: 8px;
    }

    .student-row.list-mode {
        grid-template-columns: 44px 1fr auto;
        gap: 12px;
        padding: 12px;
    }

    .op {
        width: 36px;
        height: 30px;
    }

    .student-grid {
        grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
        gap: 14px;
    }
}

@media (max-width: 480px) {
    .class-name {
        font-size: 18px;
    }

    .student-count {
        font-size: 13px;
    }

    .count-detail {
        font-size: 12px;
    }

    .student-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
    }

    .student-row.list-mode {
        grid-template-columns: 40px 1fr;
        grid-template-rows: auto auto;
        gap: 8px;
        align-items: start;
    }

    .ops {
        grid-column: 1 / -1;
        justify-content: space-between;
        width: 100%;
        margin-top: 4px;
    }

    .op {
        flex: 1;
        width: auto;
    }
}
</style>
