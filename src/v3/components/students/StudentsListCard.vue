<template>
    <article :id="`student-card-${student.id}`" class="student-card"
        :class="{ 'is-group': displayMode === 'group', 'is-list': displayMode === 'list', 'is-selected': selected }"
        @click.stop="emit('select', student.id)">
        <div v-if="selected && displayMode !== 'group'" class="student-card__selected-badge">
            <i-ep-check />
        </div>
        <div class="student-card__accent" :class="student.toneClass" />

        <div class="student-card__head">
            <div class="student-card__main">
                <div class="student-profile">
                    <div v-if="displayMode !== 'group'" class="student-avatar" :class="student.toneClass">
                        {{ student.initials }}
                    </div>
                    <div class="student-profile__body">
                        <div v-if="displayMode === 'list'" class="student-profile__inline">
                            <strong class="student-profile__name">{{ student.name }}</strong>
                            <p>{{ getGenderLabel(student.gender) }}</p>
                            <span class="student-profile__score" :style="getScoreStyle(student.toneClass)">
                                <span class="student-profile__score-label">可用</span>
                                <span class="student-profile__score-value">{{ student.availablePoints }}</span>
                                <span class="student-profile__score-separator">/</span>
                                <span class="student-profile__score-label">总分</span>
                                <span class="student-profile__score-value">{{ student.totalPoints }}</span>
                            </span>
                        </div>
                        <div v-else-if="displayMode === 'group'">
                            <strong class="student-profile__name">{{ student.name }}</strong>
                            <p class="student-profile__group-score">积分 {{ student.totalPoints }}</p>
                        </div>
                        <div v-else>
                            <strong class="student-profile__name">{{ student.name }}</strong>
                            <div class="student-profile__meta">
                                <p>{{ getGenderLabel(student.gender) }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="student-card__actions">
                    <button type="button" class="icon-button" @click.stop="emit('edit', student)">
                        <i-ep-edit-pen />
                    </button>
                    <button type="button" class="icon-button icon-button--danger" @click.stop="emit('remove', student)">
                        <i-ep-delete />
                    </button>
                </div>
            </div>

            <div v-if="displayMode === 'card'" class="student-card__score-row">
                <span class="student-profile__score" :style="getScoreStyle(student.toneClass)">
                    <span class="student-profile__score-label">可用</span>
                    <span class="student-profile__score-value">{{ student.availablePoints }}</span>
                    <span class="student-profile__score-separator">/</span>
                    <span class="student-profile__score-label">总分</span>
                    <span class="student-profile__score-value">{{ student.totalPoints }}</span>
                </span>
            </div>
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

/** 定义学生积分标签的配色结构。 */
interface StudentScoreToneStyle {
    background: string
    backgroundSelected: string
    color: string
}

const STUDENT_SCORE_TONE_STYLE_MAP: Record<string, StudentScoreToneStyle> = {
    "tone-blue": {
        color: "#4f7cff",
        background: "rgba(79, 124, 255, 0.1)",
        backgroundSelected: "rgba(79, 124, 255, 0.18)"
    },
    "tone-orange": {
        color: "#ff8a3d",
        background: "rgba(255, 138, 61, 0.12)",
        backgroundSelected: "rgba(255, 138, 61, 0.2)"
    },
    "tone-emerald": {
        color: "#18b979",
        background: "rgba(24, 185, 121, 0.12)",
        backgroundSelected: "rgba(24, 185, 121, 0.2)"
    },
    "tone-rose": {
        color: "#ff6f91",
        background: "rgba(255, 111, 145, 0.12)",
        backgroundSelected: "rgba(255, 111, 145, 0.2)"
    },
    "tone-violet": {
        color: "#8b5cf6",
        background: "rgba(139, 92, 246, 0.12)",
        backgroundSelected: "rgba(139, 92, 246, 0.2)"
    },
    "tone-cyan": {
        color: "#06b6d4",
        background: "rgba(6, 182, 212, 0.12)",
        backgroundSelected: "rgba(6, 182, 212, 0.2)"
    },
    "tone-slate": {
        color: "#64748b",
        background: "rgba(100, 116, 139, 0.12)",
        backgroundSelected: "rgba(100, 116, 139, 0.2)"
    }
}

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

/** 返回学生积分标签使用的动态样式。 */
function getScoreStyle(toneClass: string): Record<string, string> {
    const defaultToneStyle = STUDENT_SCORE_TONE_STYLE_MAP["tone-blue"] as StudentScoreToneStyle
    const toneStyle = STUDENT_SCORE_TONE_STYLE_MAP[toneClass] ?? defaultToneStyle

    return {
        "--student-score-background": toneStyle.background,
        "--student-score-background-selected": toneStyle.backgroundSelected,
        "--student-score-color": toneStyle.color
    }
}

</script>

<style scoped>
.student-card {
    position: relative;
    min-width: 0;
    min-height: 126px;
    padding: 14px;
    overflow: hidden;
    border: 1px solid var(--ta-line);
    border-radius: 16px;
    background: #ffffff;
    cursor: pointer;
    transition: border-color 140ms ease, box-shadow 140ms ease, transform 100ms ease;
}

.student-card:hover {
    border-color: rgba(0, 122, 255, 0.25);
}

.student-card:active {
    transform: scale(0.985);
}

.student-card.is-selected {
    border-color: rgba(0, 122, 255, 0.62);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.student-card.is-list {
    min-height: 68px;
    padding: 10px 12px;
}

.student-card.is-group {
    min-height: 72px;
    padding: 11px;
    background: var(--ta-surface-muted);
}

.student-card.is-group:hover {
    background: #ffffff;
}

.student-card.is-group.is-selected {
    background: var(--ta-blue-soft);
}

.student-card__accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--ta-blue);
}

.student-card__accent.tone-orange {
    background: #ff9f0a;
}

.student-card__accent.tone-emerald {
    background: #34c759;
}

.student-card__accent.tone-rose {
    background: #ff375f;
}

.student-card__accent.tone-violet {
    background: #af52de;
}

.student-card__accent.tone-cyan {
    background: #32ade6;
}

.student-card__accent.tone-slate {
    background: #8e8e93;
}

.student-card__selected-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 2;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #ffffff;
    background: var(--ta-blue);
    font-size: 13px;
}

.student-card__head {
    display: grid;
    gap: 12px;
}

.student-card__main,
.student-profile,
.student-profile__inline,
.student-card__score-row,
.student-profile__score,
.student-card__actions {
    display: flex;
    align-items: center;
}

.student-card__main {
    min-width: 0;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
}

.student-profile {
    min-width: 0;
    gap: 10px;
}

.student-avatar {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: #0069d6;
    background: #e7f3ff;
    font-size: 16px;
    font-weight: 700;
}

.student-avatar.tone-orange {
    color: #a84b00;
    background: #fff0e0;
}

.student-avatar.tone-emerald {
    color: #26713c;
    background: #e9f8ed;
}

.student-avatar.tone-rose {
    color: #b42345;
    background: #fff0f3;
}

.student-avatar.tone-violet {
    color: #74409b;
    background: #f6edfb;
}

.student-avatar.tone-cyan {
    color: #087a99;
    background: #e9f8fc;
}

.student-avatar.tone-slate {
    color: #59616d;
    background: #eff1f4;
}

.student-profile__body {
    min-width: 0;
}

.student-profile__name {
    display: block;
    overflow: hidden;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.student-profile__meta p,
.student-profile__inline p {
    margin: 3px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.student-profile__inline {
    min-width: 0;
    gap: 10px;
    flex-wrap: wrap;
}

.student-profile__inline p {
    margin: 0;
}

.student-card__actions {
    flex: 0 0 auto;
    gap: 5px;
}

.icon-button {
    width: 30px;
    height: 30px;
    padding: 0;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 9px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    cursor: pointer;
}

.icon-button:hover {
    color: var(--ta-text);
}

.icon-button--danger:hover {
    color: var(--ta-red);
    background: var(--ta-red-soft);
}

.icon-button svg {
    width: 15px;
    height: 15px;
}

.student-card__score-row {
    justify-content: flex-end;
}

.student-profile__score {
    min-height: 30px;
    padding: 0 9px;
    gap: 5px;
    border-radius: 9px;
    color: var(--student-score-color, var(--ta-blue));
    background: var(--student-score-background, var(--ta-blue-soft));
    font-size: 12px;
    white-space: nowrap;
}

.student-profile__score-label {
    color: var(--ta-text-tertiary);
}

.student-profile__score-value {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.student-profile__score-separator {
    color: var(--ta-line-strong);
}

.student-card.is-list .student-card__head,
.student-card.is-list .student-card__main {
    width: 100%;
}

.student-card.is-group .student-card__head,
.student-card.is-group .student-card__main {
    width: 100%;
}

.student-card.is-group .student-card__main {
    align-items: center;
}

.student-card.is-group .student-profile {
    flex: 1;
}

.student-card.is-group .student-profile__name {
    font-size: 14px;
}

.student-profile__group-score {
    margin: 3px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
}

.student-card.is-group .student-card__actions {
    gap: 3px;
}

.student-card.is-group .icon-button {
    width: 27px !important;
    height: 27px !important;
    min-height: 27px !important;
    border-radius: 8px;
}

.student-card.is-list .student-card__main {
    align-items: center;
}

.student-card.is-list .student-profile {
    flex: 1;
}

@media (max-width: 660px) {
    .student-card {
        min-height: 118px;
    }
}
</style>
