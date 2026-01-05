export type LotteryPrizeDTO = {
    name?: string
    weight?: number
    enabled?: boolean
}

export type LotteryPoolDTO = {
    id?: number
    name?: string
    prizes?: LotteryPrizeDTO[]
    user_id?: number
}

export type ListLotteryPoolsResp = {
    pools?: LotteryPoolDTO[]
}

export type CreateLotteryPoolReq = {
    name?: string
}

export type UpdateLotteryPoolReq = {
    id: number
    name: string
}

export type ClearLotteryPoolReq = {
    pool_id: number
}

export type AddPrizeToLotteryPoolReq = {
    pool_id: number
    name: string
    weight?: number
    enabled?: boolean
}

export type UpdatePrizeInLotteryPoolReq = {
    pool_id: number
    name: string
    weight?: number
    enabled?: boolean
}

export type RemovePrizeFromLotteryPoolReq = {
    pool_id: number
    name: string
}


