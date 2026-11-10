import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, ssrContextKey, type App } from 'vue'
import UserManagementView from '../UserManagementView.vue'
import OpinionManagementView from '../OpinionManagementView.vue'
import { ApiRequestError } from '@/types/api'
import type { User } from '@/types/admin'
import type { UserEntitlement } from '@/types/user'

const mocks = vi.hoisted(() => ({
    getUserList: vi.fn(),
    getRoleList: vi.fn(),
    assignRoleToUser: vi.fn(),
    adminLoginAsUser: vi.fn(),
    getOpinionList: vi.fn(),
    confirm: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    open: vi.fn(),
    setItem: vi.fn(),
}))

vi.mock('@/api/admin', () => ({
    getUserList: mocks.getUserList,
    getRoleList: mocks.getRoleList,
    assignRoleToUser: mocks.assignRoleToUser,
    adminLoginAsUser: mocks.adminLoginAsUser,
    getOpinionList: mocks.getOpinionList,
}))
vi.mock('element-plus', () => ({
    ElMessage: { success: mocks.success, error: mocks.error, warning: mocks.warning },
    ElMessageBox: { confirm: mocks.confirm },
}))

interface UserDirectoryState {
    users: User[]
    filteredUsers: User[]
    keyword: string
    currentPage: number
    total: number
    loading: boolean
    loadError: boolean
    rolesLoaded: boolean
    selectedRoleId: number | null
    roleDialogVisible: boolean
    assigningRole: boolean
    loadUsers: () => Promise<void>
    handleSortChange: (event: { order: 'ascending' | 'descending' | null }) => void
    handleQuickLogin: (user: User) => Promise<void>
    handleOpenAssignRoleDialog: (user: User) => void
    handleAssignRole: () => Promise<void>
    getSubscriptionTitle: (user: User) => string
    getSubscriptionExpiry: (user: User) => string
}

interface OpinionDirectoryState {
    opinions: { id: number; content: string }[]
    total: number
    loadError: string
    loading: boolean
    loadOpinions: () => Promise<void>
    handleCurrentChange: (page: number) => void
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

function mountDirectory<T>(component: typeof UserManagementView | typeof OpinionManagementView): T {
    app = renderer.createApp({ ...component, render: () => null })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    return (vm.$ as unknown as { setupState: T }).setupState
}

async function flushRequests(): Promise<void> {
    await Promise.resolve()
    await nextTick()
}

const teacher: User = {
    id: 'teacher-id',
    name: '陈老师',
    email: 'chen@example.com',
    status: 1,
    role_id: 2,
    created_at: '2026-11-08T10:00:00Z',
    entitlement: {
        state: 'not_started',
        trial_started_at: null,
        trial_expires_at: null,
        paid_expires_at: null,
        permanent: false,
    },
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('window', {
        location: { origin: 'https://school.example.com' },
        open: mocks.open,
        localStorage: { setItem: mocks.setItem },
        sessionStorage: { setItem: mocks.setItem },
    })
    mocks.getUserList.mockResolvedValue({ data: { items: [teacher], total: 21 } })
    mocks.getRoleList.mockResolvedValue({ data: [{ id: 2, name: '教师', code: 'teacher' }] })
    mocks.getOpinionList.mockResolvedValue({ data: { items: [{ id: 1, content: '希望支持更多课堂活动' }], total: 12 } })
    mocks.assignRoleToUser.mockResolvedValue({ data: null })
    mocks.confirm.mockResolvedValue('confirm')
    mocks.adminLoginAsUser.mockResolvedValue({ data: { token: 'teacher+token/with=symbols' } })
    mocks.open.mockReturnValue({ opener: {} })
})

afterEach(() => {
    app?.unmount()
    app = undefined
    vi.unstubAllGlobals()
})

describe('platform user directory', () => {
    it.each<{
        roleCode: string | null
        entitlementState: UserEntitlement['state']
        expected: string
    }>([
        { roleCode: 'common', entitlementState: 'paid_active', expected: '普通版 · 付费权益有效' },
        { roleCode: 'pro', entitlementState: 'paid_active', expected: 'Pro 版 · 付费权益有效' },
        { roleCode: 'common', entitlementState: 'paid_expired', expected: '普通版 · 付费权益已到期 · 仅可查看' },
        { roleCode: 'trial', entitlementState: 'trial_active', expected: '14 天免费试用中' },
        { roleCode: 'trial', entitlementState: 'trial_expired', expected: '试用已到期 · 仅可查看' },
        { roleCode: 'pro', entitlementState: 'permanent', expected: '长期使用权益' },
        { roleCode: 'trial', entitlementState: 'not_started', expected: '试用尚未开启' },
        { roleCode: 'admin', entitlementState: 'not_started', expected: '无需订阅' },
        { roleCode: null, entitlementState: 'paid_active', expected: '付费权益有效' },
    ])('displays $roleCode subscription title for $entitlementState', ({ roleCode, entitlementState, expected }) => {
        const state = mountDirectory<UserDirectoryState>(UserManagementView)
        const user: User = {
            ...teacher,
            role: roleCode ? {
                id: 2, code: roleCode, name: roleCode, timeout: 0, system: true, permissions: [],
            } : null,
            entitlement: { ...teacher.entitlement, state: entitlementState, permanent: entitlementState === 'permanent' },
        }
        expect(state.getSubscriptionTitle(user)).toBe(expected)
    })

    it.each<{
        entitlementState: UserEntitlement['state']
        expected: string
    }>([
        { entitlementState: 'trial_active', expected: '2026-11-20 09:08:07' },
        { entitlementState: 'trial_expired', expected: '2026-11-20 09:08:07' },
        { entitlementState: 'paid_active', expected: '2027-05-15 18:30:45' },
        { entitlementState: 'paid_expired', expected: '2027-05-15 18:30:45' },
        { entitlementState: 'permanent', expected: '永久有效' },
        { entitlementState: 'not_started', expected: '-' },
    ])('selects the matching subscription expiry for $entitlementState', ({ entitlementState, expected }) => {
        const state = mountDirectory<UserDirectoryState>(UserManagementView)
        const user: User = {
            ...teacher,
            entitlement: {
                ...teacher.entitlement,
                state: entitlementState,
                permanent: entitlementState === 'permanent',
                trial_expires_at: new Date(2026, 10, 20, 9, 8, 7).toISOString(),
                paid_expires_at: new Date(2027, 4, 15, 18, 30, 45).toISOString(),
            },
        }
        expect(state.getSubscriptionExpiry(user)).toBe(expected)
    })

    it.each<UserEntitlement['state']>(['trial_active', 'trial_expired', 'paid_active', 'paid_expired'])(
        'shows a placeholder when %s has no expiry', (entitlementState) => {
            const state = mountDirectory<UserDirectoryState>(UserManagementView)
            expect(state.getSubscriptionExpiry({
                ...teacher, entitlement: { ...teacher.entitlement, state: entitlementState },
            })).toBe('-')
        },
    )

    it('shows permanent validity for a superadmin without a subscription', () => {
        const state = mountDirectory<UserDirectoryState>(UserManagementView)
        expect(state.getSubscriptionExpiry({
            ...teacher,
            role: { id: 1, code: 'admin', name: '超级管理员', timeout: 0, system: true, permissions: [] },
        })).toBe('永久有效')
    })

    it('loads users and roles, searches the current page, and keeps pagination and sorting requests', async () => {
        const state = mountDirectory<UserDirectoryState>(UserManagementView)
        await flushRequests()
        expect(mocks.getUserList).toHaveBeenCalledWith({ offset: 0, limit: 10, sort_order: 'asc' })
        expect(state.rolesLoaded).toBe(true)
        state.keyword = 'CHEN@'
        expect(state.filteredUsers).toEqual([teacher])
        state.keyword = '不存在'
        expect(state.filteredUsers).toEqual([])

        state.currentPage = 2
        await flushRequests()
        expect(mocks.getUserList).toHaveBeenLastCalledWith({ offset: 10, limit: 10, sort_order: 'asc' })
        state.handleSortChange({ order: 'descending' })
        await flushRequests()
        expect(state.currentPage).toBe(1)
        expect(mocks.getUserList).toHaveBeenLastCalledWith({ offset: 0, limit: 10, sort_order: 'desc' })
    })

    it('ignores an older list response after the current page changes', async () => {
        let finishFirst!: (response: { data: { items: User[]; total: number } }) => void
        mocks.getUserList.mockReturnValueOnce(new Promise((resolve) => { finishFirst = resolve }))
        const state = mountDirectory<UserDirectoryState>(UserManagementView)
        state.currentPage = 2
        await flushRequests()
        finishFirst({ data: { items: [], total: 0 } })
        await flushRequests()
        expect(state.users).toEqual([teacher])
        expect(state.total).toBe(21)
        expect(state.loading).toBe(false)
    })

    it('opens a teacher token on the current origin without writing to the administrator session', async () => {
        const state = mountDirectory<UserDirectoryState>(UserManagementView)
        await state.handleQuickLogin(teacher)
        expect(mocks.adminLoginAsUser).toHaveBeenCalledWith('teacher-id')
        const [target, browserTarget] = mocks.open.mock.calls[0]!
        const url = new URL(target as string)
        expect(url.origin).toBe('https://school.example.com')
        expect(url.pathname).toBe('/')
        expect(url.searchParams.get('token')).toBe('teacher+token/with=symbols')
        expect(url.searchParams.get('session')).toBe('tab')
        expect(browserTarget).toBe('_blank')
        expect(mocks.open.mock.results[0]!.value.opener).toBeNull()
        expect(mocks.setItem).not.toHaveBeenCalled()
    })

    it('does not request a user token after confirmation is cancelled', async () => {
        mocks.confirm.mockRejectedValue('cancel')
        const state = mountDirectory<UserDirectoryState>(UserManagementView)
        await state.handleQuickLogin(teacher)
        expect(mocks.adminLoginAsUser).not.toHaveBeenCalled()
        expect(mocks.open).not.toHaveBeenCalled()
        expect(mocks.error).not.toHaveBeenCalled()
    })

    it('reports a blocked new tab and a missing login token', async () => {
        mocks.open.mockReturnValueOnce(null)
        const state = mountDirectory<UserDirectoryState>(UserManagementView)
        await state.handleQuickLogin(teacher)
        expect(mocks.warning).toHaveBeenCalledWith('浏览器拦截了新标签页，请允许弹窗后重试')
        mocks.adminLoginAsUser.mockResolvedValueOnce({ data: { token: '' } })
        await state.handleQuickLogin(teacher)
        expect(mocks.error).toHaveBeenCalledWith('登录失败：未获取到 token')
        expect(mocks.open).toHaveBeenCalledTimes(1)
    })

    it('prevents duplicate role submissions and refreshes users after assigning the chosen role', async () => {
        let finishAssign!: () => void
        mocks.assignRoleToUser.mockReturnValueOnce(new Promise<void>((resolve) => { finishAssign = resolve }))
        const state = mountDirectory<UserDirectoryState>(UserManagementView)
        await flushRequests()
        state.handleOpenAssignRoleDialog(teacher)
        expect(state.selectedRoleId).toBe(2)
        state.selectedRoleId = 3
        const pending = state.handleAssignRole()
        await state.handleAssignRole()
        expect(mocks.assignRoleToUser).toHaveBeenCalledTimes(1)
        expect(mocks.assignRoleToUser).toHaveBeenCalledWith({ user_id: 'teacher-id', role_id: 3 })
        finishAssign()
        await pending
        expect(state.roleDialogVisible).toBe(false)
        expect(state.assigningRole).toBe(false)
        expect(mocks.getUserList).toHaveBeenCalledTimes(2)
    })

    it('allows retry after loading fails and avoids repeating API-layer error messages', async () => {
        mocks.getUserList.mockRejectedValueOnce(new ApiRequestError('禁止访问'))
        const state = mountDirectory<UserDirectoryState>(UserManagementView)
        await flushRequests()
        expect(state.loadError).toBe(true)
        expect(mocks.error).not.toHaveBeenCalled()
        await state.loadUsers()
        expect(state.loadError).toBe(false)
        expect(state.users).toEqual([teacher])
    })
})

describe('platform feedback directory', () => {
    it('loads feedback and requests the selected page', async () => {
        const state = mountDirectory<OpinionDirectoryState>(OpinionManagementView)
        await flushRequests()
        expect(state.opinions[0]?.content).toBe('希望支持更多课堂活动')
        expect(state.total).toBe(12)
        expect(mocks.getOpinionList).toHaveBeenCalledWith({ offset: 0, limit: 10 })
        state.handleCurrentChange(2)
        await flushRequests()
        expect(mocks.getOpinionList).toHaveBeenLastCalledWith({ offset: 10, limit: 10 })
    })

    it('shows a retryable loading error without repeating an API-layer message', async () => {
        mocks.getOpinionList.mockRejectedValueOnce(new ApiRequestError('反馈服务暂不可用'))
        const state = mountDirectory<OpinionDirectoryState>(OpinionManagementView)
        await flushRequests()
        expect(state.loadError).toBe('反馈服务暂不可用')
        expect(state.loading).toBe(false)
        expect(mocks.error).not.toHaveBeenCalled()
        await state.loadOpinions()
        expect(state.loadError).toBe('')
        expect(state.opinions).toHaveLength(1)
    })
})
