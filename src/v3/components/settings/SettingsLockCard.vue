<template>
    <article class="settings-section settings-section--lock">
        <div class="settings-section__intro">
            <h3>锁屏</h3>
            <p>支持设置、修改与清除锁屏密码，防止临时离开时发生误触。</p>
        </div>
        <div class="settings-section__body">
            <div class="lock-status-card">
                <div class="lock-status-card__meta">
                    <div>
                        <strong>{{ hasPwd ? "锁屏功能已启用" : "锁屏功能未启用" }}</strong>
                        <p>{{ hasPwd ? "修改或清除密码前，需要先输入原密码进行校验。" : "请先设置至少 4 位的锁屏密码后再使用。" }}</p>
                    </div>
                </div>
                <div class="lock-status-card__actions">
                    <span class="status-chip" :class="hasPwd ? 'status-chip--sky' : 'status-chip--slate'">
                        {{ hasPwd ? "已设置锁屏密码" : "未设置锁屏密码" }}
                    </span>
                    <button v-if="hasPwd" type="button" class="ghost-button" :disabled="savingPwd"
                        @click="emit('lock-now')">立即锁屏</button>
                    <button ref="editTrigger" type="button" class="ghost-button" :disabled="savingPwd"
                        :aria-expanded="editing" aria-controls="lock-password-form" @click="toggleEditing">
                        {{ editing ? "取消修改" : hasPwd ? "修改密码" : "设置密码" }}
                    </button>
                </div>
            </div>

            <form v-if="editing" id="lock-password-form" @submit.prevent="savePassword">
                <div class="settings-form-grid">
                    <label v-if="hasPwd" class="field-block">
                        <span class="field-block__label">原密码</span>
                        <el-input ref="oldPasswordInput" v-model="oldPasswordModel" type="password" show-password
                            :disabled="savingPwd" :aria-invalid="Boolean(touched.oldPassword && errors.oldPassword)"
                            :aria-describedby="touched.oldPassword && errors.oldPassword ? 'lock-old-error' : undefined"
                            placeholder="输入当前锁屏密码" @blur="touched.oldPassword = true" />
                        <p v-if="touched.oldPassword && errors.oldPassword" id="lock-old-error" class="field-error" role="alert">{{ errors.oldPassword }}</p>
                    </label>
                    <label class="field-block">
                        <span class="field-block__label">新密码</span>
                        <el-input ref="newPasswordInput" v-model="newPasswordModel" type="password" show-password
                            :disabled="savingPwd" :aria-invalid="Boolean(touched.newPassword && errors.newPassword)"
                            :aria-describedby="touched.newPassword && errors.newPassword ? 'lock-new-error' : undefined"
                            placeholder="请输入新的锁屏密码（至少 4 位）" @blur="touched.newPassword = true" />
                        <p v-if="touched.newPassword && errors.newPassword" id="lock-new-error" class="field-error" role="alert">{{ errors.newPassword }}</p>
                    </label>
                    <label class="field-block" :class="{ 'field-block--full': hasPwd }">
                        <span class="field-block__label">确认密码</span>
                        <el-input ref="confirmPasswordInput" v-model="confirmPasswordModel" type="password" show-password
                            :disabled="savingPwd" :aria-invalid="Boolean(touched.confirmPassword && errors.confirmPassword)"
                            :aria-describedby="touched.confirmPassword && errors.confirmPassword ? 'lock-confirm-error' : undefined"
                            placeholder="再次输入锁屏密码" @blur="touched.confirmPassword = true" />
                        <p v-if="touched.confirmPassword && errors.confirmPassword" id="lock-confirm-error" class="field-error" role="alert">{{ errors.confirmPassword }}</p>
                    </label>
                </div>

                <div class="toolbar compact-toolbar">
                    <button type="submit" class="primary-button" :disabled="savingPwd">
                        {{ savingPwd ? "保存中..." : "保存密码" }}
                    </button>
                    <button v-if="hasPwd" type="button" class="ghost-button" :disabled="savingPwd"
                        @click="clearPassword">清除密码</button>
                </div>
            </form>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";

/** 定义锁屏设置卡片属性。 */
interface SettingsLockCardProps {
    confirmPassword: string
    hasPwd: boolean
    newPassword: string
    oldPassword: string
    savingPwd: boolean
    errors?: { oldPassword?: string, newPassword?: string, confirmPassword?: string }
}

/** 定义锁屏设置卡片事件。 */
interface SettingsLockCardEmits {
    (event: "clear-password"): void
    (event: "lock-now"): void
    (event: "save-password"): void
    (event: "update:confirmPassword", value: string): void
    (event: "update:newPassword", value: string): void
    (event: "update:oldPassword", value: string): void
}

const props = withDefaults(defineProps<SettingsLockCardProps>(), { errors: () => ({}) })
const emit = defineEmits<SettingsLockCardEmits>()
const editing = ref(false)
const touched = reactive({ oldPassword: false, newPassword: false, confirmPassword: false })
const editTrigger = ref<HTMLButtonElement | null>(null)
const oldPasswordInput = ref<{ focus(): void } | null>(null)
const newPasswordInput = ref<{ focus(): void } | null>(null)
const confirmPasswordInput = ref<{ focus(): void } | null>(null)

async function toggleEditing(): Promise<void> {
    if (props.savingPwd) return
    editing.value = !editing.value
    Object.assign(touched, { oldPassword: false, newPassword: false, confirmPassword: false })
    if (editing.value) {
        await nextTick()
        const input = props.hasPwd ? oldPasswordInput : newPasswordInput
        input.value?.focus()
    } else {
        emit("update:oldPassword", "")
        emit("update:newPassword", "")
        emit("update:confirmPassword", "")
        editTrigger.value?.focus()
    }
}

function savePassword(): void {
    if (props.savingPwd) return
    Object.assign(touched, { oldPassword: true, newPassword: true, confirmPassword: true })
    const invalidInput = props.hasPwd && props.errors.oldPassword ? oldPasswordInput
        : props.errors.newPassword ? newPasswordInput : props.errors.confirmPassword ? confirmPasswordInput : null
    if (invalidInput) {
        invalidInput.value?.focus()
        return
    }
    emit("save-password")
}

function clearPassword(): void {
    if (props.savingPwd) return
    touched.oldPassword = true
    if (props.errors.oldPassword) {
        oldPasswordInput.value?.focus()
        return
    }
    emit("clear-password")
}

watch(() => props.savingPwd, (saving, wasSaving) => {
    if (wasSaving && !saving && !props.newPassword && !props.confirmPassword && !props.oldPassword) {
        editing.value = false
        editTrigger.value?.focus()
    }
})

/** 代理原密码输入值。 */
const oldPasswordModel = computed({
    get: () => props.oldPassword,
    set: (value: string) => emit("update:oldPassword", value),
})

/** 代理新密码输入值。 */
const newPasswordModel = computed({
    get: () => props.newPassword,
    set: (value: string) => emit("update:newPassword", value),
})

/** 代理确认密码输入值。 */
const confirmPasswordModel = computed({
    get: () => props.confirmPassword,
    set: (value: string) => emit("update:confirmPassword", value),
})
</script>

<style scoped>
.settings-section {
    padding: 28px 4px;
    display: grid;
    grid-template-columns: minmax(180px, 230px) minmax(0, 1fr);
    gap: clamp(28px, 5vw, 72px);
    border-bottom: 1px solid var(--ta-line);
}

.settings-section__intro h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.015em;
}

.settings-section__intro p {
    margin: 7px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 13px;
    line-height: 1.6;
}

.settings-section__body {
    min-width: 0;
}

.lock-status-card,
.lock-status-card__actions,
.toolbar {
    display: flex;
    align-items: center;
}

.lock-status-card {
    min-height: 62px;
    padding: 10px 0 14px;
    justify-content: space-between;
    gap: 18px;
    border-bottom: 1px solid var(--ta-line);
}

.lock-status-card__meta strong {
    display: block;
    font-size: 14px;
}

.lock-status-card__meta p {
    margin: 4px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 12.5px;
}

.lock-status-card__actions {
    justify-content: flex-end;
    gap: 7px;
    flex-wrap: wrap;
}

.status-chip {
    min-height: 26px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 6px;
    color: var(--ta-text-secondary);
    background: var(--ta-surface-muted);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}

.status-chip--sky {
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.settings-form-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.field-block {
    min-width: 0;
    display: grid;
    gap: 5px;
}

.field-block--full {
    grid-column: 1 / -1;
}

.field-block__label {
    color: var(--ta-text-secondary);
    font-size: 12px;
    font-weight: 600;
}

.field-error {
    margin: 0;
    color: var(--ta-red);
    font-size: 12px;
}

.settings-section :deep(.el-input__wrapper) {
    min-height: 36px;
    padding-inline: 10px;
    border-radius: var(--ta-radius-small);
    font-size: 14px;
}

.toolbar {
    margin-top: 12px;
    gap: 8px;
    flex-wrap: wrap;
}

.ghost-button,
.primary-button {
    min-height: 34px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: var(--ta-radius-small);
    font-size: 13px;
    font-weight: 620;
    white-space: nowrap;
    cursor: pointer;
}

.ghost-button {
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
}

.primary-button {
    color: #ffffff;
    background: var(--ta-blue);
    box-shadow: var(--ta-shadow-1);
}

.ghost-button:disabled,
.primary-button:disabled {
    opacity: 0.42;
}

@media (min-width: 1800px) {
    .settings-section {
        grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
        gap: clamp(60px, 5vw, 100px);
    }
}

@media (max-width: 920px) {
    .settings-section {
        grid-template-columns: minmax(150px, 190px) minmax(0, 1fr);
        gap: 28px;
    }
}

@media (max-width: 660px) {
    .settings-section {
        grid-template-columns: 1fr;
        gap: 16px;
        padding-block: 22px;
    }

    .lock-status-card {
        align-items: stretch;
        flex-direction: column;
    }

    .lock-status-card__actions {
        justify-content: flex-start;
    }

    .settings-form-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .field-block--full {
        grid-column: 1 / -1;
    }
}

@media (max-width: 440px) {
    .settings-form-grid {
        grid-template-columns: 1fr;
    }

    .field-block--full {
        grid-column: auto;
    }
}
</style>
