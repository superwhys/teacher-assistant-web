/**
 * Points 组接口类型定义（来自 swagger）
 */

export type Wallet = {
    available_points?: number
    id?: number
    student_id?: number
    total_points?: number
}

export type ApplyPointsReq = {
    class_id?: number
    rule_id?: number
    student_id?: number
}

export type ImportPointsRecordItem = {
    name?: string
    points?: number
}

export type ImportPointsRecordsReq = {
    class_id?: number
    records?: ImportPointsRecordItem[]
}

/**
 * 导出类型
 * - final: 最终积分
 * - records: 积分记录
 */
export type ExportType = 'final' | 'records'

/**
 * 导出排序方式（仅部分导出类型需要）
 */
export type ExportSort = 'points_desc' | 'points_asc' | 'name_desc' | 'name_asc'

export type ExportPointsRecordsPreviewReq = {
    class_id?: number
    export_type?: ExportType
    from?: string
    to?: string
    rule_ids?: number[]
    sort?: ExportSort
    student_group_id?: number
}

export type ExportPointsRecordsPreviewResp = {
    headers?: string[]
    key?: string
    values?: string[][]
}

export type ExportPointsRecordsReq = {
    key?: string
}

export type Record = {
    after_balance?: number
    amount?: number
    before_balance?: number
    class_id?: number
    created_at?: string | number
    from?: number
    id?: number
    rule_desc?: string
    rule_id?: number
    student_name?: string
    student_id?: number
    type?: number
    user_id?: number
}

export type PaginatedRecordResp = {
    items?: Record[]
    total?: number
}

export type ListApplyRecordsQuery = {
    class_id?: number
    student_id?: number
    rule_id?: number
    name?: string
    type?: number
    from?: string
    to?: string
    offset?: number
    limit?: number
}

export type CreateRuleItem = {
    rule_group_id?: number
    points?: number
    type?: number
    name?: string
    icon?: string
}

export type CreateRuleReq = {
    rules?: CreateRuleItem[]
}

export type UpdateRuleReq = {
    icon?: string
    name?: string
    points?: number
    rule_id?: number
    type?: number
}

export type Rule = {
    icon?: string
    id?: number
    name?: string
    points?: number
    points_type?: number
}

export type CreateRuleGroupItem = {
    name?: string
    icon?: string
}

export type CreateRuleGroupReq = {
    groups?: CreateRuleGroupItem[]
}

export type UpdateRuleGroupReq = {
    group_id?: number
    icon?: string
    name?: string
}

export type RuleGroup = {
    icon?: string
    id?: number
    name?: string
    rules?: Rule[]
}

export type ListRuleGroupsResp = {
    groups?: RuleGroup[]
}

/**
 * 排行榜时间范围
 */
export type RankingTimeRange = 'all' | 'weekly' | 'monthly'

export type StudentRankingItem = {
    student_id?: number
    score?: number
    rank?: number
}

export type GetClassRankingQuery = {
    class_id: number
    time_range?: RankingTimeRange
    limit?: number
}

export type GetClassRankingResp = {
    items?: StudentRankingItem[]
}

export type GetRuleRankingQuery = {
    class_id: number
    rule_id: number
    time_range?: RankingTimeRange
    limit?: number
}

export type GetRuleRankingResp = {
    items?: StudentRankingItem[]
}
