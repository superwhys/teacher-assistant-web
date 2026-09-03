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
    min-width: 0;
    min-height: 430px;
    padding: 20px;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 14px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface);
    box-shadow: var(--ta-shadow-1);
}

.display-stage {
    position: relative;
    min-height: 320px;
    padding: 24px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    border-radius: 17px;
    background: var(--ta-surface-muted);
    text-align: center;
}

.display-stage.is-rolling {
    box-shadow: inset 0 0 0 2px rgba(0, 122, 255, 0.14);
}

.display-stage__badge {
    position: absolute;
    top: 13px;
    left: 13px;
    min-height: 26px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: #0064cf;
    background: #e6f2ff;
    font-size: 11px;
    font-weight: 600;
}

.display-stage__icon {
    width: 74px;
    height: 74px;
    display: grid;
    place-items: center;
    border-radius: 24px;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
    transition: opacity 180ms ease, transform 180ms ease;
}

.display-stage__icon svg {
    width: 32px;
    height: 32px;
}

.display-stage__icon.is-hidden {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.86);
}

.display-name {
    min-height: 1.1em;
    margin-top: 22px;
    font-size: clamp(38px, 5vw, 64px);
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -0.045em;
    word-break: break-word;
}

.display-name.is-placeholder {
    color: var(--ta-text-tertiary);
}

.display-meta {
    margin: 9px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 13px;
}

.selected-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
}

.celebrate-icon {
    font-size: 72px;
}

.display-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    flex-wrap: wrap;
}

.ghost-button,
.primary-button {
    min-width: 120px;
    min-height: 38px;
    padding: 0 13px;
    border: 0;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 620;
    cursor: pointer;
}

.ghost-button {
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
}

.primary-button {
    color: #ffffff;
    background: var(--ta-blue);
    box-shadow: 0 5px 14px rgba(0, 122, 255, 0.18);
}

.ghost-button:disabled,
.primary-button:disabled {
    opacity: 0.42;
}

@media (max-width: 660px) {
    .tools-lottery-display-panel {
        min-height: 360px;
        padding: 16px;
    }

    .display-stage {
        min-height: 260px;
    }

    .display-actions button {
        flex: 1 1 0;
        min-width: 0;
    }
}
</style>
