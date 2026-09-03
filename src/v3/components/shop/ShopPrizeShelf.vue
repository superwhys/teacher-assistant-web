<template>
    <section class="shop-prize-shelf">
        <div class="panel-head">
            <div>
                <span class="panel-head__eyebrow">商品列表</span>
                <h3>课堂奖品卡片</h3>
            </div>
            <span class="panel-head__meta">共 {{ items.length }} 个奖品</span>
        </div>

        <div v-if="items.length > 0" class="shop-prize-shelf__grid">
            <ShopPrizeCard v-for="item in items" :key="item.id ?? item.name" :item="item" :can-exchange="canExchange"
                @delete="emit('delete', $event)" @edit="emit('edit', $event)" @exchange="emit('exchange', $event)" />
        </div>

        <div v-else class="shop-prize-shelf__empty">
            <i-ep-goods-filled class="shop-prize-shelf__empty-icon" />
            <strong>当前还没有上架奖品</strong>
            <p>可以通过“新增奖品”手动创建，也可以使用 Excel 一次性导入。</p>
        </div>
    </section>
</template>

<script setup lang="ts">
import type { Prize } from "@/types/mall"
import ShopPrizeCard from "@/v3/components/shop/ShopPrizeCard.vue"

defineOptions({ name: "ShopPrizeShelf" })

/** 定义商城奖品货架属性。 */
interface ShopPrizeShelfProps {
    canExchange: boolean
    items: Prize[]
}

defineProps<ShopPrizeShelfProps>()

const emit = defineEmits<{
    (e: "delete", item: Prize): void
    (e: "edit", item: Prize): void
    (e: "exchange", item: Prize): void
}>()
</script>

<style scoped>
.shop-prize-shelf {
    min-width: 0;
    padding: 20px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface);
    box-shadow: var(--ta-shadow-1);
    backdrop-filter: blur(18px) saturate(150%);
}

.panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
}

.panel-head__eyebrow {
    color: var(--ta-blue);
    font-size: 11px;
    font-weight: 650;
}

.panel-head h3 {
    margin: 5px 0 0;
    font-size: 17px;
    letter-spacing: -0.015em;
}

.panel-head__meta {
    min-height: 26px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: var(--ta-text-secondary);
    background: var(--ta-surface-muted);
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
}

.shop-prize-shelf__grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.shop-prize-shelf__empty {
    min-height: 280px;
    margin-top: 14px;
    padding: 24px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 8px;
    border-radius: 14px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    text-align: center;
}

.shop-prize-shelf__empty-icon {
    width: 42px;
    height: 42px;
    color: var(--ta-blue);
}

.shop-prize-shelf__empty strong {
    color: var(--ta-text);
    font-size: 14px;
}

.shop-prize-shelf__empty p {
    margin: 0;
    font-size: 12px;
}

@media (min-width: 1800px) {
    .shop-prize-shelf__grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (min-width: 2300px) {
    .shop-prize-shelf__grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
    }
}

@media (max-width: 1180px) {
    .shop-prize-shelf__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 660px) {
    .shop-prize-shelf {
        padding: 16px;
    }

    .panel-head {
        align-items: stretch;
        flex-direction: column;
    }

    .shop-prize-shelf__grid {
        grid-template-columns: 1fr;
    }
}
</style>
