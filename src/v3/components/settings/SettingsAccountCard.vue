<template>
    <article class="hero-card account-card">
        <div class="hero-banner">
            <div class="account-hero-layout">
                <div class="account-summary">
                    <el-avatar class="account-summary__avatar" :size="72" :src="userAvatar || undefined">
                        {{ userInitial }}
                    </el-avatar>
                    <div class="account-summary__body">
                        <div class="account-summary__name-row">
                            <h3>{{ displayName }}</h3>
                            <div class="status-chip-row">
                                <span class="status-chip" :class="isLoginExpired ? 'status-chip--rose' : 'status-chip--emerald'">
                                    {{ isLoginExpired ? "登录已过期" : "已登录" }}
                                </span>
                                <span v-if="isTrial" class="status-chip status-chip--amber">
                                    {{ trialStatusText }}
                                </span>
                            </div>
                        </div>
                        <p>{{ userEmail || "当前账号未绑定邮箱" }}</p>
                    </div>
                </div>

                <div class="account-context-card">
                    <span class="account-context-card__label">当前班级上下文</span>
                    <div class="hero-status-stack">
                        <span class="status-chip status-chip--sky">{{ currentClassName || "未选择班级" }}</span>
                        <span class="status-chip" :class="semesterStatusToneClass">
                            {{ currentSemesterName || "未设置学期" }}
                        </span>
                    </div>
                    <p>{{ semesterNoticeText }}</p>
                </div>
            </div>
        </div>

        <div v-if="hasProfile" class="summary-grid summary-grid--account">
            <div class="summary-item summary-item--soft-blue">
                <span>用户 ID</span>
                <strong class="mono-text">{{ userId || "-" }}</strong>
            </div>
            <div class="summary-item summary-item--soft-purple">
                <span>角色标识</span>
                <strong>{{ roleId ?? "-" }}</strong>
            </div>
            <div class="summary-item summary-item--soft-gold">
                <span>账号状态</span>
                <strong>{{ isLoginExpired ? "需要重新登录" : "可以正常使用" }}</strong>
            </div>
            <div class="summary-item summary-item--soft-green">
                <span>锁屏状态</span>
                <strong>{{ hasPwd ? "已设置密码" : "尚未启用" }}</strong>
            </div>
        </div>

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
    roleId: number | null
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
.hero-card {
    padding: 24px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    backdrop-filter: blur(16px);
}

.account-card {
    background:
        radial-gradient(circle at top right, rgba(142, 108, 255, 0.16), transparent 28%),
        radial-gradient(circle at bottom left, rgba(85, 104, 255, 0.12), transparent 26%),
        rgba(255, 255, 255, 0.8);
}

.hero-banner,
.account-summary,
.account-summary__name-row {
    display: flex;
    align-items: center;
}

.hero-banner {
    justify-content: space-between;
    gap: 16px;
}

.account-hero-layout {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
    gap: 18px;
    align-items: start;
}

.account-summary {
    gap: 16px;
    min-width: 0;
    align-items: flex-start;
}

.account-summary__avatar {
    border: 2px solid rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 26px rgba(40, 56, 105, 0.18);
    flex-shrink: 0;
}

.account-summary__body {
    min-width: 0;
    display: grid;
    gap: 10px;
    flex: 1;
}

.account-summary__name-row {
    align-items: flex-start;
    gap: 14px;
    flex-wrap: wrap;
}

.account-summary__body h3 {
    margin: 0;
    font-size: 28px;
    line-height: 1.2;
    color: #16213e;
}

.account-summary__body p,
.account-context-card p,
.empty-state p {
    margin: 0;
    color: #627099;
    line-height: 1.7;
}

.status-chip-row,
.hero-status-stack {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.account-context-card {
    padding: 16px 18px;
    border-radius: 24px;
    border: 1px solid rgba(122, 141, 198, 0.14);
    background: rgba(255, 255, 255, 0.72);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.account-context-card__label {
    display: block;
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #627099;
}

.summary-grid {
    display: grid;
    gap: 14px;
    margin-top: 22px;
}

.summary-grid--account {
    grid-template-columns: repeat(4, minmax(0, 1fr));
}

.summary-item {
    padding: 18px;
    border-radius: 24px;
    background: rgba(85, 104, 255, 0.06);
}

.summary-item span {
    display: block;
    font-size: 13px;
    color: #627099;
}

.summary-item strong {
    display: block;
    margin-top: 8px;
    font-size: 18px;
    color: #16213e;
    line-height: 1.5;
}

.summary-item--soft-blue {
    background: linear-gradient(180deg, rgba(85, 104, 255, 0.1), rgba(255, 255, 255, 0.94));
}

.summary-item--soft-purple {
    background: linear-gradient(180deg, rgba(142, 108, 255, 0.12), rgba(255, 255, 255, 0.94));
}

.summary-item--soft-gold {
    background: linear-gradient(180deg, rgba(255, 182, 72, 0.14), rgba(255, 255, 255, 0.94));
}

.summary-item--soft-green {
    background: linear-gradient(180deg, rgba(18, 185, 129, 0.12), rgba(255, 255, 255, 0.94));
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

.status-chip--emerald {
    color: #067647;
    background: rgba(18, 185, 129, 0.12);
}

.status-chip--sky {
    color: #2563eb;
    background: rgba(59, 130, 246, 0.12);
}

.status-chip--amber {
    color: #b45309;
    background: rgba(245, 158, 11, 0.16);
}

.status-chip--rose {
    color: #be123c;
    background: rgba(255, 107, 129, 0.16);
}

.status-chip--slate {
    color: #475467;
    background: rgba(71, 84, 103, 0.12);
}

.empty-state {
    margin-top: 20px;
    padding: 18px;
    border-radius: 24px;
    background: rgba(71, 84, 103, 0.06);
}

.empty-state strong {
    display: block;
    color: #16213e;
    font-size: 18px;
}

.mono-text {
    font-variant-numeric: tabular-nums;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

@media (max-width: 1280px) {
    .summary-grid--account {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 1080px) {
    .account-hero-layout {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .hero-banner {
        flex-direction: column;
        align-items: stretch;
    }

    .summary-grid--account {
        grid-template-columns: 1fr;
    }

    .account-summary {
        align-items: flex-start;
    }

    .account-summary__name-row {
        flex-direction: column;
    }

    .hero-card {
        padding: 20px;
        border-radius: 26px;
    }
}
</style>
