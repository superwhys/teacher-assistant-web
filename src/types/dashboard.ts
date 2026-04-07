/**
 * 仪表盘摘要指标结构
 */
export type DashboardSummaryMetric = {
    value?: string | number
}

/**
 * 仪表盘统计查询参数
 */
export type DashboardStatisticsQuery = {
    class_id: number
}

/**
 * 仪表盘统计响应结构
 */
export type DashboardStatisticsResp = {
    current_term_name?: string
    operation_status_text?: string
    summary?: {
        students?: DashboardSummaryMetric
        groups?: DashboardSummaryMetric
        records?: DashboardSummaryMetric
        shop?: DashboardSummaryMetric
    }
}
