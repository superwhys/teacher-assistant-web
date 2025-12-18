import { get, post, put, del } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type {
    ApplyPointsReq,
    CreateRuleGroupReq,
    CreateRuleReq,
    ListApplyRecordsQuery,
    ListRuleGroupsResp,
    PaginatedRecordResp,
    UpdateRuleGroupReq,
    UpdateRuleReq,
    Wallet,
} from '@/types/points'

export const pointsApi = {
    applyRule(data: ApplyPointsReq): Promise<ApiResponse<Wallet>> {
        return post<Wallet>('/points/rule/apply', data)
    },
    undoApply(applyId: number): Promise<ApiResponse<Wallet>> {
        return post<Wallet>(`/points/rule/apply/undo/${applyId}`)
    },
    listApplyRecords(query?: ListApplyRecordsQuery): Promise<ApiResponse<PaginatedRecordResp>> {
        return get<PaginatedRecordResp>('/points/rule/apply/list', query)
    },

    createRule(data: CreateRuleReq): Promise<ApiResponse<null>> {
        return post<null>('/points/rule/create', data)
    },
    updateRule(ruleId: number, data: UpdateRuleReq): Promise<ApiResponse<null>> {
        return put<null>(`/points/rule/${ruleId}`, data)
    },
    deleteRule(ruleId: number): Promise<ApiResponse<null>> {
        return del<null>(`/points/rule/${ruleId}`)
    },

    createGroup(data: CreateRuleGroupReq): Promise<ApiResponse<null>> {
        return post<null>('/points/rule/group/create', data)
    },
    updateGroup(groupId: number, data: UpdateRuleGroupReq): Promise<ApiResponse<null>> {
        return put<null>(`/points/rule/group/${groupId}`, data)
    },
    deleteGroup(groupId: number): Promise<ApiResponse<null>> {
        return del<null>(`/points/rule/group/${groupId}`)
    },
    listGroups(): Promise<ApiResponse<ListRuleGroupsResp>> {
        return get<ListRuleGroupsResp>('/points/rule/group/list')
    },
}
