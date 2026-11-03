<template>
    <div class="agent-markdown" v-html="html" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderAgentMarkdown } from '@/utils/agentMarkdown'

const props = defineProps<{ content: string }>()
const html = computed(() => renderAgentMarkdown(props.content))
</script>

<style scoped>
.agent-markdown {
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
    color: var(--ta-text);
    line-height: 1.8;
}
.agent-markdown :deep(> :first-child) {
    margin-top: 0;
}
.agent-markdown :deep(> :last-child) {
    margin-bottom: 0;
}
.agent-markdown :deep(p),
.agent-markdown :deep(ul),
.agent-markdown :deep(ol),
.agent-markdown :deep(blockquote),
.agent-markdown :deep(pre),
.agent-markdown :deep(.agent-markdown__table-scroll) {
    margin: 12px 0;
}
.agent-markdown :deep(h1),
.agent-markdown :deep(h2),
.agent-markdown :deep(h3),
.agent-markdown :deep(h4),
.agent-markdown :deep(h5),
.agent-markdown :deep(h6) {
    margin: 20px 0 8px;
    line-height: 1.5;
    font-weight: 650;
}
.agent-markdown :deep(h1) {
    font-size: 19px;
}
.agent-markdown :deep(h2) {
    font-size: 17px;
}
.agent-markdown :deep(h3) {
    font-size: 15px;
}
.agent-markdown :deep(h4),
.agent-markdown :deep(h5),
.agent-markdown :deep(h6) {
    font-size: 13px;
}
.agent-markdown :deep(strong) {
    font-weight: 650;
}
.agent-markdown :deep(ul),
.agent-markdown :deep(ol) {
    padding-left: 22px;
}
.agent-markdown :deep(li + li) {
    margin-top: 4px;
}
.agent-markdown :deep(li > p) {
    margin: 4px 0;
}
.agent-markdown :deep(blockquote) {
    padding-left: 12px;
    border-left: 3px solid var(--ta-line-strong);
    color: var(--ta-text-secondary);
}
.agent-markdown :deep(a) {
    color: var(--ta-blue);
    text-decoration: underline;
    text-underline-offset: 3px;
}
.agent-markdown :deep(code) {
    padding: 2px 5px;
    border-radius: 4px;
    background: var(--ta-surface-muted);
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 12px;
}
.agent-markdown :deep(pre) {
    max-width: 100%;
    overflow-x: auto;
    padding: 12px;
    border: 1px solid var(--ta-line);
    border-radius: 10px;
    background: var(--ta-surface-muted);
    white-space: pre;
    overflow-wrap: normal;
}
.agent-markdown :deep(pre code) {
    padding: 0;
    border-radius: 0;
    background: transparent;
}
.agent-markdown :deep(.agent-markdown__table-scroll) {
    max-width: 100%;
    overflow-x: auto;
    border: 1px solid var(--ta-line);
    border-radius: 10px;
}
.agent-markdown :deep(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    white-space: nowrap;
}
.agent-markdown :deep(th),
.agent-markdown :deep(td) {
    padding: 8px 10px;
    border-bottom: 1px solid var(--ta-line);
    text-align: left;
}
.agent-markdown :deep(th) {
    background: var(--ta-surface-muted);
    font-weight: 600;
}
.agent-markdown :deep(tr:last-child td) {
    border-bottom: 0;
}
.agent-markdown :deep(hr) {
    margin: 16px 0;
    border: 0;
    border-top: 1px solid var(--ta-line);
}
</style>
