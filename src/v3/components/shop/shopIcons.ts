import type { Component } from "vue"
import {
    Basketball as IEpBasketball,
    Coffee as IEpCoffee,
    Coin as IEpCoin,
    EditPen as IEpEditPen,
    GoodsFilled as IEpGoodsFilled,
    Reading as IEpReading,
    StarFilled as IEpStarFilled,
    Trophy as IEpTrophy,
} from "@element-plus/icons-vue"

/** 定义商城图标选项结构。 */
export interface ShopIconOption {
    label: string
    value: string
    icon: Component
}

const iconComponentMap: Record<string, Component> = {
    "basketball": IEpBasketball,
    "coffee": IEpCoffee,
    "coin": IEpCoin,
    "edit-pen": IEpEditPen,
    "goods-filled": IEpGoodsFilled,
    "reading": IEpReading,
    "star-filled": IEpStarFilled,
    "trophy": IEpTrophy,
}

const iconVisualClassMap: Record<string, string> = {
    "basketball": "shop-card__visual--gold",
    "coffee": "shop-card__visual--sunset",
    "coin": "shop-card__visual--gold",
    "edit-pen": "shop-card__visual--cyan",
    "goods-filled": "shop-card__visual--sunset",
    "reading": "shop-card__visual--indigo",
    "star-filled": "shop-card__visual--violet",
    "trophy": "shop-card__visual--emerald",
}

/** 提供商城图标下拉选项。 */
export const shopIconOptions: ShopIconOption[] = [
    { label: "礼物", value: "goods-filled", icon: IEpGoodsFilled },
    { label: "奖杯", value: "trophy", icon: IEpTrophy },
    { label: "星标", value: "star-filled", icon: IEpStarFilled },
    { label: "积分", value: "coin", icon: IEpCoin },
    { label: "阅读", value: "reading", icon: IEpReading },
    { label: "文具", value: "edit-pen", icon: IEpEditPen },
    { label: "饮品", value: "coffee", icon: IEpCoffee },
    { label: "运动", value: "basketball", icon: IEpBasketball },
]

/** 返回商品图标对应的组件。 */
export function getShopIconComponent(iconName?: string): Component {
    if (!iconName) {
        return IEpGoodsFilled
    }

    return iconComponentMap[iconName] ?? IEpGoodsFilled
}

/** 返回商品视觉卡片对应的渐变样式类名。 */
export function getShopVisualClass(iconName?: string): string {
    if (!iconName) {
        return "shop-card__visual--violet"
    }

    return iconVisualClassMap[iconName] ?? "shop-card__visual--violet"
}
