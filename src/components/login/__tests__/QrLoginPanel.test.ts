import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, ssrContextKey, type App } from 'vue'
import QrLoginPanel from '../QrLoginPanel.vue'

const mocks = vi.hoisted(() => ({
    createQrLogin: vi.fn(), pollQrLogin: vi.fn(),
    createQrBinding: vi.fn(), pollQrBinding: vi.fn(), random: vi.fn(),
}))
vi.mock('@/api/auth', () => ({ authApi: {
    createQrLogin: mocks.createQrLogin, pollQrLogin: mocks.pollQrLogin,
    createQrBinding: mocks.createQrBinding, pollQrBinding: mocks.pollQrBinding,
} }))

interface PanelState {
    status: string
    qrCode: string
    remainingSeconds: number
    errorMessage: string
    createQrCode: () => Promise<void>
}

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})
let app: App | undefined
let authenticated: ReturnType<typeof vi.fn>
let bound: ReturnType<typeof vi.fn>

function mountPanel(purpose?: 'login' | 'bind'): PanelState {
    authenticated = vi.fn()
    bound = vi.fn()
    app = renderer.createApp({ ...QrLoginPanel, render: () => null }, {
        purpose, onAuthenticated: authenticated, onBound: bound,
    })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    return (vm.$ as unknown as { setupState: PanelState }).setupState
}

function createResponse(serialNo: string, seconds = 120) {
    return { data: {
        serial_no: serialNo, claim_secret: 'private-claim',
        expires_at: Date.now() / 1000 + seconds, qr_code: 'data:image/png;base64,aGVsbG8=',
    } }
}

async function settle(): Promise<void> {
    await Promise.resolve()
    await Promise.resolve()
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T00:00:00Z'))
    vi.stubGlobal('window', {
        setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
        setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval,
    })
    let randomCalls = 0
    mocks.random.mockImplementation((bytes: Uint8Array) => bytes.fill(++randomCalls))
    vi.stubGlobal('crypto', { getRandomValues: mocks.random })
    mocks.createQrLogin.mockImplementation(({ serial_no }: { serial_no: string }) => Promise.resolve(createResponse(serial_no)))
    mocks.pollQrLogin.mockResolvedValue({ data: { status: 'pending' } })
    mocks.createQrBinding.mockImplementation(({ serial_no }: { serial_no: string }) => Promise.resolve(createResponse(serial_no)))
    mocks.pollQrBinding.mockResolvedValue({ data: { status: 'pending' } })
})

afterEach(() => {
    app?.unmount()
    app = undefined
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('QR login panel', () => {
    it('creates a random serial and polls with the claim secret after two seconds', async () => {
        const state = mountPanel()
        await settle()

        expect(mocks.random).toHaveBeenCalledWith(expect.any(Uint8Array))
        expect(mocks.random.mock.calls[0]?.[0]).toHaveLength(16)
        expect(mocks.createQrLogin).toHaveBeenCalledWith({ serial_no: '01'.repeat(16) })
        expect(state.qrCode).toBe('data:image/png;base64,aGVsbG8=')
        expect(state.remainingSeconds).toBe(120)
        expect(state.status).toBe('pending')
        expect(mocks.pollQrLogin).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(2000)

        expect(mocks.pollQrLogin).toHaveBeenCalledWith({ serial_no: '01'.repeat(16), claim_secret: 'private-claim' })
    })

    it('keeps at most one poll request in flight', async () => {
        let finishPoll!: (value: { data: { status: string } }) => void
        mocks.pollQrLogin.mockReturnValueOnce(new Promise((resolve) => { finishPoll = resolve }))
        mountPanel()
        await settle()
        await vi.advanceTimersByTimeAsync(8000)
        expect(mocks.pollQrLogin).toHaveBeenCalledTimes(1)

        finishPoll({ data: { status: 'pending' } })
        await settle()
        await vi.advanceTimersByTimeAsync(2000)
        expect(mocks.pollQrLogin).toHaveBeenCalledTimes(2)
    })

    it('refreshes the code and ignores an old successful poll response', async () => {
        let finishPoll!: (value: { data: { status: string; token: string } }) => void
        mocks.pollQrLogin.mockReturnValueOnce(new Promise((resolve) => { finishPoll = resolve }))
        const state = mountPanel()
        await settle()
        await vi.advanceTimersByTimeAsync(2000)

        await state.createQrCode()
        finishPoll({ data: { status: 'success', token: 'old-token' } })
        await settle()

        expect(mocks.createQrLogin).toHaveBeenLastCalledWith({ serial_no: '02'.repeat(16) })
        expect(authenticated).not.toHaveBeenCalled()
        expect(state.status).toBe('pending')
        await vi.advanceTimersByTimeAsync(2000)
        expect(mocks.pollQrLogin).toHaveBeenLastCalledWith({ serial_no: '02'.repeat(16), claim_secret: 'private-claim' })
    })

    it('expires locally and stops polling when the QR lifetime ends', async () => {
        mocks.createQrLogin.mockImplementation(({ serial_no }: { serial_no: string }) => Promise.resolve(createResponse(serial_no, 3)))
        const state = mountPanel()
        await settle()
        await vi.advanceTimersByTimeAsync(3000)

        expect(state.status).toBe('expired')
        expect(state.remainingSeconds).toBe(0)
        expect(vi.getTimerCount()).toBe(0)
        await vi.advanceTimersByTimeAsync(5000)
        expect(mocks.pollQrLogin).toHaveBeenCalledTimes(1)
    })

    it.each(['expired', 'consumed'])('stops polling on terminal status %s', async (status) => {
        mocks.pollQrLogin.mockResolvedValue({ data: { status } })
        const state = mountPanel()
        await settle()
        await vi.advanceTimersByTimeAsync(2000)

        expect(state.status).toBe(status)
        expect(vi.getTimerCount()).toBe(0)
        expect(authenticated).not.toHaveBeenCalled()
        expect(state.errorMessage).toBeTruthy()
    })

    it('emits a successful token once and stops all timers', async () => {
        mocks.pollQrLogin.mockResolvedValue({ data: { status: 'success', token: 'web-token' } })
        const state = mountPanel()
        await settle()
        await vi.advanceTimersByTimeAsync(6000)

        expect(authenticated).toHaveBeenCalledExactlyOnceWith('web-token')
        expect(bound).not.toHaveBeenCalled()
        expect(state.status).toBe('success')
        expect(mocks.pollQrLogin).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('rejects a success response that has no token', async () => {
        mocks.pollQrLogin.mockResolvedValue({ data: { status: 'success' } })
        const state = mountPanel()
        await settle()
        await vi.advanceTimersByTimeAsync(2000)

        expect(state.status).toBe('error')
        expect(state.errorMessage).toBeTruthy()
        expect(authenticated).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('shows create failure and allows a fresh retry', async () => {
        mocks.createQrLogin.mockRejectedValueOnce(new Error('network failure'))
        const state = mountPanel()
        await settle()
        expect(state.status).toBe('error')
        expect(vi.getTimerCount()).toBe(0)

        await state.createQrCode()
        expect(state.status).toBe('pending')
        expect(mocks.createQrLogin).toHaveBeenCalledTimes(2)
    })

    it('rejects an invalid image response without polling', async () => {
        mocks.createQrLogin.mockImplementation(({ serial_no }: { serial_no: string }) => Promise.resolve({
            data: { ...createResponse(serial_no).data, qr_code: 'https://example.com/unsafe.svg' },
        }))
        const state = mountPanel()
        await settle()

        expect(state.status).toBe('error')
        expect(mocks.pollQrLogin).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('retries a network poll failure without overlapping requests', async () => {
        mocks.pollQrLogin.mockRejectedValueOnce(new Error('offline'))
        const state = mountPanel()
        await settle()
        await vi.advanceTimersByTimeAsync(2000)
        expect(state.status).toBe('pending')
        expect(state.errorMessage).toBeTruthy()

        await vi.advanceTimersByTimeAsync(2000)
        expect(mocks.pollQrLogin).toHaveBeenCalledTimes(2)
        expect(state.errorMessage).toBe('')
    })

    it('stops timers and ignores a pending poll response after unmount', async () => {
        let finishPoll!: (value: { data: { status: string; token: string } }) => void
        mocks.pollQrLogin.mockReturnValue(new Promise((resolve) => { finishPoll = resolve }))
        mountPanel()
        await settle()
        await vi.advanceTimersByTimeAsync(2000)
        app?.unmount()
        app = undefined
        finishPoll({ data: { status: 'success', token: 'late-token' } })
        await settle()

        expect(authenticated).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('ignores a create response after unmount and creates no timer', async () => {
        let finishCreate!: (value: ReturnType<typeof createResponse>) => void
        mocks.createQrLogin.mockReturnValue(new Promise((resolve) => { finishCreate = resolve }))
        mountPanel()
        app?.unmount()
        app = undefined
        finishCreate(createResponse('01'.repeat(16)))
        await settle()

        expect(vi.getTimerCount()).toBe(0)
        expect(mocks.pollQrLogin).not.toHaveBeenCalled()
    })
})

describe('QR binding panel', () => {
    it('creates and polls a binding QR code with the claim secret', async () => {
        const state = mountPanel('bind')
        await settle()

        expect(mocks.createQrBinding).toHaveBeenCalledExactlyOnceWith({ serial_no: '01'.repeat(16) })
        expect(mocks.createQrLogin).not.toHaveBeenCalled()
        expect(state.qrCode).toBe('data:image/png;base64,aGVsbG8=')
        expect(state.remainingSeconds).toBe(120)
        expect(state.status).toBe('pending')

        await vi.advanceTimersByTimeAsync(2000)

        expect(mocks.pollQrBinding).toHaveBeenCalledExactlyOnceWith({
            serial_no: '01'.repeat(16), claim_secret: 'private-claim',
        })
        expect(mocks.pollQrLogin).not.toHaveBeenCalled()
    })

    it.each([
        { response: { status: 'success' } },
        { response: { status: 'success', token: 'unexpected-login-token' } },
    ])('emits bound once without authenticating for $response', async ({ response }) => {
        mocks.pollQrBinding.mockResolvedValue({ data: response })
        const state = mountPanel('bind')
        await settle()
        await vi.advanceTimersByTimeAsync(6000)

        expect(bound).toHaveBeenCalledExactlyOnceWith()
        expect(authenticated).not.toHaveBeenCalled()
        expect(state.status).toBe('success')
        expect(mocks.pollQrBinding).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('keeps at most one binding poll request in flight', async () => {
        let finishPoll!: (value: { data: { status: string } }) => void
        mocks.pollQrBinding.mockReturnValueOnce(new Promise((resolve) => { finishPoll = resolve }))
        mountPanel('bind')
        await settle()
        await vi.advanceTimersByTimeAsync(8000)
        expect(mocks.pollQrBinding).toHaveBeenCalledTimes(1)

        finishPoll({ data: { status: 'pending' } })
        await settle()
        await vi.advanceTimersByTimeAsync(2000)
        expect(mocks.pollQrBinding).toHaveBeenCalledTimes(2)
    })

    it('refreshes a binding QR code and ignores the old successful poll', async () => {
        let finishPoll!: (value: { data: { status: string } }) => void
        mocks.pollQrBinding.mockReturnValueOnce(new Promise((resolve) => { finishPoll = resolve }))
        const state = mountPanel('bind')
        await settle()
        await vi.advanceTimersByTimeAsync(2000)

        await state.createQrCode()
        finishPoll({ data: { status: 'success' } })
        await settle()

        expect(mocks.createQrBinding).toHaveBeenLastCalledWith({ serial_no: '02'.repeat(16) })
        expect(bound).not.toHaveBeenCalled()
        expect(authenticated).not.toHaveBeenCalled()
        expect(state.status).toBe('pending')
        await vi.advanceTimersByTimeAsync(2000)
        expect(mocks.pollQrBinding).toHaveBeenLastCalledWith({
            serial_no: '02'.repeat(16), claim_secret: 'private-claim',
        })
    })

    it('expires locally and stops binding polls when the QR lifetime ends', async () => {
        mocks.createQrBinding.mockImplementation(({ serial_no }: { serial_no: string }) => Promise.resolve(createResponse(serial_no, 3)))
        const state = mountPanel('bind')
        await settle()
        await vi.advanceTimersByTimeAsync(3000)

        expect(state.status).toBe('expired')
        expect(state.remainingSeconds).toBe(0)
        expect(vi.getTimerCount()).toBe(0)
        await vi.advanceTimersByTimeAsync(5000)
        expect(mocks.pollQrBinding).toHaveBeenCalledTimes(1)
        expect(bound).not.toHaveBeenCalled()
    })

    it.each(['expired', 'consumed'])('stops binding polls on terminal status %s', async (status) => {
        mocks.pollQrBinding.mockResolvedValue({ data: { status } })
        const state = mountPanel('bind')
        await settle()
        await vi.advanceTimersByTimeAsync(2000)

        expect(state.status).toBe(status)
        expect(state.errorMessage).toBeTruthy()
        expect(bound).not.toHaveBeenCalled()
        expect(authenticated).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('shows binding QR creation failure and allows a fresh retry', async () => {
        mocks.createQrBinding.mockRejectedValueOnce(new Error('network failure'))
        const state = mountPanel('bind')
        await settle()
        expect(state.status).toBe('error')
        expect(vi.getTimerCount()).toBe(0)

        await state.createQrCode()
        expect(state.status).toBe('pending')
        expect(mocks.createQrBinding).toHaveBeenCalledTimes(2)
        expect(mocks.createQrLogin).not.toHaveBeenCalled()
    })

    it('retries a failed binding poll and clears the error after recovery', async () => {
        mocks.pollQrBinding.mockRejectedValueOnce(new Error('offline'))
        const state = mountPanel('bind')
        await settle()
        await vi.advanceTimersByTimeAsync(2000)
        expect(state.status).toBe('pending')
        expect(state.errorMessage).toBeTruthy()

        await vi.advanceTimersByTimeAsync(2000)
        expect(mocks.pollQrBinding).toHaveBeenCalledTimes(2)
        expect(state.errorMessage).toBe('')
        expect(bound).not.toHaveBeenCalled()
    })

    it('ignores a successful binding poll after unmount and stops timers', async () => {
        let finishPoll!: (value: { data: { status: string } }) => void
        mocks.pollQrBinding.mockReturnValue(new Promise((resolve) => { finishPoll = resolve }))
        mountPanel('bind')
        await settle()
        await vi.advanceTimersByTimeAsync(2000)
        app?.unmount()
        app = undefined
        finishPoll({ data: { status: 'success' } })
        await settle()

        expect(bound).not.toHaveBeenCalled()
        expect(authenticated).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('ignores a binding QR creation response after unmount', async () => {
        let finishCreate!: (value: ReturnType<typeof createResponse>) => void
        mocks.createQrBinding.mockReturnValue(new Promise((resolve) => { finishCreate = resolve }))
        mountPanel('bind')
        app?.unmount()
        app = undefined
        finishCreate(createResponse('01'.repeat(16)))
        await settle()

        expect(mocks.pollQrBinding).not.toHaveBeenCalled()
        expect(bound).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })
})
