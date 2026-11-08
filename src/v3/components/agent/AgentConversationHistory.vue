<template>
    <section class="agent-history" aria-label="历史对话" :aria-busy="loading">
        <div class="agent-history__heading">
            <div>
                <h3>历史对话</h3>
                <p>查看或继续之前的对话</p>
            </div>
            <button type="button" class="agent-history__back" @click="$emit('back')">
                <ArrowLeft aria-hidden="true" />返回当前对话
            </button>
        </div>

        <div class="agent-history__list">
            <div v-if="loading && !items.length" class="agent-history__state" role="status">
                <Loading class="agent-history__spinner" aria-hidden="true" />正在加载历史对话…
            </div>
            <div v-else-if="!items.length && !error" class="agent-history__empty" role="status">
                <ChatDotRound aria-hidden="true" />
                <strong>还没有历史对话</strong>
                <p>和小 Y 聊聊，之后可以在这里继续。</p>
            </div>

            <ul v-if="items.length" class="agent-history__items">
                <li v-for="item in items" :key="item.id">
                    <button type="button" class="agent-history__item" :disabled="disabled"
                        :aria-current="item.id === currentId ? 'true' : undefined" @click="$emit('select', item.id)">
                        <span class="agent-history__item-body">
                            <strong :title="item.title || '未命名对话'">{{ item.title || '未命名对话' }}</strong>
                            <span class="agent-history__meta">
                                <time :datetime="item.created_at">{{ formatCreatedAt(item.created_at) }}</time>
                                <span v-if="item.id === currentId" class="agent-history__current">当前对话</span>
                            </span>
                        </span>
                        <ArrowRight aria-hidden="true" />
                    </button>
                </li>
            </ul>

            <div v-if="error" class="agent-history__error" role="alert">
                <span>{{ error }}</span>
                <button type="button" :disabled="loading || disabled" @click="$emit('retry')">重新加载</button>
            </div>
            <button v-else-if="hasMore" type="button" class="agent-history__more"
                :disabled="loading || disabled" @click="$emit('load-more')">
                <Loading v-if="loading" class="agent-history__spinner" aria-hidden="true" />
                {{ loading ? '正在加载…' : '加载更多' }}
            </button>
        </div>
    </section>
</template>

<script setup lang="ts">
import { ArrowLeft, ArrowRight, ChatDotRound, Loading } from "@element-plus/icons-vue";
import type { AgentConversationSummary } from "@/types/agent";

defineProps<{
    items: AgentConversationSummary[];
    currentId?: string;
    loading: boolean;
    error: string;
    hasMore: boolean;
    disabled: boolean;
}>();

defineEmits<{
    back: [];
    select: [id: string];
    retry: [];
    "load-more": [];
}>();

function formatCreatedAt(timestamp: string): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "时间未知";
    return date.toLocaleString("zh-CN", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    });
}
</script>

<style scoped>
.agent-history {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    padding-top: 22px;
}
.agent-history__heading {
    display: flex;
    flex-shrink: 0;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 20px 16px;
}
.agent-history__heading h3 {
    margin: 0;
    font-size: 15px;
    color: var(--ta-text);
}
.agent-history__heading p {
    margin: 6px 0 0;
    font-size: 11px;
    color: var(--ta-text-tertiary);
}
.agent-history button {
    font-family: inherit;
    cursor: pointer;
    transition: background-color 160ms ease, transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}
.agent-history button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}
.agent-history button:focus-visible {
    outline: 2px solid var(--ta-blue);
    outline-offset: 2px;
}
.agent-history button:not(:disabled):active {
    transform: scale(0.98);
}
.agent-history__back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 32px;
    padding: 5px 8px;
    border: 0;
    border-radius: 8px;
    background: var(--ta-blue-soft);
    color: var(--ta-blue);
    font-size: 11px;
    white-space: nowrap;
}
.agent-history__back svg {
    width: 13px;
    height: 13px;
}
.agent-history__list {
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 2px 20px 20px;
    overscroll-behavior: contain;
}
.agent-history__items {
    display: grid;
    gap: 8px;
    padding: 0;
    margin: 0;
    list-style: none;
}
.agent-history__item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px;
    border: 1px solid var(--ta-line);
    border-radius: 12px;
    background: #fff;
    text-align: left;
}
.agent-history__item[aria-current="true"] {
    border-color: var(--ta-line-strong);
    background: var(--ta-surface-muted);
}
.agent-history__item-body {
    flex: 1;
    min-width: 0;
}
.agent-history__item strong {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    font-size: 13px;
    line-height: 1.6;
    overflow-wrap: anywhere;
    color: var(--ta-text);
}
.agent-history__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    margin-top: 8px;
    font-size: 10px;
    line-height: 1.5;
    color: var(--ta-text-tertiary);
}
.agent-history__current {
    padding: 2px 5px;
    border-radius: 4px;
    background: var(--ta-blue-soft);
    color: var(--ta-blue);
}
.agent-history__item > svg {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    color: var(--ta-text-tertiary);
}
.agent-history__state, .agent-history__empty, .agent-history__error {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 32px 0;
    font-size: 12px;
    line-height: 1.7;
    color: var(--ta-text-secondary);
}
.agent-history__empty {
    flex-direction: column;
    padding-top: 48px;
    text-align: center;
}
.agent-history__empty > svg {
    width: 32px;
    height: 32px;
    margin-bottom: 8px;
    color: var(--ta-text-tertiary);
}
.agent-history__empty strong {
    font-size: 14px;
    color: var(--ta-text);
}
.agent-history__empty p {
    margin: 0;
    color: var(--ta-text-tertiary);
}
.agent-history__error {
    flex-direction: column;
    overflow-wrap: anywhere;
}
.agent-history__error button {
    border: 0;
    padding: 6px 10px;
    border-radius: 6px;
    background: var(--ta-blue-soft);
    color: var(--ta-blue);
}
.agent-history__more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    min-height: 38px;
    margin-top: 12px;
    border: 0;
    border-radius: 8px;
    background: var(--ta-surface-muted);
    color: var(--ta-text-secondary);
    font-size: 12px;
}
.agent-history__spinner {
    width: 15px;
    height: 15px;
    animation: agent-history-spin 900ms linear infinite;
}
@keyframes agent-history-spin {
    to { transform: rotate(360deg); }
}
@media (hover: hover) and (pointer: fine) {
    .agent-history__item:not(:disabled):hover {
        background: var(--ta-surface-muted);
    }
}
@media (max-width: 520px) {
    .agent-history__heading {
        padding-right: 16px;
        padding-left: 16px;
    }
    .agent-history__list {
        padding-right: 16px;
        padding-left: 16px;
    }
}
@media (prefers-reduced-motion: reduce) {
    .agent-history button {
        transition: background-color 120ms ease;
    }
    .agent-history button:not(:disabled):active {
        transform: none;
    }
    .agent-history__spinner {
        animation: none;
    }
}
</style>
