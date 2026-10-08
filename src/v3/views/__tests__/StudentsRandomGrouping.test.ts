import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, reactive, ssrContextKey, type App } from 'vue'
import StudentsView from '../StudentsView.vue'
import { ApiRequestError } from '@/types/api'
import type { ApplyRandomGroupsReq, StudentDTO, StudentGroupDTO } from '@/types/student'

const mocks = vi.hoisted(() => ({
    list: vi.fn(),
    listGroups: vi.fn(),
    applyRandomGroups: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    bumpDataVersion: vi.fn(),
    cache: {} as {
        classId: number
        getActiveClassId: () => number
        getActiveSemesterId: () => number
        getActiveSemesterStatus: () => number
        getClassLayout: () => string
        getStudentsSort: () => string
        profile: { id: string }
        bumpDataVersion: () => void
    },
}))

vi.mock('@/managers/student', () => ({ studentManager: {
    list: mocks.list, listGroups: mocks.listGroups, applyRandomGroups: mocks.applyRandomGroups,
} }))
vi.mock('@/managers/points', () => ({ pointsManager: {} }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('element-plus', () => ({ ElMessage: {
    success: mocks.success, error: mocks.error, info: vi.fn(), warning: vi.fn(),
} }))
vi.mock('element-plus/es', () => ({}))
vi.mock('element-plus/es/components/base/style/css', () => ({}))
vi.mock('element-plus/es/components/dropdown/style/css', () => ({}))
vi.mock('element-plus/es/components/dropdown-menu/style/css', () => ({}))
vi.mock('element-plus/es/components/dropdown-item/style/css', () => ({}))
vi.mock('element-plus/es/components/select/style/css', () => ({}))
vi.mock('element-plus/es/components/option/style/css', () => ({}))
vi.mock('@/v3/components/AppDialogShell.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/students/StudentsAddDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/students/StudentsConfirmDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/students/StudentsEditDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/students/StudentsGroupImportDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/students/StudentsGroupManageDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/students/StudentsListPanel.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/students/StudentsPointsRuleDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/students/StudentsRandomGroupDialog.vue', () => ({ default: { render: () => null } }))
vi.mock('@/v3/components/students/StudentsSelectionPanel.vue', () => ({ default: { render: () => null } }))

interface StudentsState {
    loading: boolean
    students: StudentDTO[]
    groups: StudentGroupDTO[]
    randomGroupVisible: boolean
    randomGroupingSaving: boolean
    randomGroupingError: string
    loadStudentData: () => Promise<void>
    openRandomGroupDialog: () => void
    handleApplyRandomGroups: (groups: ApplyRandomGroupsReq['groups']) => Promise<void>
}

// Run the actual setup, watchers and request orchestration without rendering child dialogs.
const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})

let app: App | undefined
const initialStudents: StudentDTO[] = [{ id: 1, name: '甲', group_id: 10 }, { id: 2, name: '乙', group_id: 10 }]
const initialGroups: StudentGroupDTO[] = [{ id: 10, name: '原分组', students: initialStudents }]
const preview: ApplyRandomGroupsReq['groups'] = [{ name: '第一组', student_ids: [2, 1] }]
const savedGroups: StudentGroupDTO[] = [{ id: 20, name: '第一组', students: [{ id: 2, name: '乙' }, { id: 1, name: '甲' }] }]

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (error: Error) => void
    const promise = new Promise<T>((finish, fail) => { resolve = finish; reject = fail })
    return { promise, resolve, reject }
}

async function mountStudents(): Promise<StudentsState> {
    app = renderer.createApp({ ...StudentsView, render: () => null })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    await Promise.resolve()
    await nextTick()
    const state = (vm.$ as unknown as { setupState: StudentsState }).setupState
    expect(state.loading).toBe(false)
    state.openRandomGroupDialog()
    return state
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('window', { matchMedia: () => ({
        matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }) })
    mocks.cache = reactive({
        classId: 7,
        getActiveClassId() { return this.classId },
        getActiveSemesterId: () => 70,
        getActiveSemesterStatus: () => 1,
        getClassLayout: () => 'card',
        getStudentsSort: () => 'default',
        profile: { id: 'teacher' },
        bumpDataVersion: mocks.bumpDataVersion,
    })
    mocks.list.mockResolvedValue(initialStudents)
    mocks.listGroups.mockResolvedValue(initialGroups)
    mocks.applyRandomGroups.mockResolvedValue(savedGroups)
})

afterEach(() => {
    app?.unmount()
    app = undefined
    vi.unstubAllGlobals()
})

describe('StudentsView random grouping', () => {
    it('releases loading when saving replaces an in-flight refresh and ignores the stale response', async () => {
        const state = await mountStudents()
        const saving = deferred<StudentGroupDTO[]>()
        const oldStudents = deferred<StudentDTO[]>()
        const oldGroups = deferred<StudentGroupDTO[]>()
        mocks.applyRandomGroups.mockReturnValueOnce(saving.promise)
        const pendingSave = state.handleApplyRandomGroups(preview)
        mocks.list.mockReturnValueOnce(oldStudents.promise)
        mocks.listGroups.mockReturnValueOnce(oldGroups.promise)
        const pendingRefresh = state.loadStudentData()
        expect(state.loading).toBe(true)

        saving.resolve(savedGroups)
        await pendingSave
        oldStudents.resolve(initialStudents)
        oldGroups.resolve(initialGroups)
        await pendingRefresh

        expect(mocks.applyRandomGroups).toHaveBeenCalledWith({ class_id: 7, groups: preview })
        expect(state.groups).toEqual(savedGroups)
        expect(state.students.map(student => student.group_id)).toEqual([20, 20])
        expect(state.randomGroupingSaving).toBe(false)
        expect(state.randomGroupVisible).toBe(false)
        expect(state.loading).toBe(false)
    })

    it('keeps the dialog and original groups after a save failure so the preview can be retried', async () => {
        const state = await mountStudents()
        mocks.applyRandomGroups.mockRejectedValueOnce(new ApiRequestError('名单已变化'))

        await state.handleApplyRandomGroups(preview)

        expect(state.groups).toEqual(initialGroups)
        expect(state.students).toEqual(initialStudents)
        expect(state.randomGroupVisible).toBe(true)
        expect(state.randomGroupingSaving).toBe(false)
        expect(state.randomGroupingError).toBe('名单已变化')
        expect(mocks.success).not.toHaveBeenCalled()
        expect(mocks.bumpDataVersion).not.toHaveBeenCalled()
    })

    it('ignores a late save response after switching classes', async () => {
        const state = await mountStudents()
        const saving = deferred<StudentGroupDTO[]>()
        mocks.applyRandomGroups.mockReturnValueOnce(saving.promise)
        const pendingSave = state.handleApplyRandomGroups(preview)
        const otherStudents: StudentDTO[] = [{ id: 3, name: '丙', group_id: 30 }]
        const otherGroups: StudentGroupDTO[] = [{ id: 30, name: '另一班分组', students: otherStudents }]
        mocks.list.mockResolvedValue(otherStudents)
        mocks.listGroups.mockResolvedValue(otherGroups)
        mocks.cache.classId = 8
        await nextTick()
        await Promise.resolve()
        await nextTick()

        saving.resolve(savedGroups)
        await pendingSave

        expect(state.groups).toEqual(otherGroups)
        expect(state.students).toEqual(otherStudents)
        expect(state.randomGroupVisible).toBe(false)
        expect(state.randomGroupingSaving).toBe(false)
        expect(mocks.success).not.toHaveBeenCalled()
        expect(mocks.bumpDataVersion).not.toHaveBeenCalled()
    })
})
