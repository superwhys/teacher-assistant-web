/**
 * Mall 组接口类型定义（来自 swagger）
 */

export type Prize = {
    description?: string
    icon?: string
    id?: number
    name?: string
    points?: number
    stock?: number
}

export type PrizeRecord = {
    count?: number
    description?: string
    id?: number
    points?: number
    prize_id?: number
    student_id?: number
    student_name?: string
}

export type CreatePrizeReq = {
    description?: string
    icon?: string
    name?: string
    points?: number
    stock?: number
}

export type UpdatePrizeReq = {
    description?: string
    icon?: string
    id?: number
    name?: string
    points?: number
    stock?: number
}

export type ExchangePrizeReq = {
    count?: number
    prize_id?: number
    student_id?: number
}

export type UndoExchangePrizeReq = {
    order_id?: number
}

export type PaginatedPrizeResp = {
    items?: Prize[]
    total?: number
}

export type PaginatedPrizeRecordResp = {
    items?: PrizeRecord[]
    total?: number
}

export type ListPrizeRecordsQuery = {
    class_id?: number
    limit?: number
    offset?: number
    student_id?: number
}
