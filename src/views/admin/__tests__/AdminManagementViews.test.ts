import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, ssrContextKey, type App } from 'vue'
import type { CreateMenuRequest, CreatePermissionRequest, PermissionAPIBinding, PermissionPoint, RbacMenu, Role } from '@/types/admin'
import PermissionManagementView from '../PermissionManagementView.vue'
import MenuManagementView from '../MenuManagementView.vue'

const mocks = vi.hoisted(() => ({
    createPermission: vi.fn(),
    createRole: vi.fn(),
    deletePermission: vi.fn(),
    getMenuList: vi.fn(),
    getPermissionList: vi.fn(),
    getRoleList: vi.fn(),
    replaceRolePermissions: vi.fn(),
    updatePermission: vi.fn(),
    createMenu: vi.fn(),
    reorderMenus: vi.fn(),
    updateMenu: vi.fn(),
    success: vi.fn(),
    confirm: vi.fn(),
}))

vi.mock('@/api/admin', () => ({
    createPermission: mocks.createPermission,
    createRole: mocks.createRole,
    deletePermission: mocks.deletePermission,
    getMenuList: mocks.getMenuList,
    getPermissionList: mocks.getPermissionList,
    getRoleList: mocks.getRoleList,
    replaceRolePermissions: mocks.replaceRolePermissions,
    updatePermission: mocks.updatePermission,
    createMenu: mocks.createMenu,
    reorderMenus: mocks.reorderMenus,
    updateMenu: mocks.updateMenu,
}))
vi.mock('element-plus', () => ({
    ElMessage: { success: mocks.success },
    ElMessageBox: { confirm: mocks.confirm },
}))
vi.mock('element-plus/es', () => ({
    ElLoadingDirective: {},
    ElMessage: { success: mocks.success },
    ElMessageBox: { confirm: mocks.confirm },
}))
vi.mock('element-plus/es/components/base/style/css', () => ({}))
vi.mock('element-plus/es/components/alert/style/css', () => ({}))
vi.mock('element-plus/es/components/autocomplete/style/css', () => ({}))
vi.mock('element-plus/es/components/button/style/css', () => ({}))
vi.mock('element-plus/es/components/dialog/style/css', () => ({}))
vi.mock('element-plus/es/components/empty/style/css', () => ({}))
vi.mock('element-plus/es/components/form/style/css', () => ({}))
vi.mock('element-plus/es/components/form-item/style/css', () => ({}))
vi.mock('element-plus/es/components/input/style/css', () => ({}))
vi.mock('element-plus/es/components/input-number/style/css', () => ({}))
vi.mock('element-plus/es/components/loading/style/css', () => ({}))
vi.mock('element-plus/es/components/option/style/css', () => ({}))
vi.mock('element-plus/es/components/select/style/css', () => ({}))
vi.mock('element-plus/es/components/switch/style/css', () => ({}))
vi.mock('element-plus/es/components/table/style/css', () => ({}))
vi.mock('element-plus/es/components/table-column/style/css', () => ({}))
vi.mock('element-plus/es/components/tag/style/css', () => ({}))

interface PermissionState {
    loading: boolean
    loadError: boolean
    roles: Role[]
    permissions: PermissionPoint[]
    menus: RbacMenu[]
    savingRoleIds: Set<number>
    matrixRows: Array<{ permission: PermissionPoint; moduleCode: string; rowSpan: number }>
    roleForm: { code: string; name: string; timeout: number }
    abilityForm: CreatePermissionRequest
    apiBindings: PermissionAPIBinding[]
    loadData: () => Promise<void>
    toggleRolePermission: (role: Role, permission: PermissionPoint) => Promise<void>
    openRoleDialog: () => void
    submitRole: () => Promise<void>
    openCreateAbility: (moduleCode?: string, lockModule?: boolean) => void
    openEditAbility: (permission: PermissionPoint) => void
    submitAbility: () => Promise<void>
    openAPIEditor: (permission: PermissionPoint) => void
    addAPIBinding: () => void
    removeAPIBinding: (index: number) => void
    saveAPIBindings: () => Promise<void>
    confirmDeleteAbility: (permission: PermissionPoint) => Promise<void>
}

interface MenuState {
    loading: boolean
    loadError: string
    menus: RbacMenu[]
    menuForm: CreateMenuRequest
    menuCreating: boolean
    loadData: () => Promise<void>
    openCreateMenu: () => void
    submitMenu: () => Promise<void>
    saveMenu: (menu: RbacMenu) => Promise<void>
    move: (index: number, offset: -1 | 1) => Promise<void>
}

const renderer = createRenderer<object, object>({
    patchProp: () => {},
    insert: () => {},
    remove: () => {},
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    setText: () => {},
    setElementText: () => {},
    parentNode: () => null,
    nextSibling: () => null,
})

let app: App | undefined

async function mountView<T extends { loading: boolean }>(component: typeof PermissionManagementView | typeof MenuManagementView): Promise<T> {
    app = renderer.createApp({ ...component, render: () => null })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    const state = (vm.$ as unknown as { setupState: T }).setupState
    await vi.waitFor(() => expect(state.loading).toBe(false))
    return state
}

function permission(id: number, action: string): PermissionPoint {
    return { id, code: `students.${action}`, name: action, module: 'students', action, api_bindings: [] }
}

function menu(id: number, code: string, sort: number): RbacMenu {
    return {
        id, code, name: code, route_key: code, icon: 'Menu', sort, enabled: true,
        view_permission_id: id, view_permission_code: `${code}.view`, role_codes: [],
    }
}

beforeEach(() => {
    vi.resetAllMocks()
    mocks.getMenuList.mockResolvedValue({ data: [menu(1, 'students', 10), menu(2, 'points', 20)] })
    mocks.getPermissionList.mockResolvedValue({ data: [permission(2, 'edit'), permission(1, 'view')] })
    mocks.getRoleList.mockResolvedValue({ data: [
        { id: 1, code: 'admin', name: '管理员', timeout: 604800, system: true, permissions: [] },
        { id: 2, code: 'teacher', name: '教师', timeout: 604800, system: false, permissions: [] },
    ] })
    mocks.confirm.mockResolvedValue('confirm')
})

afterEach(() => {
    app?.unmount()
    app = undefined
})

describe('migrated permission management', () => {
    it('groups abilities by module with view first and keeps system roles read only', async () => {
        const state = await mountView<PermissionState>(PermissionManagementView)

        expect(state.matrixRows.map((row) => [row.permission.action, row.rowSpan])).toEqual([
            ['view', 2], ['edit', 0],
        ])
        await state.toggleRolePermission(state.roles[0]!, state.permissions[0]!)
        expect(mocks.replaceRolePermissions).not.toHaveBeenCalled()
    })

    it('saves role authorization and rolls the local selection back on failure', async () => {
        const state = await mountView<PermissionState>(PermissionManagementView)
        const ability = state.permissions[0]!
        await state.toggleRolePermission(state.roles[1]!, ability)
        expect(mocks.replaceRolePermissions).toHaveBeenCalledWith(2, [ability.id])
        expect(state.roles[1]!.permissions.map((item) => item.id)).toEqual([ability.id])

        mocks.replaceRolePermissions.mockRejectedValueOnce(new Error('save failed'))
        await expect(state.toggleRolePermission(state.roles[1]!, ability)).rejects.toThrow('save failed')
        expect(state.roles[1]!.permissions.map((item) => item.id)).toEqual([ability.id])
        expect(state.savingRoleIds.size).toBe(0)
    })

    it('creates a role with its timeout and normalized labels', async () => {
        const state = await mountView<PermissionState>(PermissionManagementView)
        state.openRoleDialog()
        Object.assign(state.roleForm, { code: ' teacher ', name: ' 教师 ', timeout: 3600 })

        await state.submitRole()

        expect(mocks.createRole).toHaveBeenCalledWith({ code: 'teacher', name: '教师', timeout: 3600 })
    })

    it('creates an ability using its module and action, and preserves bindings when editing', async () => {
        const state = await mountView<PermissionState>(PermissionManagementView)
        state.openCreateAbility('students', true)
        Object.assign(state.abilityForm, { name: ' 导出学生 ', action: ' export ' })
        await state.submitAbility()
        expect(mocks.createPermission).toHaveBeenCalledWith({
            code: 'students.export', name: '导出学生', module: 'students', action: 'export', api_bindings: [],
        })

        const ability = { ...permission(3, 'export'), api_bindings: [{ method: 'GET', path: '/students/export' }] }
        state.openEditAbility(ability)
        state.abilityForm.name = '下载学生'
        await state.submitAbility()
        expect(mocks.updatePermission).toHaveBeenCalledWith(3, {
            code: 'students.export', name: '下载学生', module: 'students', action: 'export',
            api_bindings: [{ method: 'GET', path: '/students/export' }],
        })
    })

    it('normalizes API methods and paths and discards incomplete bindings', async () => {
        const state = await mountView<PermissionState>(PermissionManagementView)
        state.openAPIEditor(permission(2, 'edit'))
        state.addAPIBinding()
        state.apiBindings[0] = { method: ' patch ', path: ' /students/:id ' }
        state.addAPIBinding()
        state.addAPIBinding()
        state.removeAPIBinding(2)

        await state.saveAPIBindings()

        expect(mocks.updatePermission).toHaveBeenCalledWith(2, {
            name: 'edit', module: 'students', action: 'edit',
            api_bindings: [{ method: 'PATCH', path: '/students/:id' }],
        })
    })

    it('protects menu view abilities and confirms deletion of other abilities', async () => {
        const state = await mountView<PermissionState>(PermissionManagementView)
        await state.confirmDeleteAbility(permission(1, 'view'))
        expect(mocks.confirm).not.toHaveBeenCalled()
        expect(mocks.deletePermission).not.toHaveBeenCalled()

        await state.confirmDeleteAbility(permission(2, 'edit'))
        expect(mocks.confirm).toHaveBeenCalledOnce()
        expect(mocks.deletePermission).toHaveBeenCalledWith(2)
    })
})

describe('migrated menu management', () => {
    it('creates a menu with a normalized route and the requested icon and initial order', async () => {
        const state = await mountView<MenuState>(MenuManagementView)
        state.openCreateMenu()
        Object.assign(state.menuForm, { code: ' reports ', name: ' 报表 ', route_key: ' /reports/weekly/ ', icon: ' DataAnalysis ', sort: 30 })

        await state.submitMenu()

        expect(mocks.createMenu).toHaveBeenCalledWith({
            code: 'reports', name: '报表', route_key: 'reports/weekly', icon: 'DataAnalysis', sort: 30,
        })
        expect(state.menuCreating).toBe(false)
    })

    it('saves inline names, icons and disabled states', async () => {
        const state = await mountView<MenuState>(MenuManagementView)
        const row = { ...state.menus[0]!, name: ' 学生管理 ', icon: ' UserFilled ', enabled: false }

        await state.saveMenu(row)

        expect(mocks.updateMenu).toHaveBeenCalledWith(1, { name: '学生管理', icon: 'UserFilled', enabled: false })
    })

    it('sends the full reordered menu list and ignores moves beyond either boundary', async () => {
        const state = await mountView<MenuState>(MenuManagementView)
        await state.move(0, -1)
        await state.move(1, 1)
        expect(mocks.reorderMenus).not.toHaveBeenCalled()

        await state.move(0, 1)

        expect(mocks.reorderMenus).toHaveBeenCalledWith([2, 1])
    })

    it('exposes a failed load and supports retry', async () => {
        mocks.getMenuList.mockRejectedValueOnce(new Error('network unavailable'))
        const state = await mountView<MenuState>(MenuManagementView)
        expect(state.loadError).toBe('network unavailable')

        await state.loadData()

        expect(state.loadError).toBe('')
        expect(state.menus).toHaveLength(2)
    })
})
