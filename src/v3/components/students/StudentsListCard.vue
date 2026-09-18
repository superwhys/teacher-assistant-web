<template>
    <article :id="`student-card-${student.id}`" class="student-card"
        :class="{ 'is-group': displayMode === 'group', 'is-list': displayMode === 'list', 'is-selected': selected }">
        <button type="button" class="student-card__select" :aria-pressed="selected"
            :aria-label="`选择${student.name}，可用积分${student.availablePoints}，总积分${student.totalPoints}`"
            @click.stop="emit('select', student.id)" />

        <div class="student-card__head">
            <div v-if="displayMode !== 'group'" class="student-avatar" aria-hidden="true">{{ student.initials }}</div>
            <div class="student-profile">
                <strong class="student-profile__name">{{ student.name }}</strong>
                <p>{{ getGenderLabel(student.gender) }} · {{ student.groupName }}</p>
            </div>
        </div>

        <el-dropdown class="student-card__actions" trigger="click" placement="bottom-end">
            <button type="button" class="student-card__menu" :aria-label="`管理${student.name}`" @click.stop>
                <i-ep-more-filled aria-hidden="true" />
            </button>
            <template #dropdown>
                <el-dropdown-menu>
                    <el-dropdown-item @click="emit('edit', student)"><i-ep-edit-pen />编辑学生</el-dropdown-item>
                    <el-dropdown-item divided @click="emit('remove', student)"><i-ep-delete />删除学生</el-dropdown-item>
                </el-dropdown-menu>
            </template>
        </el-dropdown>

        <div class="student-card__score-row">
            <template v-if="displayMode !== 'group'">
                <span class="student-profile__available"><strong>{{ student.availablePoints }}</strong> 可用</span>
                <span class="student-profile__total">总分 {{ student.totalPoints }}</span>
            </template>
            <span v-else class="student-profile__total">积分 {{ student.totalPoints }}</span>
            <i-ep-circle-check-filled v-if="selected" class="student-card__selected-badge" aria-hidden="true" />
        </div>
    </article>
</template>

<script setup lang="ts">
import type { UiGender, UiStudent } from "@/components/class/ClassStudentList.vue";

/** 定义学生卡片展示结构。 */
export type StudentsListCardItem = UiStudent & {
    /** 表示学生当前可用于兑换或消费的可用积分。 */
    availablePoints: number
    /** 表示学生当前所属分组的 ID，未分组时为空。 */
    groupId: number | null
    /** 表示学生当前所属分组的名称，用于列表和详情展示。 */
    groupName: string
    /** 表示学生头像中展示的姓名首字。 */
    initials: string
    /** 表示学生当前卡片附带的业务标签集合。 */
    tags: string[]
    /** 表示学生卡片头像和顶部色条使用的配色类名。 */
    toneClass: string
    /** 表示学生累计获得的总积分。 */
    totalPoints: number
}

/** 定义学生卡片属性结构。 */
interface StudentsListCardProps {
    displayMode?: "card" | "list" | "group"
    selected: boolean
    student: StudentsListCardItem
}

/** 定义学生卡片事件结构。 */
interface StudentsListCardEmits {
    (event: "edit", student: StudentsListCardItem): void
    (event: "remove", student: StudentsListCardItem): void
    (event: "select", studentId: number): void
}

withDefaults(defineProps<StudentsListCardProps>(), {
    displayMode: "card"
})
const emit = defineEmits<StudentsListCardEmits>()

/** 返回性别显示文案。 */
function getGenderLabel(gender: UiGender): string {
    if (gender === "male") {
        return "男生"
    }

    if (gender === "female") {
        return "女生"
    }

    return "性别未知"
}

</script>

<style scoped>
.student-card {
    position: relative;
    min-width: 0;
    padding: 16px;
    display: grid;
    gap: 18px;
    border: 1px solid var(--ta-line);
    border-radius: 15px;
    background: var(--ta-surface-solid);
    transition: border-color 140ms ease, box-shadow 140ms ease, transform 100ms ease;
}

.student-card:hover {
    border-color: rgba(0, 122, 255, 0.3);
}

.student-card:has(.student-card__select:active) {
    transform: scale(0.985);
}

.student-card.is-selected {
    border-color: var(--ta-blue);
    box-shadow: 0 0 0 2px var(--ta-blue-soft);
}

.student-card__select {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: inherit;
    background: transparent;
    cursor: pointer;
}

.student-card__head {
    min-width: 0;
    padding-right: 25px;
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: none;
}

.student-avatar {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
    font-size: 17px;
    font-weight: 600;
}

.student-profile {
    min-width: 0;
}

.student-profile__name {
    display: block;
    color: var(--ta-text);
    font-size: 17px;
    line-height: 1.4;
    overflow-wrap: anywhere;
}

.student-profile p {
    margin: 3px 0 0;
    color: var(--ta-text-secondary);
    font-size: 12px;
    overflow-wrap: anywhere;
}

.student-card__actions {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 2;
}

.student-card__menu {
    width: 34px;
    height: 34px;
    padding: 0;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 9px;
    color: var(--ta-text-secondary);
    background: transparent;
    cursor: pointer;
}

.student-card__menu:hover {
    background: var(--ta-surface-muted);
}

.student-card__menu svg {
    width: 17px;
    height: 17px;
}

.student-card__score-row {
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
    color: var(--ta-text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
}

.student-profile__available strong {
    color: var(--ta-text);
    font-size: 23px;
    font-weight: 650;
}

.student-profile__total {
    margin-left: auto;
}

.student-card__selected-badge {
    width: 16px;
    height: 16px;
    align-self: center;
    color: var(--ta-blue);
}

.student-card.is-list {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    padding-right: 48px;
}

.student-card.is-list .student-card__head {
    padding-right: 0;
}

.student-card.is-group {
    gap: 10px;
    padding: 12px;
}

.student-card.is-group .student-profile__name {
    font-size: 15px;
}

.student-card.is-group .student-profile__total {
    margin-left: 0;
    margin-right: auto;
}

@media (max-width: 920px) {
    .student-card__menu {
        width: 44px;
        height: 44px;
    }

    .student-card__actions {
        top: 0;
        right: 0;
    }
}

@media (max-width: 660px) {
    .student-card {
        padding: 12px;
        gap: 15px;
    }

    .student-card__head {
        gap: 7px;
        padding-right: 24px;
    }

    .student-avatar {
        width: 32px;
        height: 32px;
        font-size: 15px;
    }

    .student-profile__name {
        font-size: 15px;
    }

    .student-profile p,
    .student-card__score-row {
        font-size: 11px;
    }

    .student-profile__available strong {
        font-size: 20px;
    }

    .student-card.is-list {
        grid-template-columns: 1fr;
    }
}
</style>
