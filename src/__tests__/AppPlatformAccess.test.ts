import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, reactive, ssrContextKey, type App } from 'vue'
import AppView from '../App.vue'

interface SessionState {
    entitlementState: string
    isSuperAdmin: boolean
    sidebar: Array<{ route_key: string }>
    initialized: boolean
    error: string
    firstRoute: string | null
    canAccess: (path: string) => boolean
}

const mocks = vi.hoisted(() => ({
    session: {} as SessionState,
    cache: { isAuthenticated: true },
    router: { currentRoute: { value: { path: '/platform/users' } }, replace: vi.fn() },
}))

vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => mocks.session }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('vue-router', () => ({ useRouter: () => mocks.router }))

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

function mountApp(): void {
    app = renderer.createApp({ ...AppView, render: () => null })
    app.provide(ssrContextKey, { modules: new Set() })
    app.mount({})
}

beforeEach(() => {
    vi.resetAllMocks()
    mocks.cache = reactive({ isAuthenticated: true })
    mocks.router = reactive({
        currentRoute: { value: { path: '/platform/users' } },
        replace: vi.fn().mockResolvedValue(undefined),
    })
    mocks.session = reactive({
        entitlementState: 'permanent',
        isSuperAdmin: true,
        sidebar: [{ route_key: 'students' }],
        initialized: true,
        error: '',
        firstRoute: '/students',
        canAccess: vi.fn((path: string) => !path.startsWith('/platform/') || mocks.session.isSuperAdmin),
    })
})

afterEach(() => {
    app?.unmount()
    app = undefined
})

describe('App platform access changes', () => {
    it('leaves the platform page when the superadmin role is revoked while entitlement stays permanent', async () => {
        mountApp()
        expect(mocks.router.replace).not.toHaveBeenCalled()

        mocks.session.isSuperAdmin = false
        await nextTick()

        expect(mocks.session.entitlementState).toBe('permanent')
        expect(mocks.session.canAccess).toHaveBeenCalledWith('/platform/users')
        expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith('/students')
    })

    it('falls back to no-access when the revoked user has no remaining route', async () => {
        mocks.session.firstRoute = null
        mocks.session.sidebar = []
        mountApp()

        mocks.session.isSuperAdmin = false
        await nextTick()

        expect(mocks.session.entitlementState).toBe('permanent')
        expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith('/no-access')
    })

    it.each([
        { initialized: false, error: '' },
        { initialized: true, error: '会话服务暂不可用' },
    ])('does not redirect with initialized=$initialized and error=$error', async ({ initialized, error }) => {
        mocks.session.initialized = initialized
        mocks.session.error = error
        mountApp()

        mocks.session.isSuperAdmin = false
        mocks.session.sidebar = []
        await nextTick()

        expect(mocks.router.replace).not.toHaveBeenCalled()
    })

    it.each(['/auth', '/no-access'])('keeps the existing %s boundary page after role revocation', async (path) => {
        mocks.router.currentRoute.value.path = path
        mountApp()

        mocks.session.isSuperAdmin = false
        await nextTick()

        expect(mocks.router.replace).not.toHaveBeenCalled()
    })

    it('keeps a permitted teaching page after the superadmin role is revoked', async () => {
        mocks.router.currentRoute.value.path = '/students'
        mountApp()

        mocks.session.isSuperAdmin = false
        await nextTick()

        expect(mocks.session.canAccess).toHaveBeenCalledWith('/students')
        expect(mocks.router.replace).not.toHaveBeenCalled()
    })

    it('checks access again when the sidebar changes without an entitlement or role change', async () => {
        mocks.router.currentRoute.value.path = '/students'
        mocks.session.firstRoute = '/platform/users'
        mocks.session.canAccess = vi.fn((path: string) => mocks.session.sidebar.some((menu) => `/${menu.route_key}` === path))
        mountApp()

        mocks.session.sidebar = []
        await nextTick()

        expect(mocks.session.entitlementState).toBe('permanent')
        expect(mocks.session.isSuperAdmin).toBe(true)
        expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith('/platform/users')
    })
})
