<template>
    <section class="tools-lottery-display-panel">
        <div class="display-stage" :class="{ 'is-selected': isSelected, 'is-rolling': isRolling }">
            <span class="display-stage__badge">{{ statusLabel }}</span>
            <div class="display-stage__icon" :class="{ 'is-hidden': Boolean(currentName) }">
                <i-ep-trophy />
            </div>
            <div class="display-name" :class="{ 'is-placeholder': !currentName }">
                {{ currentName || "准备就绪" }}
            </div>
            <p class="display-meta">{{ statusMeta }}</p>
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
            <button type="button" class="ghost-button" :disabled="isRolling || enabledPrizeCount === 0"
                @click="emit('drawOnce')">
                抽取 1 次
            </button>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

defineOptions({ name: "ToolsLotteryDisplayPanel" })

/** 定义抽奖展示面板属性。 */
interface ToolsLotteryDisplayPanelProps {
    currentName: string
    currentPoolName: string
    enabledPrizeCount: number
    isRolling: boolean
    isSelected: boolean
}

const props = defineProps<ToolsLotteryDisplayPanelProps>()

const emit = defineEmits<{
    (e: "toggleRolling"): void
    (e: "drawOnce"): void
}>()

/** 返回当前抽奖展示状态文案。 */
const statusLabel = computed<string>(() => {
    if (props.isRolling) {
        return "滚动中"
    }

    if (props.isSelected) {
        return "开奖结果"
    }

    return "抽奖展示"
})

/** 返回展示区底部的状态说明。 */
const statusMeta = computed<string>(() => {
    if (!props.currentPoolName) {
        return "请先创建或选择一个奖池"
    }

    if (props.enabledPrizeCount === 0) {
        return `${props.currentPoolName} · 暂无可用奖品`
    }

    if (props.isRolling) {
        return `${props.currentPoolName} · 点击停止抽奖查看结果`
    }

    return `${props.currentPoolName} · ${props.enabledPrizeCount} 个奖品可抽`
})
</script>

<style scoped>
.tools-lottery-display-panel {
    height: 100%;
    min-height: 0;
    padding: 18px;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 16px;
    border: 1px solid rgba(18, 185, 129, 0.16);
    border-radius: 28px;
    background: linear-gradient(180deg, rgba(18, 185, 129, 0.14), rgba(255, 255, 255, 0.94));
    box-sizing: border-box;
    overflow: hidden;
}

.display-stage {
    position: relative;
    min-height: 0;
    padding: 28px 24px;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.7);
    overflow: hidden;
}

.display-stage.is-rolling {
    box-shadow: inset 0 0 0 2px rgba(18, 185, 129, 0.18);
}

.display-stage.is-selected {
    animation: pulse-gold 1s ease-in-out infinite;
}

.display-stage__badge {
    position: absolute;
    top: 16px;
    left: 16px;
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(18, 185, 129, 0.12);
    color: #067647;
    font-size: 12px;
    font-weight: 700;
}

.display-stage__icon {
    width: 72px;
    height: 72px;
    margin-bottom: 16px;
    display: grid;
    place-items: center;
    border-radius: 22px;
    background: linear-gradient(135deg, #14b8a6, #12b981);
    color: #ffffff;
    font-size: 32px;
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.display-stage__icon.is-hidden {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.86);
}

.display-name {
    color: #16213e;
    font-size: clamp(40px, 4.8vw, 84px);
    font-weight: 900;
    line-height: 1.12;
    word-break: break-word;
}

.display-name.is-placeholder {
    color: #98a2b3;
}

.display-meta {
    margin: 12px 0 0;
    color: #627099;
    font-size: 14px;
    line-height: 1.6;
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
}

.ghost-button,
.primary-button {
    min-height: 56px;
    min-width: 168px;
    padding: 0 22px;
    border-radius: 18px;
    font: inherit;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.24);
    background: rgba(255, 255, 255, 0.9);
    color: #16213e;
}

.primary-button {
    border: none;
    background: linear-gradient(135deg, #14b8a6, #12b981);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(18, 185, 129, 0.24);
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

@media (max-width: 820px) {
    .tools-lottery-display-panel {
        padding: 14px;
        border-radius: 24px;
        min-height: 360px;
    }

    .display-actions {
        flex-direction: column;
    }

    .ghost-button,
    .primary-button {
        width: 100%;
        min-width: 0;
    }
}
</style>
