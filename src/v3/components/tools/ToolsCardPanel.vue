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
    height: 100%;
    min-height: 476px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 32px;
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    backdrop-filter: blur(16px);
}

.tools-card-panel--timer {
    background: linear-gradient(180deg, rgba(85, 104, 255, 0.12), rgba(255, 255, 255, 0.95));
}

.tools-card-panel--rollcall {
    background: linear-gradient(180deg, rgba(255, 107, 129, 0.12), rgba(255, 255, 255, 0.95));
}

.tools-card-panel--lottery {
    background: linear-gradient(180deg, rgba(18, 185, 129, 0.12), rgba(255, 255, 255, 0.95));
}

.tools-card-panel__head,
.tools-card-panel__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.tools-card-panel__head {
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 12px;
}

.tools-card-panel__eyebrow {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.62);
    color: #5568ff;
    font-size: 12px;
    font-weight: 700;
}

.tools-card-panel__head h3,
.tools-card-panel__body {
    margin: 0;
}

.tools-card-panel__head h3 {
    margin-top: 12px;
    color: #16213e;
    font-size: 24px;
}

.status-chip {
    display: inline-flex;
    align-items: center;
    min-height: 38px;
    padding: 0 14px;
    border-radius: 999px;
    background: rgba(22, 33, 62, 0.06);
    color: #627099;
    font-size: 13px;
    font-weight: 700;
}

.status-chip--amber {
    color: #b54708;
    background: rgba(247, 144, 9, 0.14);
}

.status-chip--green {
    color: #067647;
    background: rgba(18, 185, 129, 0.12);
}

.status-chip--slate {
    color: #475467;
    background: rgba(71, 84, 103, 0.12);
}

.status-chip--rose {
    color: #be123c;
    background: rgba(255, 107, 129, 0.16);
}

.status-chip--violet {
    color: #6d28d9;
    background: rgba(142, 108, 255, 0.16);
}

.tools-card-panel__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.tools-card-panel__actions {
    margin-top: 18px;
    justify-content: center;
}

@media (max-width: 768px) {
    .tools-card-panel {
        min-height: auto;
        padding: 18px;
        border-radius: 28px;
    }

    .tools-card-panel__head {
        flex-direction: column;
    }
}
</style>
