<template>
    <ToolsCardPanel eyebrow="抽奖器" title="奖池预览" :status-label="`${poolCount} 个奖池`"
        status-tone-class="status-chip--violet" tone-class="tools-card-panel--lottery">
        <div class="tools-lottery-card__content">
            <div class="tools-lottery-card__summary">
                <article class="summary-pill">
                    <span>启用奖品</span>
                    <strong>{{ prizeCount }}</strong>
                </article>
                <article class="summary-pill">
                    <span>商城可同步</span>
                    <strong>{{ shopPrizeCount }}</strong>
                </article>
            </div>

            <div class="tools-lottery-card__empty">
                <i-ep-trophy />
            </div>
        </div>

        <template #actions>
            <button type="button" class="action-button" @click="emit('openShop')">
                查看商城奖品
            </button>
            <button type="button" class="action-button" @click="emit('openLottery')">
                {{ manageActionLabel }}
            </button>
            <button v-if="showOpenPageAction" type="button" class="action-button action-button--primary"
                @click="emit('openLottery')">
                进入完整页
            </button>
        </template>
    </ToolsCardPanel>
</template>

<script setup lang="ts">
import ToolsCardPanel from "@/v3/components/tools/ToolsCardPanel.vue";

defineOptions({ name: "ToolsLotteryCard" })

/** 定义抽奖器卡片属性。 */
interface ToolsLotteryCardProps {
    manageActionLabel?: string
    poolCount: number
    prizeCount: number
    prizeItems?: unknown[]
    showOpenPageAction?: boolean
    shopPrizeCount: number
}

withDefaults(defineProps<ToolsLotteryCardProps>(), {
    manageActionLabel: "管理奖池",
    showOpenPageAction: true
})

const emit = defineEmits<{
    (e: "openLottery"): void
    (e: "openShop"): void
}>()
</script>

<style scoped>
.tools-lottery-card__content {
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.tools-lottery-card__summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}

.summary-pill {
    padding: 14px;
    border-radius: 14px;
    background: var(--ta-surface-muted);
}

.summary-pill span {
    color: var(--ta-text-tertiary);
    font-size: 11px;
}

.summary-pill strong {
    display: block;
    margin-top: 5px;
    font-size: 23px;
}

.tools-lottery-card__empty {
    min-height: 120px;
    flex: 1;
    display: grid;
    place-items: center;
}

.tools-lottery-card__empty :deep(svg) {
    width: 58px;
    height: 58px;
    color: var(--ta-purple);
}

.action-button {
    min-height: 38px;
    padding: 0 13px;
    border: 0;
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
    font-size: 12px;
    font-weight: 620;
    white-space: nowrap;
    cursor: pointer;
}

.action-button--primary {
    color: #ffffff;
    background: var(--ta-purple);
    box-shadow: 0 5px 14px rgba(137, 68, 171, 0.18);
}
</style>
