import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '@/types/user'
import { get, post, postBlob } from '../api'

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(), logout: vi.fn(), message: vi.fn(),
    cache: { token: 'session' as string | null, profile: null as UserProfile | null, logout: () => {}, updateProfile: (_profile: UserProfile) => {} },
}))
vi.mock('@/routers', () => ({ default: { currentRoute: { value: { path: '/students', fullPath: '/students' } }, replace: vi.fn() } }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('element-plus', () => ({ ElMessage: mocks.message }))

function profile(state: 'not_started' | 'trial_active' | 'trial_expired' | 'permanent'): UserProfile {
    return { id: 'teacher', name: 'Teacher', email: '', roleCode: 'common', entitlement: {
        state, permanent: state === 'permanent', trial_started_at: null,
        trial_expires_at: state === 'trial_active' ? new Date(Date.now() + 86400000).toISOString() : null,
        paid_expires_at: null,
    } }
}
beforeEach(() => {
    vi.resetAllMocks()
    mocks.cache.token = 'session'
    mocks.cache.profile = profile('permanent')
    mocks.cache.logout = mocks.logout
    mocks.cache.updateProfile = next => { mocks.cache.profile = next }
    vi.stubGlobal('fetch', mocks.fetch)
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ code: 0, data: null }), { status: 200 }))
})
afterEach(() => vi.unstubAllGlobals())

describe('commercial request boundary', () => {
    it('permits Agent transport posts at expiry while retaining the business write boundary', async () => {
        mocks.cache.profile = profile('trial_expired')
        mocks.fetch.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ code: 0, data: null }), { status: 200 })))
        for (const path of ['/agent/conversations', '/agent/conversations/conversation/runs', '/agent/runs/run/cancel', '/agent/actions/action/decision']) {
            await post(path, {})
        }
        expect(mocks.fetch).toHaveBeenCalledTimes(4)
        await expect(post('/agent/runs/run/execute', {})).rejects.toMatchObject({ code: 200402 })
        await expect(post('/points/rule/apply', {})).rejects.toMatchObject({ code: 200402 })
        expect(mocks.fetch).toHaveBeenCalledTimes(4)
    })
    it('rejects an old download response after switching accounts', async () => {
        let finish!: (blob: Blob) => void
        mocks.fetch.mockResolvedValue({ status: 200, ok: true, blob: () => new Promise<Blob>(resolve => { finish = resolve }) })
        const request = postBlob('/points/rule/record/export', {})
        await Promise.resolve()
        mocks.cache.token = 'new-session'
        finish(new Blob(['old-account-data']))
        await expect(request).rejects.toThrow('账号已切换')
    })
    it('does not submit prohibited writes or exports while keeping permitted setup actions available', async () => {
        mocks.cache.profile = profile('not_started')
        await expect(post('/student/create.batch', {})).rejects.toMatchObject({ code: 200403 })
        await expect(post('/points/rule/record/export/preview', {})).rejects.toMatchObject({ code: 200403 })
        expect(mocks.fetch).not.toHaveBeenCalled()
        await post('/student/create', { name: 'Student', class_id: 1 })
        expect(mocks.fetch).toHaveBeenCalledOnce()
        expect(mocks.logout).not.toHaveBeenCalled()
    })

    it('keeps read-only sessions logged in while preventing all business writes', async () => {
        mocks.cache.profile = profile('trial_expired')
        await get('/points/ranking/class', { class_id: 1 })
        await expect(post('/student/create', {})).rejects.toMatchObject({ code: 200402 })
        expect(mocks.fetch).toHaveBeenCalledOnce()
        expect(mocks.cache.token).toBe('session')
        expect(mocks.logout).not.toHaveBeenCalled()
    })

    it.each([200402, 200403, 200404])('preserves commercial 403 code %s and the session token', async code => {
        mocks.cache.profile = profile('trial_active')
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ code, message: '商业状态已更新' }), { status: 403 }))
        await expect(post('/points/rule/apply', {})).rejects.toMatchObject({ code, message: '商业状态已更新' })
        expect(mocks.cache.token).toBe('session')
        expect(mocks.logout).not.toHaveBeenCalled()
        expect(mocks.cache.profile?.entitlement?.state).toBe(code === 200402 ? 'trial_expired' : code === 200404 ? 'paid_expired' : 'not_started')
    })

    it('does not change a new account from a stale commercial rejection', async () => {
        let finish!: (response: Response) => void
        mocks.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve }))
        const request = post('/points/rule/apply', {})
        mocks.cache.token = 'new-session'
        mocks.cache.profile = { ...profile('permanent'), id: 'new-teacher' }
        finish(new Response(JSON.stringify({ code: 200402, message: 'old trial expired' }), { status: 403 }))
        await expect(request).rejects.toMatchObject({ code: 200402 })
        expect(mocks.cache.profile.entitlement?.state).toBe('permanent')
        expect(mocks.logout).not.toHaveBeenCalled()
    })
})
