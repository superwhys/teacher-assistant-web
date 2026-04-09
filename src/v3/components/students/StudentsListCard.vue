<template>
    <article :id="`student-card-${student.id}`" class="student-card" :class="{ 'is-selected': selected }" @click="emit('select', student.id)">
        <div v-if="selected" class="student-card__selected-badge">
            <i-ep-check />
        </div>
        <div class="student-card__accent" :class="student.toneClass" />

        <div class="student-card__head">
            <div class="student-profile">
                <div class="student-avatar" :class="student.toneClass">
                    {{ student.initials }}
                </div>
                <div class="student-profile__body">
                    <strong>{{ student.name }}</strong>
                    <p>{{ getGenderLabel(student.gender) }}</p>
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

        <div class="student-tags">
            <span v-for="tag in student.tags" :key="tag" class="student-tag">
                {{ tag }}
            </span>
        </div>

        <div class="student-score">
            <strong>{{ `可用 ${student.availablePoints} / 总分 ${student.totalPoints}` }}</strong>
        </div>
    </article>
</template>

<script setup lang="ts">
import type { UiGender, UiStudent } from "@/components/class/ClassStudentList.vue";

/** 定义学生卡片展示结构。 */
export type StudentsListCardItem = UiStudent & {
    availablePoints: number
    groupId: number | null
    groupName: string
    initials: string
    tags: string[]
    toneClass: string
    totalPoints: number
}

/** 定义学生卡片属性结构。 */
interface StudentsListCardProps {
    selected: boolean
    student: StudentsListCardItem
}

/** 定义学生卡片事件结构。 */
interface StudentsListCardEmits {
    (event: "edit", student: StudentsListCardItem): void
    (event: "remove", student: StudentsListCardItem): void
    (event: "select", studentId: number): void
}

defineProps<StudentsListCardProps>()
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
    overflow: hidden;
    padding: 20px 16px 16px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.student-card:hover,
.student-card.is-selected {
    transform: translateY(-2px);
    border-color: rgba(85, 104, 255, 0.24);
    box-shadow: 0 18px 36px rgba(85, 104, 255, 0.14);
}

.student-card.is-selected {
    border-color: rgba(85, 104, 255, 0.5);
    background: linear-gradient(180deg, rgba(85, 104, 255, 0.12), rgba(255, 255, 255, 0.96));
    box-shadow:
        0 0 0 2px rgba(85, 104, 255, 0.16),
        0 18px 36px rgba(85, 104, 255, 0.18);
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
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

.tone-blue {
    background: linear-gradient(135deg, #5568ff, #7c8cff);
}

.tone-purple {
    background: linear-gradient(135deg, #8e6cff, #b084ff);
}

.tone-rose {
    background: linear-gradient(135deg, #ff8f6b, #ff6b81);
}

.tone-green {
    background: linear-gradient(135deg, #14b8a6, #12b981);
}

.student-profile__body {
    min-width: 0;
}

.student-profile__body strong {
    display: block;
    margin: 0;
    font-size: 18px;
}

.student-profile__body p {
    margin: 4px 0 0;
    color: #627099;
    font-size: 13px;
    line-height: 1.6;
}

.student-card__actions {
    display: flex;
    gap: 6px;
}

.student-tags {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.student-tag {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.08);
    color: #5568ff;
    font-size: 11px;
    font-weight: 700;
}

.student-score {
    display: flex;
    align-items: center;
    margin-top: 14px;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(85, 104, 255, 0.06);
}

.student-score strong {
    color: #16213e;
    font-size: 15px;
    line-height: 1.5;
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

@media (max-width: 768px) {
    .student-card__head {
        flex-direction: column;
        align-items: stretch;
    }

    .student-card__actions {
        justify-content: flex-end;
    }
}
</style>
