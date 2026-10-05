import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, ssrContextKey, type App } from 'vue'
import AuthView from '../AuthView.vue'
import { ApiRequestError } from '@/types/api'

const mocks = vi.hoisted(() => ({
    login: vi.fn(),
    sendEmailCode: vi.fn(),
    sha256Hex: vi.fn(),
    initialize: vi.fn(),
    reset: vi.fn(),
    replace: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    cache: {
        isAuthenticated: false,
        setTokenOnly: vi.fn(),
        logout: vi.fn(),
    },
    route: { query: {} as Record<string, unknown> },
}))

vi.mock('@/api/auth', () => ({ authApi: { login: mocks.login, sendEmailCode: mocks.sendEmailCode } }))
vi.mock('@/utils/crypto', () => ({ sha256Hex: mocks.sha256Hex }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('@/stores/sessionStore', () => ({
    useSessionStore: () => ({ initialize: mocks.initialize, reset: mocks.reset }),
}))
vi.mock('vue-router', () => ({
    useRoute: () => mocks.route,
    useRouter: () => ({ replace: mocks.replace }),
}))
vi.mock('element-plus', () => ({ ElMessage: { success: mocks.success, error: mocks.error } }))
vi.mock('@/components/login/AnimatedCharacters.vue', () => ({ default: { render: () => null } }))

interface AuthState {
    loginType: 'password' | 'code'
    loginForm: { email: string; password: string; code: string }
    loginLoading: boolean
    loginSendLoading: boolean
    loginCountdown: number
    handleLogin: () => Promise<void>
    handleSendLoginCode: () => Promise<void>
    switchLoginType: (type: 'password' | 'code') => void
}

// Exercise the real setup and lifecycle without a browser or decorative animation.
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

function mountAuth(): AuthState {
    app = renderer.createApp({ ...AuthView, render: () => null })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    return (vm.$ as unknown as { setupState: AuthState }).setupState
}

function useCodeLogin(): AuthState {
    const state = mountAuth()
    state.switchLoginType('code')
    state.loginForm.email = 'teacher@example.com'
    state.loginForm.code = '123456'
    return state
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.stubGlobal('window', {
        setInterval: globalThis.setInterval,
        clearInterval: globalThis.clearInterval,
    })
    mocks.cache.isAuthenticated = false
    mocks.route.query = {}
    mocks.login.mockResolvedValue({ data: { token: 'session-token' } })
    mocks.sendEmailCode.mockResolvedValue({ data: null })
    mocks.sha256Hex.mockResolvedValue('hashed-password')
    mocks.initialize.mockResolvedValue(undefined)
    mocks.replace.mockResolvedValue(undefined)
    mocks.cache.setTokenOnly.mockImplementation(() => { mocks.cache.isAuthenticated = true })
})

afterEach(() => {
    app?.unmount()
    app = undefined
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('AuthView login', () => {
    it('keeps password login as the default and hashes the password', async () => {
        const state = mountAuth()
        expect(state.loginType).toBe('password')
        state.loginForm.email = ' teacher@example.com '
        state.loginForm.password = ' secret123 '
        state.loginForm.code = '123456'

        await state.handleLogin()

        expect(mocks.sha256Hex).toHaveBeenCalledWith('secret123')
        expect(mocks.login).toHaveBeenCalledWith({
            email: 'teacher@example.com', login_type: 'password', password: 'hashed-password', code: '',
        })
        expect(mocks.replace).toHaveBeenCalledWith('/points')
    })

    it('logs in with the email code and initializes the session before redirecting', async () => {
        mocks.route.query.redirect = '/students'
        const state = useCodeLogin()
        state.loginForm.email = ' teacher@example.com '
        state.loginForm.code = ' 123456 '

        await state.handleLogin()

        expect(mocks.sha256Hex).not.toHaveBeenCalled()
        expect(mocks.login).toHaveBeenCalledWith({
            email: 'teacher@example.com', login_type: 'code', password: '', code: '123456',
        })
        expect(mocks.cache.setTokenOnly).toHaveBeenCalledWith('session-token')
        expect(mocks.initialize).toHaveBeenCalledWith(true)
        expect(mocks.replace).toHaveBeenCalledWith('/students')
        expect(mocks.cache.setTokenOnly.mock.invocationCallOrder[0]).toBeLessThan(mocks.initialize.mock.invocationCallOrder[0]!)
        expect(mocks.initialize.mock.invocationCallOrder[0]).toBeLessThan(mocks.replace.mock.invocationCallOrder[0]!)
        expect(state.loginLoading).toBe(false)
    })

    it('accepts a local email domain and preserves leading zeros in the verification code', async () => {
        const state = useCodeLogin()
        state.loginForm.email = 'teacher@localhost'
        state.loginForm.code = '012345'

        await state.handleLogin()

        expect(mocks.login).toHaveBeenCalledWith({
            email: 'teacher@localhost', login_type: 'code', password: '', code: '012345',
        })
        expect(mocks.replace).toHaveBeenCalledWith('/points')
    })

    it.each(['', 'invalid-email', 'teacher @example.com', 'teacher@'])('rejects invalid email %j before sending or logging in', async (email) => {
        const state = useCodeLogin()
        state.loginForm.email = email

        await state.handleSendLoginCode()
        await state.handleLogin()

        expect(mocks.sendEmailCode).not.toHaveBeenCalled()
        expect(mocks.login).not.toHaveBeenCalled()
        expect(mocks.error).toHaveBeenCalled()
    })

    it.each(['', '12345', '1234567', 'abcdef', '１２３４５６'])('rejects invalid verification code %j without a login request', async (code) => {
        const state = useCodeLogin()
        state.loginForm.code = code

        await state.handleLogin()

        expect(mocks.login).not.toHaveBeenCalled()
        expect(mocks.error).toHaveBeenCalled()
        expect(state.loginLoading).toBe(false)
    })

    it('prevents duplicate logins and code requests while login is pending', async () => {
        let finishLogin!: (response: { data: { token: string } }) => void
        mocks.login.mockReturnValue(new Promise((resolve) => { finishLogin = resolve }))
        const state = useCodeLogin()

        const pendingLogin = state.handleLogin()
        await state.handleLogin()
        await state.handleSendLoginCode()

        expect(mocks.login).toHaveBeenCalledTimes(1)
        expect(mocks.sendEmailCode).not.toHaveBeenCalled()
        expect(state.loginLoading).toBe(true)
        finishLogin({ data: { token: 'session-token' } })
        await pendingLogin
        expect(state.loginLoading).toBe(false)
    })

    it('preserves the code and releases the login lock after a network failure so the user can retry', async () => {
        mocks.login.mockRejectedValueOnce(new Error('network disconnected'))
        const state = useCodeLogin()

        await state.handleLogin()

        expect(state.loginForm.code).toBe('123456')
        expect(state.loginLoading).toBe(false)
        expect(mocks.error).toHaveBeenCalledTimes(1)
        expect(mocks.reset).toHaveBeenCalledTimes(1)
        expect(mocks.cache.logout).toHaveBeenCalledTimes(1)
        expect(mocks.replace).not.toHaveBeenCalled()

        await state.handleLogin()
        expect(mocks.login).toHaveBeenCalledTimes(2)
        expect(mocks.replace).toHaveBeenCalledWith('/points')
    })

    it('does not repeat an error already reported by the API layer', async () => {
        mocks.login.mockRejectedValue(new ApiRequestError('验证码错误'))
        const state = useCodeLogin()

        await state.handleLogin()

        expect(mocks.error).not.toHaveBeenCalled()
        expect(state.loginLoading).toBe(false)
        expect(state.loginForm.code).toBe('123456')
    })

    it('retains an accepted token without reporting login success when session initialization fails', async () => {
        mocks.initialize.mockRejectedValue(new Error('session unavailable'))
        const state = useCodeLogin()

        await state.handleLogin()

        expect(mocks.cache.setTokenOnly).toHaveBeenCalledWith('session-token')
        expect(mocks.cache.logout).not.toHaveBeenCalled()
        expect(mocks.reset).not.toHaveBeenCalled()
        expect(mocks.replace).not.toHaveBeenCalled()
        expect(mocks.success).not.toHaveBeenCalled()
        expect(state.loginLoading).toBe(false)
    })
})

describe('AuthView login verification code', () => {
    it('locks duplicate sends and login, then allows another send after the 60 second cooldown', async () => {
        let finishSend!: (response: { data: null }) => void
        mocks.sendEmailCode.mockReturnValueOnce(new Promise((resolve) => { finishSend = resolve }))
        const state = useCodeLogin()
        state.loginForm.email = ' teacher@example.com '

        const pendingSend = state.handleSendLoginCode()
        await state.handleSendLoginCode()
        await state.handleLogin()

        expect(mocks.sendEmailCode).toHaveBeenCalledTimes(1)
        expect(mocks.sendEmailCode).toHaveBeenCalledWith({ email: 'teacher@example.com' })
        expect(mocks.login).not.toHaveBeenCalled()
        expect(state.loginSendLoading).toBe(true)
        expect(state.loginCountdown).toBe(0)

        finishSend({ data: null })
        await pendingSend
        expect(state.loginSendLoading).toBe(false)
        expect(state.loginCountdown).toBe(60)
        await state.handleSendLoginCode()
        expect(mocks.sendEmailCode).toHaveBeenCalledTimes(1)

        vi.advanceTimersByTime(59_000)
        expect(state.loginCountdown).toBe(1)
        vi.advanceTimersByTime(1000)
        expect(state.loginCountdown).toBe(0)
        expect(vi.getTimerCount()).toBe(0)
        await state.handleSendLoginCode()
        expect(mocks.sendEmailCode).toHaveBeenCalledTimes(2)
    })

    it('allows retry immediately after a failed send without starting the cooldown', async () => {
        mocks.sendEmailCode.mockRejectedValueOnce(new Error('network disconnected'))
        const state = useCodeLogin()

        await state.handleSendLoginCode()

        expect(state.loginSendLoading).toBe(false)
        expect(state.loginCountdown).toBe(0)
        expect(vi.getTimerCount()).toBe(0)
        expect(mocks.error).toHaveBeenCalledTimes(1)

        await state.handleSendLoginCode()
        expect(mocks.sendEmailCode).toHaveBeenCalledTimes(2)
        expect(state.loginCountdown).toBe(60)
    })

    it('does not repeat a send error already reported by the API layer', async () => {
        mocks.sendEmailCode.mockRejectedValue(new ApiRequestError('请稍后再试'))
        const state = useCodeLogin()

        await state.handleSendLoginCode()

        expect(mocks.error).not.toHaveBeenCalled()
        expect(state.loginSendLoading).toBe(false)
        expect(state.loginCountdown).toBe(0)
    })

    it('clears the cooldown timer when the page unmounts', async () => {
        const state = useCodeLogin()
        await state.handleSendLoginCode()
        expect(vi.getTimerCount()).toBe(1)

        app?.unmount()
        app = undefined

        expect(vi.getTimerCount()).toBe(0)
    })

    it('does not create a timer when a send completes after the page unmounts', async () => {
        let finishSend!: (response: { data: null }) => void
        mocks.sendEmailCode.mockReturnValue(new Promise((resolve) => { finishSend = resolve }))
        const state = useCodeLogin()
        const pendingSend = state.handleSendLoginCode()

        app?.unmount()
        app = undefined
        finishSend({ data: null })
        await pendingSend

        expect(vi.getTimerCount()).toBe(0)
    })
})
