export type ShopItem = {
    id: string
    name: string
    points: number
    stock: number
    description?: string
    icon?: string
    createdAt: number
}

export type ExchangeRecord = {
    id: string
    shopItemId: string
    shopItemName: string
    studentName: string
    classId: string
    points: number
    quantity: number
    exchangedAt: number
}

