<template>
    <aside class="tools-lottery-pool-panel">
        <div class="prize-section__head">
            <h3>奖品</h3>
            <div class="prize-section__actions">
                <button type="button" class="prize-section__toggle" :aria-pressed="showProbability"
                    @click="toggleProbability">
                    {{ showProbability ? "隐藏概率" : "显示概率" }}
                </button>
                <span class="prize-section__count">{{ prizes.length }}</span>
            </div>
        </div>

        <div class="prize-section__body">
            <div v-if="prizes.length > 0" class="prize-list">
                <ToolsLotteryPrizeItem v-for="item in prizes" :key="item.name" :item="item"
                    :probability="probabilities[item.name] ?? 0" :show-probability="showProbability"
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
import { ref } from "vue";
import type { UiLotteryPrize } from "@/managers/lottery";
import ToolsLotteryPrizeItem from "@/v3/components/tools/ToolsLotteryPrizeItem.vue";

defineOptions({ name: "ToolsLotteryPoolPanel" })

/** 定义抽奖器左侧奖池面板属性。 */
interface ToolsLotteryPoolPanelProps {
    prizes: UiLotteryPrize[]
    probabilities: Record<string, number>
}

defineProps<ToolsLotteryPoolPanelProps>()

const PROBABILITY_STORAGE_KEY = "ta_lottery_show_probability_v1"
const showProbability = ref(readShowProbability())

const emit = defineEmits<{
    (e: "editPrize", item: UiLotteryPrize): void
    (e: "togglePrize", item: UiLotteryPrize): void
}>()

/** 读取本地保存的概率显示状态。 */
function readShowProbability(): boolean {
    try {
        return window.localStorage.getItem(PROBABILITY_STORAGE_KEY) === "1"
    } catch {
        return false
    }
}

/** 切换概率显示状态并保存到本地。 */
function toggleProbability(): void {
    showProbability.value = !showProbability.value
    try {
        window.localStorage.setItem(PROBABILITY_STORAGE_KEY, showProbability.value ? "1" : "0")
    } catch {
        return
    }
}
</script>

<style scoped>
.tools-lottery-pool-panel {
    min-width: 0;
    min-height: 0;
    padding: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface);
    box-shadow: var(--ta-shadow-1);
}

.prize-section__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.prize-section__head h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
}

.prize-section__actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.prize-section__toggle {
    min-height: 28px;
    padding: 4px 8px;
    border: 1px solid var(--ta-line);
    border-radius: 8px;
    color: var(--ta-text-secondary);
    background: var(--ta-surface-muted);
    font-size: 12px;
    white-space: nowrap;
    cursor: pointer;
}

.prize-section__count {
    min-width: 26px;
    height: 26px;
    padding: 0 8px;
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
    font-size: 12px;
    font-weight: 600;
}

.prize-section__body,
.prize-list {
    min-height: 0;
    flex: 1;
}

.prize-section__body {
    margin-top: 10px;
    overflow: auto;
}

.prize-list {
    display: grid;
    gap: 0;
    align-content: start;
}

.empty-state {
    min-height: 180px;
    padding: 20px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 7px;
    border-radius: var(--ta-radius-large);
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    text-align: center;
}

.empty-state strong {
    color: var(--ta-text);
    font-size: 14px;
}

.empty-state p {
    margin: 0;
    font-size: 12px;
}
</style>
