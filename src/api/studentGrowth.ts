import { get, post } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type {
    GrowthInterpretationQuery, GrowthInterpretationTask, GrowthReport,
    GrowthReportHistoryItem, GrowthReportQuery, SaveGrowthReportRequest,
} from '@/types/studentGrowth'

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
    createInterpretationTask(studentId: number, data: GrowthInterpretationQuery & { client_request_id: string }, signal?: AbortSignal): Promise<ApiResponse<GrowthInterpretationTask>> {
        return post<GrowthInterpretationTask>(`/student/${studentId}/growth-report/interpretation`, data, { signal })
    },
    getInterpretationTask(studentId: number, taskId: string, signal?: AbortSignal): Promise<ApiResponse<GrowthInterpretationTask>> {
        return get<GrowthInterpretationTask>(`/student/${studentId}/growth-report/interpretation/${encodeURIComponent(taskId)}`, undefined, { signal })
    },
    findInterpretationTask(studentId: number, query: GrowthInterpretationQuery, signal?: AbortSignal): Promise<ApiResponse<{ task: GrowthInterpretationTask | null; data_changed: boolean }>> {
        return get<{ task: GrowthInterpretationTask | null; data_changed: boolean }>(`/student/${studentId}/growth-report/interpretation`, query, { signal })
    },
}
