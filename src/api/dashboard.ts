import { get } from "@/api/api"
import type { ApiResponse } from "@/types/api"
import type { DashboardStatisticsQuery, DashboardStatisticsResp } from "@/types/dashboard"

/**
 * 仪表盘相关接口
 */
export const dashboardApi = {
    /**
     * 获取仪表盘统计数据
     */
    getStatistics(query: DashboardStatisticsQuery): Promise<ApiResponse<DashboardStatisticsResp>> {
        return get<DashboardStatisticsResp>("/dashboard/statistics", query)
    }
}
