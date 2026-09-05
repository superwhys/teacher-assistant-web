<template>
    <article class="tools-card-panel" :class="toneClass">
        <div class="tools-card-panel__head">
            <div>
                <span class="tools-card-panel__eyebrow">{{ eyebrow }}</span>
                <h3>{{ title }}</h3>
            </div>
            <span class="status-chip" :class="statusToneClass">{{ statusLabel }}</span>
        </div>

        <div class="tools-card-panel__body">
            <slot />
        </div>

        <div class="tools-card-panel__actions">
            <slot name="actions" />
        </div>
    </article>
</template>

<script setup lang="ts">
defineOptions({ name: "ToolsCardPanel" })

/** 定义工具卡片骨架属性。 */
interface ToolsCardPanelProps {
    eyebrow: string
    statusLabel: string
    statusToneClass: string
    title: string
    toneClass: string
}

defineProps<ToolsCardPanelProps>()
</script>

<style scoped>
.tools-card-panel {
    min-width: 0;
    min-height: 360px;
    height: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface);
    box-shadow: var(--ta-shadow-1);
    backdrop-filter: blur(18px) saturate(150%);
}

.tools-card-panel__head,
.tools-card-panel__actions {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
}

.tools-card-panel__head {
    align-items: flex-start;
    justify-content: space-between;
}

.tools-card-panel__eyebrow {
    color: var(--ta-blue);
    font-size: 12px;
    font-weight: 650;
}

.tools-card-panel__head h3 {
    margin: 5px 0 0;
    font-size: 20px;
    letter-spacing: -0.015em;
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

.status-chip--amber {
    color: #a53400;
    background: var(--ta-orange-soft);
}

.status-chip--green {
    color: #1b7133;
    background: var(--ta-green-soft);
}

.status-chip--rose {
    color: #bb0012;
    background: var(--ta-red-soft);
}

.status-chip--violet {
    color: #733593;
    background: var(--ta-purple-soft);
}

.tools-card-panel__body {
    min-height: 0;
    flex: 1;
    margin-top: 18px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.tools-card-panel__actions {
    margin-top: 18px;
}

.tools-card-panel__actions :deep(button) {
    flex: 1 1 0;
}

@media (max-width: 660px) {
    .tools-card-panel {
        min-height: 330px;
        padding: 16px;
    }
}
</style>
