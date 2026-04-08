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

                <section class="recent-records">
                    <div class="recent-records__head">
                        <strong>最近 5 条积分记录</strong>
                    </div>

                    <div v-if="recordsLoading" class="recent-records__empty">
                        正在加载积分记录...
                    </div>

                    <div v-else-if="recentRecords.length === 0" class="recent-records__empty">
                        暂无最近积分记录
                    </div>

                    <div v-else class="recent-records__list">
                        <div v-for="record in recentRecords" :key="record.id ?? `${record.created_at}-${record.rule_id}`" class="recent-record-item">
                            <div class="recent-record-item__head">
                                <strong>{{ record.rule_desc || "未知积分项" }}</strong>
                                <span :class="['recent-record-item__delta', inferDelta(record) >= 0 ? 'is-plus' : 'is-minus']">
                                    {{ inferDelta(record) >= 0 ? "+" : "-" }}{{ Math.abs(inferDelta(record)) }}
                                </span>
                            </div>
                            <p>{{ getRecordTimeLabel(record) }}</p>
                        </div>
                    </div>
                </section>
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
import { pointsManager } from "@/managers/points";
import type { Record as PointsApplyRecord } from "@/types/points";
import { formatChineseDateTime } from "@/utils/date";
import type { StudentsListCardItem } from "@/v3/components/students/StudentsListCard.vue";
import { ref, watch } from "vue";

/** 定义学生选择面板属性结构。 */
interface StudentsSelectionPanelProps {
    classId: number | null
    selectedStudent: StudentsListCardItem | null
    selectedStudents: StudentsListCardItem[]
    statusLabel: string
    title: string
}

const props = defineProps<StudentsSelectionPanelProps>()
const recentRecords = ref<PointsApplyRecord[]>([])
const recordsLoading = ref(false)
let recordsFetchSeq = 0

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

/** 将未知值转换为数字。 */
function toNumber(value: unknown, fallback = 0): number {
    const parsedValue = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}

/** 计算记录对应的积分变化值。 */
function inferDelta(record: PointsApplyRecord): number {
    const amount = toNumber(record.amount, 0)
    if (amount !== 0 && amount !== Math.abs(amount)) {
        return amount
    }

    const type = toNumber(record.type, 0)
    if (type === 2) {
        return -Math.abs(amount)
    }

    if (type === 1) {
        return Math.abs(amount)
    }

    return amount
}

/** 解析积分记录的时间戳。 */
function getRecordTimestamp(record: PointsApplyRecord): number {
    const rawValue = record.created_at
    if (!rawValue) {
        return 0
    }

    if (typeof rawValue === "number") {
        return rawValue
    }

    const parsedTimestamp = Date.parse(String(rawValue))
    return Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0
}

/** 返回积分记录的时间展示文案。 */
function getRecordTimeLabel(record: PointsApplyRecord): string {
    const timestamp = getRecordTimestamp(record)
    if (!timestamp) {
        return "时间未知"
    }

    return formatChineseDateTime(new Date(timestamp))
}

/** 加载当前单选学生最近 5 条积分记录。 */
async function loadRecentRecords(): Promise<void> {
    if (!props.classId || !props.selectedStudent) {
        recentRecords.value = []
        recordsLoading.value = false
        return
    }

    const currentFetchSeq = ++recordsFetchSeq
    recordsLoading.value = true
    try {
        const response = await pointsManager.listApplyRecords({
            class_id: props.classId,
            student_id: props.selectedStudent.id,
            limit: 5,
            offset: 0
        })

        if (currentFetchSeq !== recordsFetchSeq) {
            return
        }

        recentRecords.value = [...(response.items ?? [])].sort((left, right) => {
            const leftTimestamp = getRecordTimestamp(left) || toNumber(left.id, 0)
            const rightTimestamp = getRecordTimestamp(right) || toNumber(right.id, 0)
            return rightTimestamp - leftTimestamp
        }).slice(0, 5)
    } catch (error) {
        if (currentFetchSeq !== recordsFetchSeq) {
            return
        }

        console.error("加载学生最近积分记录失败", error)
        recentRecords.value = []
    } finally {
        if (currentFetchSeq === recordsFetchSeq) {
            recordsLoading.value = false
        }
    }
}

watch(() => [props.classId, props.selectedStudent?.id] as const, async () => {
    await loadRecentRecords()
}, { immediate: true })
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

.recent-records {
    margin-top: 18px;
}

.recent-records__head {
    margin-bottom: 12px;
}

.recent-records__head strong {
    display: block;
    font-size: 16px;
}

.recent-records__empty {
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(85, 104, 255, 0.06);
    color: #627099;
    line-height: 1.6;
}

.recent-records__list {
    display: grid;
    gap: 12px;
}

.recent-record-item {
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.72);
}

.recent-record-item__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.recent-record-item__head strong {
    display: block;
    font-size: 15px;
    line-height: 1.6;
}

.recent-record-item p {
    margin: 8px 0 0;
    color: #627099;
    font-size: 13px;
    line-height: 1.6;
}

.recent-record-item__delta {
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 800;
}

.recent-record-item__delta.is-plus {
    color: #067647;
}

.recent-record-item__delta.is-minus {
    color: #d92d20;
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
