<template>
    <article :id="`student-card-${student.id}`" class="student-card"
        :class="{ 'is-list': displayMode === 'list', 'is-selected': selected }" @click="emit('select', student.id)">
        <div v-if="selected" class="student-card__selected-badge">
            <i-ep-check />
        </div>
        <div class="student-card__accent" :class="student.toneClass" />

        <div class="student-card__head">
            <div class="student-card__main">
                <div class="student-profile">
                    <div class="student-avatar" :class="student.toneClass">
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

            <div v-if="displayMode !== 'list'" class="student-card__score-row">
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
    displayMode?: "card" | "list"
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
    overflow: hidden;
    padding: 24px 16px 20px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.student-card.is-list {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    min-height: 74px;
    padding: 14px 16px;
}

.student-card:hover,
.student-card.is-selected {
    transform: translateY(-2px);
    border-color: rgba(85, 104, 255, 0.24);
    box-shadow: 0 18px 36px rgba(85, 104, 255, 0.14);
}

.student-card.is-selected {
    border-color: rgba(85, 104, 255, 0.72);
    background: linear-gradient(180deg, rgba(85, 104, 255, 0.18), rgba(255, 255, 255, 0.98));
    box-shadow:
        0 0 0 3px rgba(85, 104, 255, 0.18),
        0 18px 36px rgba(85, 104, 255, 0.22);
}

.student-card.is-selected .student-card__accent {
    height: 5px;
    background: linear-gradient(90deg, #3f5cff, #8e6cff);
}

.student-card.is-selected .student-avatar {
    box-shadow: 0 0 0 3px rgba(85, 104, 255, 0.16);
}

.student-card__selected-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 2;
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 10px 20px rgba(85, 104, 255, 0.22);
}

.student-card__accent {
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: linear-gradient(90deg, #5568ff, #8e6cff);
}

.student-card__head {
    display: grid;
    gap: 10px;
}

.student-card__main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.student-card.is-list .student-card__head,
.student-card.is-list .student-card__main {
    min-width: 0;
}

.student-profile {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.student-avatar {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    color: #ffffff;
    font-size: 18px;
    font-weight: 800;
    border-radius: 14px;
    flex-shrink: 0;
}

.student-card.is-list .student-avatar {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    font-size: 16px;
}

.tone-blue {
    background: linear-gradient(135deg, #4f7cff, #6f8dff);
}

.tone-orange {
    background: linear-gradient(135deg, #ff9b4a, #ff7a59);
}

.tone-emerald {
    background: linear-gradient(135deg, #18b979, #34d399);
}

.tone-rose {
    background: linear-gradient(135deg, #ff6f91, #ff8fab);
}

.tone-violet {
    background: linear-gradient(135deg, #8b5cf6, #a78bfa);
}

.tone-cyan {
    background: linear-gradient(135deg, #06b6d4, #38bdf8);
}

.tone-slate {
    background: linear-gradient(135deg, #94a3b8, #7b8aa6);
}

.student-profile__body {
    min-width: 0;
    flex: 1;
}

.student-profile__inline {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.student-profile__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
}

.student-profile__name {
    display: block;
    max-width: 100%;
    font-size: 18px;
    line-height: 1.4;
    word-break: break-word;
}

.student-card.is-list .student-profile__name {
    font-size: 16px;
    line-height: 1.4;
    max-width: none;
    flex-shrink: 0;
    word-break: normal;
}

.student-profile__score {
    display: flex;
    align-items: center;
    gap: 4px;
    align-self: flex-start;
    flex: 0 0 auto;
    min-width: max-content;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--student-score-background, rgba(85, 104, 255, 0.08));
    color: var(--student-score-color, #5568ff);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
}

.student-profile__score-label,
.student-profile__score-separator {
    flex-shrink: 0;
}

.student-profile__score-value {
    flex-shrink: 0;
    min-width: 3ch;
    text-align: right;
    font-variant-numeric: tabular-nums;
}

.student-card.is-selected .student-profile__score {
    background: var(--student-score-background-selected, rgba(85, 104, 255, 0.14));
}

.student-card.is-list .student-profile__score {
    font-size: 12px;
    padding: 4px 10px;
}

.student-card__score-row {
    display: flex;
    padding-left: 54px;
}

.student-profile__body p {
    margin: 0;
    color: #627099;
    font-size: 13px;
    line-height: 1.6;
}

.student-card.is-list .student-profile__body p {
    margin-top: 0;
    font-size: 12px;
    line-height: 1.4;
    flex-shrink: 0;
}

.student-card__actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    align-self: center;
}

.icon-button {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 10px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.icon-button:hover {
    transform: translateY(-2px);
}

.icon-button--danger {
    background: rgba(255, 107, 129, 0.12);
    color: #d92d20;
}

@media (max-width: 1200px) {
    .student-card.is-list {
        grid-template-columns: minmax(0, 1fr);
        align-items: stretch;
    }
}

@media (max-width: 768px) {
    .student-card__main {
        grid-template-columns: minmax(0, 1fr);
        align-items: stretch;
    }

    .student-profile {
        align-items: flex-start;
    }

    .student-card__score-row {
        padding-left: 48px;
    }

    .student-card__actions {
        justify-content: flex-end;
        align-self: stretch;
    }

    .student-card.is-list .student-profile__meta {
        gap: 6px;
    }
}

@media (max-width: 520px) {
    .student-card {
        padding: 18px 14px 16px;
    }

    .student-card.is-list {
        padding: 12px 14px;
    }

    .student-profile {
        gap: 8px;
    }

    .student-avatar {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        font-size: 16px;
    }

    .student-card__score-row {
        padding-left: 0;
    }

    .student-profile__score {
        padding: 5px 10px;
        font-size: 12px;
    }
}
</style>
