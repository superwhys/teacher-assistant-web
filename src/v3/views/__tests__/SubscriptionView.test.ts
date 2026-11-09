import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, reactive, ssrContextKey, type App } from 'vue'
import SubscriptionView from '../SubscriptionView.vue'
import type { SubscriptionPlan, SubscriptionPlans, SubscriptionPurchaseLink } from '@/types/subscription'
import { ApiRequestError } from '@/types/api'

const mocks = vi.hoisted(() => ({
    plans: vi.fn(), purchaseLink: vi.fn(), refresh: vi.fn(), success: vi.fn(), error: vi.fn(),
    cache: { token: 'token-a', displayName: 'Teacher A', profile: { id: 'teacher-a', name: 'Teacher A', email: 'a@example.com' } },
    session: { entitlementMessage: '试用已到期，仅可查看。', refreshAfterMutation: vi.fn() },
}))
vi.mock('@/api/subscription', () => ({
    fetchSubscriptionPlans: mocks.plans, createSubscriptionPurchaseLink: mocks.purchaseLink,
}))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => mocks.session }))
vi.mock('element-plus', () => ({ ElMessage: { success: mocks.success, error: mocks.error } }))

const month: SubscriptionPlan = {
    id: 'common_month', edition: 'common', name: '普通版月卡', days: 30, price_fen: 990, available: true,
}
const catalog: SubscriptionPlans = {
    plans: [month, { ...month, id: 'common_year', name: '普通版年卡', days: 365, price_fen: 9900 },
        { ...month, id: 'pro_month', edition: 'pro', name: 'Pro 月卡', price_fen: 1299 },
        { ...month, id: 'pro_year', edition: 'pro', name: 'Pro 年卡', days: 365, price_fen: 12990 }],
    auto_renew: false, can_purchase: true, purchase_disabled_reason: '', ios_available: true,
}
function purchaseLink(overrides: Partial<SubscriptionPurchaseLink> = {}): SubscriptionPurchaseLink {
    return {
        qr_code: 'data:image/png;base64,QUJD', url_link: 'https://wxaurl.cn/example',
        expires_at: new Date(Date.now() + 600000).toISOString(),
        plan_id: 'common_month', account_name: 'Teacher A', ...overrides,
    }
}

interface SubscriptionState {
    catalog: SubscriptionPlans | null
    loading: boolean
    loadError: string
    creatingPlanID: string
    purchaseError: string
    purchaseLink: SubscriptionPurchaseLink | null
    linkExpired: boolean
    miniProgramURL: string
    refreshing: boolean
    editionGroups: { id: string; plans: SubscriptionPlan[] }[]
    loadPlans: () => Promise<void>
    createPurchaseLink: (plan: SubscriptionPlan) => Promise<void>
    refreshEntitlement: () => Promise<void>
}

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})
let app: App | undefined
async function settle() { await Promise.resolve(); await Promise.resolve(); await nextTick() }
async function mountSubscription(): Promise<SubscriptionState> {
    app = renderer.createApp({ ...SubscriptionView, render: () => null })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    await settle()
    return (vm.$ as unknown as { setupState: SubscriptionState }).setupState
}

beforeEach(() => {
    vi.resetAllMocks()
    mocks.cache = reactive({ token: 'token-a', displayName: 'Teacher A', profile: {
        id: 'teacher-a', name: 'Teacher A', email: 'a@example.com',
    } })
    mocks.session = reactive({ entitlementMessage: '试用已到期，仅可查看。', refreshAfterMutation: mocks.refresh })
    mocks.plans.mockResolvedValue({ data: catalog })
    mocks.purchaseLink.mockResolvedValue({ data: purchaseLink() })
    mocks.refresh.mockResolvedValue(undefined)
})
afterEach(() => { app?.unmount(); app = undefined; vi.useRealTimers() })

describe('SubscriptionView', () => {
    it('shows the server plans grouped by edition and loads even when trial access has expired', async () => {
        const view = await mountSubscription()
        expect(view.editionGroups.map(group => [group.id, group.plans.length])).toEqual([['common', 2], ['pro', 2]])
        expect(view.catalog?.auto_renew).toBe(false)
        expect(view.loading).toBe(false)
        expect(mocks.purchaseLink).not.toHaveBeenCalled()
    })

    it('blocks unavailable prices and accounts rejected by the server, including delegated accounts', async () => {
        const view = await mountSubscription()
        await view.createPurchaseLink({ ...month, price_fen: 0 })
        await view.createPurchaseLink({ ...month, available: false })
        view.catalog = { ...catalog, can_purchase: false, purchase_disabled_reason: '请使用本人账号购买' }
        await view.createPurchaseLink(month)
        expect(mocks.purchaseLink).not.toHaveBeenCalled()
    })

    it('prevents duplicate link requests and permits a QR-only response', async () => {
        let finish!: (value: { data: SubscriptionPurchaseLink }) => void
        mocks.purchaseLink.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
        const view = await mountSubscription()
        const pending = view.createPurchaseLink(month)
        await view.createPurchaseLink(month)
        expect(mocks.purchaseLink).toHaveBeenCalledExactlyOnceWith('common_month')
        expect(view.creatingPlanID).toBe('common_month')
        finish({ data: purchaseLink({ url_link: '' }) })
        await pending
        expect(view.purchaseLink?.account_name).toBe('Teacher A')
        expect(view.miniProgramURL).toBe('')
        expect(view.creatingPlanID).toBe('')
    })

    it('discards an old account purchase response after the account changes', async () => {
        let finish!: (value: { data: SubscriptionPurchaseLink }) => void
        mocks.purchaseLink.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
        const view = await mountSubscription()
        const pending = view.createPurchaseLink(month)
        mocks.cache.token = 'token-b'
        mocks.cache.profile = { id: 'teacher-b', name: 'Teacher B', email: 'b@example.com' }
        await settle()
        finish({ data: purchaseLink() })
        await pending
        expect(view.purchaseLink).toBeNull()
        expect(view.purchaseError).toBe('')
        expect(view.creatingPlanID).toBe('')
    })

    it('ignores an old catalog response and removes purchase entries immediately on logout', async () => {
        let finishOld!: (value: { data: SubscriptionPlans }) => void
        mocks.plans.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve }))
        const view = await mountSubscription()
        expect(view.loading).toBe(true)
        mocks.cache.token = 'token-b'
        await settle()
        expect(view.catalog?.plans).toHaveLength(4)
        finishOld({ data: { ...catalog, plans: [] } })
        await settle()
        expect(view.catalog?.plans).toHaveLength(4)
        await view.createPurchaseLink(month)
        expect(view.purchaseLink).not.toBeNull()
        mocks.cache.token = ''
        expect(view.purchaseLink).toBeNull()
        expect(view.catalog).toBeNull()
        expect(view.creatingPlanID).toBe('')
    })

    it('retries after load or link failure without pretending the purchase succeeded', async () => {
        mocks.plans.mockRejectedValueOnce(new Error('套餐读取失败'))
        const view = await mountSubscription()
        expect(view.loadError).toBe('套餐读取失败')
        await view.loadPlans()
        expect(view.catalog?.plans).toHaveLength(4)
        mocks.purchaseLink.mockRejectedValueOnce(new ApiRequestError('当前账号尚未绑定微信'))
        await view.createPurchaseLink(month)
        expect(view.purchaseError).toBe('当前账号尚未绑定微信')
        expect(view.purchaseLink).toBeNull()
        await view.createPurchaseLink(month)
        expect(view.purchaseError).toBe('')
        expect(view.purchaseLink).not.toBeNull()
        expect(mocks.success).not.toHaveBeenCalled()
    })

    it('rejects a response for the wrong plan before showing a purchase entry', async () => {
        mocks.purchaseLink.mockResolvedValueOnce({ data: purchaseLink({ plan_id: 'pro_year' }) })
        const view = await mountSubscription()
        await view.createPurchaseLink(month)
        expect(view.purchaseLink).toBeNull()
        expect(view.purchaseError).toContain('购买入口无效')
    })

    it('keeps retry available when the server returns an already expired purchase entry', async () => {
        mocks.purchaseLink.mockResolvedValueOnce({ data: purchaseLink({ expires_at: new Date(Date.now() - 1).toISOString() }) })
        const view = await mountSubscription()
        await view.createPurchaseLink(month)
        expect(view.purchaseLink).toBeNull()
        expect(view.creatingPlanID).toBe('')
        await view.createPurchaseLink(month)
        expect(view.purchaseLink).not.toBeNull()
    })

    it('expires the purchase code and cleans its timer on unmount', async () => {
        vi.useFakeTimers()
        mocks.purchaseLink.mockResolvedValueOnce({ data: purchaseLink({ expires_at: new Date(Date.now() + 2000).toISOString() }) })
        const view = await mountSubscription()
        await view.createPurchaseLink(month)
        expect(view.linkExpired).toBe(false)
        vi.advanceTimersByTime(2000)
        expect(view.linkExpired).toBe(true)
        expect(vi.getTimerCount()).toBe(0)
        await view.createPurchaseLink(month)
        expect(vi.getTimerCount()).toBe(1)
        app?.unmount()
        app = undefined
        expect(vi.getTimerCount()).toBe(0)
    })

    it('serializes entitlement refresh, reloads plan eligibility and avoids duplicate API error toasts', async () => {
        let finish!: () => void
        mocks.refresh.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve }))
        const view = await mountSubscription()
        const pending = view.refreshEntitlement()
        await view.refreshEntitlement()
        expect(mocks.refresh).toHaveBeenCalledTimes(1)
        expect(view.refreshing).toBe(true)
        finish()
        await pending
        expect(mocks.plans).toHaveBeenCalledTimes(2)
        expect(mocks.success).toHaveBeenCalledWith('账号权益已同步')
        expect(view.refreshing).toBe(false)
        mocks.refresh.mockRejectedValueOnce(new ApiRequestError('已提示'))
        await view.refreshEntitlement()
        expect(mocks.error).not.toHaveBeenCalled()
    })
})
