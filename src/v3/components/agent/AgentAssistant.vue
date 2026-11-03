<template>
    <button ref="launcherRef" type="button" class="agent-launcher" :class="{ 'is-open': visible }"
        aria-label="打开 AI 助手" title="AI 助手" aria-haspopup="dialog" :aria-expanded="visible"
        aria-controls="agent-assistant-panel" @click="visible = !visible">
        <MagicStick aria-hidden="true" />
        <span class="agent-launcher__dot" aria-hidden="true" />
    </button>

    <ElDrawer v-model="visible" class="agent-panel" modal-class="agent-panel-layer"
        title="AI 助手" direction="rtl" size="440px" append-to-body
        :modal="false" :lock-scroll="false" :show-close="false" :close-on-click-modal="false"
        :z-index="1800" aria-modal="false" id="agent-assistant-panel"
        @opened="handleOpened" @closed="handleClosed" @close="finishReply">
        <template #header>
            <div class="agent-header">
                <span class="agent-avatar"><MagicStick aria-hidden="true" /></span>
                <div class="agent-header__title">
                    <h2>AI 助手 <span class="agent-demo-badge">演示版</span></h2>
                    <p>你的课堂小帮手</p>
                </div>
                <button type="button" class="agent-icon-button" aria-label="新建对话" title="新建对话"
                    @click="resetConversation">
                    <RefreshRight aria-hidden="true" />
                </button>
                <button type="button" class="agent-icon-button" aria-label="关闭 AI 助手" title="关闭"
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

        <div ref="conversationRef" class="agent-conversation" @scroll="handleScroll">
            <div v-if="messages.length === 0" class="agent-welcome">
                <div class="agent-welcome__mark"><MagicStick aria-hidden="true" /></div>
                <span class="agent-eyebrow">让日常教学，轻松一点</span>
                <h3>你好，老师<br />今天想先处理什么？</h3>
                <p>查一查班级表现，记录一次进步，<br />或为学生兑换一份小奖励。</p>
                <div class="agent-starters">
                    <button v-for="(prompt, index) in DEMO_PROMPTS" :key="prompt" type="button"
                        class="agent-starter" @click="sendMessage(prompt)">
                        <span class="agent-starter__icon" :class="`agent-starter__icon--${index}`">
                            <component :is="starterIcons[index]" aria-hidden="true" />
                        </span>
                        <span><strong>{{ starterLabels[index] }}</strong><small>{{ prompt }}</small></span>
                        <ArrowRight aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div v-else class="agent-messages" role="log" aria-label="与 AI 助手的模拟对话"
                aria-live="polite" :aria-busy="responding">
                <div class="agent-timeline-label">本次对话 · 示例数据</div>
                <article v-for="message in messages" :key="message.id" class="agent-message"
                    :class="`agent-message--${message.role}`" :aria-label="message.role === 'user' ? '你' : 'AI 助手'">
                    <div v-if="message.role === 'assistant'" class="agent-message__sender">
                        <MagicStick aria-hidden="true" /><span>AI 助手</span>
                    </div>
                    <div v-if="message.reply && message.complete" class="agent-tool-status">
                        <CircleCheck aria-hidden="true" />{{ message.reply.steps[message.reply.steps.length - 1] }}
                    </div>
                    <p v-if="message.text" class="agent-message__text">{{ message.text }}</p>

                    <template v-if="message.complete && message.reply">
                        <div v-if="message.reply.stats" class="agent-stats">
                            <div v-for="stat in message.reply.stats" :key="stat.label" class="agent-stat">
                                <span>{{ stat.label }}</span><strong>{{ stat.value }}</strong><small>{{ stat.detail }}</small>
                            </div>
                        </div>
                        <div v-if="message.reply.rows" class="agent-data-list">
                            <div v-for="(row, index) in message.reply.rows" :key="row.name" class="agent-data-row">
                                <span class="agent-data-row__avatar">{{ row.name.slice(-2) }}</span>
                                <span class="agent-data-row__name"><strong>{{ row.name }}</strong><small>{{ row.detail }}</small></span>
                                <span class="agent-data-row__value">{{ row.value }}</span>
                                <span v-if="!message.reply.action" class="agent-data-row__rank">{{ index + 1 }}</span>
                            </div>
                        </div>

                        <div v-if="message.reply.action" class="agent-action" :class="`is-${message.actionState}`">
                            <div class="agent-action__heading">
                                <component :is="message.reply.action.kind === 'points' ? Star : Present" aria-hidden="true" />
                                <strong>{{ message.reply.action.title }}</strong>
                                <span>{{ actionStateLabels[message.actionState] }}</span>
                            </div>
                            <p>{{ message.reply.action.description }}</p>
                            <dl>
                                <div v-for="detail in message.reply.action.details" :key="detail.label">
                                    <dt>{{ detail.label }}</dt><dd>{{ detail.value }}</dd>
                                </div>
                            </dl>
                            <div v-if="message.actionState === 'pending'" class="agent-action__buttons">
                                <button type="button" class="agent-secondary-button" :disabled="responding"
                                    @click="resolveAction(message, false)">暂不执行</button>
                                <button type="button" class="agent-primary-button" :disabled="responding"
                                    @click="resolveAction(message, true)">
                                    <Check aria-hidden="true" />{{ message.reply.action.confirmLabel }}
                                </button>
                            </div>
                            <div v-else class="agent-action__result">
                                <CircleCheck v-if="message.actionState === 'confirmed'" aria-hidden="true" />
                                <span>{{ actionResultLabels[message.actionState] }}</span>
                            </div>
                        </div>
                    </template>
                </article>
            </div>

            <div v-if="responding" class="agent-thinking" role="status">
                <Loading aria-hidden="true" /><span>{{ currentStep }}…</span>
                <button type="button" @click="stopReply">停止</button>
            </div>
        </div>

        <div v-if="latestSuggestions.length && !responding" class="agent-suggestions" aria-label="继续提问">
            <button v-for="suggestion in latestSuggestions" :key="suggestion" type="button"
                @click="sendMessage(suggestion)">{{ suggestion }}<ArrowRight aria-hidden="true" /></button>
        </div>

        <form class="agent-composer" @submit.prevent="sendMessage()">
            <div class="agent-composer__input">
                <textarea ref="inputRef" v-model="draft" rows="2" maxlength="1000" aria-label="发送给 AI 助手的消息"
                    placeholder="试着问我，或者描述你想做的事…" @keydown="handleInputKeydown" />
                <div class="agent-composer__toolbar">
                    <span><span class="agent-mode-dot" />课堂助手</span>
                    <button v-if="responding" type="button" class="agent-send-button" aria-label="停止回复" @click="stopReply">
                        <span class="agent-stop-icon" />
                    </button>
                    <button v-else type="submit" class="agent-send-button" :disabled="!draft.trim()" aria-label="发送消息">
                        <Top aria-hidden="true" />
                    </button>
                </div>
            </div>
            <div class="agent-composer__hint"><span>Enter 发送 · Shift + Enter 换行</span><span>{{ draft.length }}/1000</span></div>
            <p class="agent-demo-note"><InfoFilled aria-hidden="true" />当前为模拟体验，使用示例数据，不会修改真实数据</p>
        </form>
    </ElDrawer>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { ElDrawer } from "element-plus";
import {
    ArrowRight,
    Check,
    CircleCheck,
    Close,
    DataAnalysis,
    InfoFilled,
    Loading,
    MagicStick,
    Present,
    RefreshRight,
    School,
    Star,
    Top,
} from "@element-plus/icons-vue";
import { createDemoReply, DEMO_PROMPTS, type DemoReply } from "./agentDemo";

const props = withDefaults(defineProps<{
    classId?: number | null;
    className?: string;
    semesterId?: number | null;
    semesterName?: string;
    userId?: string;
}>(), {
    className: "示例班级",
    semesterName: "当前学期",
});

type ActionState = "pending" | "confirmed" | "cancelled" | "expired";
interface ChatMessage {
    id: number;
    role: "user" | "assistant";
    text: string;
    complete: boolean;
    actionState: ActionState;
    reply?: DemoReply;
}

const visible = ref(false);
const draft = ref("");
const messages = ref<ChatMessage[]>([]);
const responding = ref(false);
const currentStep = ref("");
const launcherRef = ref<HTMLButtonElement>();
const inputRef = ref<HTMLTextAreaElement>();
const conversationRef = ref<HTMLElement>();
const starterIcons = [DataAnalysis, Star, Present];
const starterLabels = ["看看班级这一周", "为学生的进步加分", "兑换一份小奖励"];
const actionStateLabels: Record<ActionState, string> = {
    pending: "待确认",
    confirmed: "演示完成",
    cancelled: "已取消",
    expired: "已失效",
};
const actionResultLabels: Record<ActionState, string> = {
    pending: "",
    confirmed: "模拟执行完成 · 真实数据未修改",
    cancelled: "已取消，本次操作未执行",
    expired: "已开始新的提问，请重新生成预览",
};
let nextMessageId = 0;
let phaseTimer: number | undefined;
let streamTimer: number | undefined;
let activeReply: ChatMessage | undefined;
let followLatest = true;

const latestSuggestions = computed(() => messages.value[messages.value.length - 1]?.reply?.suggestions ?? []);

function clearTimers() {
    window.clearTimeout(phaseTimer);
    window.clearInterval(streamTimer);
    phaseTimer = undefined;
    streamTimer = undefined;
}

async function scrollToLatest() {
    await nextTick();
    if (followLatest && conversationRef.value) {
        conversationRef.value.scrollTop = conversationRef.value.scrollHeight;
    }
}

function handleScroll() {
    const container = conversationRef.value;
    if (container) {
        followLatest = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    }
}

function finishReply() {
    clearTimers();
    if (activeReply?.reply) {
        activeReply.text = activeReply.reply.text;
        activeReply.complete = true;
    }
    activeReply = undefined;
    responding.value = false;
    void scrollToLatest();
}

function stopReply() {
    clearTimers();
    if (activeReply) {
        activeReply.text = activeReply.text ? `${activeReply.text}\n\n已停止生成。` : "已停止生成，你可以继续提问。";
        activeReply.complete = true;
        activeReply.reply = undefined;
    }
    activeReply = undefined;
    responding.value = false;
}

function sendMessage(prompt = draft.value) {
    const text = prompt.trim().slice(0, 1000);
    if (!text || responding.value) return;
    messages.value.forEach((message) => {
        if (message.reply?.action && message.actionState === "pending") message.actionState = "expired";
    });
    draft.value = "";
    followLatest = true;
    messages.value.push({ id: ++nextMessageId, role: "user", text, complete: true, actionState: "pending" });
    const reply = createDemoReply(text, props.className);
    const message = reactive<ChatMessage>({
        id: ++nextMessageId, role: "assistant", text: "", complete: false, actionState: "pending", reply,
    });
    messages.value.push(message);
    activeReply = message;
    responding.value = true;
    currentStep.value = reply.steps[0] ?? "整理示例数据";
    void scrollToLatest();
    phaseTimer = window.setTimeout(() => {
        currentStep.value = reply.steps[reply.steps.length - 1] ?? "生成回复";
        streamTimer = window.setInterval(() => {
            message.text = reply.text.slice(0, message.text.length + 4);
            void scrollToLatest();
            if (message.text.length === reply.text.length) finishReply();
        }, 24);
    }, 650);
}

function resolveAction(message: ChatMessage, confirmed: boolean) {
    if (message.actionState !== "pending" || responding.value || !message.reply?.action) return;
    message.actionState = confirmed ? "confirmed" : "cancelled";
    messages.value.push({
        id: ++nextMessageId,
        role: "assistant",
        text: confirmed ? message.reply.action.successText : "好的，已取消这次模拟操作。你可以修改需求，或者继续查询班级情况。",
        complete: true,
        actionState: "pending",
    });
    followLatest = true;
    void scrollToLatest();
}

function handleInputKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
        event.preventDefault();
        sendMessage();
    }
}

function resetConversation() {
    clearTimers();
    activeReply = undefined;
    responding.value = false;
    messages.value = [];
    draft.value = "";
    followLatest = true;
}

function handleOpened() {
    if (window.matchMedia("(pointer: fine)").matches) inputRef.value?.focus();
    void scrollToLatest();
}

function handleClosed() {
    launcherRef.value?.focus({ preventScroll: true });
}

watch(() => [props.userId, props.classId, props.semesterId], resetConversation);
onBeforeUnmount(clearTimers);
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
    width: 56px;
    height: 56px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.55);
    border-radius: 20px;
    color: #fff;
    background: var(--ta-blue);
    box-shadow: 0 6px 22px rgba(0, 122, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), opacity 160ms ease;
}
.agent-launcher > svg {
    width: 23px;
    height: 23px;
}
.agent-launcher__dot {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #b8f0cf;
}
.agent-launcher.is-open {
    opacity: 0;
    pointer-events: none;
}
.agent-launcher:active {
    transform: scale(0.97);
}
:global(.agent-panel-layer) {
    pointer-events: none;
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
    transition: transform 260ms cubic-bezier(0.32, 0.72, 0, 1), opacity 180ms ease;
}
:global(.agent-panel-layer.el-drawer-fade-enter-active), :global(.agent-panel-layer.el-drawer-fade-leave-active) {
    transition: opacity 260ms ease;
}
:global(.agent-panel-layer.el-drawer-fade-leave-active .agent-panel) {
    transition-duration: 200ms;
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
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--ta-blue-soft);
    color: var(--ta-blue);
}
.agent-avatar svg {
    width: 23px;
    height: 23px;
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
.agent-demo-badge {
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
    width: 56px;
    height: 56px;
    margin-bottom: 23px;
    border: 1px solid #dcecff;
    border-radius: 18px;
    color: var(--ta-blue);
    background: linear-gradient(145deg, #f2f8ff, #e6f2ff);
    box-shadow: inset 0 1px 0 #fff;
}
.agent-welcome__mark svg {
    width: 29px;
    height: 29px;
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
.agent-message__sender svg {
    width: 17px;
    height: 17px;
    color: var(--ta-blue);
}
.agent-tool-status {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 10px;
    color: var(--ta-text-tertiary);
    font-size: 11px;
}
.agent-tool-status svg {
    width: 13px;
    height: 13px;
    color: var(--ta-green);
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
.agent-data-row__rank {
    width: 12px;
    color: #aaaab0;
    font-size: 10px;
    text-align: right;
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
.agent-action.is-confirmed .agent-action__result {
    color: var(--ta-green);
}
.agent-action.is-cancelled, .agent-action.is-expired {
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
.agent-demo-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin: 12px 0 0;
    font-size: 10px;
    line-height: 1.5;
    color: var(--ta-text-tertiary);
}
.agent-demo-note svg {
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
    .agent-icon-button:hover {
        background: var(--ta-surface-muted);
        color: var(--ta-text);
    }
    .agent-starter:hover {
        border-color: #b8d8ff;
        background: #f8fbff;
    }
    .agent-suggestions button:hover {
        color: var(--ta-blue);
        border-color: #b8d8ff;
    }
    .agent-primary-button:hover, .agent-send-button:not(:disabled):hover {
        background: var(--ta-blue-hover);
    }
}
@media (max-width: 920px) {
    .agent-launcher {
        right: 20px;
        bottom: calc(92px + env(safe-area-inset-bottom));
        width: 54px;
        height: 54px;
        padding: 0;
        border-radius: 18px;
    }
    .agent-launcher__dot {
        display: none;
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
    .agent-thinking > svg {
        animation: none;
    }
}
</style>
