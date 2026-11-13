<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CollectionStatus, CollectionTaskDetail, CollectionTaskStudent, CollectionUpdate } from '@/types/collectionTask'

const props = defineProps<{ task: CollectionTaskDetail; writable: boolean; busy: boolean }>()
const emit = defineEmits<{ update: [updates: CollectionUpdate[]] }>()
const labels: Record<CollectionStatus, string> = { pending: '待交', submitted: '已交', exempt: '免交' }
const filter = ref<CollectionStatus | 'all'>('all')
const bulk = ref(false)
const keepPending = ref<number[]>([])
const pending = computed(() => props.task.students.filter(student => student.status === 'pending'))
const toSubmit = computed(() => pending.value.filter(student => !keepPending.value.includes(student.student_id)))
const displayed = computed(() => {
    if (bulk.value) return pending.value
    return filter.value === 'all' ? props.task.students : props.task.students.filter(student => student.status === filter.value)
})
const filters = computed(() => [
    { value: 'all', label: '全部', count: props.task.students.length },
    { value: 'pending', label: labels.pending, count: props.task.pending_count },
    { value: 'submitted', label: labels.submitted, count: props.task.submitted_count },
    { value: 'exempt', label: labels.exempt, count: props.task.exempt_count },
] as const)

function closeBulk() {
    bulk.value = false
    keepPending.value = []
}

watch([() => props.task.version, () => props.writable], closeBulk)

function changeStatus(student: CollectionTaskStudent, status: CollectionStatus) {
    if (props.writable && !props.busy && status !== student.status) {
        emit('update', [{ student_id: student.student_id, status }])
    }
}

function collectRemaining() {
    if (!props.writable || props.busy || !bulk.value || !toSubmit.value.length) return
    emit('update', toSubmit.value.map(student => ({ student_id: student.student_id, status: 'submitted' })))
}
</script>

<template>
    <div class="roster">
        <div v-if="!bulk" class="toolbar">
            <div class="filters" role="group" aria-label="筛选收交状态">
                <button v-for="item in filters" :key="item.value" type="button"
                    :aria-pressed="filter === item.value" @click="filter = item.value">
                    {{ item.label }} {{ item.count }}
                </button>
            </div>
            <button v-if="writable && pending.length" type="button" class="action-button"
                :disabled="busy" @click="bulk = true">批量收齐</button>
        </div>
        <div v-else class="bulk-panel">
            <p>勾选仍待交的学生，其余待交学生将统一登记为已交。</p>
            <div class="bulk-actions">
                <button type="button" class="action-button" :disabled="busy" @click="closeBulk">取消</button>
                <button type="button" class="primary-button" :disabled="busy || !toSubmit.length" @click="collectRemaining">
                    {{ busy ? '登记中…' : '将 ' + toSubmit.length + ' 人记为已交' }}
                </button>
            </div>
        </div>
        <p v-if="!displayed.length" class="empty" role="status">
            {{ filter === 'pending' ? '这项作业已经收齐。' : '当前没有符合条件的学生。' }}
        </p>
        <ul v-else class="students">
            <li v-for="student in displayed" :key="student.student_id" class="student">
                <div class="student-info">
                    <strong>{{ student.student_name }}</strong>
                    <small v-if="student.awarded">已发积分</small>
                </div>
                <label v-if="bulk" class="exception">
                    <input v-model="keepPending" type="checkbox" :value="student.student_id"
                        :disabled="busy" :aria-label="student.student_name + ' 保留待交'" />
                    保留待交
                </label>
                <el-select v-else-if="writable" :class="['status-select', student.status]" :model-value="student.status"
                    :aria-label="student.student_name + '的收交状态'" :disabled="busy"
                    @update:model-value="changeStatus(student, $event)">
                    <el-option v-for="(label, value) in labels" :key="value" :label="label" :value="value" />
                </el-select>
                <span v-else :class="['status', student.status]">{{ labels[student.status] }}</span>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.roster { display: grid; gap: 16px; min-width: 0; }
.toolbar, .bulk-panel, .filters, .bulk-actions, .student, .student-info, .exception {
    display: flex;
    align-items: center;
    gap: 8px;
}
.toolbar, .bulk-panel { justify-content: space-between; flex-wrap: wrap; }
.filters { flex-wrap: wrap; gap: 4px; }
.filters button {
    padding: 6px 10px;
    color: var(--ta-text-secondary);
    border: 1px solid transparent;
    border-radius: var(--ta-radius-small);
    background: transparent;
    cursor: pointer;
}
.filters button[aria-pressed="true"] { background: var(--ta-blue-soft); color: var(--ta-blue-hover); font-weight: 600; }
.bulk-panel { padding: 12px; border-radius: var(--ta-radius-small); background: var(--ta-blue-soft); }
p { margin: 0; color: var(--ta-text-secondary); font-size: 13px; }
.students { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(225px, 100%), 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none; }
.student { justify-content: space-between; min-width: 0; padding: 10px 12px; border: 1px solid var(--ta-line); border-radius: var(--ta-radius-small); }
.student-info { min-width: 0; flex-wrap: wrap; }
.student-info strong { font-size: 14px; overflow-wrap: anywhere; }
.student-info small { color: var(--ta-text-secondary); }
.status, .exception { flex-shrink: 0; font-size: 13px; }
.status { padding: 4px 6px; border: 1px solid var(--ta-line); border-radius: var(--ta-radius-small); color: var(--status-color); background: var(--status-bg); }
.pending { --status-color: var(--ta-orange); --status-bg: var(--ta-orange-soft); }
.submitted { --status-color: var(--ta-green); --status-bg: var(--ta-green-soft); }
.exempt { --status-color: var(--ta-text-secondary); --status-bg: var(--ta-surface-muted); }
.status-select {
    flex: 0 0 92px;
    --el-input-text-color: var(--status-color);
    --el-fill-color-blank: var(--status-bg);
    --el-border-radius-base: var(--ta-radius-small);
}
.exception input { accent-color: var(--ta-blue); }
</style>
