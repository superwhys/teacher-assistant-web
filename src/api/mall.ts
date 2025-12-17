import { get, post, put, del } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type {
    CreatePrizeReq,
    ExchangePrizeReq,
    ListPrizeRecordsQuery,
    PaginatedPrizeRecordResp,
    PaginatedPrizeResp,
    UndoExchangePrizeReq,
    UpdatePrizeReq,
} from '@/types/mall'

export const mallApi = {
    createPrize(data: CreatePrizeReq): Promise<ApiResponse<null>> {
        return post<null>('/mall/prizes/create', data)
    },
    deletePrize(prizeId: number): Promise<ApiResponse<null>> {
        return del<null>(`/mall/prizes/delete/${prizeId}`)
    },
    updatePrize(prizeId: number, data: UpdatePrizeReq): Promise<ApiResponse<null>> {
        return put<null>(`/mall/prizes/update/${prizeId}`, data)
    },
    listPrizes(): Promise<ApiResponse<PaginatedPrizeResp>> {
        return get<PaginatedPrizeResp>('/mall/prizes/list')
    },
    listPrizeRecords(query?: ListPrizeRecordsQuery): Promise<ApiResponse<PaginatedPrizeRecordResp>> {
        return get<PaginatedPrizeRecordResp>('/mall/prizes/records', query)
    },
    exchangePrize(data: ExchangePrizeReq): Promise<ApiResponse<null>> {
        return post<null>('/mall/prizes/exchange', data)
    },
    undoExchangePrize(data: UndoExchangePrizeReq): Promise<ApiResponse<null>> {
        return post<null>('/mall/prizes/undo-exchange', data)
    },
}
