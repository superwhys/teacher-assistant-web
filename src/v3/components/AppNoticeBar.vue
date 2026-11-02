<template>
    <div class="app-notice-bar" :class="{ 'app-notice-bar--warning': tone === 'warning' }" role="status">
        <div class="app-notice-bar__content">
            <strong>{{ title }}</strong>
            <p>{{ description }}</p>
            <span v-if="detail" class="app-notice-bar__detail">{{ detail }}</span>
        </div>
        <div v-if="$slots.action" class="app-notice-bar__actions">
            <slot name="action" />
        </div>
    </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
    title: string
    description: string
    detail?: string
    tone?: "muted" | "warning"
}>(), { tone: "muted", detail: "" })
</script>

<style scoped>
.app-notice-bar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
    border: 1px solid var(--ta-line);
    border-radius: 12px;
    background: var(--ta-surface-muted);
}

.app-notice-bar--warning {
    background: var(--ta-orange-soft);
}

.app-notice-bar__content {
    min-width: 0;
    flex: 1;
    overflow-wrap: anywhere;
}

.app-notice-bar__content strong {
    display: block;
    color: var(--ta-text);
    font-size: 14px;
    line-height: 1.4;
}

.app-notice-bar__content p {
    margin: 4px 0 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
    line-height: 1.6;
}

.app-notice-bar__detail {
    display: block;
    margin-top: 4px;
    color: var(--ta-text-tertiary);
    font-size: 12px;
    line-height: 1.6;
}

.app-notice-bar__actions {
    flex-shrink: 0;
}

.app-notice-bar__actions :deep(.app-notice-bar__action) {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 0 12px;
    border: 0;
    border-radius: 9px;
    color: #ffffff;
    background: var(--ta-blue);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
}

.app-notice-bar__actions :deep(.app-notice-bar__action:hover) {
    background: var(--ta-blue-hover);
}

.app-notice-bar__actions :deep(.app-notice-bar__action:focus-visible) {
    outline: 2px solid var(--ta-blue);
    outline-offset: 3px;
}

.app-notice-bar__actions :deep(.app-notice-bar__action:disabled) {
    opacity: 0.5;
    cursor: wait;
}

@media (max-width: 660px) {
    .app-notice-bar {
        align-items: stretch;
        flex-direction: column;
        gap: 10px;
    }

    .app-notice-bar__actions :deep(.app-notice-bar__action) {
        width: 100%;
    }
}
</style>
