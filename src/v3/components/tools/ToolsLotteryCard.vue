<template>
    <ToolsCardPanel
        eyebrow="抽奖器"
        title="奖池预览"
        :status-label="`${poolCount} 个奖池`"
        status-tone-class="status-chip--violet"
        tone-class="tools-card-panel--lottery"
    >
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

            <div v-if="prizeItems.length > 0" class="prize-list">
                <div v-for="item in prizeItems" :key="item.id" class="prize-card">
                    <div>
                        <strong>{{ item.name }}</strong>
                        <span>{{ item.description }}</span>
                    </div>
                    <b>{{ item.sourceLabel }}</b>
                </div>
            </div>

            <div v-else class="tools-lottery-card__empty">
                <i-ep-trophy />
                <strong>当前还没有可展示的奖品</strong>
                <p>可以先从商城导入奖品，也可以在完整抽奖器页面中自定义奖池。</p>
            </div>
        </div>

        <template #actions>
            <button type="button" class="action-button" @click="emit('openShop')">
                查看商城奖品
            </button>
            <button type="button" class="action-button" @click="emit('openLottery')">
                {{ manageActionLabel }}
            </button>
            <button v-if="showOpenPageAction" type="button" class="action-button action-button--primary" @click="emit('openLottery')">
                进入完整页
            </button>
        </template>
    </ToolsCardPanel>
</template>

<script setup lang="ts">
import ToolsCardPanel from "@/v3/components/tools/ToolsCardPanel.vue";

defineOptions({ name: "ToolsLotteryCard" })

/** 定义抽奖器预览奖品结构。 */
interface ToolsLotteryPreviewItem {
    description: string
    id: string
    name: string
    sourceLabel: string
}

/** 定义抽奖器卡片属性。 */
interface ToolsLotteryCardProps {
    manageActionLabel?: string
    poolCount: number
    prizeCount: number
    prizeItems: ToolsLotteryPreviewItem[]
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
.summary-pill span,
.summary-pill strong,
.prize-card strong,
.prize-card span,
.prize-card b,
.tools-lottery-card__empty strong,
.tools-lottery-card__empty p {
    margin: 0;
}

.tools-lottery-card__content {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.tools-lottery-card__summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.summary-pill {
    padding: 16px 18px;
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(122, 141, 198, 0.14);
}

.summary-pill span {
    display: block;
    color: #627099;
    font-size: 13px;
}

.summary-pill strong {
    display: block;
    margin-top: 10px;
    color: #16213e;
    font-size: 28px;
}

.prize-list {
    margin-top: 16px;
    display: grid;
    gap: 12px;
}

.prize-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(122, 141, 198, 0.14);
}

.prize-card strong {
    display: block;
    color: #16213e;
    font-size: 17px;
}

.prize-card span {
    display: block;
    margin-top: 8px;
    color: #627099;
    line-height: 1.7;
}

.prize-card b {
    color: #067647;
    font-size: 13px;
    white-space: nowrap;
}

.tools-lottery-card__empty {
    flex: 1;
    min-height: 0;
    margin-top: 16px;
    display: grid;
    place-items: center;
    text-align: center;
    gap: 10px;
    color: #627099;
}

.tools-lottery-card__empty :deep(svg) {
    font-size: 52px;
    color: #12b981;
}

.tools-lottery-card__empty p {
    line-height: 1.7;
}

.action-button {
    min-height: 46px;
    padding: 0 16px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(18, 185, 129, 0.14);
}

.action-button--primary {
    border: none;
    background: linear-gradient(135deg, #14b8a6, #12b981);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(18, 185, 129, 0.24);
}

@media (max-width: 768px) {
    .tools-lottery-card__summary {
        grid-template-columns: 1fr;
    }

    .prize-card {
        flex-direction: column;
        align-items: flex-start;
    }

    .action-button {
        width: 100%;
    }
}
</style>
