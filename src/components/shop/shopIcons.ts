import type { Component } from 'vue'
import {
    GoodsFilled as IEpGoodsFilled,
    Trophy as IEpTrophy,
    StarFilled as IEpStarFilled,
    Coin as IEpCoin,
    Reading as IEpReading,
    EditPen as IEpEditPen,
    Coffee as IEpCoffee,
    Basketball as IEpBasketball,
} from '@element-plus/icons-vue'

export interface ShopIconOption {
    label: string
    value: string
    icon: Component
}

export const shopIconOptions: ShopIconOption[] = [
    { label: '礼物', value: 'goods-filled', icon: IEpGoodsFilled },
    { label: '奖杯', value: 'trophy', icon: IEpTrophy },
    { label: '星星', value: 'star-filled', icon: IEpStarFilled },
    { label: '钻石', value: 'coin', icon: IEpCoin },
    { label: '书本', value: 'reading', icon: IEpReading },
    { label: '铅笔', value: 'edit-pen', icon: IEpEditPen },
    { label: '杯子', value: 'coffee', icon: IEpCoffee },
    { label: '足球', value: 'basketball', icon: IEpBasketball },
]

const iconComponentMap: Record<string, Component> = {
    'goods-filled': IEpGoodsFilled,
    'trophy': IEpTrophy,
    'star-filled': IEpStarFilled,
    'coin': IEpCoin,
    'reading': IEpReading,
    'edit-pen': IEpEditPen,
    'coffee': IEpCoffee,
    'basketball': IEpBasketball,
}

export function getShopIconComponent(iconName?: string): Component {
    if (!iconName) return IEpGoodsFilled
    return iconComponentMap[iconName] || IEpGoodsFilled
}


