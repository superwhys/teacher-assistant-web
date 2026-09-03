<template>
    <article class="panel-surface side-card side-card--selected">
        <div class="panel-head">
            <div>
                <h3>{{ title }}</h3>
            </div>
            <div class="panel-head__actions">
                <button
                    v-if="selectedStudents.length > 1"
                    type="button"
                    class="clear-action-button"
                    @click="emit('clear-selected-students')"
                >
                    清空
                </button>
                <button v-if="selectedStudent" type="button" class="icon-action-button" title="定位到学生位置"
                    @click="emit('locate-student', selectedStudent.id)">
                    <i-ep-location />
                </button>
                <span class="status-chip status-chip--sky">{{ statusLabel }}</span>
            </div>
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
                        <span>积分情况</span>
                        <strong>可用 {{ selectedStudent.availablePoints }} / 总分 {{ selectedStudent.totalPoints }}</strong>
                    </div>
                </div>

                <section class="points-actions-card">
                    <div class="points-actions-card__head">
                        <span>积分操作</span>
                        <strong>{{ isArchivedSemester ? "归档学期不支持积分操作" : "支持当前学生单独加分或扣分" }}</strong>
                    </div>

                    <div class="points-actions-grid">
                        <button type="button" class="action-button action-button--plus" :disabled="isPointsActionDisabled"
                            @click="emit('open-points', { tab: 'plus' })">
                            <i-ep-plus />
                            <span>{{ pointsApplying ? "处理中..." : "单人加分" }}</span>
                        </button>
                        <button type="button" class="action-button action-button--minus" :disabled="isPointsActionDisabled"
                            @click="emit('open-points', { tab: 'minus' })">
                            <i-ep-minus />
                            <span>{{ pointsApplying ? "处理中..." : "单人扣分" }}</span>
                        </button>
                    </div>
                </section>

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

                <section class="points-actions-card">
                    <div class="points-actions-card__head">
                        <span>积分操作</span>
                        <strong>{{ isArchivedSemester ? "归档学期不支持积分操作" : `支持当前选中的 ${selectedStudents.length} 名学生批量加分或扣分` }}</strong>
                    </div>

                    <div class="points-actions-grid">
                        <button type="button" class="action-button action-button--plus" :disabled="isPointsActionDisabled"
                            @click="emit('open-points', { tab: 'plus' })">
                            <i-ep-plus />
                            <span>{{ pointsApplying ? "处理中..." : `批量加分（${selectedStudents.length}）` }}</span>
                        </button>
                        <button type="button" class="action-button action-button--minus" :disabled="isPointsActionDisabled"
                            @click="emit('open-points', { tab: 'minus' })">
                            <i-ep-minus />
                            <span>{{ pointsApplying ? "处理中..." : `批量扣分（${selectedStudents.length}）` }}</span>
                        </button>
                    </div>
                </section>

                <div class="selected-name-list">
                    <div v-for="student in selectedStudents" :key="student.id" class="selected-name-item">
                        <div class="selected-name-item__main">
                            <div class="selected-name-item__avatar" :class="student.toneClass">
                                {{ student.initials }}
                            </div>
                            <div class="selected-name-item__body">
                                <strong>{{ student.name }}</strong>
                                <p>{{ student.groupName }} · 可用 {{ student.availablePoints }} / 总分 {{ student.totalPoints }}</p>
                            </div>
                        </div>
                        <div class="selected-name-item__actions">
                            <span class="selected-name-item__badge">{{ student.groupName }}</span>
                            <button type="button" class="selected-name-item__remove" title="移除当前学生"
                                @click="emit('remove-selected-student', student.id)">
                                <i-ep-close />
                            </button>
                        </div>
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
import { computed, ref, watch } from "vue";

/** 定义学生选择面板属性结构。 */
interface StudentsSelectionPanelProps {
    classId: number | null
    isArchivedSemester?: boolean
    pointsApplying?: boolean
    selectedStudent: StudentsListCardItem | null
    selectedStudents: StudentsListCardItem[]
    statusLabel: string
    title: string
}

/** 定义学生选择面板事件结构。 */
interface StudentsSelectionPanelEmits {
    (event: "clear-selected-students"): void
    (event: "locate-student", studentId: number): void
    (event: "open-points", payload: { tab: "plus" | "minus" }): void
    (event: "remove-selected-student", studentId: number): void
}

const props = defineProps<StudentsSelectionPanelProps>()
const emit = defineEmits<StudentsSelectionPanelEmits>()
const recentRecords = ref<PointsApplyRecord[]>([])
const recordsLoading = ref(false)
let recordsFetchSeq = 0
const isArchivedSemester = computed<boolean>(() => Boolean(props.isArchivedSemester))
const pointsApplying = computed<boolean>(() => Boolean(props.pointsApplying))
const isPointsActionDisabled = computed<boolean>(() => isArchivedSemester.value || pointsApplying.value)

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
.side-card {
    min-width: 0;
    padding: 20px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface);
    box-shadow: var(--ta-shadow-1);
    backdrop-filter: blur(18px) saturate(150%);
}

.panel-head,
.panel-head__actions,
.selected-student,
.detail-item,
.points-actions-grid,
.recent-record-item__head,
.selected-name-item,
.selected-name-item__main,
.selected-name-item__actions {
    display: flex;
    align-items: center;
}

.panel-head {
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
}

.panel-head h3 {
    margin: 0;
    font-size: 17px;
    letter-spacing: -0.015em;
}

.panel-head__actions {
    justify-content: flex-end;
    gap: 6px;
    flex-wrap: wrap;
}

.clear-action-button,
.icon-action-button,
.selected-name-item__remove {
    border: 0;
    color: var(--ta-blue);
    background: transparent;
    cursor: pointer;
}

.clear-action-button {
    padding: 4px 0;
    font-size: 12px;
    font-weight: 600;
}

.icon-action-button,
.selected-name-item__remove {
    width: 30px;
    height: 30px;
    padding: 0;
    display: grid;
    place-items: center;
    border-radius: 9px;
    color: var(--ta-text-secondary);
    background: var(--ta-surface-muted);
}

.icon-action-button svg,
.selected-name-item__remove svg {
    width: 15px;
    height: 15px;
}

.status-chip {
    min-height: 26px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: #0064cf;
    background: #e6f2ff;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
}

.selection-panel__body {
    display: grid;
    gap: 14px;
}

.selected-student {
    gap: 10px;
}

.selected-student__avatar,
.selected-name-item__avatar {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    color: #0069d6;
    background: #e7f3ff;
    font-weight: 700;
}

.selected-student__avatar {
    width: 48px;
    height: 48px;
    border-radius: 15px;
    font-size: 16px;
}

.selected-name-item__avatar {
    width: 36px;
    height: 36px;
    border-radius: 11px;
    font-size: 13px;
}

.tone-orange {
    color: #a84b00;
    background: #fff0e0;
}

.tone-emerald {
    color: #26713c;
    background: #e9f8ed;
}

.tone-rose {
    color: #b42345;
    background: #fff0f3;
}

.tone-violet {
    color: #74409b;
    background: #f6edfb;
}

.tone-cyan {
    color: #087a99;
    background: #e9f8fc;
}

.tone-slate {
    color: #59616d;
    background: #eff1f4;
}

.selected-student__body,
.selected-name-item__body {
    min-width: 0;
}

.selected-student__body strong,
.selected-name-item__body strong {
    display: block;
    font-size: 14px;
}

.selected-student__body p,
.selected-name-item__body p,
.recent-record-item p,
.side-empty p {
    margin: 3px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 11px;
    line-height: 1.45;
}

.detail-list {
    display: grid;
}

.detail-item {
    min-height: 50px;
    padding: 10px 0;
    justify-content: space-between;
    gap: 14px;
    border-top: 1px solid var(--ta-line);
    border-bottom: 1px solid var(--ta-line);
}

.detail-item span {
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.detail-item strong {
    color: var(--ta-text-secondary);
    font-size: 13px;
    text-align: right;
}

.points-actions-card {
    padding: 13px;
    border-radius: 14px;
    background: var(--ta-surface-muted);
}

.points-actions-card__head span,
.points-actions-card__head strong {
    display: block;
}

.points-actions-card__head span {
    color: var(--ta-text-tertiary);
    font-size: 11px;
}

.points-actions-card__head strong {
    margin-top: 4px;
    color: var(--ta-text-secondary);
    font-size: 12px;
    line-height: 1.45;
}

.points-actions-grid {
    margin-top: 10px;
    gap: 7px;
}

.action-button {
    min-height: 38px;
    padding: 0 12px;
    flex: 1 1 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 620;
    cursor: pointer;
}

.action-button svg {
    width: 15px;
    height: 15px;
}

.action-button--plus {
    color: #ffffff;
    background: var(--ta-green);
}

.action-button--minus {
    color: #ffffff;
    background: var(--ta-red);
}

.action-button:disabled {
    opacity: 0.42;
}

.recent-records {
    padding-top: 2px;
}

.recent-records__head strong {
    font-size: 13px;
}

.recent-records__list,
.selected-name-list {
    display: grid;
    margin-top: 8px;
}

.recent-record-item {
    min-height: 48px;
    padding: 9px 0;
    border-top: 1px solid var(--ta-line);
}

.recent-record-item__head {
    justify-content: space-between;
    gap: 12px;
}

.recent-record-item__head strong {
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.recent-record-item__delta {
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
}

.recent-record-item__delta.is-plus {
    color: var(--ta-green);
}

.recent-record-item__delta.is-minus {
    color: var(--ta-red);
}

.recent-records__empty,
.side-empty {
    min-height: 120px;
    padding: 20px;
    display: grid;
    place-items: center;
    align-content: center;
    border-radius: 14px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    font-size: 12px;
    text-align: center;
}

.side-empty strong {
    color: var(--ta-text);
    font-size: 14px;
}

.selected-name-item {
    min-height: 56px;
    padding: 8px 0;
    justify-content: space-between;
    gap: 10px;
    border-top: 1px solid var(--ta-line);
}

.selected-name-item__main {
    min-width: 0;
    gap: 9px;
}

.selected-name-item__actions {
    flex: 0 0 auto;
    gap: 5px;
}

.selected-name-item__badge {
    min-height: 23px;
    padding: 0 7px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    font-size: 10px;
}

@media (max-width: 660px) {
    .side-card {
        padding: 16px;
    }

    .panel-head {
        align-items: stretch;
        flex-direction: column;
    }

    .panel-head__actions {
        justify-content: flex-start;
    }
}
</style>
