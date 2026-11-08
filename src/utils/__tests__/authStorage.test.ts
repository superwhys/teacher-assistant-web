import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '@/types/user'

const AUTH_KEY = 'ta_cache_global_v1'
const TAB_SCOPE_KEY = 'ta_auth_tab_scope_v1'
const admin: UserProfile = { id: 'admin', name: '超管', email: 'admin@example.com', roleCode: 'admin' }
const teacher: UserProfile = { id: 'teacher', name: '教师', email: 'teacher@example.com', roleCode: 'common' }

function memoryStorage() {
    const values = new Map<string, string>()
    return {
        getItem: vi.fn((key: string) => values.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => { values.set(key, value) }),
    }
}

let local: ReturnType<typeof memoryStorage>
let session: ReturnType<typeof memoryStorage>
const disposals: Array<() => void> = []

function setLocation(search: string) {
    vi.stubGlobal('window', { location: { search }, localStorage: local, sessionStorage: session })
}

async function loadCacheStore(search: string) {
    vi.resetModules()
    setLocation(search)
    const { ensureAuthStorage } = await import('../authStorage')
    ensureAuthStorage()
    const { createPinia, disposePinia } = await import('pinia')
    const { createApp, nextTick } = await import('vue')
    const { default: persistedState } = await import('pinia-plugin-persistedstate')
    const { useCacheStore } = await import('@/stores/cacheStore')
    const pinia = createPinia().use(persistedState)
    createApp({}).use(pinia)
    disposals.push(() => disposePinia(pinia))
    return { store: useCacheStore(pinia), flush: nextTick }
}

beforeEach(() => {
    vi.resetModules()
    local = memoryStorage()
    session = memoryStorage()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', session)
    setLocation('')
})

afterEach(() => {
    for (const dispose of disposals.splice(0)) dispose()
    vi.unstubAllGlobals()
})

describe('authentication persistence scope', () => {
    it('keeps ordinary login and refresh in the existing global localStorage cache', async () => {
        const { store, flush } = await loadCacheStore('')
        store.setAuth('admin-token', admin, false, null)
        store.setExpired(true)
        await flush()

        expect(JSON.parse(local.getItem(AUTH_KEY)!)).toMatchObject({
            token: 'admin-token', profile: admin, isExpired: true,
        })
        expect(session.getItem(AUTH_KEY)).toBeNull()

        const reloaded = await loadCacheStore('')
        expect(reloaded.store.token).toBe('admin-token')
        expect(reloaded.store.profile).toEqual(admin)
        expect(reloaded.store.isExpired).toBe(true)
    })

    it('starts an explicit tab session without hydrating the superadmin token or profile', async () => {
        const adminCache = JSON.stringify({ token: 'admin-token', profile: admin, isExpired: false })
        local.setItem(AUTH_KEY, adminCache)
        local.getItem.mockClear()
        const { store, flush } = await loadCacheStore('?session=tab&token=teacher-token')

        expect(store.token).toBeNull()
        expect(store.profile).toBeNull()
        expect(local.getItem).not.toHaveBeenCalledWith(AUTH_KEY)
        store.setTokenOnly('teacher-token')
        await flush()
        expect(store.profile).toBeNull()
        expect(JSON.parse(session.getItem(AUTH_KEY)!)).toMatchObject({ token: 'teacher-token', profile: null })

        store.updateProfile(teacher)
        store.setExpired(true)
        await flush()
        expect(JSON.parse(session.getItem(AUTH_KEY)!)).toMatchObject({
            token: 'teacher-token', profile: teacher, isExpired: true,
        })
        expect(local.getItem(AUTH_KEY)).toBe(adminCache)
    })

    it('restores the tab token, profile and expiry after the URL scope parameter is removed', async () => {
        local.setItem(AUTH_KEY, JSON.stringify({ token: 'admin-token', profile: admin }))
        const initial = await loadCacheStore('?session=tab&token=teacher-token')
        const trialDeadline = '2030-01-01T00:00:00Z'
        const trialTeacher: UserProfile = {
            ...teacher,
            entitlement: {
                state: 'trial_active', permanent: false, trial_started_at: null,
                trial_expires_at: trialDeadline, paid_expires_at: null,
            },
        }
        initial.store.setAuth('teacher-token', trialTeacher)
        initial.store.setExpired(true)
        await initial.flush()
        expect(session.getItem(TAB_SCOPE_KEY)).toBe('1')

        const reloaded = await loadCacheStore('')
        expect(reloaded.store.token).toBe('teacher-token')
        expect(reloaded.store.profile).toEqual(trialTeacher)
        expect(reloaded.store.isExpired).toBe(true)
        expect(reloaded.store.isTrial).toBe(true)
        expect(reloaded.store.trialExpiresAt).toBe(Date.parse(trialDeadline) / 1000)
    })

    it('logs out only the tab session and cannot restore the superadmin on refresh', async () => {
        const adminCache = JSON.stringify({ token: 'admin-token', profile: admin, isExpired: false })
        local.setItem(AUTH_KEY, adminCache)
        const { store, flush } = await loadCacheStore('?session=tab&token=teacher-token')
        store.setAuth('teacher-token', teacher, true, 1234)
        await flush()
        store.logout()
        await flush()

        expect(JSON.parse(session.getItem(AUTH_KEY)!)).toEqual({
            token: null, profile: null, isTrial: false, trialExpiresAt: null, isExpired: false,
        })
        expect(local.getItem(AUTH_KEY)).toBe(adminCache)
        expect(session.getItem(TAB_SCOPE_KEY)).toBe('1')

        const reloaded = await loadCacheStore('')
        expect(reloaded.store.token).toBeNull()
        expect(reloaded.store.profile).toBeNull()
    })

    it('keeps user business preferences in their existing localStorage namespace', async () => {
        const { store, flush } = await loadCacheStore('?session=tab')
        store.setAuth('teacher-token', teacher, false, null)
        store.setActiveClassId(7)
        await flush()

        expect(JSON.parse(local.getItem('ta_cache:teacher')!)).toMatchObject({ activeClassId: 7 })
        expect(session.getItem('ta_cache:teacher')).toBeNull()
        expect(local.getItem(AUTH_KEY)).toBeNull()
    })

    it('supports ordinary node/test storage mocks without window sessionStorage or location', async () => {
        vi.stubGlobal('window', { localStorage: local })
        const { authStorage, ensureAuthStorage } = await import('../authStorage')
        ensureAuthStorage()
        authStorage.setItem(AUTH_KEY, 'ordinary-auth')
        expect(authStorage.getItem(AUTH_KEY)).toBe('ordinary-auth')
        expect(local.getItem(AUTH_KEY)).toBe('ordinary-auth')
    })

    it.each(['missing', 'read', 'write'] as const)('fails an explicit tab session with %s sessionStorage instead of touching global auth', async (failure) => {
        local.setItem(AUTH_KEY, 'superadmin-auth')
        local.getItem.mockClear()
        local.setItem.mockClear()
        const unavailable = failure === 'missing' ? undefined : {
            getItem: () => { if (failure === 'read') throw new Error('blocked'); return null },
            setItem: () => { if (failure === 'write') throw new Error('blocked') },
        }
        vi.stubGlobal('window', { location: { search: '?session=tab&token=teacher-token' }, sessionStorage: unavailable })
        const { authStorage, ensureAuthStorage } = await import('../authStorage')

        expect(ensureAuthStorage).toThrow('无法创建独立的代登录会话')
        expect(() => authStorage.getItem(AUTH_KEY)).toThrow('无法创建独立的代登录会话')
        expect(() => authStorage.setItem(AUTH_KEY, 'teacher-auth')).toThrow('无法创建独立的代登录会话')
        expect(local.getItem).not.toHaveBeenCalled()
        expect(local.setItem).not.toHaveBeenCalled()
    })

    it('does not fall back to global auth if tab persistence fails after initialization', async () => {
        local.setItem(AUTH_KEY, 'superadmin-auth')
        setLocation('?session=tab')
        const { authStorage, ensureAuthStorage } = await import('../authStorage')
        ensureAuthStorage()
        setLocation('')
        session.setItem.mockImplementation(() => { throw new Error('quota exceeded') })

        expect(() => authStorage.setItem(AUTH_KEY, 'teacher-auth')).toThrow('quota exceeded')
        expect(local.getItem(AUTH_KEY)).toBe('superadmin-auth')
    })

    it('does not restore global auth when a refreshed tab cannot read its persisted scope', async () => {
        local.setItem(AUTH_KEY, 'superadmin-auth')
        session.setItem(TAB_SCOPE_KEY, '1')
        session.getItem.mockImplementation(() => { throw new Error('storage blocked') })
        const { authStorage, ensureAuthStorage } = await import('../authStorage')
        local.getItem.mockClear()
        local.setItem.mockClear()

        expect(ensureAuthStorage).toThrow('无法读取标签页会话')
        expect(() => authStorage.setItem(AUTH_KEY, 'teacher-auth')).toThrow('无法读取标签页会话')
        expect(local.getItem).not.toHaveBeenCalled()
        expect(local.setItem).not.toHaveBeenCalled()
    })
})
