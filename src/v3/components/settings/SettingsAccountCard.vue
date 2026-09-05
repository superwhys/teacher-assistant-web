<template>
    <article class="settings-profile">
        <template v-if="hasProfile">
            <el-avatar class="settings-profile__avatar" :size="58" :src="userAvatar || undefined">
                {{ userInitial }}
            </el-avatar>
            <div class="settings-profile__identity">
                <h2>{{ displayName }}</h2>
                <p>{{ userEmail || "当前账号未绑定邮箱" }}</p>
                <div class="status-chip-row">
                    <span class="status-chip" :class="isLoginExpired ? 'status-chip--rose' : 'status-chip--emerald'">
                        {{ isLoginExpired ? "登录已过期" : "已登录" }}
                    </span>
                    <span v-if="isTrial" class="status-chip status-chip--amber">{{ trialStatusText }}</span>
                    <span class="status-chip status-chip--sky">{{ hasPwd ? "已设置锁屏密码" : "未设置锁屏密码" }}</span>
                </div>
            </div>
            <div class="settings-profile__facts">
                <div class="settings-profile__fact">
                    <span>当前班级</span>
                    <strong>{{ currentClassName || "未选择班级" }}</strong>
                </div>
                <div class="settings-profile__fact">
                    <span>当前学期</span>
                    <strong>{{ currentSemesterName || "未设置学期" }}</strong>
                </div>
                <div class="settings-profile__fact">
                    <span>用户 ID</span>
                    <strong class="mono-text">{{ userId || "-" }}</strong>
                </div>
                <div class="settings-profile__fact">
                    <span>账号状态</span>
                    <strong>{{ isLoginExpired ? "需要重新登录" : "可以正常使用" }}</strong>
                </div>
                <div class="settings-profile__fact settings-profile__fact--wide">
                    <span>使用建议</span>
                    <strong>{{ semesterNoticeText }}</strong>
                </div>
            </div>
        </template>

        <div v-else class="empty-state">
            <strong>当前未获取到账号信息</strong>
            <p>请确认登录状态后再进行设置。</p>
        </div>
    </article>
</template>

<script setup lang="ts">
/** 定义账号信息卡片属性。 */
interface SettingsAccountCardProps {
    currentClassName: string
    currentSemesterName: string
    displayName: string
    hasProfile: boolean
    hasPwd: boolean
    isLoginExpired: boolean
    isTrial: boolean
    semesterNoticeText: string
    semesterStatusToneClass: string
    trialStatusText: string
    userAvatar: string | null
    userEmail: string
    userId: string
    userInitial: string
}

defineProps<SettingsAccountCardProps>()
</script>

<style scoped>
.settings-profile {
    padding: 10px 4px 26px;
    display: grid;
    grid-template-columns: auto minmax(170px, 0.65fr) minmax(420px, 1.35fr);
    align-items: center;
    gap: 18px;
    border-bottom: 1px solid var(--ta-line);
}

.settings-profile__avatar {
    color: #ffffff;
    background: linear-gradient(145deg, #5e5ce6, #007aff);
    box-shadow: 0 8px 22px rgba(0, 122, 255, 0.18);
}

.settings-profile__identity {
    min-width: 0;
}

.settings-profile__identity h2 {
    margin: 0;
    font-size: 21px;
    letter-spacing: -0.02em;
}

.settings-profile__identity p {
    margin: 4px 0 0;
    overflow: hidden;
    color: var(--ta-text-tertiary);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.status-chip-row {
    margin-top: 9px;
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
}

.status-chip {
    min-height: 26px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: var(--ta-text-secondary);
    background: var(--ta-surface-muted);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}

.status-chip--emerald {
    color: #1b7133;
    background: var(--ta-green-soft);
}

.status-chip--amber {
    color: #a53400;
    background: var(--ta-orange-soft);
}

.status-chip--sky {
    color: #0064cf;
    background: #e6f2ff;
}

.status-chip--rose {
    color: #bb0012;
    background: var(--ta-red-soft);
}

.settings-profile__facts {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
}

.settings-profile__fact {
    min-width: 0;
    padding: 3px 16px;
    border-left: 1px solid var(--ta-line);
}

.settings-profile__fact span {
    display: block;
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.settings-profile__fact strong {
    display: block;
    margin-top: 5px;
    overflow: hidden;
    color: var(--ta-text-secondary);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.settings-profile__fact--wide {
    display: none;
}

.mono-text {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-variant-numeric: tabular-nums;
}

.empty-state {
    grid-column: 1 / -1;
    min-height: 120px;
    display: grid;
    place-items: center;
    align-content: center;
    color: var(--ta-text-tertiary);
    text-align: center;
}

.empty-state strong {
    color: var(--ta-text);
}

.empty-state p {
    margin: 4px 0 0;
    font-size: 13px;
}

@media (min-width: 1800px) {
    .settings-profile {
        grid-template-columns: auto minmax(190px, 0.55fr) minmax(560px, 1.45fr);
    }
}

@media (max-width: 1120px) {
    .settings-profile__facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        row-gap: 14px;
    }
}

@media (max-width: 760px) {
    .settings-profile {
        grid-template-columns: auto minmax(0, 1fr);
    }

    .settings-profile__facts {
        grid-column: 1 / -1;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        row-gap: 12px;
    }

    .settings-profile__fact:nth-child(odd) {
        border-left: 0;
        padding-left: 0;
    }
}

@media (max-width: 440px) {
    .settings-profile__facts {
        grid-template-columns: 1fr;
    }

    .settings-profile__fact {
        padding: 8px 0;
        border-left: 0;
        border-top: 1px solid var(--ta-line);
    }
}
</style>
