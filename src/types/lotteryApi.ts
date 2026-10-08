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

export type AddLotteryPrizeItem = {
    name: string
    enabled?: boolean
    weight?: number
}

export type AddPrizeToLotteryPoolReq = {
    pool_id: number
    prizes?: AddLotteryPrizeItem[]
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

export type LotteryRecordDTO = {
    id: number
    pool_id: number
    client_id: string
    prize_name: string
    drawn_at: number
    student_id: number
    student_name: string
    student_class_id: number
}

export type CreateLotteryRecordItem = {
    client_id: string
    prize_name: string
    drawn_at: number
    student_id?: number
}

export type LotteryRecordsResp = {
    records: LotteryRecordDTO[]
}

