import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, type EffectScope } from 'vue'
import { useStudentGrowthReport } from '../useStudentGrowthReport'
import { growthReportFixture } from '@/utils/__tests__/growthReportFixture'
import { ApiRequestError, type ApiResponse } from '@/types/api'
import type { GrowthReport } from '@/types/studentGrowth'

const api = vi.hoisted(() => ({ getReport: vi.fn(), getSavedReport: vi.fn(), listReports: vi.fn(), saveReport: vi.fn(), interpret: vi.fn() }))
vi.mock('@/api/studentGrowth', () => ({ studentGrowthApi: api }))
const response = <T>(data: T): ApiResponse<T> => ({ code: 0, message: '', data })
const period = { from: '2026-11-02', to: '2026-11-08' }
let scope: EffectScope
function setup() {
    scope = effectScope()
    return scope.run(() => useStudentGrowthReport({ studentId: 11, semesterId: 70 }))!
}
function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>(finish => { resolve = finish })
    return { resolve, promise }
}

beforeEach(() => {
    vi.resetAllMocks()
    api.getReport.mockResolvedValue(response(growthReportFixture()))
    api.listReports.mockResolvedValue(response({ reports: [] }))
})
afterEach(() => scope?.stop())

describe('student report request lifecycle', () => {
    it('ignores a late prior-period response, error and loading completion', async () => {
        const first = deferred<ApiResponse<GrowthReport>>()
        api.getReport.mockReturnValueOnce(first.promise)
        const state = setup()
        const oldRequest = state.loadReport(period)
        const oldSignal = api.getReport.mock.calls[0]![2] as AbortSignal
        await state.loadReport({ from: '2026-10-01', to: '2026-10-31' })
        expect(oldSignal.aborted).toBe(true)
        first.resolve(response(growthReportFixture({ snapshot_hash: 'late-old' })))
        await oldRequest
        expect(state.report.value?.snapshot_hash).toBe('snapshot-1')
        expect(state.loading.value).toBe(false)
    })

    it('cancels and isolates requests when the dialog scope closes', async () => {
        const pending = deferred<ApiResponse<GrowthReport>>()
        api.getReport.mockReturnValueOnce(pending.promise)
        const state = setup()
        const loading = state.loadReport(period)
        scope.stop()
        expect((api.getReport.mock.calls[0]![2] as AbortSignal).aborted).toBe(true)
        pending.resolve(response(growthReportFixture()))
        await loading
        expect(state.report.value).toBeNull()
    })

    it('loads a saved snapshot and retries a failed selection without regenerating data', async () => {
        api.getSavedReport.mockRejectedValueOnce(new Error('网络断开'))
        api.getSavedReport.mockResolvedValueOnce(response(growthReportFixture({ id: 42, teacher_note: '原寄语' })))
        const state = setup()
        await state.loadReport(42)
        expect(state.error.value).toBe('网络断开')
        await state.retry()
        expect(state.report.value?.id).toBe(42)
        expect(state.report.value?.teacher_note).toBe('原寄语')
        expect(api.getReport).not.toHaveBeenCalled()
    })

    it('sends drafts and hash once, then reports saving independently from history refresh', async () => {
        const saving = deferred<ApiResponse<GrowthReport>>()
        api.saveReport.mockReturnValueOnce(saving.promise)
        api.listReports.mockRejectedValueOnce(new Error('历史暂不可用'))
        const state = setup()
        await state.loadReport(period)
        const firstSave = state.save('继续加油', '根据记录解读')
        expect(await state.save('重复', '')).toBe(false)
        saving.resolve(response(growthReportFixture({ id: 43, teacher_note: '继续加油' })))
        expect(await firstSave).toBe(true)
        expect(api.saveReport).toHaveBeenCalledExactlyOnceWith(11, {
            semester_id: 70, ...period, snapshot_hash: 'snapshot-1', teacher_note: '继续加油', interpretation: '根据记录解读',
        }, expect.any(AbortSignal))
        expect(state.report.value?.id).toBe(43)
        expect(state.actionError.value).toBe('')
        await vi.waitFor(() => expect(state.historyError.value).toBe('历史暂不可用'))
    })

    it('keeps the existing report and blocks stale-hash mutations until refreshed', async () => {
        api.saveReport.mockRejectedValueOnce(new ApiRequestError('报告数据已变化，请刷新报告后重试', 100409))
        const state = setup()
        await state.loadReport(period)
        expect(await state.save('未丢失的输入', '')).toBe(false)
        expect(state.dataChanged.value).toBe(true)
        expect(state.report.value?.snapshot_hash).toBe('snapshot-1')
        expect(await state.interpret()).toBeNull()
        expect(api.interpret).not.toHaveBeenCalled()
        await state.loadReport(period)
        expect(state.dataChanged.value).toBe(false)
    })

    it('does not apply AI output to a different report selected during generation', async () => {
        const ai = deferred<ApiResponse<{ interpretation: string }>>()
        api.interpret.mockReturnValueOnce(ai.promise)
        const state = setup()
        await state.loadReport(period)
        const generating = state.interpret()
        await state.loadReport(42)
        ai.resolve(response({ interpretation: '旧报告的解读' }))
        expect(await generating).toBeNull()
        expect(state.interpreting.value).toBe(false)
    })
})
