<template>
    <button ref="launcherRef" type="button" class="agent-launcher" :class="{ 'is-open': visible }"
        aria-label="打开小 Y" title="找小 Y 帮忙" aria-haspopup="dialog" :aria-expanded="visible"
        aria-controls="agent-assistant-panel" @click="visible = !visible">
        <XiaoYAvatar :size="56" :animated="!visible" />
        <span class="agent-launcher__label" aria-hidden="true">小 Y</span>
    </button>

    <ElDrawer v-model="visible" class="agent-panel" modal-class="agent-panel-layer"
        title="小 Y" direction="rtl" size="440px" append-to-body
        :show-close="false" :z-index="1800" id="agent-assistant-panel"
        @opened="handleOpened" @closed="handleClosed">
        <template #header>
            <div class="agent-header">
                <span class="agent-avatar"><XiaoYAvatar :size="48" :animated="visible" :mood="avatarMood" /></span>
                <div class="agent-header__title">
                    <h2>小 Y <span class="agent-status-badge">{{ statusLabel }}</span></h2>
                    <p>你的课堂小帮手</p>
                </div>
                <button type="button" class="agent-icon-button" aria-label="历史对话" title="历史对话"
                    :aria-pressed="historyVisible" :disabled="!canSwitchConversation"
                    @click="historyVisible ? closeHistory() : openHistory()">
                    <Clock aria-hidden="true" />
                </button>
                <button type="button" class="agent-icon-button" aria-label="新建对话" title="新建对话"
                    :disabled="!canSwitchConversation" @click="startNewConversation">
                    <RefreshRight aria-hidden="true" />
                </button>
                <button type="button" class="agent-icon-button" aria-label="关闭小 Y" title="关闭"
                    @click="visible = false">
                    <Close aria-hidden="true" />
                </button>
            </div>
        </template>

        <div class="agent-context">
            <School aria-hidden="true" />
            <span :title="className">{{ className }}</span>
            <span class="agent-context__divider">/</span>
            <span :title="semesterName">{{ semesterName }}</span>
        </div>

        <div v-if="!scopeReady" class="agent-notice" role="status">
            请先在页面顶部选择班级和学期，再开始对话。
        </div>
        <div v-if="error && scopeReady" class="agent-error" role="alert">
            <WarningFilled aria-hidden="true" />
            <span>{{ error }}</span>
            <button type="button" :disabled="loading || sending" @click="reconnect">重新同步</button>
        </div>

        <AgentConversationHistory v-if="historyVisible" :items="history" :current-id="conversation?.id"
            :loading="historyLoading" :error="historyError" :has-more="historyHasMore"
            :disabled="!canSwitchConversation" @back="closeHistory" @select="selectConversation"
            @retry="chat.loadHistory()" @load-more="chat.loadHistory(false)" />

        <template v-else>
            <div ref="conversationRef" class="agent-conversation" @scroll="handleScroll">
                <div v-if="loading" class="agent-loading" role="status">
                    <Loading aria-hidden="true" />正在同步对话…
                </div>
                <div v-else-if="messages.length === 0" class="agent-welcome">
                    <div class="agent-welcome__mark"><XiaoYAvatar :size="76" /></div>
                    <span class="agent-eyebrow">让日常教学，轻松一点</span>
                    <h3>你好，老师<br />今天想先处理什么？</h3>
                    <p>我是小 Y，你的课堂小帮手。<br />查班级、记积分，或兑换一份小奖励。</p>
                    <div class="agent-starters">
                        <button v-for="starter in starters" :key="starter.prompt" type="button"
                            class="agent-starter" :disabled="!canSend" @click="sendMessage(starter.prompt)">
                            <span class="agent-starter__icon" :class="starter.tone">
                                <component :is="starter.icon" aria-hidden="true" />
                            </span>
                            <span><strong>{{ starter.label }}</strong><small>{{ starter.prompt }}</small></span>
                            <ArrowRight aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div v-else class="agent-messages" role="log" aria-label="与小 Y 的对话"
                    aria-live="polite" :aria-busy="responding">
                    <div class="agent-timeline-label">当前班级 · {{ semesterName }}</div>
                    <article v-for="message in messages" :key="message.id" class="agent-message"
                        :class="`agent-message--${message.role}`" :aria-label="message.role === 'user' ? '你' : '小 Y'">
                        <div v-if="message.role === 'assistant'" class="agent-message__sender">
                            <XiaoYAvatar :size="24" /><span>小 Y</span>
                        </div>
                        <AgentMarkdown v-if="message.role === 'assistant' && message.text && !message.actions.length"
                            :content="message.text" />
                        <p v-else-if="message.role === 'user' && message.text" class="agent-message__text">{{ message.text }}</p>
                        <details v-if="message.cards.length || (message.actions.length && message.text)" class="agent-query-details"
                            :open="message.complete && !message.text && !message.actions.length">
                            <summary>
                                <ArrowRight aria-hidden="true" />
                                <span>{{ message.actions.length ? '操作说明' : '查询详情' }}</span>
                                <span v-if="message.cards.length" class="agent-query-details__count">{{ message.cards.length }} 项查询</span>
                            </summary>
                            <AgentMarkdown v-if="message.actions.length && message.text" class="agent-action-explanation"
                                :content="message.text" />
                            <div v-for="(card, cardIndex) in message.cards" :key="`${message.runId}-${cardIndex}`" class="agent-data-card">
                                <h4 v-if="card.title">{{ card.title }}</h4>
                                <div v-if="card.stats?.length" class="agent-stats">
                                    <div v-for="stat in card.stats" :key="stat.label" class="agent-stat">
                                        <span>{{ stat.label }}</span>
                                        <strong>{{ stat.value }}</strong>
                                        <small v-if="stat.detail">{{ stat.detail }}</small>
                                    </div>
                                </div>
                                <div v-if="card.rows?.length" class="agent-data-list">
                                    <div v-for="row in card.rows" :key="row.id" class="agent-data-row">
                                        <span class="agent-data-row__avatar">{{ row.name.slice(-2) }}</span>
                                        <span class="agent-data-row__name">
                                            <strong>{{ row.name }}</strong><small>{{ row.detail }}</small>
                                        </span>
                                        <span class="agent-data-row__value">{{ row.value }}</span>
                                    </div>
                                </div>
                                <p v-if="card.note" class="agent-data-card__note">{{ card.note }}</p>
                            </div>
                        </details>

                        <div v-for="action in message.actions" :key="action.id" class="agent-action"
                            :class="`is-${action.status}`">
                            <div class="agent-action__heading">
                                <component :is="action.kind === 'points' ? Star : Present" aria-hidden="true" />
                                <strong>{{ action.title }}</strong>
                                <span>{{ actionLabel(action) }}</span>
                            </div>
                            <p>{{ action.description }}</p>
                            <div v-if="action.rows?.length" class="agent-data-list agent-action__students">
                                <div v-for="(row, rowIndex) in action.rows" :key="`${action.id}-${rowIndex}`" class="agent-data-row">
                                    <span class="agent-data-row__name">
                                        <strong>{{ row.name }}</strong><small>{{ row.detail }}</small>
                                    </span>
                                    <span class="agent-data-row__value">{{ row.value }}</span>
                                </div>
                            </div>
                            <dl>
                                <div v-for="detail in action.details" :key="detail.label">
                                    <dt>{{ detail.label }}</dt><dd>{{ detail.value }}</dd>
                                </div>
                            </dl>
                            <template v-if="action.status === 'pending'">
                                <p class="agent-action__expiry">
                                    {{ isExpired(action) ? '预览已过期，请重新生成' : `请在 ${formatTime(action.expires_at)} 前确认` }}
                                </p>
                                <p v-if="!canWrite && !isExpired(action)" class="agent-action__expiry">
                                    当前为只读状态，暂不能确认写入。
                                </p>
                                <div class="agent-action__buttons">
                                    <button type="button" class="agent-secondary-button"
                                        :disabled="loading || !!actionBusyId" @click="handleActionDecision(action, 'reject')">暂不执行</button>
                                    <button type="button" class="agent-primary-button"
                                        :disabled="!canConfirm(action)" @click="handleActionDecision(action, 'confirm')">
                                        <Loading v-if="actionBusyId === action.id" class="agent-busy-icon" aria-hidden="true" />
                                        <Check v-else aria-hidden="true" />
                                        {{ actionBusyId === action.id ? '处理中…' : action.kind === 'points' ? '确认执行' : '确认兑换' }}
                                    </button>
                                </div>
                            </template>
                            <div v-else class="agent-action__result">
                                <CircleCheck v-if="action.status === 'succeeded'" aria-hidden="true" />
                                <span>{{ action.result?.summary || actionResultLabels[action.status] }}</span>
                            </div>
                        </div>
                        <p v-if="message.error" class="agent-message__error" role="status">{{ message.error }}</p>
                        <p v-if="message.durationMs !== undefined" class="agent-message__duration">
                            耗时 {{ formatDuration(message.durationMs) }}
                        </p>
                    </article>
                </div>

                <div v-if="responding || sending" class="agent-thinking" role="status">
                    <Loading aria-hidden="true" /><span>{{ stepLabel }}</span>
                    <button type="button" :disabled="sending || stopping" @click="cancel">{{ stopping ? '停止中…' : '停止' }}</button>
                </div>
            </div>

            <div v-if="messages.length && !responding && !loading" class="agent-suggestions" aria-label="继续提问">
                <button v-for="starter in starters" :key="starter.prompt" type="button" :disabled="!canSend"
                    @click="sendMessage(starter.prompt)">{{ starter.label }}<ArrowRight aria-hidden="true" /></button>
            </div>

            <form class="agent-composer" @submit.prevent="sendMessage()">
                <div class="agent-composer__input">
                    <textarea ref="inputRef" v-model="draft" rows="2" maxlength="1000" aria-label="发送给小 Y 的消息"
                        :disabled="!scopeReady || loading" placeholder="试着问我，或者描述你想做的事…"
                        @keydown="handleInputKeydown" />
                    <div class="agent-composer__toolbar">
                        <span><span class="agent-mode-dot" />小 Y · 课堂助手</span>
                        <button v-if="responding" type="button" class="agent-send-button" aria-label="停止回复" :disabled="stopping" @click="cancel">
                            <span class="agent-stop-icon" />
                        </button>
                        <button v-else type="submit" class="agent-send-button" :disabled="!canSend || !draft.trim()" aria-label="发送消息">
                            <Top aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <div class="agent-composer__hint"><span>Enter 发送 · Shift + Enter 换行</span><span>{{ draft.length }}/1000</span></div>
                <p class="agent-data-note"><InfoFilled aria-hidden="true" />AI 建议请核对，积分操作和兑换需确认后执行</p>
            </form>
        </template>
    </ElDrawer>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ElDrawer } from "element-plus";
import {
    ArrowRight,
    Check,
    CircleCheck,
    Clock,
    Close,
    DataAnalysis,
    InfoFilled,
    Loading,
    Present,
    RefreshRight,
    School,
    Star,
    Top,
    WarningFilled,
} from "@element-plus/icons-vue";
import type { AgentAction } from "@/types/agent";
import { notifyAgentActionSucceeded } from "@/utils/agentEvents";
import { useAgentChat } from "@/v3/composables/useAgentChat";
import AgentMarkdown from "./AgentMarkdown.vue";
import AgentConversationHistory from "./AgentConversationHistory.vue";
import XiaoYAvatar from "./XiaoYAvatar.vue";
import { formatDuration, toChatMessages } from "./agentPresentation";

const props = withDefaults(defineProps<{
    classId?: number | null;
    className?: string;
    semesterId?: number | null;
    semesterName?: string;
    userId?: string;
    canWrite?: boolean;
}>(), {
    className: "请选择班级",
    semesterName: "请选择学期",
    canWrite: false,
});

const visible = ref(false);
const historyVisible = ref(false);
const draft = ref("");
const now = ref(Date.now());
const launcherRef = ref<HTMLButtonElement>();
const inputRef = ref<HTMLTextAreaElement>();
const conversationRef = ref<HTMLElement>();
let followLatest = true;
let expiryTimer: number | undefined;

const chat = useAgentChat(
    () => ({ userId: props.userId, classId: props.classId, semesterId: props.semesterId }),
    (action) => {
        if (props.userId && props.classId && props.semesterId) {
            notifyAgentActionSucceeded({
                userId: props.userId,
                classId: props.classId,
                semesterId: props.semesterId,
                kind: action.kind,
            });
        }
    },
);
const {
    conversation, loading, sending, responding, streamConnected, error, actionBusyId, stopping,
    currentStep, reconnect, cancel, history, historyLoading, historyError, historyHasMore,
} = chat;
const messages = computed(() => toChatMessages(conversation.value));
const scopeReady = computed(() => !!props.userId && !!props.classId && !!props.semesterId);
const canSend = computed(() => scopeReady.value && !loading.value && !sending.value && !responding.value && !actionBusyId.value);
const canSwitchConversation = computed(() => scopeReady.value && !loading.value && !sending.value && !stopping.value && !actionBusyId.value);
const statusLabel = computed(() => loading.value ? "同步中" : responding.value ? streamConnected.value ? "回复中" : "连接中" : "随时待命");
const avatarMood = computed(() => {
    if (responding.value && messages.value.some((message) => message.role === "assistant" && !message.complete && message.text)) {
        return "speaking";
    }
    return loading.value || sending.value || responding.value ? "thinking" : "idle";
});
const starters = [
    { label: "看看班级这一周", prompt: "总结本周班级积分", icon: DataAnalysis, tone: "agent-starter__icon--0" },
    { label: "为学生的进步加分", prompt: "为学生的进步加分", icon: Star, tone: "agent-starter__icon--1" },
    { label: "兑换一份小奖励", prompt: "查看可以兑换的奖品", icon: Present, tone: "agent-starter__icon--2" },
];
const actionStateLabels: Record<AgentAction["status"], string> = {
    pending: "待确认", succeeded: "已完成", rejected: "已取消", expired: "已过期",
};
const actionResultLabels: Record<AgentAction["status"], string> = {
    pending: "等待确认", succeeded: "操作已执行", rejected: "已取消，本次操作未执行", expired: "预览已过期，请重新生成",
};
const stepLabel = computed(() => sending.value ? "正在发送消息…" : currentStep.value || "正在生成回复…");

function isExpired(action: AgentAction): boolean {
    return Date.parse(action.expires_at) <= now.value;
}

function actionLabel(action: AgentAction): string {
    if (actionBusyId.value === action.id) return "处理中";
    if (action.status === "pending" && isExpired(action)) return "已过期";
    return actionStateLabels[action.status];
}

function canConfirm(action: AgentAction): boolean {
    return props.canWrite && scopeReady.value && action.status === "pending" && !isExpired(action)
        && !loading.value && !responding.value && !sending.value && !actionBusyId.value;
}

function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

async function scrollToLatest() {
    await nextTick();
    if (followLatest && conversationRef.value) {
        conversationRef.value.scrollTop = messages.value.length ? conversationRef.value.scrollHeight : 0;
    }
}

function handleScroll() {
    const container = conversationRef.value;
    if (container) followLatest = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
}

async function sendMessage(prompt = draft.value) {
    if (!canSend.value || !prompt.trim()) return;
    const originalDraft = draft.value;
    followLatest = true;
    if (await chat.send(prompt)) {
        if (draft.value === originalDraft) draft.value = "";
        void scrollToLatest();
    }
}

async function startNewConversation() {
    if (!canSwitchConversation.value) return;
    followLatest = true;
    await chat.newConversation();
    if (!error.value) {
        draft.value = "";
        closeHistory();
    }
}

async function openHistory() {
    if (!canSwitchConversation.value) return;
    historyVisible.value = true;
    await chat.loadHistory();
}

function closeHistory() {
    historyVisible.value = false;
    followLatest = true;
    void scrollToLatest();
}

async function selectConversation(id: string) {
    if (!canSwitchConversation.value) return;
    if (await chat.selectConversation(id)) {
        draft.value = "";
        closeHistory();
    }
}

async function handleActionDecision(action: AgentAction, decision: "confirm" | "reject") {
    if (loading.value || actionBusyId.value) return;
    if (decision === "confirm" && !canConfirm(action)) return;
    await chat.decide(action.id, decision);
}

function handleInputKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
        event.preventDefault();
        void sendMessage();
    }
}

function handleOpened() {
    if (window.matchMedia("(pointer: fine)").matches) inputRef.value?.focus();
    void scrollToLatest();
}

function handleClosed() {
    launcherRef.value?.focus({ preventScroll: true });
}

watch(visible, (open) => {
    window.clearInterval(expiryTimer);
    if (open) {
        now.value = Date.now();
        expiryTimer = window.setInterval(() => { now.value = Date.now(); }, 1000);
        void chat.open();
    } else {
        chat.close();
    }
});
watch(() => [props.userId, props.classId, props.semesterId], () => {
    draft.value = "";
    historyVisible.value = false;
});
watch(messages, () => { void scrollToLatest(); }, { deep: true });
onBeforeUnmount(() => window.clearInterval(expiryTimer));
</script>

<style scoped>
.agent-launcher {
    position: fixed;
    z-index: 1799;
    right: 28px;
    bottom: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    padding: 0;
    border: 1px solid #dbeaff;
    border-radius: 24px;
    color: var(--ta-text);
    background: var(--ta-surface-solid);
    box-shadow: 0 6px 22px rgba(0, 122, 255, 0.15), inset 0 1px 0 #fff;
    cursor: pointer;
    transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), opacity 160ms ease;
}
.agent-launcher__label {
    position: absolute;
    bottom: -7px;
    padding: 1px 8px;
    border: 1px solid #dbeaff;
    border-radius: 8px;
    background: var(--ta-surface-solid);
    color: #315c99;
    font-size: 10px;
    font-weight: 650;
    line-height: 1.5;
}
.agent-launcher.is-open {
    opacity: 0;
    pointer-events: none;
}
.agent-launcher:active {
    transform: scale(0.97);
}
:global(.agent-panel-layer) {
    --el-transition-duration: 280ms;
    background: transparent;
    backdrop-filter: none;
}
:global(.agent-panel-layer::before) {
    position: absolute;
    inset: 0;
    content: "";
    background: rgba(0, 0, 0, 0.18);
    opacity: 1;
    pointer-events: none;
    transition: opacity var(--el-transition-duration) cubic-bezier(0.32, 0.72, 0, 1);
}
:global(.el-drawer.agent-panel) {
    top: 16px;
    right: 16px;
    bottom: 16px;
    height: calc(100% - 32px);
    max-width: calc(100vw - 32px);
    border: 1px solid var(--ta-line);
    border-radius: 24px;
    overflow: hidden;
    pointer-events: auto;
    background: var(--ta-surface-solid);
    box-shadow: 0 16px 60px rgba(29, 29, 31, 0.14), 0 2px 8px rgba(29, 29, 31, 0.04);
    transform: translate3d(0, 0, 0);
    transition: transform var(--el-transition-duration) cubic-bezier(0.32, 0.72, 0, 1);
}
:global(.agent-panel-layer.el-drawer-fade-enter-active), :global(.agent-panel-layer.el-drawer-fade-leave-active) {
    /* ElDrawer 在外层判断过渡结束，时长需与抽屉和遮罩同步。 */
    transition: opacity var(--el-transition-duration) cubic-bezier(0.32, 0.72, 0, 1);
}
:global(.agent-panel-layer.el-drawer-fade-leave-active) {
    --el-transition-duration: 200ms;
}
:global(.agent-panel-layer.el-drawer-fade-enter-from::before), :global(.agent-panel-layer.el-drawer-fade-leave-to::before) {
    opacity: 0;
}
:global(.agent-panel-layer.el-drawer-fade-enter-from .agent-panel), :global(.agent-panel-layer.el-drawer-fade-leave-to .agent-panel) {
    transform: translate3d(calc(100% + 32px), 0, 0);
}
:global(.agent-panel .el-drawer__header) {
    flex: 0 0 auto;
    padding: 20px 20px 16px;
    margin: 0;
}
:global(.agent-panel .el-drawer__body) {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 0;
    overflow: hidden;
}
.agent-header {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
}
.agent-avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 48px;
    height: 48px;
}
.agent-header__title {
    flex: 1;
    min-width: 0;
}
.agent-header h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: var(--ta-text);
}
.agent-header p {
    margin: 5px 0 0;
    font-size: 12px;
    color: var(--ta-text-tertiary);
}
.agent-status-badge {
    padding: 3px 6px;
    border-radius: 5px;
    background: var(--ta-green-soft);
    font-size: 10px;
    font-weight: 500;
    color: var(--ta-green);
}
.agent-icon-button {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    padding: 7px;
    border: 0;
    border-radius: 9px;
    color: var(--ta-text-tertiary);
    background: transparent;
    cursor: pointer;
}
.agent-icon-button svg {
    width: 18px;
    height: 18px;
}
.agent-icon-button[aria-pressed="true"] {
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
}
.agent-icon-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}
.agent-icon-button:focus-visible {
    outline: 2px solid var(--ta-blue);
    outline-offset: 2px;
}
.agent-context {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
    margin: 0 20px;
    padding: 10px 12px;
    border: 1px solid var(--ta-line);
    border-radius: 10px;
    font-size: 12px;
    color: var(--ta-text-secondary);
    background: #fafafb;
}
.agent-context > svg {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    color: var(--ta-blue);
}
.agent-context > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.agent-context__divider {
    color: #c5c5ca;
}
.agent-notice {
    margin: 12px 20px 0;
    color: var(--ta-text-secondary);
    font-size: 12px;
    line-height: 1.7;
}
.agent-error {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin: 12px 20px 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--ta-red-soft);
    color: var(--ta-red);
    font-size: 12px;
    line-height: 1.6;
}
.agent-error > svg {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    margin-top: 2px;
}
.agent-error > span {
    min-width: 0;
    flex: 1;
    overflow-wrap: anywhere;
}
.agent-error button {
    flex-shrink: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 11px;
    text-decoration: underline;
    cursor: pointer;
}
.agent-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 24px 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
}
.agent-loading > svg {
    width: 17px;
    height: 17px;
    animation: agent-spin 1s linear infinite;
}
.agent-message__error {
    margin: 10px 0 0;
    color: var(--ta-red);
    font-size: 12px;
}
.agent-message__duration {
    margin: 10px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 11px;
}
.agent-query-details {
    margin-top: 14px;
}
.agent-query-details > summary {
    display: flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    color: var(--ta-text-secondary);
    font-size: 11px;
    cursor: pointer;
    list-style: none;
}
.agent-query-details > summary::-webkit-details-marker {
    display: none;
}
.agent-query-details > summary > svg {
    width: 12px;
    height: 12px;
}
.agent-query-details[open] > summary > svg {
    transform: rotate(90deg);
}
.agent-query-details > summary:focus-visible {
    outline: 2px solid var(--ta-blue);
    outline-offset: 4px;
    border-radius: 4px;
}
.agent-query-details__count {
    color: var(--ta-text-tertiary);
}
.agent-action-explanation {
    margin-top: 12px;
}
.agent-data-card {
    margin-top: 14px;
}
.agent-data-card h4 {
    margin: 0 0 8px;
    color: var(--ta-text-secondary);
    font-size: 12px;
    font-weight: 600;
}
.agent-data-card__note {
    margin: 8px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 11px;
    line-height: 1.7;
}
.agent-action__students {
    margin: 12px 0;
    background: var(--ta-surface-solid);
}
.agent-action > .agent-action__expiry {
    margin: 10px 0 0;
    line-height: 1.6;
}
.agent-busy-icon {
    animation: agent-spin 1s linear infinite;
}
.agent-icon-button:disabled,
.agent-starter:disabled,
.agent-primary-button:disabled,
.agent-secondary-button:disabled,
.agent-suggestions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.agent-conversation {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 24px 20px;
    scrollbar-width: thin;
    scrollbar-color: #d8d8dc transparent;
}
.agent-welcome {
    padding: 12px 2px 6px;
}
.agent-welcome__mark {
    display: grid;
    place-items: center;
    width: 76px;
    height: 76px;
    margin-bottom: 16px;
}
.agent-eyebrow {
    color: var(--ta-text-tertiary);
    font-size: 12px;
}
.agent-welcome h3 {
    margin: 10px 0 12px;
    font-size: 28px;
    line-height: 1.45;
    font-weight: 650;
    letter-spacing: -0.04em;
    color: var(--ta-text);
}
.agent-welcome > p {
    margin: 0;
    font-size: 13px;
    line-height: 1.85;
    color: var(--ta-text-secondary);
}
.agent-starters {
    display: grid;
    gap: 10px;
    margin-top: 28px;
}
.agent-starter {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 12px;
    border: 1px solid var(--ta-line);
    border-radius: 14px;
    text-align: left;
    background: #fff;
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease;
}
.agent-starter__icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--ta-blue-soft);
    color: var(--ta-blue);
}
.agent-starter__icon--1 {
    background: var(--ta-orange-soft);
    color: var(--ta-orange);
}
.agent-starter__icon--2 {
    background: var(--ta-purple-soft);
    color: var(--ta-purple);
}
.agent-starter__icon svg {
    width: 19px;
    height: 19px;
}
.agent-starter > span:nth-child(2) {
    flex: 1;
    min-width: 0;
}
.agent-starter strong, .agent-starter small {
    display: block;
}
.agent-starter strong {
    font-size: 13px;
    font-weight: 600;
    color: var(--ta-text);
}
.agent-starter small {
    margin-top: 5px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--ta-text-tertiary);
}
.agent-starter > svg {
    width: 14px;
    height: 14px;
    color: #b2b2b8;
}
.agent-messages {
    display: flex;
    flex-direction: column;
    gap: 23px;
}
.agent-timeline-label {
    text-align: center;
    font-size: 11px;
    color: var(--ta-text-tertiary);
}
.agent-message {
    min-width: 0;
    font-size: 13px;
    line-height: 1.8;
}
.agent-message--user {
    align-self: flex-end;
    max-width: 90%;
    padding: 11px 15px;
    border-radius: 15px 15px 4px 15px;
    background: var(--ta-blue-soft);
    color: var(--ta-text);
}
.agent-message__text {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}
.agent-message__sender {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    color: var(--ta-text);
    font-size: 12px;
    font-weight: 650;
}


.agent-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 14px;
}
.agent-stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 10px;
    border: 1px solid var(--ta-line);
    border-radius: 12px;
    background: #fafafb;
}
.agent-stat > span {
    font-size: 11px;
    color: var(--ta-text-secondary);
}
.agent-stat strong {
    font-size: 23px;
    line-height: 1.4;
    font-variant-numeric: tabular-nums;
    color: var(--ta-text);
    font-weight: 650;
    letter-spacing: -0.04em;
}
.agent-stat small {
    font-size: 10px;
    line-height: 1.5;
    color: var(--ta-text-tertiary);
    overflow-wrap: anywhere;
}
.agent-data-list {
    margin-top: 14px;
    padding: 4px 12px;
    border: 1px solid var(--ta-line);
    border-radius: 12px;
}
.agent-data-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 0;
}
.agent-data-row + .agent-data-row {
    border-top: 1px solid var(--ta-line);
}
.agent-data-row__avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 10px;
    background: var(--ta-blue-soft);
    color: #4385be;
    font-size: 10px;
}
.agent-data-row__name {
    flex: 1;
    min-width: 0;
}
.agent-data-row__name strong, .agent-data-row__name small {
    display: block;
}
.agent-data-row__name strong {
    font-size: 12px;
    font-weight: 550;
}
.agent-data-row__name small {
    font-size: 10px;
    line-height: 1.6;
    color: var(--ta-text-tertiary);
}
.agent-data-row__value {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--ta-green);
}

.agent-action {
    margin-top: 14px;
    padding: 15px;
    border: 1px solid #cfe4fd;
    border-radius: 14px;
    background: #f7fbff;
}
.agent-action__heading {
    display: flex;
    align-items: center;
    gap: 7px;
}
.agent-action__heading > svg {
    flex-shrink: 0;
    width: 17px;
    height: 17px;
    color: var(--ta-blue);
}
.agent-action__heading > strong {
    flex: 1;
    font-size: 13px;
    font-weight: 650;
}
.agent-action__heading > span {
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: 5px;
    background: #e8f1fc;
    color: var(--ta-blue);
    font-size: 10px;
}
.agent-action > p {
    margin: 5px 0 13px;
    font-size: 11px;
    color: var(--ta-text-tertiary);
}
.agent-action dl {
    display: grid;
    gap: 8px;
    margin: 0;
    font-size: 12px;
}
.agent-action dl > div {
    display: flex;
    gap: 15px;
    justify-content: space-between;
    align-items: baseline;
}
.agent-action dt {
    flex-shrink: 0;
    color: var(--ta-text-secondary);
}
.agent-action dd {
    margin: 0;
    text-align: right;
    overflow-wrap: anywhere;
    color: var(--ta-text);
}
.agent-action__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
}
.agent-primary-button, .agent-secondary-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 8px 11px;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
}
.agent-primary-button {
    background: var(--ta-blue);
    color: #fff;
}
.agent-secondary-button {
    background: #fff;
    border-color: var(--ta-line);
    color: var(--ta-text-secondary);
}
.agent-primary-button svg {
    width: 14px;
    height: 14px;
}
.agent-action__result {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 13px;
    padding-top: 11px;
    border-top: 1px solid var(--ta-line);
    color: var(--ta-text-secondary);
    font-size: 11px;
}
.agent-action__result svg {
    width: 14px;
    height: 14px;
}
.agent-action.is-succeeded .agent-action__result {
    color: var(--ta-green);
}
.agent-action.is-rejected, .agent-action.is-expired {
    border-color: var(--ta-line);
    background: #fafafb;
}
.agent-thinking {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 16px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 12px;
}
.agent-thinking > svg {
    width: 15px;
    height: 15px;
    animation: agent-spin 1s linear infinite;
}
.agent-thinking > button {
    margin-left: auto;
    border: 0;
    padding: 4px 6px;
    background: transparent;
    color: var(--ta-text-secondary);
    cursor: pointer;
    font-size: 11px;
}
.agent-suggestions {
    display: flex;
    flex-shrink: 0;
    flex-wrap: wrap;
    gap: 7px;
    padding: 0 20px 12px;
}
.agent-suggestions button {
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    border: 1px solid var(--ta-line);
    padding: 6px 8px;
    border-radius: 8px;
    font-size: 10px;
    background: #fff;
    color: var(--ta-text-secondary);
    text-align: left;
    cursor: pointer;
}
.agent-suggestions svg {
    width: 11px;
    height: 11px;
    flex-shrink: 0;
}
.agent-composer {
    flex-shrink: 0;
    padding: 4px 20px 15px;
}
.agent-composer__input {
    border: 1px solid var(--ta-line-strong);
    border-radius: 15px;
    padding: 12px;
    background: #fff;
    transition: border-color 160ms ease, box-shadow 160ms ease;
}
.agent-composer__input:focus-within {
    border-color: #80bdff;
    box-shadow: 0 0 0 3px var(--ta-blue-soft);
}
.agent-composer textarea {
    display: block;
    width: 100%;
    height: 51px;
    max-height: 100px;
    padding: 0;
    resize: none;
    border: 0;
    outline: none;
    box-shadow: none;
    background: transparent;
    color: var(--ta-text);
    line-height: 1.7;
    font-size: 13px;
}
.agent-composer textarea::placeholder {
    color: #9c9ca3;
}
.agent-composer__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 5px;
}
.agent-composer__toolbar > span {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    color: var(--ta-text-tertiary);
}
.agent-mode-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--ta-green);
}
.agent-send-button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 6px;
    border: 0;
    border-radius: 9px;
    background: var(--ta-blue);
    color: #fff;
    cursor: pointer;
    transition: background-color 160ms ease, transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}
.agent-send-button svg {
    width: 18px;
    height: 18px;
}
.agent-send-button:disabled {
    background: #edf0f3;
    color: #b2b7be;
}
.agent-send-button:active {
    transform: scale(0.96);
}
.agent-stop-icon {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: currentColor;
}
.agent-composer__hint {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 7px 2px 0;
    font-size: 9px;
    color: var(--ta-text-tertiary);
}
.agent-data-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin: 12px 0 0;
    font-size: 10px;
    line-height: 1.5;
    color: var(--ta-text-tertiary);
}
.agent-data-note svg {
    width: 11px;
    height: 11px;
    flex-shrink: 0;
}
@keyframes agent-spin {
    to {
        transform: rotate(360deg);
    }
}
@media (hover: hover) and (pointer: fine) {
    .agent-launcher:hover {
        transform: translateY(-2px);
    }
    .agent-icon-button:not(:disabled):hover {
        background: var(--ta-surface-muted);
        color: var(--ta-text);
    }
    .agent-starter:not(:disabled):hover {
        border-color: #b8d8ff;
        background: #f8fbff;
    }
    .agent-suggestions button:not(:disabled):hover {
        color: var(--ta-blue);
        border-color: #b8d8ff;
    }
    .agent-primary-button:not(:disabled):hover, .agent-send-button:not(:disabled):hover {
        background: var(--ta-blue-hover);
    }
}
@media (max-width: 920px) {
    .agent-launcher {
        right: 20px;
        bottom: calc(92px + env(safe-area-inset-bottom));
        width: 60px;
        height: 60px;
        padding: 0;
        border-radius: 22px;
    }
}
@media (max-width: 520px) {
    :global(.el-drawer.agent-panel) {
        top: 8px;
        right: 8px;
        bottom: 8px;
        width: calc(100vw - 16px) !important;
        max-width: none;
        height: calc(100% - 16px);
        border-radius: 20px;
    }
    :global(.agent-panel .el-drawer__header) {
        padding: 16px 16px 12px;
    }
    .agent-header {
        gap: 6px;
    }
    .agent-header h2 {
        flex-wrap: wrap;
        gap: 4px 6px;
    }
    .agent-icon-button {
        width: 30px;
        height: 30px;
        padding: 6px;
    }
    .agent-context {
        margin: 0 16px;
    }
    .agent-conversation {
        padding: 20px 16px;
    }
    .agent-composer {
        padding: 4px 16px max(12px, env(safe-area-inset-bottom));
    }
    .agent-suggestions {
        padding-right: 16px;
        padding-left: 16px;
    }
    .agent-welcome {
        padding-top: 0;
    }
    .agent-welcome__mark {
        margin-bottom: 15px;
    }
    .agent-welcome h3 {
        font-size: 25px;
    }
    .agent-starters {
        margin-top: 20px;
    }
    .agent-composer textarea {
        font-size: 16px;
    }
    .agent-stat {
        padding: 10px 8px;
    }
    .agent-stat strong {
        font-size: 21px;
    }
}
@media (prefers-reduced-motion: reduce) {
    :global(.el-drawer.agent-panel) {
        transition: opacity 120ms ease;
    }
    :global(.agent-panel-layer.el-drawer-fade-enter-from .agent-panel), :global(.agent-panel-layer.el-drawer-fade-leave-to .agent-panel) {
        transform: none;
        opacity: 0;
    }
    .agent-launcher, .agent-send-button {
        transition: background-color 120ms ease;
    }
    .agent-launcher:hover, .agent-launcher:active, .agent-send-button:active {
        transform: none;
    }
    .agent-thinking > svg, .agent-loading > svg, .agent-busy-icon {
        animation: none;
    }
}
</style>
