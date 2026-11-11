import { get, post } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type { GrowthReport, GrowthReportHistoryItem, GrowthReportQuery, SaveGrowthReportRequest } from '@/types/studentGrowth'

export const studentGrowthApi = {
    getReport(studentId: number, query: GrowthReportQuery, signal?: AbortSignal): Promise<ApiResponse<GrowthReport>> {
        return get<GrowthReport>(`/student/${studentId}/growth-report`, query, { signal })
    },
    saveReport(studentId: number, data: SaveGrowthReportRequest, signal?: AbortSignal): Promise<ApiResponse<GrowthReport>> {
        return post<GrowthReport>(`/student/${studentId}/growth-reports`, data, { signal })
    },
    listReports(studentId: number, semesterId: number, signal?: AbortSignal): Promise<ApiResponse<{ reports: GrowthReportHistoryItem[] }>> {
        return get<{ reports: GrowthReportHistoryItem[] }>(`/student/${studentId}/growth-reports`, { semester_id: semesterId }, { signal })
    },
    getSavedReport(studentId: number, reportId: number, signal?: AbortSignal): Promise<ApiResponse<GrowthReport>> {
        return get<GrowthReport>(`/student/${studentId}/growth-reports/${reportId}`, undefined, { signal })
    },
    interpret(studentId: number, data: GrowthReportQuery & { snapshot_hash: string }, signal?: AbortSignal): Promise<ApiResponse<{ interpretation: string }>> {
        const timeout = AbortSignal.timeout(60000)
        return post<{ interpretation: string }>(`/student/${studentId}/growth-report/interpretation`, data, {
            signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        })
    },
}
