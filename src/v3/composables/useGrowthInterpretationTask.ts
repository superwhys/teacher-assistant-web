import { computed, onScopeDispose, shallowReadonly, shallowRef, watch } from 'vue'
import { studentGrowthApi } from '@/api/studentGrowth'
import { ApiRequestError } from '@/types/api'
import type { GrowthInterpretationTask, GrowthReport } from '@/types/studentGrowth'

interface InterpretationTaskOptions {
    userId: string
    canRead: () => boolean
    canGenerate: () => boolean
}

/** 查询生命周期只属于当前弹窗；任务生命周期由服务端 worker 持有。 */
export function useGrowthInterpretationTask(getReport: () => GrowthReport | null, options: InterpretationTaskOptions) {
    const task = shallowRef<GrowthInterpretationTask | null>(null)
    const querying = shallowRef(false)
    const submitting = shallowRef(false)
    const error = shallowRef('')
    const otherData = shallowRef(false)
    const reportStale = shallowRef(false)
    const submissionUncertain = shallowRef(false)
    const lastOperation = shallowRef<'lookup' | 'poll' | 'submit'>('lookup')
    const pending = computed(() => !reportStale.value && (task.value?.status === 'queued' || task.value?.status === 'running'))
    const completedTask = computed(() => !reportStale.value && task.value?.status === 'succeeded' ? task.value : null)
    const canRetryQuery = computed(() => !!error.value && lastOperation.value !== 'submit' && !reportStale.value)
    const scopeKey = computed(() => {
        const report = getReport()
        return report && options.canRead() ? JSON.stringify([
            options.userId, report.student_id, report.semester_id, report.from, report.to, report.snapshot_hash,
        ]) : ''
    })
    let active = true
    let revision = 0
    let request: AbortController | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let clientRequestId = ''

    function storedRequestId(key: string): string {
        try {
            return window.sessionStorage.getItem(`growth-interpretation:request:${key}`) ?? ''
        } catch {
            return ''
        }
    }

    function storeRequestId(key: string, value: string): void {
        try {
            const storageKey = `growth-interpretation:request:${key}`
            if (value) window.sessionStorage.setItem(storageKey, value)
            else window.sessionStorage.removeItem(storageKey)
        } catch {
            // 禁用浏览器存储时，同一打开弹窗内仍复用内存中的请求 ID。
        }
    }

    function clearTimer(): void {
        clearTimeout(timer)
        timer = undefined
    }

    function current(requestRevision: number, key: string, controller: AbortController): boolean {
        return active && requestRevision === revision && key === scopeKey.value && !controller.signal.aborted
    }

    function clearSubmission(key: string): void {
        clientRequestId = ''
        submissionUncertain.value = false
        storeRequestId(key, '')
    }

    function handleError(cause: unknown): void {
        error.value = cause instanceof Error ? cause.message : '解读任务查询失败，请重试'
        if (cause instanceof ApiRequestError && cause.code === 100409) reportStale.value = true
    }

    function acceptTask(value: GrowthInterpretationTask, hash: string, key: string): void {
        if (value.snapshot_hash !== hash) throw new Error('解读与当前报告数据不匹配，请重新查询')
        task.value = value
        otherData.value = false
        clearSubmission(key)
        if (value.status === 'failed' && value.error_code === 100409) reportStale.value = true
    }

    function schedulePoll(): void {
        clearTimer()
        if (!active || !pending.value || reportStale.value) return
        timer = setTimeout(() => {
            timer = undefined
            void read('poll')
        }, 2000)
    }

    async function read(operation: 'lookup' | 'poll'): Promise<void> {
        const report = getReport()
        if (!report || !scopeKey.value || request || reportStale.value) return
        if (operation === 'poll' && !task.value) return
        clearTimer()
        const key = scopeKey.value
        const requestRevision = revision
        const controller = new AbortController()
        request = controller
        querying.value = true
        error.value = ''
        lastOperation.value = operation
        let succeeded = false
        try {
            if (operation === 'lookup') {
                const response = await studentGrowthApi.findInterpretationTask(report.student_id, {
                    semester_id: report.semester_id, from: report.from, to: report.to,
                    snapshot_hash: report.snapshot_hash,
                }, controller.signal)
                if (!current(requestRevision, key, controller)) return
                if (!response.data) throw new Error('解读任务查询结果不可用，请重试')
                if (response.data.task) acceptTask(response.data.task, report.snapshot_hash, key)
                else {
                    task.value = null
                    otherData.value = response.data.data_changed
                }
            } else {
                const response = await studentGrowthApi.getInterpretationTask(report.student_id, task.value!.id, controller.signal)
                if (!current(requestRevision, key, controller)) return
                if (!response.data) throw new Error('解读任务查询结果不可用，请重试')
                acceptTask(response.data, report.snapshot_hash, key)
            }
            succeeded = true
        } catch (cause) {
            if (current(requestRevision, key, controller)) handleError(cause)
        } finally {
            if (current(requestRevision, key, controller)) {
                request = null
                querying.value = false
                if (succeeded) schedulePoll()
            }
        }
    }

    async function generate(): Promise<void> {
        const report = getReport()
        if (!report || !scopeKey.value || request || pending.value || reportStale.value || canRetryQuery.value || !options.canGenerate()) return
        clearTimer()
        const key = scopeKey.value
        const requestRevision = revision
        const controller = new AbortController()
        request = controller
        submitting.value = true
        submissionUncertain.value = false
        lastOperation.value = 'submit'
        error.value = ''
        otherData.value = false
        task.value = null
        let succeeded = false
        try {
            if (!clientRequestId) clientRequestId = crypto.randomUUID()
            storeRequestId(key, clientRequestId)
            const response = await studentGrowthApi.createInterpretationTask(report.student_id, {
                semester_id: report.semester_id, from: report.from, to: report.to,
                snapshot_hash: report.snapshot_hash, client_request_id: clientRequestId,
            }, controller.signal)
            if (!current(requestRevision, key, controller)) return
            if (!response.data) throw new Error('提交结果尚未确认，请重试提交')
            acceptTask(response.data, report.snapshot_hash, key)
            succeeded = true
        } catch (cause) {
            if (current(requestRevision, key, controller)) {
                handleError(cause)
                if (cause instanceof ApiRequestError && cause.code !== undefined) clearSubmission(key)
                else submissionUncertain.value = !!clientRequestId
            }
        } finally {
            if (current(requestRevision, key, controller)) {
                request = null
                submitting.value = false
                if (succeeded) schedulePoll()
            }
        }
    }

    watch(scopeKey, key => {
        revision += 1
        clearTimer()
        request?.abort()
        request = null
        task.value = null
        querying.value = false
        submitting.value = false
        error.value = ''
        otherData.value = false
        reportStale.value = false
        clientRequestId = key ? storedRequestId(key) : ''
        submissionUncertain.value = !!clientRequestId
        // 恢复任务仅发起查询，不写回实时报告或已保存快照。
        if (key) void read('lookup')
    }, { immediate: true, flush: 'sync' })

    onScopeDispose(() => {
        active = false
        revision += 1
        clearTimer()
        request?.abort()
        request = null
    })

    return {
        task: shallowReadonly(task), querying: shallowReadonly(querying), submitting: shallowReadonly(submitting),
        error: shallowReadonly(error), otherData: shallowReadonly(otherData), reportStale: shallowReadonly(reportStale),
        submissionUncertain: shallowReadonly(submissionUncertain), pending, completedTask, canRetryQuery, generate,
        retryQuery: () => read(task.value && pending.value ? 'poll' : 'lookup'),
    }
}
