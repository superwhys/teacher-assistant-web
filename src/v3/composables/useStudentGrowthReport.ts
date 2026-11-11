import { onScopeDispose, shallowReadonly, shallowRef } from 'vue'
import { studentGrowthApi } from '@/api/studentGrowth'
import { ApiRequestError } from '@/types/api'
import type { GrowthReport, GrowthReportHistoryItem } from '@/types/studentGrowth'
import type { GrowthPeriod } from '@/utils/studentGrowth'

export interface GrowthReportTarget {
    studentId: number
    semesterId: number
}

/** 每个弹窗持有独立的报告请求，切换报告或关闭时取消并隔离晚到结果。 */
export function useStudentGrowthReport(target: GrowthReportTarget) {
    const report = shallowRef<GrowthReport | null>(null)
    const history = shallowRef<GrowthReportHistoryItem[]>([])
    const loading = shallowRef(false)
    const saving = shallowRef(false)
    const historyLoading = shallowRef(false)
    const error = shallowRef('')
    const historyError = shallowRef('')
    const actionError = shallowRef('')
    const dataChanged = shallowRef(false)
    let active = true
    let revision = 0
    let historyRevision = 0
    let lastSelection: GrowthPeriod | number | null = null
    let historyRequest: AbortController | undefined
    const controllers = new Set<AbortController>()

    function controller(): AbortController {
        const request = new AbortController()
        controllers.add(request)
        return request
    }

    function message(cause: unknown): string {
        return cause instanceof Error ? cause.message : '请求失败，请重试'
    }

    function handleActionError(cause: unknown): void {
        actionError.value = message(cause)
        if (cause instanceof ApiRequestError && cause.code === 100409) dataChanged.value = true
    }

    async function loadHistory(): Promise<void> {
        historyRequest?.abort()
        const requestId = ++historyRevision
        const request = controller()
        historyRequest = request
        historyLoading.value = true
        historyError.value = ''
        try {
            const response = await studentGrowthApi.listReports(target.studentId, target.semesterId, request.signal)
            if (active && requestId === historyRevision) history.value = response.data?.reports ?? []
        } catch (cause) {
            if (active && requestId === historyRevision && !request.signal.aborted) historyError.value = message(cause)
        } finally {
            controllers.delete(request)
            if (historyRequest === request) historyRequest = undefined
            if (active && requestId === historyRevision) historyLoading.value = false
        }
    }

    async function select(selection: GrowthPeriod | number): Promise<void> {
        const requestId = ++revision
        for (const pending of controllers) {
            if (pending !== historyRequest) {
                pending.abort()
                controllers.delete(pending)
            }
        }
        const request = controller()
        lastSelection = selection
        report.value = null
        loading.value = true
        saving.value = false
        error.value = ''
        actionError.value = ''
        dataChanged.value = false
        try {
            const response = typeof selection === 'number'
                ? await studentGrowthApi.getSavedReport(target.studentId, selection, request.signal)
                : await studentGrowthApi.getReport(target.studentId, { ...selection, semester_id: target.semesterId }, request.signal)
            if (active && requestId === revision) {
                if (!response.data) throw new Error('报告暂时不可用，请重试')
                report.value = response.data
            }
        } catch (cause) {
            if (active && requestId === revision && !request.signal.aborted) error.value = message(cause)
        } finally {
            controllers.delete(request)
            if (active && requestId === revision) loading.value = false
        }
    }

    async function save(teacherNote: string, interpretation: string): Promise<boolean> {
        const snapshot = report.value
        if (!snapshot || saving.value || dataChanged.value) return false
        const requestId = revision
        const request = controller()
        saving.value = true
        actionError.value = ''
        try {
            const response = await studentGrowthApi.saveReport(target.studentId, {
                semester_id: target.semesterId, from: snapshot.from, to: snapshot.to,
                snapshot_hash: snapshot.snapshot_hash, teacher_note: teacherNote, interpretation,
            }, request.signal)
            if (!active || requestId !== revision || request.signal.aborted) return false
            if (!response.data) throw new Error('保存结果未确认，请重试')
            report.value = response.data
            void loadHistory()
            return true
        } catch (cause) {
            if (active && requestId === revision && !request.signal.aborted) handleActionError(cause)
            return false
        } finally {
            controllers.delete(request)
            if (active && requestId === revision) saving.value = false
        }
    }

    onScopeDispose(() => {
        active = false
        revision += 1
        historyRevision += 1
        for (const pending of controllers) pending.abort()
        controllers.clear()
    })

    return {
        report: shallowReadonly(report), history: shallowReadonly(history), loading: shallowReadonly(loading),
        saving: shallowReadonly(saving), historyLoading: shallowReadonly(historyLoading),
        error: shallowReadonly(error), historyError: shallowReadonly(historyError), actionError: shallowReadonly(actionError),
        dataChanged: shallowReadonly(dataChanged), loadReport: select, loadHistory, save,
        retry: () => lastSelection !== null ? select(lastSelection) : Promise.resolve(),
    }
}
