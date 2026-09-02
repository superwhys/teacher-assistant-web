<template>
    <aside class="tools-lottery-pool-panel">
        <div class="prize-section__head">
            <h3>奖品</h3>
            <span class="prize-section__count">{{ prizes.length }}</span>
        </div>

        <div class="prize-section__body">
            <div v-if="prizes.length > 0" class="prize-list">
                <ToolsLotteryPrizeItem v-for="item in prizes" :key="item.name" :item="item"
                    @edit="emit('editPrize', $event)" @toggle-enabled="emit('togglePrize', $event)" />
            </div>

            <div v-else class="empty-state">
                <i-ep-box />
                <strong>还没有奖品</strong>
                <p>可以手动新增，也可以从积分商城导入。</p>
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import type { UiLotteryPrize } from "@/managers/lottery";
import ToolsLotteryPrizeItem from "@/v3/components/tools/ToolsLotteryPrizeItem.vue";

defineOptions({ name: "ToolsLotteryPoolPanel" })

/** 定义抽奖器左侧奖池面板属性。 */
interface ToolsLotteryPoolPanelProps {
    prizes: UiLotteryPrize[]
}

defineProps<ToolsLotteryPoolPanelProps>()

const emit = defineEmits<{
    (e: "editPrize", item: UiLotteryPrize): void
    (e: "togglePrize", item: UiLotteryPrize): void
}>()
</script>

<style scoped>
.tools-lottery-pool-panel {
    height: 100%;
    min-height: 0;
    padding: 16px;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 10px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.88);
    box-sizing: border-box;
    overflow: hidden;
}

.prize-section__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.prize-section__head h3 {
    margin: 0;
    color: #16213e;
    font-size: 16px;
}

.prize-section__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    min-height: 28px;
    padding: 0 8px;
    border-radius: 999px;
    background: rgba(18, 185, 129, 0.12);
    color: #067647;
    font-size: 12px;
    font-weight: 700;
}

.prize-section__body {
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.prize-list {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: auto;
    padding-right: 4px;
    align-items: stretch;
}

.empty-state {
    flex: 1;
    min-height: 0;
    padding: 16px;
    display: grid;
    place-items: center;
    text-align: center;
    gap: 8px;
    color: #627099;
    border: 1px dashed rgba(122, 141, 198, 0.22);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.7);
}

.empty-state strong,
.empty-state p {
    margin: 0;
}

.empty-state p {
    line-height: 1.6;
    font-size: 13px;
}

.empty-state :deep(svg) {
    font-size: 36px;
    color: #12b981;
}

@media (max-width: 1080px) {
    .tools-lottery-pool-panel {
        min-height: 280px;
    }
}

@media (max-width: 820px) {
    .tools-lottery-pool-panel {
        height: auto;
        min-height: 240px;
        padding: 14px;
        border-radius: 22px;
    }
}
</style>
