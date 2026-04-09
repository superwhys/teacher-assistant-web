<template>
    <article class="panel-surface">
        <div class="panel-head panel-head--stack">
            <div>
                <h3>锁屏设置</h3>
                <p>支持设置、修改与清除锁屏密码，并在课堂中快速防止大屏误触。</p>
            </div>
            <span class="status-chip" :class="hasPwd ? 'status-chip--sky' : 'status-chip--slate'">
                {{ hasPwd ? "已设置锁屏密码" : "未设置锁屏密码" }}
            </span>
        </div>

        <div class="lock-status-card">
            <div class="lock-status-card__meta">
                <div class="lock-status-card__icon" :class="{ 'is-active': hasPwd }">
                    <i-ep-lock v-if="hasPwd" />
                    <i-ep-unlock v-else />
                </div>
                <div>
                    <strong>{{ hasPwd ? "锁屏功能已启用" : "锁屏功能未启用" }}</strong>
                    <p>{{ hasPwd ? "设置后可通过主界面或此处按钮立即锁定。" : "请先设置至少 4 位的锁屏密码后再使用。" }}</p>
                </div>
            </div>

            <button type="button" class="ghost-button ghost-button--small" @click="emit('lock-now')">
                立即锁屏
            </button>
        </div>

        <div class="settings-form-grid">
            <label v-if="hasPwd" class="field-block">
                <span class="field-block__label">原密码</span>
                <el-input v-model="oldPasswordModel" type="password" show-password placeholder="输入当前锁屏密码" />
            </label>

            <label class="field-block">
                <span class="field-block__label">新密码</span>
                <el-input v-model="newPasswordModel" type="password" show-password placeholder="请输入新的锁屏密码（至少 4 位）" />
            </label>

            <label class="field-block">
                <span class="field-block__label">确认密码</span>
                <el-input v-model="confirmPasswordModel" type="password" show-password placeholder="再次输入锁屏密码" />
            </label>
        </div>

        <div class="toolbar compact-toolbar">
            <button type="button" class="primary-button primary-button--small" :disabled="savingPwd" @click="emit('save-password')">
                {{ savingPwd ? "保存中..." : "保存密码" }}
            </button>
            <button
                v-if="hasPwd"
                type="button"
                class="ghost-button ghost-button--small"
                :disabled="savingPwd"
                @click="emit('clear-password')"
            >
                清除密码
            </button>
        </div>

        <div class="helper-note">
            {{ hasPwd ? "修改或清除密码前，需要先输入原密码进行校验。" : "首次设置密码后，就可以在课堂中随时使用立即锁屏。" }}
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed } from "vue";

/** 定义锁屏设置卡片属性。 */
interface SettingsLockCardProps {
    confirmPassword: string
    hasPwd: boolean
    newPassword: string
    oldPassword: string
    savingPwd: boolean
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

const props = defineProps<SettingsLockCardProps>()
const emit = defineEmits<SettingsLockCardEmits>()

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
.panel-surface {
    padding: 24px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    backdrop-filter: blur(16px);
}

.panel-head,
.toolbar,
.lock-status-card,
.lock-status-card__meta {
    display: flex;
    align-items: center;
}

.panel-head,
.lock-status-card {
    justify-content: space-between;
    gap: 16px;
}

.panel-head {
    margin-bottom: 18px;
}

.panel-head--stack {
    align-items: flex-start;
}

.panel-head h3 {
    margin: 0;
    font-size: 24px;
    color: #16213e;
}

.panel-head p,
.lock-status-card__meta p,
.helper-note {
    margin: 0;
    color: #627099;
    line-height: 1.7;
}

.status-chip {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(22, 33, 62, 0.06);
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.status-chip--sky {
    color: #2563eb;
    background: rgba(59, 130, 246, 0.12);
}

.status-chip--slate {
    color: #475467;
    background: rgba(71, 84, 103, 0.12);
}

.lock-status-card {
    margin-bottom: 18px;
    padding: 18px;
    border-radius: 24px;
    border: 1px solid rgba(122, 141, 198, 0.14);
    background: linear-gradient(180deg, rgba(85, 104, 255, 0.08), rgba(255, 255, 255, 0.92));
}

.lock-status-card__meta {
    gap: 14px;
    min-width: 0;
}

.lock-status-card__meta strong {
    display: block;
    margin-bottom: 6px;
    color: #16213e;
    font-size: 18px;
}

.lock-status-card__icon {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    background: rgba(71, 84, 103, 0.12);
    color: #627099;
    font-size: 22px;
    flex-shrink: 0;
}

.lock-status-card__icon.is-active {
    background: rgba(85, 104, 255, 0.14);
    color: #5568ff;
}

.settings-form-grid {
    display: grid;
    gap: 14px;
}

.field-block {
    display: grid;
    gap: 10px;
}

.field-block__label {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #627099;
}

.toolbar {
    gap: 12px;
    flex-wrap: wrap;
}

.compact-toolbar {
    gap: 10px;
    margin-top: 16px;
}

.helper-note {
    margin-top: 16px;
    padding: 14px 16px;
    border-radius: 20px;
    background: rgba(22, 33, 62, 0.04);
}

.ghost-button,
.primary-button {
    min-height: 46px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 16px;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.24);
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
}

.primary-button {
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.26);
}

.ghost-button--small,
.primary-button--small {
    min-height: 42px;
    padding: 0 14px;
    border-radius: 14px;
}

.ghost-button:hover,
.primary-button:hover {
    transform: translateY(-2px);
}

.ghost-button:disabled,
.primary-button:disabled {
    opacity: 0.56;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.panel-surface :deep(.el-input__wrapper) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.panel-surface :deep(.el-input__wrapper.is-focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

@media (max-width: 768px) {
    .lock-status-card {
        flex-direction: column;
        align-items: stretch;
    }

    .panel-surface {
        padding: 20px;
        border-radius: 26px;
    }
}
</style>
