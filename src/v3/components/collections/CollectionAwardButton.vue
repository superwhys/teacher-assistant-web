<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { collectionTaskApi } from '@/api/collectionTask'
import { useBusinessAccess } from '@/composables/useBusinessAccess'
import { pointsManager } from '@/managers/points'
import { isApiRequestError } from '@/types/api'
import type { CollectionTaskDetail } from '@/types/collectionTask'
import type { RuleGroup } from '@/types/points'
import AppDialogShell from '@/v3/components/AppDialogShell.vue'

const props = defineProps<{
    classId: number
    semesterId: number
    task: CollectionTaskDetail
    disabled: boolean
}>()
const emit = defineEmits<{
    updated: [task: CollectionTaskDetail]
    reload: []
}>()
const { canWrite, allowWrite } = useBusinessAccess()
const visible = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const groups = ref<RuleGroup[]>([])
const selected = ref(0)
const selectedRule = computed(() => rules.value.find(rule => rule.id === selected.value))
const rules = computed(() => groups.value.flatMap(group => group.rules ?? [])
    .filter(rule => rule.id && rule.points_type === 1 && (rule.points ?? 0) > 0))
const eligible = computed(() => props.task.students.filter(student => student.status === 'submitted' && !student.awarded))
let request = 0
onScopeDispose(() => { request++ })
watch(() => [props.disabled, canWrite.value, props.task.version], () => { visible.value = false })

async function open() {
    if (props.disabled || saving.value || !eligible.value.length || !allowWrite()) return
    const id = ++request
    visible.value = true
    loading.value = true
    groups.value = []
    selected.value = 0
    error.value = ''
    try {
        const result = await pointsManager.listRuleGroups()
        if (id === request) groups.value = result
    } catch (cause) {
        if (id === request) error.value = cause instanceof Error ? cause.message : '读取加分规则失败'
    } finally {
        if (id === request) loading.value = false
    }
}

async function confirm() {
    const rule = selectedRule.value
    if (!visible.value || props.disabled || saving.value || !eligible.value.length || !rule?.id || !rule.points || !allowWrite()) return
    const id = ++request
    const count = eligible.value.length
    saving.value = true
    error.value = ''
    try {
        const response = await collectionTaskApi.award(props.classId, props.task.id, {
            semester_id: props.semesterId, version: props.task.version, rule_id: rule.id, expected_points: rule.points,
        })
        if (id !== request) return
        visible.value = false
        emit('updated', response.data)
        ElMessage.success(`已为 ${count} 名学生各加 ${rule.points} 分`)
    } catch (cause) {
        if (id !== request) return
        if (isApiRequestError(cause) && cause.code === 100409) {
            visible.value = false
            emit('reload')
        } else {
            error.value = cause instanceof Error ? cause.message : '加分未获确认，请刷新清单核对'
        }
    } finally {
        if (id === request) saving.value = false
    }
}
</script>

<template>
    <button type="button" class="ghost-button" :disabled="disabled || !canWrite || saving || eligible.length === 0" @click="open">
        给已交学生加分<span v-if="eligible.length">（{{ eligible.length }}）</span>
    </button>
    <AppDialogShell v-model="visible" title="给已交学生加分" width="480px" height="auto" :busy="saving"
        :description="`《${task.title}》有 ${eligible.length} 名已交学生尚未获得本次积分。`">
        <p v-if="loading" role="status">正在读取加分规则…</p>
        <label v-else-if="rules.length" class="award-field">
            加分规则
            <select v-model="selected" :disabled="saving">
                <option :value="0" disabled>选择规则</option>
                <option v-for="rule in rules" :key="rule.id" :value="rule.id">{{ rule.name }}（+{{ rule.points }} 分）</option>
            </select>
        </label>
        <p v-else-if="!error">请先在「积分管理」中添加加分规则。</p>
        <p v-if="error" role="alert">{{ error }} <button v-if="!saving" type="button" class="ghost-button" @click="open">重新加载规则</button></p>
        <template #footer>
            <button type="button" class="ghost-button" :disabled="saving" @click="visible = false">取消</button>
            <button type="button" class="primary-button" :disabled="!selectedRule || saving || disabled || !canWrite" @click="confirm">
                {{ saving ? '正在加分…' : '确认加分' }}
            </button>
        </template>
    </AppDialogShell>
</template>

<style scoped>
.award-field { display: grid; gap: 8px; }
.award-field select { width: 100%; padding: 10px; font: inherit; color: inherit; border: 1px solid var(--ta-border); border-radius: 6px; }
</style>
