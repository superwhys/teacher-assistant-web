<template>
    <aside class="tools-lottery-pool-panel">
        <div class="tools-lottery-pool-panel__head">
            <div>
                <span class="panel-eyebrow">抽奖器</span>
                <h3>奖池与奖品</h3>
            </div>

            <div class="pool-actions-inline">
                <button type="button" class="icon-button" @click="emit('addPool')">
                    <i-ep-plus />
                </button>
                <button type="button" class="icon-button" :disabled="!hasCurrentPool" @click="emit('editCurrentPool')">
                    <i-ep-edit />
                </button>
            </div>
        </div>

        <div class="tools-lottery-pool-panel__control-card">
            <div class="pool-selector">
                <el-select v-model="selectedPoolId" placeholder="选择奖池" size="large" class="pool-selector__control">
                    <el-option v-for="pool in pools" :key="pool.id" :label="pool.name" :value="pool.id" />
                    <template #empty>
                        <div class="pool-selector__empty">
                            <button type="button" class="text-button" @click="emit('addPool')">新建奖池</button>
                        </div>
                    </template>
                </el-select>
            </div>

            <div class="action-row">
                <button type="button" class="ghost-button" @click="emit('addPrize')">
                    添加奖品
                </button>
                <button type="button" class="ghost-button" @click="emit('importPrize')">
                    商城导入
                </button>
                <button type="button" class="ghost-button danger" :disabled="prizes.length === 0"
                    @click="emit('clearAll')">
                    清空奖池
                </button>
            </div>
        </div>

        <section class="prize-section">
            <div class="prize-section__head">
                <div>
                    <span class="panel-eyebrow panel-eyebrow--soft">奖品列表</span>
                    <h4>当前奖池奖品</h4>
                </div>
                <span class="prize-section__count">共 {{ prizes.length }} 个</span>
            </div>

            <div class="prize-section__body">
                <div v-if="prizes.length > 0" class="prize-list">
                    <ToolsLotteryPrizeItem v-for="item in prizes" :key="item.name" :item="item"
                        @edit="emit('editPrize', $event)" @toggle-enabled="emit('togglePrize', $event)" />
                </div>

                <div v-else class="empty-state">
                    <i-ep-box />
                    <strong>当前奖池还没有奖品</strong>
                    <p>可以手动新增奖品，也可以直接从积分商城导入现有奖品。</p>
                </div>
            </div>
        </section>
    </aside>
</template>

<script setup lang="ts">
import type { UiLotteryPool, UiLotteryPrize } from "@/managers/lottery";
import ToolsLotteryPrizeItem from "@/v3/components/tools/ToolsLotteryPrizeItem.vue";
import { computed } from "vue";

defineOptions({ name: "ToolsLotteryPoolPanel" })

/** 定义抽奖器左侧奖池面板属性。 */
interface ToolsLotteryPoolPanelProps {
    currentPoolId: string | null
    hasCurrentPool: boolean
    pools: UiLotteryPool[]
    prizes: UiLotteryPrize[]
}

const props = defineProps<ToolsLotteryPoolPanelProps>()

const emit = defineEmits<{
    (e: "addPool"): void
    (e: "editCurrentPool"): void
    (e: "update:currentPoolId", value: string | null): void
    (e: "addPrize"): void
    (e: "importPrize"): void
    (e: "clearAll"): void
    (e: "editPrize", item: UiLotteryPrize): void
    (e: "togglePrize", item: UiLotteryPrize): void
}>()

/** 返回支持双向绑定的当前奖池 ID。 */
const selectedPoolId = computed<string | null>({
    get: () => props.currentPoolId,
    set: (value) => emit("update:currentPoolId", value)
})
</script>

<style scoped>
.tools-lottery-pool-panel {
    height: 100%;
    min-height: 0;
    padding: 22px;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: 16px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 30px;
    background: #ffffff;
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    box-sizing: border-box;
    overflow: hidden;
}

.tools-lottery-pool-panel__head,
.pool-actions-inline,
.action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.tools-lottery-pool-panel__head {
    justify-content: space-between;
    align-items: flex-start;
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

.panel-eyebrow--soft {
    background: rgba(255, 255, 255, 0.62);
    color: #067647;
}

.tools-lottery-pool-panel__head h3 {
    margin: 12px 0 0;
    color: #16213e;
    font-size: 24px;
}

.icon-button,
.ghost-button,
.text-button {
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
    border: 1px solid rgba(122, 141, 198, 0.24);
    background: #ffffff;
    color: #16213e;
}

.icon-button {
    width: 46px;
    height: 46px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
}

.ghost-button {
    min-height: 46px;
    padding: 0 16px;
    border-radius: 16px;
}

.text-button {
    min-height: 40px;
    padding: 0 14px;
    border-radius: 14px;
}

.icon-button:hover,
.ghost-button:hover,
.text-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(18, 185, 129, 0.14);
}

.icon-button:disabled,
.ghost-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.ghost-button.danger {
    color: #c2410c;
    background: rgba(255, 237, 213, 0.82);
    border-color: rgba(251, 146, 60, 0.24);
}

.tools-lottery-pool-panel__control-card,
.prize-section {
    border: 1px solid rgba(122, 141, 198, 0.14);
    border-radius: 24px;
    background: #ffffff;
    box-sizing: border-box;
}

.tools-lottery-pool-panel__control-card {
    padding: 16px;
    display: grid;
    gap: 14px;
}

.pool-selector__control {
    width: 100%;
}

.pool-selector__empty {
    padding: 10px;
    text-align: center;
}

.action-row .ghost-button {
    flex: 1;
}

.prize-section {
    min-height: 0;
    padding: 16px;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 16px;
    overflow: hidden;
}

.prize-section__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.prize-section__head h4 {
    margin: 10px 0 0;
    color: #16213e;
    font-size: 18px;
}

.prize-section__count {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    padding: 0 12px;
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
    gap: 12px;
    overflow: auto;
    padding-right: 4px;
    align-items: stretch;
}

.empty-state {
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    text-align: center;
    gap: 10px;
    color: #627099;
    border: 1px dashed rgba(122, 141, 198, 0.22);
    border-radius: 22px;
    background: #ffffff;
}

.empty-state strong,
.empty-state p {
    margin: 0;
}

.empty-state p {
    line-height: 1.7;
}

.empty-state :deep(svg) {
    font-size: 52px;
    color: #12b981;
}

@media (max-width: 1080px) {
    .tools-lottery-pool-panel {
        height: auto;
        grid-template-rows: auto auto auto;
    }
}

@media (max-width: 768px) {
    .tools-lottery-pool-panel {
        padding: 18px;
        border-radius: 26px;
    }

    .action-row {
        flex-direction: column;
    }

    .action-row .ghost-button {
        flex: none;
        width: 100%;
    }

    .prize-section__head {
        flex-direction: column;
    }
}
</style>
