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
    padding: 22px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    backdrop-filter: blur(16px);
}

.panel-head h3,
.panel-head p,
.shop-prize-shelf__empty strong,
.shop-prize-shelf__empty p {
    margin: 0;
}

.panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
}

.panel-head__eyebrow {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font-size: 12px;
    font-weight: 700;
}

.panel-head h3 {
    margin-top: 12px;
    color: #16213e;
    font-size: 24px;
}

.panel-head p {
    margin-top: 8px;
    color: #627099;
    line-height: 1.7;
}

.panel-head__meta {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    padding: 0 14px;
    border-radius: 999px;
    background: rgba(22, 33, 62, 0.06);
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.shop-prize-shelf__grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px;
}

.shop-prize-shelf__empty {
    min-height: 320px;
    margin-top: 18px;
    display: grid;
    place-items: center;
    text-align: center;
    gap: 10px;
    color: #627099;
}

.shop-prize-shelf__empty-icon {
    font-size: 54px;
    color: #8e6cff;
}

@media (max-width: 1280px) {
    .shop-prize-shelf__grid {
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
}

@media (max-width: 768px) {
    .shop-prize-shelf {
        padding: 16px;
        border-radius: 28px;
    }

    .panel-head {
        flex-direction: column;
    }

    .shop-prize-shelf__grid {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
    }
}
</style>
