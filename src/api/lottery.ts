import { get, post, put } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type {
    AddPrizeToLotteryPoolReq,
    ClearLotteryPoolReq,
    CreateLotteryPoolReq,
    ListLotteryPoolsResp,
    LotteryPoolDTO,
    RemovePrizeFromLotteryPoolReq,
    UpdateLotteryPoolReq,
    UpdatePrizeInLotteryPoolReq,
} from '@/types/lotteryApi'

export const lotteryApi = {
    listPools(): Promise<ApiResponse<ListLotteryPoolsResp>> {
        return get<ListLotteryPoolsResp>('/lottery/pools/list')
    },
    getPool(poolId: number): Promise<ApiResponse<LotteryPoolDTO>> {
        return get<LotteryPoolDTO>(`/lottery/pools/${poolId}`)
    },
    createPool(data: CreateLotteryPoolReq): Promise<ApiResponse<LotteryPoolDTO>> {
        return post<LotteryPoolDTO>('/lottery/pools/create', data)
    },
    updatePool(data: UpdateLotteryPoolReq): Promise<ApiResponse<null>> {
        return put<null>('/lottery/pools/update', data)
    },
    clearPool(data: ClearLotteryPoolReq): Promise<ApiResponse<null>> {
        return post<null>('/lottery/pools/clear', data)
    },
    addPrizeToPool(data: AddPrizeToLotteryPoolReq): Promise<ApiResponse<null>> {
        return post<null>('/lottery/pools/add-prize', data)
    },
    updatePrizeInPool(data: UpdatePrizeInLotteryPoolReq): Promise<ApiResponse<null>> {
        return put<null>('/lottery/pools/prizes/update', data)
    },
    removePrizeFromPool(data: RemovePrizeFromLotteryPoolReq): Promise<ApiResponse<null>> {
        return post<null>('/lottery/pools/remove-prize', data)
    },
}


