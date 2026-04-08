<template>
    <article class="panel-surface side-card side-card--selected">
        <div class="panel-head">
            <div>
                <h3>{{ title }}</h3>
            </div>
            <span class="status-chip status-chip--sky">{{ statusLabel }}</span>
        </div>

        <div class="selection-panel__body">
            <template v-if="selectedStudent">
                <div class="selected-student">
                    <div class="selected-student__avatar" :class="selectedStudent.toneClass">
                        {{ selectedStudent.initials }}
                    </div>
                    <div class="selected-student__body">
                        <strong>{{ selectedStudent.name }}</strong>
                        <p>{{ selectedStudent.groupName }} · {{ getGenderLabel(selectedStudent.gender) }}</p>
                    </div>
                </div>

                <div class="detail-list">
                    <div class="detail-item">
                        <span>当前选中学生</span>
                        <strong>{{ selectedStudent.name }}</strong>
                    </div>
                    <div class="detail-item">
                        <span>当前所在分组</span>
                        <strong>{{ selectedStudent.groupName }}</strong>
                    </div>
                    <div class="detail-item">
                        <span>积分情况</span>
                        <strong>可用 {{ selectedStudent.availablePoints }} / 总分 {{ selectedStudent.totalPoints }}</strong>
                    </div>
                </div>
            </template>

            <template v-else-if="selectedStudents.length > 1">
                <div class="detail-list">
                    <div class="detail-item">
                        <span>当前已选择</span>
                        <strong>{{ selectedStudents.length }} 名学生</strong>
                    </div>
                </div>

                <div class="selected-name-list">
                    <div v-for="student in selectedStudents" :key="student.id" class="selected-name-item">
                        <strong>{{ student.name }}</strong>
                    </div>
                </div>
            </template>

            <div v-else class="side-empty">
                <strong>暂无选中学生</strong>
                <p>点击左侧学生卡片后，这里会显示单个学生详情，或展示当前多选的学生名单。</p>
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
import type { UiGender } from "@/components/class/ClassStudentList.vue";
import type { StudentsListCardItem } from "@/v3/components/students/StudentsListCard.vue";

/** 定义学生选择面板属性结构。 */
interface StudentsSelectionPanelProps {
    selectedStudent: StudentsListCardItem | null
    selectedStudents: StudentsListCardItem[]
    statusLabel: string
    title: string
}

defineProps<StudentsSelectionPanelProps>()

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
.panel-surface {
    display: flex;
    flex-direction: column;
    padding: 22px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.84);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    backdrop-filter: blur(16px);
    height: calc(100vh - 40px);
    max-height: calc(100vh - 40px);
    overflow: hidden;
}

.side-card--selected {
    background:
        linear-gradient(180deg, rgba(85, 104, 255, 0.08), rgba(255, 255, 255, 0.92)),
        rgba(255, 255, 255, 0.84);
}

.panel-head,
.selected-student {
    display: flex;
    align-items: center;
}

.panel-head {
    flex-shrink: 0;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 18px;
}

.selection-panel__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
}

.panel-head h3,
.selected-student__body strong {
    margin: 0;
}

.status-chip {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    background: rgba(59, 130, 246, 0.12);
    color: #2563eb;
}

.status-chip--sky {
    background: rgba(59, 130, 246, 0.12);
    color: #2563eb;
}

.selected-student {
    gap: 14px;
    padding: 16px 18px;
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.72);
}

.selected-student__avatar {
    width: 72px;
    height: 72px;
    display: grid;
    place-items: center;
    color: #ffffff;
    font-size: 24px;
    font-weight: 800;
    border-radius: 24px;
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

.selected-student__body {
    min-width: 0;
}

.selected-student__body strong {
    display: block;
    font-size: 20px;
}

.selected-student__body p {
    margin: 6px 0 0;
    color: #627099;
    line-height: 1.6;
}

.detail-list {
    display: grid;
    gap: 14px;
}

.detail-list:not(:first-child) {
    margin-top: 18px;
}

.selected-name-list {
    display: grid;
    gap: 12px;
    margin-top: 18px;
}

.selected-name-item {
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.72);
}

.selected-name-item strong {
    display: block;
    font-size: 16px;
    line-height: 1.6;
}

.detail-item {
    padding: 16px 18px;
    border-radius: 20px;
    background: rgba(85, 104, 255, 0.06);
}

.detail-item span {
    display: block;
    color: #627099;
    font-size: 13px;
}

.detail-item strong {
    display: block;
    margin-top: 8px;
    font-size: 17px;
    line-height: 1.6;
}

.side-empty {
    padding: 24px;
    border-radius: 24px;
    background: rgba(85, 104, 255, 0.06);
}

.side-empty strong {
    display: block;
    margin: 0;
    font-size: 18px;
}

.side-empty p {
    margin-top: 10px;
    color: #627099;
    line-height: 1.7;
}

@media (max-width: 768px) {
    .panel-surface {
        padding: 18px;
        height: auto;
        max-height: none;
    }

    .panel-head {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
