import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '@/types/api'

const mocks = vi.hoisted(() => ({
    session: { isSuperAdmin: false, refreshAfterMutation: vi.fn() },
    cache: { profile: { id: 'self' } },
    get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(), warning: vi.fn(), error: vi.fn(),
}))
vi.mock('@/api/api', () => ({ get: mocks.get, post: mocks.post, put: mocks.put, del: mocks.del }))
vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => mocks.session }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('element-plus', () => ({ ElMessage: { warning: mocks.warning, error: mocks.error } }))
import {
    assignRoleToUser, createMenu, getUserList, getRoleList, replaceRolePermissions, updateMenu, updateUserEntitlement,
} from '../admin'

const response = { code: 0, message: 'ok', data: null }
beforeEach(() => {
    vi.resetAllMocks()
    mocks.session.isSuperAdmin = false
    mocks.session.refreshAfterMutation.mockResolvedValue(undefined)
    mocks.get.mockResolvedValue(response)
    mocks.post.mockResolvedValue(response)
    mocks.put.mockResolvedValue(response)
})

describe('platform API authorization', () => {
    it('blocks reads and writes before issuing a request for ordinary accounts', async () => {
        await expect(getUserList({ offset: 0, limit: 10 })).rejects.toMatchObject({ code: 100403 })
        await expect(getRoleList()).rejects.toMatchObject({ code: 100403 })
        await expect(replaceRolePermissions(2, [3])).rejects.toMatchObject({ code: 100403 })
        await expect(updateUserEntitlement('other', { permanent: true, paid_expires_at: null })).rejects.toMatchObject({ code: 100403 })
        expect(mocks.get).not.toHaveBeenCalled()
        expect(mocks.put).not.toHaveBeenCalled()
    })

    it('checks the current role again when an already-open action is submitted', async () => {
        mocks.session.isSuperAdmin = true
        await getRoleList()
        expect(mocks.get).toHaveBeenCalledWith('/admin/rbac/roles')
        mocks.session.isSuperAdmin = false
        await expect(assignRoleToUser({ user_id: 'other', role_id: 2 })).rejects.toMatchObject({ code: 100403 })
        expect(mocks.post).not.toHaveBeenCalled()
    })

    it('refreshes the session when the current administrator changes their own role', async () => {
        mocks.session.isSuperAdmin = true
        await assignRoleToUser({ user_id: 'self', role_id: 2 })
        expect(mocks.post).toHaveBeenCalledWith('/admin/user/assign/role', { user_id: 'self', role_id: 2 })
        expect(mocks.session.refreshAfterMutation).toHaveBeenCalledOnce()
    })

    it.each([
        { permanent: false, paid_expires_at: '2027-05-15T10:30:45.000Z', reason: '调整有效期' },
        { permanent: true, paid_expires_at: null, reason: '长期授权' },
        { permanent: false, paid_expires_at: null, trial_expires_at: '2026-12-15T10:30:45.000Z', reason: '延长试用' },
    ])('updates a user expiry with the exact $permanent payload', async (data) => {
        mocks.session.isSuperAdmin = true
        await expect(updateUserEntitlement('teacher/with space', data)).resolves.toEqual(response)
        expect(mocks.put).toHaveBeenCalledExactlyOnceWith('/admin/user/teacher%2Fwith%20space/entitlement', data)
        expect(mocks.session.refreshAfterMutation).not.toHaveBeenCalled()
    })

    it('refreshes the session when the current administrator changes their own expiry', async () => {
        mocks.session.isSuperAdmin = true
        await updateUserEntitlement('self', { permanent: true, paid_expires_at: null })
        expect(mocks.put).toHaveBeenCalledWith('/admin/user/self/entitlement', { permanent: true, paid_expires_at: null })
        expect(mocks.session.refreshAfterMutation).toHaveBeenCalledOnce()
    })

    it('refreshes navigation after menu writes and preserves a successful save if refresh fails', async () => {
        mocks.session.isSuperAdmin = true
        await createMenu({ code: 'demo', name: 'Demo', route_key: 'demo', icon: 'Menu', sort: 0 })
        expect(mocks.session.refreshAfterMutation).toHaveBeenCalledOnce()
        mocks.session.refreshAfterMutation.mockRejectedValueOnce(new Error('offline'))
        await expect(updateMenu(3, { name: 'Demo', icon: 'Menu', enabled: true })).resolves.toEqual(response)
        expect(mocks.warning).toHaveBeenCalledWith('已保存，导航同步失败，请刷新页面重试')
    })
})


describe('platform transport errors', () => {
    it('reports a network failure once and marks it as already handled for migrated pages', async () => {
        mocks.session.isSuperAdmin = true
        mocks.get.mockRejectedValueOnce(new TypeError('Failed to fetch'))
        await expect(getRoleList()).rejects.toMatchObject({
            isApiRequestError: true, message: '网络请求失败，请检查网络连接',
        })
        expect(mocks.error).toHaveBeenCalledExactlyOnceWith('网络请求失败，请检查网络连接')
    })

    it('does not repeat an error already handled by the shared request layer', async () => {
        mocks.session.isSuperAdmin = true
        const error = new ApiRequestError('权限已撤销', 100403)
        mocks.get.mockRejectedValueOnce(error)
        await expect(getRoleList()).rejects.toBe(error)
        expect(mocks.error).not.toHaveBeenCalled()
    })
})
