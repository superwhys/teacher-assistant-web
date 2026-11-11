import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, shallowRef, type EffectScope } from 'vue'
import { useGrowthInterpretationTask } from '../useGrowthInterpretationTask'
import { growthReportFixture } from '@/utils/__tests__/growthReportFixture'
import { ApiRequestError, type ApiResponse } from '@/types/api'
import type { GrowthInterpretationTask, GrowthReport } from '@/types/studentGrowth'

const api = vi.hoisted(() => ({ findInterpretationTask: vi.fn(), createInterpretationTask: vi.fn(), getInterpretationTask: vi.fn() }))
vi.mock('@/api/studentGrowth', () => ({ studentGrowthApi: api }))
const response = <T>(data: T): ApiResponse<T> => ({ code: 0, message: '', data })
const task = (status: GrowthInterpretationTask['status'], extra: Partial<GrowthInterpretationTask> = {}): GrowthInterpretationTask => ({
    id: 'task-1', snapshot_hash: 'snapshot-1', status, interpretation: status === 'succeeded' ? '任务生成的解读' : '',
    error: '', error_code: 0, created_at: '2026-11-11T10:00:00+08:00', updated_at: '2026-11-11T10:00:00+08:00', ...extra,
})
const deferred = <T>() => {
    let resolve!: (value: T) => void
    let reject!: (cause: unknown) => void
    const promise = new Promise<T>((finish, fail) => { resolve = finish; reject = fail })
    return { promise, resolve, reject }
}
let scopes: EffectScope[]
let storage: Map<string, string>
async function settle() {
    for (let index = 0; index < 10; index++) await Promise.resolve()
}
function setup(initialReport: GrowthReport | null = growthReportFixture()) {
    const report = shallowRef(initialReport)
    const canRead = shallowRef(true)
    const canGenerate = shallowRef(true)
    const scope = effectScope()
    scopes.push(scope)
    const state = scope.run(() => useGrowthInterpretationTask(() => report.value, {
        userId: 'teacher', canRead: () => canRead.value, canGenerate: () => canGenerate.value,
    }))!
    return { state, report, canRead, canGenerate, scope }
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    scopes = []
    storage = new Map()
    vi.stubGlobal('window', { sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
    } })
    api.findInterpretationTask.mockResolvedValue(response({ task: null, data_changed: false }))
    api.createInterpretationTask.mockResolvedValue(response(task('queued')))
})
afterEach(() => {
    for (const scope of scopes) scope.stop()
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('background growth interpretation tasks', () => {
    it('restores an existing task with a pure lookup, polls serially and stops at completion', async () => {
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: task('queued'), data_changed: false }))
        const pendingPoll = deferred<ApiResponse<GrowthInterpretationTask>>()
        api.getInterpretationTask.mockReturnValueOnce(pendingPoll.promise)
        api.getInterpretationTask.mockResolvedValueOnce(response(task('succeeded')))
        const { state } = setup()
        await settle()
        expect(api.findInterpretationTask).toHaveBeenCalledExactlyOnceWith(11, {
            semester_id: 70, from: '2026-11-02', to: '2026-11-08', snapshot_hash: 'snapshot-1',
        }, expect.any(AbortSignal))
        expect(api.createInterpretationTask).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(2000)
        expect(api.getInterpretationTask).toHaveBeenCalledOnce()
        await vi.advanceTimersByTimeAsync(10000)
        expect(api.getInterpretationTask).toHaveBeenCalledOnce()
        pendingPoll.resolve(response(task('running')))
        await settle()
        await vi.advanceTimersByTimeAsync(1999)
        expect(api.getInterpretationTask).toHaveBeenCalledOnce()
        await vi.advanceTimersByTimeAsync(1)
        expect(state.completedTask.value?.interpretation).toBe('任务生成的解读')
        await vi.advanceTimersByTimeAsync(20000)
        expect(api.getInterpretationTask).toHaveBeenCalledTimes(2)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('recovers a completed interpretation without creating a task', async () => {
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: task('succeeded'), data_changed: false }))
        const { state } = setup()
        await settle()
        expect(state.completedTask.value?.id).toBe('task-1')
        expect(api.createInterpretationTask).not.toHaveBeenCalled()
        expect(api.getInterpretationTask).not.toHaveBeenCalled()
    })

    it('allows a fresh task when only an older hash has an interpretation', async () => {
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: null, data_changed: true }))
        const { state } = setup()
        await settle()
        expect(state.otherData.value).toBe(true)
        expect(state.reportStale.value).toBe(false)
        await state.generate()
        expect(api.createInterpretationTask).toHaveBeenCalledOnce()
        expect(state.task.value?.status).toBe('queued')
    })

    it('retries lookup failures independently without discarding report statistics', async () => {
        api.findInterpretationTask.mockRejectedValueOnce(new Error('网络断开'))
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: task('succeeded'), data_changed: false }))
        const { state, report } = setup()
        await settle()
        expect(state.error.value).toBe('网络断开')
        expect(report.value?.summary.records).toBe(3)
        expect(state.canRetryQuery.value).toBe(true)
        await state.generate()
        expect(api.createInterpretationTask).not.toHaveBeenCalled()
        await state.retryQuery()
        expect(state.error.value).toBe('')
        expect(state.completedTask.value).not.toBeNull()
    })

    it('reuses the UUID after an uncertain POST, including after closing and reopening', async () => {
        api.createInterpretationTask.mockRejectedValueOnce(new TypeError('网络断开'))
        const first = setup()
        await settle()
        await first.state.generate()
        const requestId = api.createInterpretationTask.mock.calls[0]![1].client_request_id
        expect(first.state.submissionUncertain.value).toBe(true)
        expect(storage.size).toBe(1)
        first.scope.stop()
        const second = setup()
        await settle()
        expect(second.state.submissionUncertain.value).toBe(true)
        await second.state.generate()
        expect(api.createInterpretationTask.mock.calls[1]![1].client_request_id).toBe(requestId)
        expect(storage.size).toBe(0)
    })

    it('creates a new UUID for an explicit retry after a failed task', async () => {
        api.createInterpretationTask.mockResolvedValueOnce(response(task('failed', { error: '模型暂不可用' })))
        api.createInterpretationTask.mockResolvedValueOnce(response(task('queued', { id: 'task-2' })))
        const { state } = setup()
        await settle()
        await state.generate()
        const firstId = api.createInterpretationTask.mock.calls[0]![1].client_request_id
        expect(state.task.value?.error).toBe('模型暂不可用')
        await state.generate()
        expect(api.createInterpretationTask.mock.calls[1]![1].client_request_id).not.toBe(firstId)
        expect(state.task.value?.id).toBe('task-2')
    })

    it('cancels only the local lookup on close and ignores a late successful response', async () => {
        const lookup = deferred<ApiResponse<{ task: GrowthInterpretationTask | null; data_changed: boolean }>>()
        api.findInterpretationTask.mockReturnValueOnce(lookup.promise)
        const { state, scope } = setup()
        const signal = api.findInterpretationTask.mock.calls[0]![2] as AbortSignal
        scope.stop()
        expect(signal.aborted).toBe(true)
        lookup.resolve(response({ task: task('succeeded'), data_changed: false }))
        await settle()
        expect(state.task.value).toBeNull()
        expect(vi.getTimerCount()).toBe(0)
        expect(api.createInterpretationTask).not.toHaveBeenCalled()
    })

    it('leaves a submitted background task running after close and finds it when reopened', async () => {
        const submission = deferred<ApiResponse<GrowthInterpretationTask>>()
        api.createInterpretationTask.mockReturnValueOnce(submission.promise)
        const first = setup()
        await settle()
        const pendingSubmission = first.state.generate()
        const signal = api.createInterpretationTask.mock.calls[0]![2] as AbortSignal
        first.scope.stop()
        expect(signal.aborted).toBe(true)
        submission.resolve(response(task('queued')))
        await pendingSubmission
        expect(first.state.task.value).toBeNull()
        expect(storage.size).toBe(1)
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: task('running'), data_changed: false }))
        const second = setup()
        await settle()
        expect(second.state.task.value?.status).toBe('running')
        expect(api.createInterpretationTask).toHaveBeenCalledOnce()
        expect(storage.size).toBe(0)
    })

    it('stops at a poll transport failure and resumes that same task only after retrying its query', async () => {
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: task('running'), data_changed: false }))
        api.getInterpretationTask.mockRejectedValueOnce(new TypeError('网络中断'))
        api.getInterpretationTask.mockResolvedValueOnce(response(task('succeeded')))
        const { state } = setup()
        await settle()
        await vi.advanceTimersByTimeAsync(2000)
        expect(state.error.value).toBe('网络中断')
        await vi.advanceTimersByTimeAsync(10000)
        expect(api.getInterpretationTask).toHaveBeenCalledOnce()
        await state.retryQuery()
        expect(api.getInterpretationTask).toHaveBeenLastCalledWith(11, 'task-1', expect.any(AbortSignal))
        expect(state.completedTask.value).not.toBeNull()
        expect(api.createInterpretationTask).not.toHaveBeenCalled()
    })

    it('isolates old poll results and timers when the selected report hash changes', async () => {
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: task('running'), data_changed: false }))
        const poll = deferred<ApiResponse<GrowthInterpretationTask>>()
        api.getInterpretationTask.mockReturnValueOnce(poll.promise)
        const { state, report } = setup()
        await settle()
        await vi.advanceTimersByTimeAsync(2000)
        const signal = api.getInterpretationTask.mock.calls[0]![2] as AbortSignal
        report.value = growthReportFixture({ snapshot_hash: 'new-snapshot' })
        await settle()
        expect(signal.aborted).toBe(true)
        poll.resolve(response(task('succeeded')))
        await settle()
        expect(state.completedTask.value).toBeNull()
        expect(state.reportStale.value).toBe(false)
        expect(api.findInterpretationTask.mock.calls[1]![1].snapshot_hash).toBe('new-snapshot')
        expect(vi.getTimerCount()).toBe(0)
    })

    it('stops polling at a 409 and requires fresh report statistics before another generation', async () => {
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: task('running'), data_changed: false }))
        api.getInterpretationTask.mockRejectedValueOnce(new ApiRequestError('报告数据已变化，请刷新报告后重试', 100409))
        const { state, report } = setup()
        await settle()
        await vi.advanceTimersByTimeAsync(2000)
        expect(state.reportStale.value).toBe(true)
        expect(state.pending.value).toBe(false)
        expect(state.completedTask.value).toBeNull()
        expect(state.task.value?.id).toBe('task-1')
        await state.generate()
        await vi.advanceTimersByTimeAsync(20000)
        expect(api.createInterpretationTask).not.toHaveBeenCalled()
        expect(api.getInterpretationTask).toHaveBeenCalledOnce()
        api.findInterpretationTask.mockResolvedValueOnce(response({
            task: task('queued', { id: 'task-2', snapshot_hash: 'fresh-snapshot' }), data_changed: false,
        }))
        report.value = growthReportFixture({ snapshot_hash: 'fresh-snapshot' })
        await settle()
        expect(state.reportStale.value).toBe(false)
        expect(state.pending.value).toBe(true)
        expect(state.task.value?.id).toBe('task-2')
        expect(vi.getTimerCount()).toBe(1)
    })

    it('restores tasks for saved reports with a pure lookup and does not submit automatically', async () => {
        const { state } = setup(growthReportFixture({ id: 42, interpretation: '已保存的解读' }))
        await settle()
        expect(api.findInterpretationTask).toHaveBeenCalledOnce()
        expect(api.createInterpretationTask).not.toHaveBeenCalled()
        await state.generate()
        expect(api.createInterpretationTask).toHaveBeenCalledOnce()
    })

    it('stops reading after an edition change and checks generation access at submission', async () => {
        api.findInterpretationTask.mockResolvedValueOnce(response({ task: task('running'), data_changed: false }))
        const { state, canRead, canGenerate } = setup()
        await settle()
        canRead.value = false
        await vi.advanceTimersByTimeAsync(2000)
        expect(api.getInterpretationTask).not.toHaveBeenCalled()
        canRead.value = true
        canGenerate.value = false
        await settle()
        await state.generate()
        expect(api.createInterpretationTask).not.toHaveBeenCalled()
    })
})
