import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '../sessionStore'

const mocks = vi.hoisted(() => ({ fetchSessionInit: vi.fn(), setAuth: vi.fn() }))
vi.mock('@/api/session', () => ({ fetchSessionInit: mocks.fetchSessionInit }))
vi.mock('@/stores/cacheStore', () => ({
    useCacheStore: () => ({ token: 'web-session', profile: null, setAuth: mocks.setAuth }),
}))

beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
    mocks.fetchSessionInit.mockResolvedValue({ data: {
        user: { id: 17, email: 'teacher@example.com', wechat_bound: false },
        role: { id: 2, code: 'limited', name: '受限角色' },
        config: { sidebar: [
            { id: 1, code: 'dashboard', name: '班级总览', route_key: 'dashboard', icon: 'HomeFilled', sort: 1 },
        ] },
    } })
})

describe('account binding access', () => {
    it('lets an authenticated role without settings access bind its own mini program without granting other settings', async () => {
        const session = useSessionStore()
        await session.initialize()

        expect(session.canAccess('/settings/mini-program')).toBe(true)
        expect(session.canAccess('/dashboard')).toBe(true)
        expect(session.canAccess('/settings')).toBe(false)
        expect(session.canAccess('/settings/mini-program/other')).toBe(false)
        expect(session.canAccess('/students')).toBe(false)
        expect(session.firstRoute).toBe('/dashboard')
        expect(mocks.setAuth).toHaveBeenCalledWith('web-session', expect.objectContaining({ wechatBound: false }), true, expect.any(Number))
    })
})
