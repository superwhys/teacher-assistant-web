import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, reactive, ssrContextKey, type App } from 'vue'
import AccountEntitlementNotice from '../AccountEntitlementNotice.vue'
import { ApiRequestError } from '@/types/api'

const mocks = vi.hoisted(() => ({
    confirm: vi.fn(),
    startTrial: vi.fn(),
    initialize: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    cache: { token: 'token-a', profile: { id: 'teacher-a' } },
    session: {
        entitlementState: 'not_started',
        entitlementMessage: '尚未开启试用，可新增班级、学生、分组及维护组员。',
        canWrite: false,
        startingTrial: false,
        trialExpiresAt: null as number | null,
        paidExpiresAt: null as number | null,
        startTrial: vi.fn(),
        initialize: vi.fn(),
    },
}))

vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => mocks.session }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('@/utils/confirmDialog', () => ({ confirmDialog: mocks.confirm }))
vi.mock('element-plus', () => ({
    ElMessage: { warning: mocks.warning, error: mocks.error },
}))

interface NoticeState {
    statusText: string
    expiresAtText: string
    confirming: boolean
    synchronizing: boolean
    confirmStartTrial: () => Promise<void>
    synchronizeEntitlement: () => Promise<void>
}

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})

let app: App | undefined

function mountNotice(): NoticeState {
    app = renderer.createApp({ ...AccountEntitlementNotice, render: () => null })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    return (vm.$ as unknown as { setupState: NoticeState }).setupState
}

beforeEach(() => {
    vi.resetAllMocks()
    mocks.session = reactive({
        entitlementState: 'not_started',
        entitlementMessage: '尚未开启试用，可新增班级、学生、分组及维护组员。',
        canWrite: false,
        startingTrial: false,
        trialExpiresAt: null,
        paidExpiresAt: null,
        startTrial: mocks.startTrial,
        initialize: mocks.initialize,
    })
    mocks.cache = reactive({ token: 'token-a', profile: { id: 'teacher-a' } })
    mocks.confirm.mockResolvedValue('confirm')
    mocks.startTrial.mockResolvedValue(undefined)
    mocks.initialize.mockResolvedValue(undefined)
})

afterEach(() => {
    app?.unmount()
    app = undefined
})

describe('AccountEntitlementNotice', () => {
    it('waits for explicit confirmation and prevents duplicate confirmation or activation', async () => {
        let confirm!: (value: string) => void
        mocks.confirm.mockReturnValue(new Promise((resolve) => { confirm = resolve }))
        const notice = mountNotice()
        expect(mocks.startTrial).not.toHaveBeenCalled()

        const pending = notice.confirmStartTrial()
        await notice.confirmStartTrial()
        expect(notice.confirming).toBe(true)
        expect(mocks.confirm).toHaveBeenCalledTimes(1)
        expect(mocks.confirm.mock.calls[0]?.[0]).toContain('连续计时 14 天')
        expect(mocks.confirm.mock.calls[0]?.[0]).toContain('每个账号只能领取一次')
        expect(mocks.startTrial).not.toHaveBeenCalled()

        confirm('confirm')
        await pending
        expect(mocks.startTrial).toHaveBeenCalledTimes(1)
        expect(notice.confirming).toBe(false)
    })

    it('does not activate after cancellation and allows the teacher to open confirmation again', async () => {
        mocks.confirm.mockRejectedValueOnce('cancel')
        const notice = mountNotice()

        await notice.confirmStartTrial()
        expect(mocks.startTrial).not.toHaveBeenCalled()
        expect(notice.confirming).toBe(false)

        await notice.confirmStartTrial()
        expect(mocks.startTrial).toHaveBeenCalledTimes(1)
    })

    it.each(['token', 'user-id'])('rejects a confirmation opened for a different account when %s changes', async (changed) => {
        let confirm!: (value: string) => void
        mocks.confirm.mockReturnValue(new Promise((resolve) => { confirm = resolve }))
        const notice = mountNotice()
        const pending = notice.confirmStartTrial()

        if (changed === 'token') mocks.cache.token = 'token-b'
        else mocks.cache.profile = { id: 'teacher-b' }
        confirm('confirm')
        await pending

        expect(mocks.startTrial).not.toHaveBeenCalled()
        expect(mocks.warning).toHaveBeenCalledWith('账号已切换，请重新确认是否开启试用')
        expect(notice.confirming).toBe(false)
    })

    it('releases the local lock after failure so the existing entry can retry', async () => {
        mocks.startTrial.mockRejectedValueOnce(new Error('request already reported'))
        const notice = mountNotice()

        await notice.confirmStartTrial()
        expect(notice.confirming).toBe(false)
        await notice.confirmStartTrial()
        expect(mocks.startTrial).toHaveBeenCalledTimes(2)
    })

    it('ignores an entry while another activation is running and rechecks eligibility after confirmation', async () => {
        const notice = mountNotice()
        mocks.session.startingTrial = true
        await notice.confirmStartTrial()
        expect(mocks.confirm).not.toHaveBeenCalled()

        mocks.session.startingTrial = false
        mocks.confirm.mockImplementation(async () => { mocks.session.entitlementState = 'trial_active' })
        await notice.confirmStartTrial()
        expect(mocks.startTrial).not.toHaveBeenCalled()
        expect(notice.statusText).toBe('14 天免费试用中')
    })

    it.each([
        ['not_started', '试用尚未开启'],
        ['trial_expired', '试用已到期 · 仅可查看'],
        ['paid_active', '付费权益有效'],
        ['paid_expired', '付费权益已到期 · 仅可查看'],
        ['permanent', '长期使用权益'],
        ['unavailable', '暂时无法获取使用权益'],
    ])('displays the server entitlement state %s', (state, expected) => {
        mocks.session.entitlementState = state
        const notice = mountNotice()
        expect(notice.statusText).toBe(expected)
        expect(notice.expiresAtText).toBe('')
    })

    it('uses the server trial and paid deadlines, without deriving duration from account creation or role', () => {
        mocks.session.entitlementState = 'trial_active'
        mocks.session.trialExpiresAt = Date.parse('2026-11-16T12:00:00+08:00')
        mocks.session.paidExpiresAt = Date.parse('2026-12-02T12:00:00+08:00')
        const notice = mountNotice()
        expect(notice.expiresAtText).toContain('2026/11/16')

        mocks.session.entitlementState = 'paid_active'
        expect(notice.expiresAtText).toContain('2026/12/02')
        mocks.session.entitlementState = 'permanent'
        expect(notice.expiresAtText).toBe('')
    })

    it('resynchronizes missing entitlement and prevents duplicate sync requests', async () => {
        let finish!: () => void
        mocks.session.entitlementState = 'unavailable'
        mocks.initialize.mockReturnValue(new Promise<void>((resolve) => { finish = resolve }))
        const notice = mountNotice()
        const pending = notice.synchronizeEntitlement()
        await notice.synchronizeEntitlement()
        expect(mocks.initialize).toHaveBeenCalledExactlyOnceWith(true)
        expect(notice.synchronizing).toBe(true)

        mocks.session.entitlementState = 'not_started'
        finish()
        await pending
        expect(notice.synchronizing).toBe(false)
        expect(mocks.warning).not.toHaveBeenCalled()
        expect(notice.statusText).toBe('试用尚未开启')
        await notice.confirmStartTrial()
        expect(mocks.startTrial).toHaveBeenCalledTimes(1)
    })

    it('warns when a successful session refresh still has no usable entitlement', async () => {
        mocks.session.entitlementState = 'unavailable'
        const notice = mountNotice()
        await notice.synchronizeEntitlement()
        expect(mocks.warning).toHaveBeenCalledWith('权益状态尚未同步，请稍后重试')
        expect(notice.synchronizing).toBe(false)
    })

    it('reports a network sync failure, preserves retry, and does not duplicate a reported API error', async () => {
        mocks.session.entitlementState = 'unavailable'
        mocks.initialize.mockRejectedValueOnce(new Error('offline'))
        const notice = mountNotice()
        await notice.synchronizeEntitlement()
        expect(mocks.error).toHaveBeenCalledExactlyOnceWith('权益同步失败，请稍后重试')
        expect(notice.synchronizing).toBe(false)

        mocks.initialize.mockRejectedValueOnce(new ApiRequestError('server already reported'))
        await notice.synchronizeEntitlement()
        expect(mocks.initialize).toHaveBeenCalledTimes(2)
        expect(mocks.error).toHaveBeenCalledTimes(1)
        expect(notice.synchronizing).toBe(false)
    })
})
