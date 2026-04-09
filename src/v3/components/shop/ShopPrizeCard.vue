<template>
    <article class="shop-card">
        <div class="shop-card__toolbar">
            <button type="button" class="icon-button" aria-label="编辑商品" @click="emit('edit', item)">
                <i-ep-edit />
            </button>
            <button type="button" class="icon-button icon-button--danger" aria-label="删除商品" @click="emit('delete', item)">
                <i-ep-delete />
            </button>
        </div>

        <div class="shop-card__visual" :class="visualClass">
            <component :is="iconComponent" />
            <span>{{ itemName }}</span>
        </div>

        <div class="shop-card__title">
            <strong>{{ itemName }}</strong>
            <p>{{ itemDescription }}</p>
        </div>

        <div class="shop-card__footer">
            <div class="shop-card__points">
                <span>兑换所需</span>
                <strong>{{ itemPoints }}</strong>
            </div>

            <div class="shop-card__meta">
                <span class="shop-card__stock" :class="{ 'is-empty': itemStock <= 0 }">
                    {{ itemStock <= 0 ? "库存不足" : `库存 ${itemStock}` }}
                </span>
                <button
                    type="button"
                    class="exchange-button"
                    :disabled="itemStock <= 0 || !canExchange"
                    @click="emit('exchange', item)"
                >
                    {{ itemStock <= 0 ? "已兑完" : "立即兑换" }}
                </button>
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { Prize } from "@/types/mall"
import { getShopIconComponent, getShopVisualClass } from "@/v3/components/shop/shopIcons"

defineOptions({ name: "ShopPrizeCard" })

/** 定义商城商品卡片属性。 */
interface ShopPrizeCardProps {
    canExchange: boolean
    item: Prize
}

const props = defineProps<ShopPrizeCardProps>()

const emit = defineEmits<{
    (e: "delete", item: Prize): void
    (e: "edit", item: Prize): void
    (e: "exchange", item: Prize): void
}>()

/** 返回商品名称。 */
const itemName = computed<string>(() => props.item.name?.trim() || "未命名商品")

/** 返回商品描述。 */
const itemDescription = computed<string>(() => props.item.description?.trim() || "可作为课堂激励或阶段奖励发放。")

/** 返回商品所需积分。 */
const itemPoints = computed<number>(() => toNumber(props.item.points, 0))

/** 返回商品库存。 */
const itemStock = computed<number>(() => toNumber(props.item.stock, 0))

/** 返回商品展示图标组件。 */
const iconComponent = computed(() => getShopIconComponent(props.item.icon))

/** 返回商品顶部视觉渐变样式。 */
const visualClass = computed<string>(() => getShopVisualClass(props.item.icon))

/** 将任意值转换为数字。 */
function toNumber(value: unknown, fallback = 0): number {
    const parsedValue = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}
</script>

<style scoped>
.shop-card {
    position: relative;
    padding: 18px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.shop-card:hover {
    transform: translateY(-4px);
    border-color: rgba(85, 104, 255, 0.26);
    box-shadow: 0 20px 34px rgba(71, 90, 150, 0.16);
}

.shop-card__toolbar,
.shop-card__footer,
.shop-card__meta {
    display: flex;
    align-items: center;
}

.shop-card__toolbar,
.shop-card__footer {
    justify-content: space-between;
    gap: 12px;
}

.shop-card__toolbar {
    position: absolute;
    top: 10px;
    right: 10px;
    opacity: 0;
    transition: opacity 0.16s ease;
}

.shop-card:hover .shop-card__toolbar {
    opacity: 1;
}

.icon-button,
.exchange-button {
    border: none;
    font: inherit;
    cursor: pointer;
}

.icon-button {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: rgba(22, 33, 62, 0.06);
    color: #5568ff;
    transition: transform 0.16s ease, background-color 0.16s ease;
}

.icon-button:hover {
    transform: translateY(-1px);
    background: rgba(85, 104, 255, 0.12);
}

.icon-button--danger {
    color: #d92d20;
}

.icon-button--danger:hover {
    background: rgba(217, 45, 32, 0.12);
}

.shop-card__visual {
    height: 126px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    gap: 8px;
    color: #ffffff;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.shop-card__visual :deep(svg) {
    width: 26px;
    height: 26px;
}

.shop-card__visual span {
    font-size: 22px;
    font-weight: 800;
    text-align: center;
}

.shop-card__visual--violet {
    background: linear-gradient(135deg, #8e6cff, #5568ff);
}

.shop-card__visual--emerald {
    background: linear-gradient(135deg, #12b981, #14b8a6);
}

.shop-card__visual--gold {
    background: linear-gradient(135deg, #f59e0b, #f97316);
}

.shop-card__visual--sunset {
    background: linear-gradient(135deg, #ff8f6b, #ff6b81);
}

.shop-card__visual--indigo {
    background: linear-gradient(135deg, #5568ff, #7c8cff);
}

.shop-card__visual--cyan {
    background: linear-gradient(135deg, #06b6d4, #3b82f6);
}

.shop-card__title {
    margin-top: 14px;
}

.shop-card__title strong,
.shop-card__title p,
.shop-card__points span,
.shop-card__points strong,
.shop-card__stock {
    margin: 0;
}

.shop-card__title strong {
    display: block;
    color: #16213e;
    font-size: 18px;
    line-height: 1.3;
}

.shop-card__title p {
    margin-top: 8px;
    color: #627099;
    font-size: 13px;
    line-height: 1.6;
    min-height: 42px;
}

.shop-card__footer {
    margin-top: 14px;
}

.shop-card__points span {
    display: block;
    color: #627099;
    font-size: 12px;
}

.shop-card__points strong {
    display: block;
    margin-top: 6px;
    color: #16213e;
    font-size: 24px;
    line-height: 1;
}

.shop-card__meta {
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.shop-card__stock {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(22, 33, 62, 0.06);
    color: #627099;
    font-size: 12px;
    font-weight: 700;
}

.shop-card__stock.is-empty {
    background: rgba(217, 45, 32, 0.1);
    color: #d92d20;
}

.exchange-button {
    min-height: 36px;
    padding: 0 14px;
    border-radius: 14px;
    background: rgba(22, 33, 62, 0.08);
    color: #16213e;
    font-size: 13px;
    font-weight: 700;
    transition: transform 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}

.exchange-button:not(:disabled):hover {
    transform: translateY(-1px);
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
}

.exchange-button:disabled {
    opacity: 0.46;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .shop-card {
        padding: 16px;
    }

    .shop-card__toolbar {
        opacity: 1;
        top: 10px;
        right: 10px;
    }

    .shop-card__visual {
        height: 112px;
    }

    .shop-card__visual span {
        font-size: 20px;
    }

    .shop-card__footer {
        align-items: flex-start;
        flex-direction: column;
    }

    .shop-card__meta {
        width: 100%;
        justify-content: space-between;
    }
}
</style>
