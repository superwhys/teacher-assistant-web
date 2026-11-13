<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { collectionTaskApi } from '@/api/collectionTask'
import { isApiRequestError } from '@/types/api'
import type { CollectionTaskDetail, CollectionTaskSummary, CollectionUpdate } from '@/types/collectionTask'
import CollectionTaskRoster from './CollectionTaskRoster.vue'
import CollectionAwardButton from './CollectionAwardButton.vue'

const props = defineProps<{ classId: number; semesterId: number; writable: boolean }>()
const tasks = ref<CollectionTaskSummary[]>([])
const activeId = ref<number | null>(null)
const detail = ref<CollectionTaskDetail | null>(null)
const listLoading = ref(true)
const detailLoading = ref(false)
const listError = ref('')
const detailError = ref('')
const updateError = ref('')
const saving = ref(false)
const creating = ref(false)
const showCreate = ref(false)
const title = ref('')
const createError = ref('')
const createdDate = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' })

let active = true
let detailRequest = 0
let createIntent: { title: string; id: string } | null = null

onBeforeUnmount(() => { active = false })
watch(() => props.writable, writable => {
    if (!writable) showCreate.value = false
})

function applyDetail(task: CollectionTaskDetail) {
    if (!active || task.id !== activeId.value || (detail.value && task.version < detail.value.version)) return
    detail.value = task
    const index = tasks.value.findIndex(item => item.id === task.id)
    if (index >= 0) tasks.value[index] = task
}

async function openTask(id: number) {
    const request = ++detailRequest
    activeId.value = id
    detail.value = null
    detailError.value = ''
    updateError.value = ''
    detailLoading.value = true
    try {
        const { data } = await collectionTaskApi.detail(props.classId, id, props.semesterId)
        if (active && request === detailRequest) applyDetail(data)
    } catch (error) {
        if (active && request === detailRequest) detailError.value = error instanceof Error ? error.message : '读取名单失败'
    } finally {
        if (active && request === detailRequest) detailLoading.value = false
    }
}

async function loadTasks() {
    listLoading.value = true
    listError.value = ''
    try {
        const { data } = await collectionTaskApi.list(props.classId, props.semesterId)
        if (!active) return
        tasks.value = data.tasks
        if (tasks.value[0]) void openTask(tasks.value[0].id)
    } catch (error) {
        if (active) listError.value = error instanceof Error ? error.message : '读取作业列表失败'
    } finally {
        if (active) listLoading.value = false
    }
}

async function createTask() {
    const name = title.value.trim()
    if (!active || !props.writable || creating.value || saving.value) return
    if (!name || [...name].length > 100) {
        createError.value = '请输入 1 至 100 个字的作业名称'
        return
    }
    creating.value = true
    createError.value = ''
    try {
        if (createIntent?.title !== name) createIntent = { title: name, id: crypto.randomUUID() }
        const { data } = await collectionTaskApi.create(props.classId, {
            title: name, semester_id: props.semesterId, client_request_id: createIntent.id,
        })
        if (!active) return
        ++detailRequest
        activeId.value = data.id
        detail.value = data
        detailLoading.value = false
        detailError.value = ''
        updateError.value = ''
        tasks.value = [data, ...tasks.value.filter(task => task.id !== data.id)]
        showCreate.value = false
        title.value = ''
        createIntent = null
    } catch (error) {
        if (active) createError.value = error instanceof Error ? error.message : '创建作业失败，可重试'
    } finally {
        if (active) creating.value = false
    }
}

async function updateStudents(updates: CollectionUpdate[]) {
    const task = detail.value
    if (!active || !props.writable || !task || !updates.length || saving.value || creating.value) return
    saving.value = true
    updateError.value = ''
    try {
        const { data } = await collectionTaskApi.update(props.classId, task.id, {
            semester_id: props.semesterId, version: task.version, updates,
        })
        applyDetail(data)
    } catch (error) {
        if (!active || task.id !== activeId.value) return
        if (isApiRequestError(error) && error.code === 100409) {
            await openTask(task.id)
            if (active && task.id === activeId.value) updateError.value = '名单已更新，请核对最新状态后重新登记。'
        } else {
            updateError.value = error instanceof Error ? error.message : '登记失败，请重试'
        }
    } finally {
        if (active) saving.value = false
    }
}

void loadTasks()
</script>

<template>
    <div class="workspace">
        <section class="task-list" aria-label="作业列表">
            <header>
                <h2>作业列表</h2>
                <button v-if="writable && !showCreate" type="button" class="action-button"
                    :disabled="listLoading || !!listError || saving" @click="showCreate = true">新建作业</button>
            </header>
            <form v-if="showCreate && writable" class="create-form" @submit.prevent="createTask">
                <label for="collection-title">作业名称</label>
                <input id="collection-title" v-model="title" required maxlength="100"
                    placeholder="例如：周五口算本" :disabled="creating" />
                <p v-if="createError" class="error" role="alert">{{ createError }}</p>
                <div class="form-actions">
                    <button type="button" class="action-button" :disabled="creating" @click="showCreate = false">收起</button>
                    <button type="submit" class="primary-button" :disabled="creating || saving || !title.trim()">
                        {{ creating ? '创建中…' : '创建清单' }}
                    </button>
                </div>
            </form>
            <p v-if="listLoading" role="status">正在读取作业…</p>
            <div v-else-if="listError" class="error" role="alert">
                {{ listError }} <button class="action-button" type="button" @click="loadTasks">重试</button>
            </div>
            <p v-else-if="!tasks.length" role="status">本学期还没有收交清单。</p>
            <div v-else class="task-items">
                <button v-for="task in tasks" :key="task.id" type="button" class="task-item"
                    :aria-pressed="task.id === activeId" :disabled="saving || creating" @click="task.id !== activeId && openTask(task.id)">
                    <strong>{{ task.title }}</strong>
                    <span><time :datetime="task.created_at">{{ createdDate.format(new Date(task.created_at)) }}</time>
                        · {{ task.pending_count ? task.pending_count + ' 人待交' : '已收齐' }}</span>
                </button>
            </div>
        </section>

        <section v-if="activeId" class="task-detail" aria-label="作业登记">
            <p v-if="detailLoading" role="status">正在读取收交名单…</p>
            <div v-else-if="detailError" class="error" role="alert">
                {{ detailError }} <button class="action-button" type="button" @click="openTask(activeId)">重试</button>
            </div>
            <template v-else-if="detail">
                <header class="detail-header">
                    <h2>{{ detail.title }}</h2>
                    <CollectionAwardButton v-if="writable" :key="[classId, semesterId, detail.id].join(':')"
                        :class-id="classId" :semester-id="semesterId" :task="detail" :disabled="saving || creating"
                        @updated="applyDetail" @reload="openTask(detail.id)" />
                </header>
                <p v-if="updateError" class="error" role="alert">{{ updateError }}</p>
                <CollectionTaskRoster :key="detail.id" :task="detail" :writable="writable" :busy="saving || creating"
                    @update="updateStudents" />
            </template>
        </section>
    </div>
</template>

<style scoped>
.workspace {
    display: grid;
    grid-template-columns: minmax(230px, 1fr) minmax(0, 2.5fr);
    align-items: start;
    gap: 16px;
}
.task-list, .task-detail {
    display: grid;
    min-width: 0;
    gap: 16px;
    padding: 20px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface);
}
header, .form-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
}
h2, p { margin: 0; }
h2 { font-size: 18px; overflow-wrap: anywhere; }
p, .task-item span { font-size: 13px; color: var(--ta-text-secondary); }
.error { color: var(--ta-red); }
.create-form, .task-items { display: grid; gap: 8px; }
.create-form label { font-size: 13px; font-weight: 600; }
.create-form input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid var(--ta-line-strong);
    border-radius: var(--ta-radius-small);
}
.form-actions { justify-content: flex-end; }
.task-items { max-height: 60vh; overflow-y: auto; }
.task-item {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    text-align: left;
    color: var(--ta-text);
    border: 1px solid transparent;
    border-radius: var(--ta-radius-small);
    background: var(--ta-surface-muted);
    cursor: pointer;
}
.task-item strong { overflow-wrap: anywhere; }
.task-item[aria-pressed="true"] { border-color: var(--ta-blue); background: var(--ta-blue-soft); }
@media (max-width: 850px) {
    .workspace { grid-template-columns: minmax(0, 1fr); }
    .task-items { max-height: 220px; }
}
</style>
