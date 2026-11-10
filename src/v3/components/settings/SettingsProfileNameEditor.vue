<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { userApi } from '@/api/user'
import { useCacheStore } from '@/stores/cacheStore'
import AppDialogShell from '@/v3/components/AppDialogShell.vue'

const props = defineProps<{ promptDefaultName?: boolean }>()
const cacheStore = useCacheStore()
const visible = ref(false)
const name = ref('')
const saving = ref(false)
const error = ref('')
const nameLength = computed(() => Array.from(name.value.trim()).length)
let generation = 0
let disposed = false
let dialogToken: string | null = null
let dialogUserID = ''
let defaultNamePrompted = false

function nameError(value: string): string {
    if (/[\u0000-\u001f\u007f-\u009f]/u.test(value)) return '姓名不能包含换行、制表符或其他控制字符。'
    const length = Array.from(value.trim()).length
    return length >= 1 && length <= 64 ? '' : '姓名需为 1–64 个字符。'
}

function open(): void {
    if (saving.value || !cacheStore.token || !cacheStore.profile?.id) return
    generation += 1
    dialogToken = cacheStore.token
    dialogUserID = cacheStore.profile.id
    name.value = cacheStore.profile.name
    error.value = ''
    visible.value = true
}

function close(): void {
    if (saving.value) return
    generation += 1
    visible.value = false
    name.value = ''
    error.value = ''
    dialogToken = null
    dialogUserID = ''
}

async function save(): Promise<void> {
    if (!visible.value || saving.value) return
    error.value = nameError(name.value)
    if (error.value) return
    const token = dialogToken
    const userID = dialogUserID
    const version = generation
    const current = () => !disposed && version === generation && visible.value
        && token === cacheStore.token && userID === cacheStore.profile?.id
    if (!token || !userID || !current()) return

    saving.value = true
    try {
        const response = await userApi.updateName(name.value.trim())
        if (!current()) return
        const updated = response.data
        if (updated.id !== userID || typeof updated.name !== 'string' || nameError(updated.name)
            || updated.name !== updated.name.trim()) throw new Error('返回的账号信息不一致，请重新保存。')
        const profile = cacheStore.profile
        if (!profile) return
        cacheStore.updateProfile({ ...profile, name: updated.name })
        visible.value = false
        name.value = ''
        error.value = ''
        ElMessage.success('姓名已修改')
    } catch (cause) {
        if (current()) error.value = cause instanceof Error ? cause.message : '姓名保存失败，请稍后重试。'
    } finally {
        if (version === generation) saving.value = false
    }
}

watch([() => cacheStore.token, () => cacheStore.profile?.id], () => {
    defaultNamePrompted = false
    saving.value = false
    close()
}, { flush: 'sync' })

watch([
    () => props.promptDefaultName,
    () => cacheStore.token,
    () => cacheStore.profile?.id,
    () => cacheStore.profile?.name,
    () => cacheStore.isLocked,
], () => {
    if (!props.promptDefaultName || defaultNamePrompted || cacheStore.isLocked
        || cacheStore.profile?.name !== '微信用户') return
    open()
    defaultNamePrompted = visible.value
}, { immediate: true })

onBeforeUnmount(() => { disposed = true; generation += 1 })
</script>

<template>
    <button v-if="!promptDefaultName" type="button" class="profile-name-edit" :disabled="saving" @click="open">修改姓名</button>
    <AppDialogShell :model-value="visible" :busy="saving" title="修改姓名" eyebrow="账号设置"
        :description="promptDefaultName ? '你当前的姓名为「微信用户」，请修改为便于识别的姓名。' : '设置你希望展示的姓名。'"
        width="480px" height="330px" @update:model-value="value => { if (!value) close() }">
        <div class="profile-name-form">
            <label for="profile-name-input" class="profile-name-form__label">姓名</label>
            <el-input id="profile-name-input" v-model="name" :disabled="saving" :maxlength="128"
                autocomplete="name" placeholder="请输入姓名" @keyup.enter="save" />
            <p class="profile-name-form__hint">{{ nameLength }} / 64 个字符，可使用中文、空格和表情。</p>
            <p v-if="error" class="profile-name-form__error" role="alert">{{ error }}</p>
        </div>
        <template #footer>
            <div class="profile-name-form__actions">
                <button type="button" class="profile-name-form__cancel" :disabled="saving" @click="close">取消</button>
                <button type="button" class="profile-name-form__save" :disabled="saving" @click="save">
                    {{ saving ? '保存中…' : '保存姓名' }}
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<style scoped>
.profile-name-edit {
    padding: 4px 0;
    border: 0;
    background: transparent;
    color: var(--ta-blue);
    font: inherit;
    font-size: 12px;
    white-space: nowrap;
    cursor: pointer;
}

.profile-name-form {
    display: grid;
    gap: 10px;
}

.profile-name-form__label {
    color: var(--ta-text-secondary);
    font-size: 13px;
    font-weight: 600;
}

.profile-name-form__hint, .profile-name-form__error {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
}

.profile-name-form__hint {
    color: var(--ta-text-tertiary);
}

.profile-name-form__error {
    color: #b04436;
}

.profile-name-form__actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}


.profile-name-form__cancel, .profile-name-form__save {
    min-height: 38px;
    padding: 9px 16px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-small);
    background: var(--ta-surface-solid);
    color: var(--ta-text);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.profile-name-form__save {
    border-color: var(--ta-blue);
    background: var(--ta-blue);
    color: #fff;
}

.profile-name-edit:disabled, .profile-name-form__actions button:disabled {
    opacity: .55;
    cursor: default;
}

.profile-name-edit:focus-visible, .profile-name-form__actions button:focus-visible {
    outline: 2px solid var(--ta-blue);
    outline-offset: 3px;
}
</style>
