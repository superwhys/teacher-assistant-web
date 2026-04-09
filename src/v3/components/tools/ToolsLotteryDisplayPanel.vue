<template>
    <section class="tools-lottery-display-panel">
        <div class="display-card" :class="{ 'is-selected': isSelected }">
            <span class="panel-eyebrow panel-eyebrow--violet">抽奖展示区</span>
            <div class="display-name" :class="{ 'is-placeholder': !currentName }">
                {{ currentName || "准备就绪" }}
            </div>
            <p class="display-meta">
                {{ currentPoolName ? `当前奖池：${currentPoolName}` : "请先创建或选择一个奖池" }}
            </p>
            <transition name="celebrate">
                <div v-if="isSelected" class="selected-overlay">
                    <div class="celebrate-icon">🎉</div>
                </div>
            </transition>
        </div>

        <div class="display-actions">
            <button type="button" class="primary-button" :disabled="enabledPrizeCount === 0"
                @click="emit('toggleRolling')">
                {{ isRolling ? "停止抽奖" : "开始抽奖" }}
            </button>
            <button type="button" class="ghost-button" :disabled="isRolling" @click="emit('drawOnce')">
                抽取 1 次
            </button>
            <button type="button" class="ghost-button danger" :disabled="recordCount === 0"
                @click="emit('clearRecords')">
                清空历史
            </button>
        </div>
    </section>
</template>

<script setup lang="ts">
defineOptions({ name: "ToolsLotteryDisplayPanel" })

/** 定义抽奖展示面板属性。 */
interface ToolsLotteryDisplayPanelProps {
    currentName: string
    currentPoolName: string
    enabledPrizeCount: number
    isRolling: boolean
    isSelected: boolean
    recordCount: number
}

defineProps<ToolsLotteryDisplayPanelProps>()

const emit = defineEmits<{
    (e: "toggleRolling"): void
    (e: "drawOnce"): void
    (e: "clearRecords"): void
}>()
</script>

<style scoped>
.tools-lottery-display-panel {
    height: 100%;
    min-height: 0;
    padding: 24px;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 18px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 30px;
    background: #ffffff;
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    box-sizing: border-box;
    overflow: hidden;
}

.panel-eyebrow {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.62);
    color: #067647;
    font-size: 12px;
    font-weight: 700;
}

.display-card {
    position: relative;
    min-height: 0;
    padding: 36px 28px;
    border-radius: 28px;
    display: grid;
    place-items: center;
    text-align: center;
    background: #ffffff;
    border: 1px solid rgba(122, 141, 198, 0.14);
    overflow: hidden;
}

.display-card.is-selected {
    animation: pulse-gold 1s ease-in-out infinite;
}

.display-name {
    color: #16213e;
    font-size: clamp(52px, 5.4vw, 88px);
    font-weight: 900;
    line-height: 1.1;
}

.display-name.is-placeholder {
    color: #98a2b3;
}

.display-meta {
    margin: 8px 0 0;
    color: #627099;
    line-height: 1.7;
}

.selected-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
}

.celebrate-icon {
    font-size: 88px;
    animation: celebrate-spin 1s ease-in-out infinite;
}

.display-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px;
    min-height: 46px;
}

.ghost-button,
.primary-button {
    min-height: 46px;
    padding: 0 16px;
    border-radius: 16px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.24);
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
}

.primary-button {
    border: none;
    background: linear-gradient(135deg, #14b8a6, #12b981);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(18, 185, 129, 0.24);
}

.ghost-button.danger {
    color: #c2410c;
    background: rgba(255, 237, 213, 0.82);
    border-color: rgba(251, 146, 60, 0.24);
}

.ghost-button:hover,
.primary-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(18, 185, 129, 0.14);
}

.ghost-button:disabled,
.primary-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

@keyframes celebrate-spin {
    0% {
        transform: rotate(0deg) scale(1);
    }

    25% {
        transform: rotate(-15deg) scale(1.2);
    }

    50% {
        transform: rotate(15deg) scale(1);
    }

    75% {
        transform: rotate(-10deg) scale(1.2);
    }

    100% {
        transform: rotate(0deg) scale(1);
    }
}

@keyframes pulse-gold {

    0%,
    100% {
        box-shadow: 0 8px 32px rgba(255, 215, 0, 0.36), inset 0 0 0 1px rgba(255, 255, 255, 0.3);
        transform: scale(1);
    }

    50% {
        box-shadow: 0 12px 40px rgba(255, 237, 78, 0.54), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
        transform: scale(1.02);
    }
}

@media (max-width: 768px) {
    .tools-lottery-display-panel {
        padding: 18px;
        border-radius: 26px;
    }

    .display-actions {
        flex-direction: column;
    }

    .ghost-button,
    .primary-button {
        width: 100%;
    }
}
</style>
