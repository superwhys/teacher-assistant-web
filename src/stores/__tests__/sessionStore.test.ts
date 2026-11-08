import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import type { UserProfile } from '@/types/user'
import { useSessionStore } from '../sessionStore'

type Cache = {
    token: string | null
    profile: UserProfile | null
    setAuth: (token: string, profile: UserProfile, trial: boolean, expiresAt: number | null) => void
    updateProfile: (profile: UserProfile) => void
}
const mocks = vi.hoisted(() => ({
    fetchSessionInit: vi.fn(), startTrial: vi.fn(), setAuth: vi.fn(),
    success: vi.fn(), warning: vi.fn(), error: vi.fn(), cache: null as unknown as Cache,
}))
vi.mock('@/api/session', () => ({ fetchSessionInit: mocks.fetchSessionInit }))
vi.mock('@/api/user', () => ({ userApi: { startTrial: mocks.startTrial } }))
vi.mock('element-plus', () => ({ ElMessage: { success: mocks.success, warning: mocks.warning, error: mocks.error } }))
vi.mock('@/stores/cacheStore', async () => {
    const { reactive } = await import('vue')
    const cache = reactive<Cache>({
        token: 'web-session', profile: null,
        setAuth(token, profile, trial, expiresAt) {
            mocks.setAuth(token, profile, trial, expiresAt)
            cache.token = token
            cache.profile = profile
        },
        updateProfile(profile) { cache.profile = profile },
    })
    mocks.cache = cache
    return { useCacheStore: () => cache }
})

const menu = (route: string) => ({ id: 1, code: route, name: route, route_key: route, icon: 'HomeFilled', sort: 1 })
function profile(state: 'not_started' | 'trial_active' | 'trial_expired' | 'permanent' = 'permanent', expiresAt: string | null = null) {
    return {
        id: '17', name: 'Teacher', email: 'teacher@example.com', role_id: 2,
        role: { id: 2, code: 'common', name: '普通角色' }, wechat_bound: false,
        entitlement: { state, permanent: state === 'permanent', trial_started_at: null, trial_expires_at: expiresAt, paid_expires_at: null },
    }
}
function sessionResponse(user = profile(), routes = ['dashboard']) {
    return { data: { user, role: { id: 2, code: 'common', name: '普通角色' }, config: { sidebar: routes.map(menu) } } }
}
let pinia: Pinia
beforeEach(() => {
    vi.resetAllMocks()
    mocks.cache.token = 'web-session'
    mocks.cache.profile = null
    pinia = createPinia()
    setActivePinia(pinia)
    mocks.fetchSessionInit.mockResolvedValue(sessionResponse())
})
afterEach(() => { disposePinia(pinia); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('AI assistant module access', () => {
    it('requires the agent menu and keeps the global assistant out of navigation', async () => {
        const session = useSessionStore()
        expect(session.canUseAgent).toBe(false)
        await session.initialize()
        expect(session.canUseAgent).toBe(false)
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile(), ['agent', 'students']))
        await session.initialize(true)
        expect(session.canUseAgent).toBe(true)
        expect(session.sidebar.map(item => item.code)).toEqual(['students'])
        expect(session.firstRoute).toBe('/students')
        expect(session.canAccess('/agent')).toBe(false)
    })

    it('does not turn an assistant-only grant into a nonexistent page', async () => {
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile(), ['agent']))
        const session = useSessionStore()
        await session.initialize()
        expect(session.canUseAgent).toBe(true)
        expect(session.sidebar).toEqual([])
        expect(session.firstRoute).toBeNull()
    })

    it('keeps assistant access during preparation while retaining write restrictions', async () => {
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile('not_started'), ['agent', 'students', 'points']))
        const session = useSessionStore()
        await session.initialize()
        expect(session.canUseAgent).toBe(true)
        expect(session.canWrite).toBe(false)
        expect(session.sidebar.map(item => item.code)).toEqual(['students'])
    })

    it('revokes assistant access after refreshed role menus remove it', async () => {
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile(), ['agent', 'dashboard']))
        const session = useSessionStore()
        await session.initialize()
        expect(session.canUseAgent).toBe(true)
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse())
        await session.initialize(true)
        expect(session.canUseAgent).toBe(false)
    })

    it('clears assistant access immediately when the account changes', async () => {
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile(), ['agent', 'dashboard']))
        const session = useSessionStore()
        await session.initialize()
        expect(session.canUseAgent).toBe(true)
        mocks.cache.token = 'another-session'
        expect(session.canUseAgent).toBe(false)
        expect(session.initialized).toBe(false)
    })
})

describe('commercial session permissions', () => {
    it('does not let an older active snapshot undo a commercial rejection', async () => {
        const browser = new EventTarget()
        vi.stubGlobal('window', browser)
        vi.stubGlobal('document', new EventTarget())
        const active = profile('trial_active', new Date(Date.now() + 86400000).toISOString())
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(active, ['students', 'points']))
        const session = useSessionStore()
        await session.initialize()
        let finishOld!: (value: ReturnType<typeof sessionResponse>) => void
        mocks.fetchSessionInit.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
        const oldRequest = session.initialize(true)
        mocks.cache.updateProfile({ ...mocks.cache.profile!, entitlement: profile('trial_expired').entitlement })
        mocks.fetchSessionInit.mockResolvedValueOnce(sessionResponse(profile('trial_expired'), ['students', 'points']))
        const rejection = new Event('teacher-entitlement-rejected')
        Object.defineProperty(rejection, 'detail', { value: { token: 'web-session' } })
        browser.dispatchEvent(rejection)
        await session.initialize(true)
        finishOld(sessionResponse(active, ['students', 'points']))
        await oldRequest
        expect(session.entitlementState).toBe('trial_expired')
        expect(session.canWrite).toBe(false)
    })

    it('releases the old account claim lock without letting its late response clear the new lock', async () => {
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile('not_started'), ['students']))
        const session = useSessionStore()
        await session.initialize()
        let finishOld!: (value: { data: ReturnType<typeof profile> }) => void
        let finishNew!: (value: { data: ReturnType<typeof profile> }) => void
        mocks.startTrial.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
        const oldRequest = session.startTrial()
        mocks.cache.token = 'new-session'
        mocks.cache.profile = { ...profile('not_started'), id: 'new-teacher' }
        expect(session.startingTrial).toBe(false)
        mocks.startTrial.mockImplementationOnce(() => new Promise(resolve => { finishNew = resolve }))
        const nextRequest = session.startTrial()
        finishOld({ data: profile('trial_active', new Date(Date.now() + 86400000).toISOString()) })
        await expect(oldRequest).rejects.toThrow('账号已切换')
        expect(session.startingTrial).toBe(true)
        const active = { ...profile('trial_active', new Date(Date.now() + 86400000).toISOString()), id: 'new-teacher' }
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(active, ['students']))
        finishNew({ data: active })
        await nextRequest
        expect(session.startingTrial).toBe(false)
        expect(session.canWrite).toBe(true)
        expect(mocks.startTrial).toHaveBeenCalledTimes(2)
    })
    it('keeps account binding independent of settings permission without fabricating other menus', async () => {
        const session = useSessionStore()
        await session.initialize()
        expect(session.canAccess('/settings/mini-program')).toBe(true)
        expect(session.canAccess('/dashboard')).toBe(true)
        expect(session.canAccess('/settings')).toBe(false)
        expect(session.canAccess('/settings/mini-program/other')).toBe(false)
        expect(session.firstRoute).toBe('/dashboard')
        expect(mocks.setAuth).toHaveBeenCalledWith('web-session', expect.objectContaining({ wechatBound: false }), false, null)
    })

    it('does not start trial on login and only exposes existing preparation menus', async () => {
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile('not_started'), ['dashboard', 'students', 'points', 'settings']))
        const session = useSessionStore()
        await session.initialize()
        expect(session.canPrepare).toBe(true)
        expect(session.canWrite).toBe(false)
        expect(session.canImportExport).toBe(false)
        expect(session.sidebar.map(item => item.route_key)).toEqual(['students', 'settings'])
        expect(session.canAccess('/points')).toBe(false)
        expect(mocks.startTrial).not.toHaveBeenCalled()
    })

    it('downgrades an open session at its deadline and keeps its read-only menus', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-11-02T00:00:00Z'))
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile('trial_active', '2026-11-02T00:00:01Z'), ['students', 'points', 'tools']))
        const session = useSessionStore()
        await session.initialize()
        expect(session.canWrite).toBe(true)
        await vi.advanceTimersByTimeAsync(1001)
        expect(session.entitlementState).toBe('trial_expired')
        expect(session.canPrepare).toBe(false)
        expect(session.canWrite).toBe(false)
        expect(session.canAccess('/points')).toBe(true)
        expect(session.canAccess('/tools/timer')).toBe(false)
        expect(mocks.cache.token).toBe('web-session')
    })

    it('does not infer commercial access from an existing common role or missing cache fields', async () => {
        const raw = sessionResponse()
        delete (raw.data.user as { entitlement?: unknown }).entitlement
        mocks.fetchSessionInit.mockResolvedValue(raw)
        const session = useSessionStore()
        await session.initialize()
        expect(session.entitlementState).toBe('unavailable')
        expect(session.canWrite).toBe(false)
        expect(session.canPrepare).toBe(false)
    })

    it('deduplicates explicit trial activation and immediately adopts its server deadline', async () => {
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile('not_started'), ['students', 'settings']))
        const session = useSessionStore()
        await session.initialize()
        const active = profile('trial_active', new Date(Date.now() + 14 * 86400000).toISOString())
        let finish!: (value: { data: ReturnType<typeof profile> }) => void
        mocks.startTrial.mockImplementation(() => new Promise(resolve => { finish = resolve }))
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(active, ['students', 'points', 'settings']))
        const first = session.startTrial()
        const second = session.startTrial()
        expect(session.startingTrial).toBe(true)
        expect(mocks.startTrial).toHaveBeenCalledOnce()
        finish({ data: active })
        await Promise.all([first, second])
        expect(session.entitlementState).toBe('trial_active')
        expect(session.canAccess('/points')).toBe(true)
        expect(session.trialExpiresAt).toBe(Date.parse(active.entitlement.trial_expires_at!))
        expect(session.startingTrial).toBe(false)
        expect(mocks.success).toHaveBeenCalledOnce()
    })

    it('keeps a successful claim when refreshing menus fails instead of inviting another claim', async () => {
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile('not_started'), ['students']))
        const session = useSessionStore()
        await session.initialize()
        mocks.startTrial.mockResolvedValue({ data: profile('trial_active', new Date(Date.now() + 86400000).toISOString()) })
        mocks.fetchSessionInit.mockRejectedValue(new Error('offline'))
        await session.startTrial()
        expect(session.canWrite).toBe(true)
        expect(session.error).toBe('')
        expect(mocks.warning).toHaveBeenCalledWith(expect.stringContaining('试用已开启'))
        await expect(session.startTrial()).rejects.toThrow()
        expect(mocks.startTrial).toHaveBeenCalledOnce()
    })

    it('releases a failed activation for an explicit retry', async () => {
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile('not_started'), ['students']))
        const session = useSessionStore()
        await session.initialize()
        mocks.startTrial.mockRejectedValueOnce(new Error('offline'))
        await expect(session.startTrial()).rejects.toThrow('offline')
        expect(session.startingTrial).toBe(false)
        expect(session.entitlementState).toBe('not_started')
        const active = profile('trial_active', new Date(Date.now() + 86400000).toISOString())
        mocks.startTrial.mockResolvedValue({ data: active })
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(active))
        await session.startTrial()
        expect(mocks.startTrial).toHaveBeenCalledTimes(2)
        expect(session.canWrite).toBe(true)
    })

    it('does not grant a switched account the old activation response', async () => {
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile('not_started'), ['students']))
        const session = useSessionStore()
        await session.initialize()
        let finish!: (value: { data: ReturnType<typeof profile> }) => void
        mocks.startTrial.mockImplementation(() => new Promise(resolve => { finish = resolve }))
        const pending = session.startTrial()
        mocks.cache.token = 'another-session'
        mocks.cache.profile = { id: 'other', name: 'Other', email: '' }
        finish({ data: profile('trial_active', new Date(Date.now() + 86400000).toISOString()) })
        await expect(pending).rejects.toThrow('账号已切换')
        expect(mocks.cache.profile.id).toBe('other')
        expect(session.canWrite).toBe(false)
        expect(mocks.success).not.toHaveBeenCalled()
    })
})

describe('platform administration access', () => {
    function adminResponse(routes: string[] = []) {
        const response = sessionResponse(profile('trial_expired'), routes)
        const role = { id: 1, code: 'admin', name: '超级管理员' }
        response.data.role = role
        response.data.user.role = role
        response.data.user.role_id = 1
        return response
    }

    it('requires a freshly initialized admin role and supports accounts with no teaching menus', async () => {
        mocks.cache.profile = { id: '17', name: 'Teacher', email: '', roleCode: 'admin' }
        const session = useSessionStore()
        expect(session.isSuperAdmin).toBe(false)
        expect(session.canAccess('/platform/users')).toBe(false)
        mocks.fetchSessionInit.mockResolvedValue(adminResponse())
        await session.initialize()
        expect(session.isSuperAdmin).toBe(true)
        expect(session.platformSidebar.map(item => item.route_key)).toEqual([
            'platform/users', 'platform/permissions', 'platform/menus', 'platform/opinions',
        ])
        expect(session.firstRoute).toBe('/platform/users')
        expect(session.canAccess('/platform/users')).toBe(true)
        expect(session.canAccess('/platform/unknown')).toBe(false)
        expect(session.canWrite).toBe(true)
    })

    it('does not let dynamic menus or a parent path grant platform access to an ordinary account', async () => {
        const response = sessionResponse(profile(), ['students'])
        response.data.config.sidebar.push(
            { ...menu('forged'), route_key: 'platform/users' },
            { ...menu('parent'), route_key: 'platform' },
        )
        mocks.fetchSessionInit.mockResolvedValue(response)
        const session = useSessionStore()
        await session.initialize()
        expect(session.isSuperAdmin).toBe(false)
        expect(session.platformSidebar).toEqual([])
        expect(session.sidebar.map(item => item.route_key)).toEqual(['students'])
        expect(session.canAccess('/platform/users')).toBe(false)
        expect(session.canAccess('/platform/users?tab=all')).toBe(false)
        expect(session.canAccess('/students')).toBe(true)
    })

    it('does not identify administrators by role id, display name or permanent entitlement', async () => {
        const response = sessionResponse(profile(), ['dashboard'])
        response.data.role = { id: 1, code: 'common', name: '超级管理员' }
        mocks.fetchSessionInit.mockResolvedValue(response)
        const session = useSessionStore()
        await session.initialize()
        expect(session.isSuperAdmin).toBe(false)
        expect(session.canAccess('/platform/permissions')).toBe(false)
    })

    it('removes platform access after a refresh revokes the role while entitlement stays permanent', async () => {
        mocks.fetchSessionInit.mockResolvedValue(adminResponse(['dashboard']))
        const session = useSessionStore()
        await session.initialize()
        expect(session.isSuperAdmin).toBe(true)
        mocks.fetchSessionInit.mockResolvedValue(sessionResponse(profile(), ['dashboard']))
        await session.initialize(true)
        expect(session.isSuperAdmin).toBe(false)
        expect(session.platformSidebar).toEqual([])
        expect(session.canAccess('/platform/users')).toBe(false)
        expect(session.entitlementState).toBe('permanent')
        expect(session.firstRoute).toBe('/dashboard')
    })

    it('clears platform grants immediately when the account changes', async () => {
        mocks.fetchSessionInit.mockResolvedValue(adminResponse())
        const session = useSessionStore()
        await session.initialize()
        mocks.cache.token = 'ordinary-session'
        expect(session.isSuperAdmin).toBe(false)
        expect(session.platformSidebar).toEqual([])
        expect(session.canAccess('/platform/menus')).toBe(false)
    })
})


describe('session refresh after platform writes', () => {
    it('discards an older in-flight snapshot when an administrator changes their own role', async () => {
        const role = { id: 1, code: 'admin', name: '超级管理员' }
        const admin = sessionResponse(profile(), ['dashboard'])
        admin.data.role = role
        admin.data.user.role = role
        mocks.fetchSessionInit.mockResolvedValue(admin)
        const session = useSessionStore()
        await session.initialize()
        let finishOld!: (value: typeof admin) => void
        mocks.fetchSessionInit.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
        const old = session.initialize(true)
        mocks.fetchSessionInit.mockResolvedValueOnce(sessionResponse(profile(), ['dashboard']))
        await session.refreshAfterMutation()
        expect(mocks.fetchSessionInit).toHaveBeenCalledTimes(3)
        expect(session.isSuperAdmin).toBe(false)
        finishOld(admin)
        await old
        expect(session.isSuperAdmin).toBe(false)
        expect(session.canAccess('/platform/users')).toBe(false)
    })
})
