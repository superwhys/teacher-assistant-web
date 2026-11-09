import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, reactive, ssrContextKey, type App, type Component } from 'vue'
import ClassSwitchButton from '../ClassSwitchButton.vue'
import SemesterSwitchButton from '../SemesterSwitchButton.vue'

const mocks = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), listSemesters: vi.fn(), updateSemester: vi.fn(), warning: vi.fn() }))
const session = reactive({ canWrite: true, canPrepare: true, canImportExport: true, entitlementMessage: '当前权益不支持此操作' })
const cache = reactive({ profile: { roleCode: 'pro' } })
vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => session }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => cache }))
vi.mock('@/managers/class', () => ({ classManager: mocks }))
vi.mock('element-plus', () => ({ ElMessage: { warning: mocks.warning, error: vi.fn(), success: vi.fn() } }))
vi.mock('element-plus/es', () => ({ ElMessage: { warning: mocks.warning, error: vi.fn(), success: vi.fn() } }))
vi.mock('element-plus/es/components/base/style/css', () => ({}))
vi.mock('element-plus/es/components/input/style/css', () => ({}))
vi.mock('element-plus/es/components/select/style/css', () => ({}))
vi.mock('element-plus/es/components/option/style/css', () => ({}))
vi.mock('element-plus/es/components/tag/style/css', () => ({}))
vi.mock('@/v3/components/AppDialogShell.vue', () => ({ default: { render: () => null } }))

interface ClassSwitchState {
    createClassName: string
    createSemesterName: string
    selectedClassId: number | null
    canCreateClass: boolean
    handleCreateClass: () => Promise<void>
    applyClassSwitch: () => void
}
interface SemesterSwitchState {
    selectedSemesterId: number | null
    semesters: { id: number, name: string }[]
    loadSemesters: () => Promise<void>
    applySemesterSwitch: () => Promise<void>
}

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})
let app: App | undefined
function mountState<T>(component: Component, props: Record<string, unknown>): T {
    app = renderer.createApp({ ...component, render: () => null }, props)
    app.provide(ssrContextKey, { modules: new Set() })
    return (app.mount({}).$ as unknown as { setupState: T }).setupState
}

beforeEach(() => {
    vi.resetAllMocks()
    Object.assign(session, { canWrite: true, canPrepare: true, canImportExport: true })
    cache.profile.roleCode = 'pro'
    mocks.list.mockResolvedValue([])
    mocks.create.mockResolvedValue({ id: 9, name: '新班级' })
    mocks.listSemesters.mockResolvedValue([{ id: 2, name: '第二学期' }])
})
afterEach(() => { app?.unmount(); app = undefined })

describe('navigation commercial access', () => {
    it('rejects a second common class after refreshing the owned list and permits Pro creation', async () => {
        cache.profile.roleCode = 'common'
        mocks.list.mockResolvedValue([{ id: 1, name: '已有班级' }])
        const state = mountState<ClassSwitchState>(ClassSwitchButton, { activeClassId: 1 })
        state.createClassName = '第二个班级'
        state.createSemesterName = '第一学期'
        await state.handleCreateClass()
        expect(mocks.create).not.toHaveBeenCalled()
        expect(state.canCreateClass).toBe(false)
        expect(mocks.warning).toHaveBeenCalledWith('普通版最多创建 1 个班级，多班级管理请使用 Pro 版。')
        cache.profile.roleCode = 'pro'
        expect(state.canCreateClass).toBe(true)
        await state.handleCreateClass()
        expect(mocks.create).toHaveBeenCalledWith('第二个班级', '第一学期')
    })

    it('refreshes the list before allowing the first common class', async () => {
        cache.profile.roleCode = 'common'
        const state = mountState<ClassSwitchState>(ClassSwitchButton, { activeClassId: null })
        state.createClassName = '第一个班级'
        state.createSemesterName = '第一学期'
        await state.handleCreateClass()
        expect(mocks.list).toHaveBeenCalled()
        expect(mocks.create).toHaveBeenCalledWith('第一个班级', '第一学期')
    })

    it('allows creating a class during preparation', async () => {
        Object.assign(session, { canWrite: false, canPrepare: true, canImportExport: false })
        const state = mountState<ClassSwitchState>(ClassSwitchButton, { activeClassId: 1 })
        state.createClassName = '新班级'
        state.createSemesterName = '第一学期'
        await state.handleCreateClass()
        expect(mocks.create).toHaveBeenCalledWith('新班级', '第一学期')
    })

    it('rejects creating a class after expiry while still allowing local class selection', async () => {
        const switched = vi.fn()
        const state = mountState<ClassSwitchState>(ClassSwitchButton, { activeClassId: 1, onSwitched: switched })
        state.createClassName = '新班级'
        state.createSemesterName = '第一学期'
        Object.assign(session, { canWrite: false, canPrepare: false, canImportExport: false })
        await state.handleCreateClass()
        state.selectedClassId = 2
        state.applyClassSwitch()
        expect(mocks.create).not.toHaveBeenCalled()
        expect(switched).toHaveBeenCalledWith(2)
        expect(mocks.warning).toHaveBeenCalledWith(session.entitlementMessage)
    })

    it.each(['preparation', 'expired'])('allows viewing semester options but denies server-side switching while %s', async stage => {
        Object.assign(session, { canWrite: false, canPrepare: stage === 'preparation', canImportExport: false })
        const state = mountState<SemesterSwitchState>(SemesterSwitchButton, { activeClassId: 1, currentSemesterId: 1 })
        await state.loadSemesters()
        expect(state.semesters).toEqual([{ id: 2, name: '第二学期' }])
        state.selectedSemesterId = 2
        await state.applySemesterSwitch()
        expect(mocks.updateSemester).not.toHaveBeenCalled()
        expect(mocks.warning).toHaveBeenCalledWith(session.entitlementMessage)
    })
})
