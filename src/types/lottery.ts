export type Prize = {
    id: string
    name: string
    weight: number
    enabled: boolean
    source: 'custom' | 'shop'
    shopItemId?: string
    createdAt: number
}

export type DrawRecord = {
    id: string
    prizeId: string
    prizeName: string
    drawnAt: number
}

export type PrizePool = {
    id: string
    name: string
    prizes: Prize[]
    records: DrawRecord[]
    createdAt: number
}


