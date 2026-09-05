<template>
    <article class="shop-card">
        <div class="shop-card__toolbar">
            <el-dropdown trigger="click" placement="bottom-end" popper-class="shop-card-actions-menu"
                @command="handleActionCommand">
                <button type="button" class="shop-card__menu-button" aria-label="商品操作" @click.stop>
                    <i-ep-more-filled />
                </button>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item command="edit">
                            <i-ep-edit />
                            <span>编辑商品</span>
                        </el-dropdown-item>
                        <el-dropdown-item command="delete" divided class="shop-card-actions-menu__danger">
                            <i-ep-delete />
                            <span>删除商品</span>
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>

        <div class="shop-card__visual" :class="visualClass">
            <component :is="iconComponent" />
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
                    {{ itemStock <= 0 ? "库存不足" : `库存 ${itemStock}` }} </span>
                        <button type="button" class="exchange-button" :disabled="itemStock <= 0 || !canExchange"
                            @click="emit('exchange', item)">
                            {{ itemStock <= 0 ? "已兑完" : "兑换" }} </button>
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { Prize } from "@/types/mall"
import { getShopIconComponent, getShopVisualClass } from "@/v3/components/shop/shopIcons"

defineOptions({ name: "ShopPrizeCard" })

type ShopCardActionCommand = "edit" | "delete"

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
const itemDescription = computed<string>(() => props.item.description?.trim() || "")

/** 返回商品所需积分。 */
const itemPoints = computed<number>(() => toNumber(props.item.points, 0))

/** 返回商品库存。 */
const itemStock = computed<number>(() => toNumber(props.item.stock, 0))

/** 返回商品展示图标组件。 */
const iconComponent = computed(() => getShopIconComponent(props.item.icon))

/** 返回商品顶部视觉渐变样式。 */
const visualClass = computed<string>(() => getShopVisualClass(props.item.icon))


/** 处理商品卡片右上角菜单操作。 */
function handleActionCommand(command: ShopCardActionCommand): void {
    if (command === "edit") {
        emit("edit", props.item)
        return
    }

    emit("delete", props.item)
}

/** 将任意值转换为数字。 */
function toNumber(value: unknown, fallback = 0): number {
    const parsedValue = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}
</script>

<style scoped>
.shop-card {
    position: relative;
    min-width: 0;
    padding: 13px;
    border: 1px solid var(--ta-line);
    border-radius: 16px;
    background: #ffffff;
    transition: border-color 140ms ease, box-shadow 140ms ease, transform 100ms ease;
}

.shop-card:hover {
    border-color: rgba(0, 122, 255, 0.25);
}

.shop-card:active {
    transform: scale(0.99);
}

.shop-card__footer,
.shop-card__meta {
    display: flex;
    align-items: center;
}

.shop-card__toolbar {
    position: absolute;
    top: 9px;
    right: 9px;
    z-index: 2;
}

.shop-card__menu-button {
    width: 32px;
    height: 32px;
    padding: 0;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(12px);
    cursor: pointer;
    transition: color 140ms ease, background-color 140ms ease, transform 100ms ease;
}

.shop-card__menu-button:hover,
.shop-card__menu-button[aria-expanded="true"] {
    color: var(--ta-blue);
    background: #ffffff;
}

.shop-card__menu-button:active {
    transform: scale(0.96);
}

.shop-card__menu-button svg {
    width: 17px;
    height: 17px;
}

:global(.shop-card-actions-menu.el-popper) {
    padding: 4px;
    border: 1px solid var(--ta-line);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.97);
    box-shadow: var(--ta-shadow-2);
    backdrop-filter: blur(20px) saturate(160%);
}

:global(.shop-card-actions-menu .el-dropdown-menu) {
    padding: 0;
    background: transparent;
}

:global(.shop-card-actions-menu .el-dropdown-menu__item) {
    min-height: 36px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 8px;
    color: var(--ta-text-secondary);
    font-size: 13px;
}

:global(.shop-card-actions-menu .el-dropdown-menu__item svg) {
    width: 15px;
    height: 15px;
}

:global(.shop-card-actions-menu .el-dropdown-menu__item:not(.is-disabled):focus) {
    color: var(--ta-text);
    background: var(--ta-surface-muted);
}

:global(.shop-card-actions-menu .shop-card-actions-menu__danger) {
    color: var(--ta-red);
}

.shop-card__visual {
    height: 90px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: #ffffff;
}

.shop-card__visual :deep(svg) {
    width: 32px;
    height: 32px;
}

.shop-card__visual--violet {
    background: linear-gradient(145deg, #9b6be8, #7650c7);
}

.shop-card__visual--emerald {
    background: linear-gradient(145deg, #4aa568, #2f7f49);
}

.shop-card__visual--gold {
    background: linear-gradient(145deg, #efad32, #d57c16);
}

.shop-card__visual--sunset {
    background: linear-gradient(145deg, #ef8f6f, #d65b76);
}

.shop-card__visual--indigo {
    background: linear-gradient(145deg, #5e72d8, #4555aa);
}

.shop-card__visual--cyan {
    background: linear-gradient(145deg, #37a6c8, #357fbd);
}

.shop-card__title {
    margin-top: 11px;
}

.shop-card__title strong {
    display: block;
    overflow: hidden;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.shop-card__title p {
    min-height: 34px;
    margin: 4px 0 0;
    display: -webkit-box;
    overflow: hidden;
    color: var(--ta-text-tertiary);
    font-size: 12px;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}

.shop-card__footer {
    margin-top: 10px;
    justify-content: space-between;
    gap: 8px;
}

.shop-card__points span {
    display: block;
    color: var(--ta-text-tertiary);
    font-size: 11px;
}

.shop-card__points strong {
    display: block;
    margin-top: 3px;
    font-size: 19px;
    line-height: 1;
}

.shop-card__meta {
    justify-content: flex-end;
    gap: 5px;
    flex-wrap: wrap;
}

.shop-card__stock {
    min-height: 25px;
    padding: 0 7px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    font-size: 11px;
    white-space: nowrap;
}

.shop-card__stock.is-empty {
    color: var(--ta-red);
    background: var(--ta-red-soft);
}

.exchange-button {
    min-height: 30px;
    padding: 0 10px;
    border: 0;
    border-radius: 9px;
    color: #ffffff;
    background: var(--ta-blue);
    font-size: 12px;
    font-weight: 620;
    cursor: pointer;
}

.exchange-button:disabled {
    opacity: 0.42;
}

</style>
