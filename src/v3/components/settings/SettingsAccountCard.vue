<template>
    <article class="hero-card account-card">
        <div v-if="hasProfile" class="account-card__layout">
            <div class="hero-banner">
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
            </div>

            <div class="summary-item account-context-card">
                <span class="account-context-card__label">班级与学期</span>
                <div class="account-context-card__grid">
                    <div class="context-inline-item">
                        <span class="context-inline-item__label">班级</span>
                        <span class="status-chip status-chip--sky">{{ currentClassName || "未选择班级" }}</span>
                    </div>
                    <div class="context-inline-item">
                        <span class="context-inline-item__label">学期</span>
                        <span class="status-chip" :class="semesterStatusToneClass">
                            {{ currentSemesterName || "未设置学期" }}
                        </span>
                    </div>
                </div>
                <p>{{ semesterNoticeText }}</p>
            </div>

            <div class="summary-item summary-item--soft-blue">
                <span>用户 ID</span>
                <strong class="mono-text">{{ userId || "-" }}</strong>
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
    container-type: inline-size;
    container-name: account-card;
}

.account-card__layout {
    display: grid;
    gap: 18px 14px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: stretch;
}

.hero-banner,
.account-summary,
.account-summary__name-row {
    display: flex;
    align-items: center;
}

.hero-banner {
    width: 100%;
    min-width: 0;
    grid-column: 1 / span 3;
    gap: 18px;
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
    padding: 18px;
    border-radius: 24px;
    border: 1px solid rgba(122, 141, 198, 0.14);
    background: linear-gradient(180deg, rgba(98, 112, 153, 0.08), rgba(255, 255, 255, 0.94));
    display: grid;
    gap: 10px;
}

.account-context-card__label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #627099;
}

.account-context-card__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
}

.context-inline-item {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.context-inline-item .status-chip {
    flex: 1 1 auto;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    white-space: normal;
    text-align: center;
    line-height: 1.35;
    height: auto;
    padding: 8px 12px;
    overflow-wrap: anywhere;
}

.context-inline-item__label {
    font-size: 12px;
    font-weight: 600;
    color: #7a86a8;
    line-height: 1.4;
    white-space: nowrap;
}

.summary-item {
    min-width: 0;
    padding: 18px;
    border-radius: 24px;
    background: rgba(85, 104, 255, 0.06);
}

.summary-item > span {
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

.summary-item--soft-gold {
    background: linear-gradient(180deg, rgba(255, 182, 72, 0.14), rgba(255, 255, 255, 0.94));
}

.summary-item--soft-green {
    background: linear-gradient(180deg, rgba(18, 185, 129, 0.12), rgba(255, 255, 255, 0.94));
}

.account-context-card {
    grid-column: 4;
    grid-row: 1 / span 2;
    align-self: stretch;
}

.status-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(22, 33, 62, 0.06);
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
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

@container account-card (max-width: 1080px) {
    .account-card__layout {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hero-banner {
        grid-column: 1 / -1;
    }

    .account-context-card {
        grid-column: auto;
        grid-row: auto;
    }
}

@container account-card (max-width: 420px) {
    .account-card__layout {
        grid-template-columns: 1fr;
    }

    .hero-banner {
        grid-column: 1 / -1;
        flex-direction: column;
        align-items: stretch;
    }

    .account-summary {
        align-items: flex-start;
    }

    .account-summary__name-row {
        flex-direction: column;
    }
}

@media (max-width: 768px) {
    .hero-card {
        padding: 20px;
        border-radius: 26px;
    }
}
</style>
