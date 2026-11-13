import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, ssrContextKey, type App, type Component } from 'vue'
import { ApiRequestError } from '@/types/api'
import type { CollectionStatus, CollectionTaskDetail, CollectionTaskStudent, CollectionUpdate } from '@/types/collectionTask'
import CollectionTaskWorkspace from '@/v3/components/collections/CollectionTaskWorkspace.vue'
import CollectionTaskRoster from '@/v3/components/collections/CollectionTaskRoster.vue'

const api = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), detail: vi.fn(), update: vi.fn() }))
vi.mock('@/api/collectionTask', () => ({ collectionTaskApi: api }))
vi.mock('@/v3/components/collections/CollectionAwardButton.vue', () => ({ default: { render: () => null } }))

const task: CollectionTaskDetail = {
    id: 9, title: '口算本', created_at: '2026-11-13T00:00:00Z', version: 1,
    pending_count: 2, submitted_count: 1, exempt_count: 1,
    students: [
        { student_id: 1, student_name: '甲', status: 'pending', awarded: false },
        { student_id: 2, student_name: '乙', status: 'pending', awarded: false },
        { student_id: 3, student_name: '丙', status: 'submitted', awarded: true },
        { student_id: 4, student_name: '丁', status: 'exempt', awarded: false },
    ],
}
const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {}, createElement: () => ({}),
    createText: () => ({}), createComment: () => ({}), setText: () => {}, setElementText: () => {},
    parentNode: () => null, nextSibling: () => null,
})
let app: App | undefined

function mount<T>(component: Component, props: Record<string, unknown>): T {
    app = renderer.createApp({ ...component, render: () => null }, props)
    app.provide(ssrContextKey, { modules: new Set() })
    return (app.mount({}).$ as unknown as { setupState: T }).setupState
}

interface Workspace {
    detail: CollectionTaskDetail | null
    title: string
    createError: string
    updateError: string
    openTask(id: number): Promise<void>
    createTask(): Promise<void>
    updateStudents(updates: CollectionUpdate[]): Promise<void>
}
async function mountWorkspace(writable = true, classId = 3) {
    const state = mount<Workspace>(CollectionTaskWorkspace, { classId, semesterId: 6, writable })
    await vi.waitFor(() => expect(state.detail?.id).toBe(task.id))
    return state
}
interface Roster {
    bulk: boolean
    keepPending: number[]
    filter: string
    displayed: CollectionTaskStudent[]
    collectRemaining(): void
    changeStatus(student: CollectionTaskStudent, status: CollectionStatus): void
}

beforeEach(() => {
    vi.resetAllMocks()
    api.list.mockResolvedValue({ data: { tasks: [task] } })
    api.detail.mockResolvedValue({ data: task })
})
afterEach(() => { app?.unmount(); app = undefined })

describe('作业收交清单', () => {
    it('仅提交未勾选的待交学生，保留已交及免交状态', () => {
        const update = vi.fn()
        const roster = mount<Roster>(CollectionTaskRoster, { task, writable: true, busy: false, onUpdate: update })
        roster.bulk = true
        roster.keepPending = [2]
        expect(roster.displayed.map(student => student.student_id)).toEqual([1, 2])
        roster.collectRemaining()
        expect(update).toHaveBeenCalledExactlyOnceWith([{ student_id: 1, status: 'submitted' }])
        roster.keepPending = [1, 2]
        roster.collectRemaining()
        expect(update).toHaveBeenCalledTimes(1)
    })

    it('待交筛选列出缺交名单，补交只更改一个学生', () => {
        const update = vi.fn()
        const roster = mount<Roster>(CollectionTaskRoster, { task, writable: true, busy: false, onUpdate: update })
        roster.filter = 'pending'
        expect(roster.displayed.map(student => student.student_name)).toEqual(['甲', '乙'])
        roster.changeStatus(task.students[0]!, 'submitted')
        expect(update).toHaveBeenCalledExactlyOnceWith([{ student_id: 1, status: 'submitted' }])
        expect(roster.displayed[0]?.status).toBe('pending')
    })

    it('无效名称不会提交，未收到创建响应可使用同一标识重试', async () => {
        const state = await mountWorkspace()
        state.title = '  '
        await state.createTask()
        expect(api.create).not.toHaveBeenCalled()
        state.title = '  周五练习册  '
        api.create.mockRejectedValueOnce(new Error('超时')).mockResolvedValueOnce({ data: { ...task, id: 10 } })
        await state.createTask()
        expect(state.createError).toBe('超时')
        await state.createTask()
        expect(api.create).toHaveBeenCalledTimes(2)
        expect(api.create.mock.calls[0]).toEqual(api.create.mock.calls[1])
        expect(api.create.mock.calls[0]).toEqual([3, {
            semester_id: 6, title: '周五练习册', client_request_id: expect.stringMatching(/^[a-f\d-]{36}$/i),
        }])
        expect(state.detail?.id).toBe(10)
    })

    it('归档或只读学期可打开详情，不能新建或登记', async () => {
        const state = await mountWorkspace(false)
        expect(api.detail).toHaveBeenCalledWith(3, 9, 6)
        state.title = '另一份作业'
        await state.createTask()
        await state.updateStudents([{ student_id: 1, status: 'exempt' }])
        expect(api.create).not.toHaveBeenCalled()
        expect(api.update).not.toHaveBeenCalled()
    })

    it('并发登记发生冲突后刷新当前版本，不重放旧操作', async () => {
        const state = await mountWorkspace()
        api.update.mockRejectedValue(new ApiRequestError('记录已更改', 100409))
        api.detail.mockResolvedValue({ data: { ...task, version: 2 } })
        const updates: CollectionUpdate[] = [{ student_id: 2, status: 'exempt' }]
        await state.updateStudents(updates)
        expect(api.update).toHaveBeenCalledExactlyOnceWith(3, 9, { semester_id: 6, version: 1, updates })
        expect(state.detail?.version).toBe(2)
        expect(state.updateError).toContain('核对')
    })

    it('快速切换作业时，迟到的详情响应不会覆盖当前清单', async () => {
        const state = await mountWorkspace()
        let finish!: (response: unknown) => void
        api.detail.mockReturnValueOnce(new Promise(done => { finish = done }))
        const old = state.openTask(11)
        api.detail.mockResolvedValueOnce({ data: { ...task, id: 12 } })
        await state.openTask(12)
        finish({ data: { ...task, id: 11 } })
        await old
        expect(state.detail?.id).toBe(12)
    })

    it('切换班级后忽略旧清单的提交响应', async () => {
        const prior = await mountWorkspace()
        let finish!: (response: unknown) => void
        api.update.mockReturnValueOnce(new Promise(done => { finish = done }))
        const old = prior.updateStudents([{ student_id: 1, status: 'submitted' }])
        app!.unmount()
        const current = await mountWorkspace(true, 4)
        finish({ data: { ...task, version: 88 } })
        await old
        await nextTick()
        expect(prior.detail?.version).toBe(1)
        expect(current.detail?.version).toBe(1)
    })
})
