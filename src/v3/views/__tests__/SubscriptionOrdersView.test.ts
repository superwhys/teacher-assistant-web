import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, reactive, ssrContextKey, type App } from 'vue'
import SubscriptionOrdersView from '../SubscriptionOrdersView.vue'
import type { SubscriptionOrder, SubscriptionOrders } from '@/types/subscription'

const mocks = vi.hoisted(() => ({
    list: vi.fn(), get: vi.fn(), refresh: vi.fn(),
    cache: { token: 'token-a', profile: { id: 'teacher-a', email: 'a@example.com' }, displayName: 'A' },
}))
vi.mock('@/api/subscription', () => ({ fetchSubscriptionOrders: mocks.list, fetchSubscriptionOrder: mocks.get }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => ({ refreshAfterMutation: mocks.refresh }) }))

const pending: SubscriptionOrder = { id: 'order-a', plan_id: 'common_month', status: 'pending', amount_fen: 990,
    created_at: '2026-11-09T12:00:00Z', paid_expires_at: null, refund_review_required: false }
const result = (orders = [pending], page = 1, total = orders.length): { data: SubscriptionOrders } => ({
    data: { orders, total, page, page_size: 20 },
})
interface OrdersState {
    orders: SubscriptionOrder[]; loading: boolean; loadError: string; checkingID: string;
    page: number; pageCount: number; checkMessage: string; checkError: string;
    loadOrders: (page?: number) => Promise<void>; checkOrder: (id: string) => Promise<void>;
}
const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})
let app: App | undefined
async function settle() { await Promise.resolve(); await Promise.resolve(); await nextTick() }
async function mountOrders(): Promise<OrdersState> {
    app = renderer.createApp({ ...SubscriptionOrdersView, render: () => null })
    app.provide(ssrContextKey, { modules: new Set() })
    const vm = app.mount({})
    await settle()
    return (vm.$ as unknown as { setupState: OrdersState }).setupState
}
beforeEach(() => {
    vi.resetAllMocks()
    mocks.cache = reactive({ token: 'token-a', profile: { id: 'teacher-a', email: 'a@example.com' }, displayName: 'A' })
    mocks.list.mockResolvedValue(result())
    mocks.get.mockResolvedValue({ data: pending })
    mocks.refresh.mockResolvedValue(undefined)
})
afterEach(() => { app?.unmount(); app = undefined })

describe('subscription order retrieval', () => {
    it('retrieves account orders from the server without relying on local purchase storage', async () => {
        const view = await mountOrders()
        expect(mocks.list).toHaveBeenCalledExactlyOnceWith(1, 20)
        expect(view.orders[0]?.amount_fen).toBe(990)
        expect(view.loading).toBe(false)
        expect(mocks.get).not.toHaveBeenCalled()
    })
    it('retains the current list on load failure and supports a retry and pagination', async () => {
        const view = await mountOrders()
        mocks.list.mockRejectedValueOnce(new Error('服务暂不可用'))
        await view.loadOrders(2)
        expect(view.orders[0]?.id).toBe(pending.id)
        expect(view.page).toBe(1)
        expect(view.loadError).toBe('服务暂不可用')
        mocks.list.mockResolvedValueOnce(result([{ ...pending, id: 'page-2' }], 2, 21))
        await view.loadOrders(2)
        expect(view.page).toBe(2)
        expect(view.pageCount).toBe(2)
        expect(view.loadError).toBe('')
    })
    it('checks only an existing order and prevents duplicate queries while preserving pending uncertainty', async () => {
        const view = await mountOrders()
        let finish!: (value: { data: SubscriptionOrder }) => void
        mocks.get.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
        await view.checkOrder('other-order')
        const request = view.checkOrder(pending.id)
        await view.checkOrder(pending.id)
        await view.loadOrders(2)
        expect(mocks.get).toHaveBeenCalledExactlyOnceWith(pending.id)
        expect(mocks.list).toHaveBeenCalledTimes(1)
        finish({ data: pending })
        await request
        expect(view.checkMessage).toContain('暂未确认付款')
        expect(mocks.refresh).not.toHaveBeenCalled()
    })
    it('keeps confirmed payment when entitlement synchronization fails and allows retry', async () => {
        const view = await mountOrders()
        const paid = { ...pending, status: 'paid' as const, paid_expires_at: '2026-12-09T12:00:00Z' }
        mocks.get.mockResolvedValue({ data: paid })
        mocks.refresh.mockRejectedValueOnce(new Error('同步失败'))
        await view.checkOrder(pending.id)
        expect(view.orders[0]?.status).toBe('paid')
        expect(view.checkMessage).toBe('已付款并开通')
        expect(view.checkError).toContain('订单状态已更新')
        await view.checkOrder(pending.id)
        expect(view.checkError).toBe('')
    })
    it('rejects a mismatching query result without changing the original order', async () => {
        const view = await mountOrders()
        mocks.get.mockResolvedValueOnce({ data: { ...pending, id: 'foreign-order', status: 'paid' } })
        await view.checkOrder(pending.id)
        expect(view.orders[0]?.status).toBe('pending')
        expect(view.checkError).toContain('信息不一致')
        expect(mocks.refresh).not.toHaveBeenCalled()
    })
    it('clears old account orders immediately and discards stale list and query responses', async () => {
        const view = await mountOrders()
        let finishQuery!: (value: { data: SubscriptionOrder }) => void
        let finishList!: (value: ReturnType<typeof result>) => void
        mocks.get.mockReturnValueOnce(new Promise(resolve => { finishQuery = resolve }))
        const query = view.checkOrder(pending.id)
        mocks.list.mockImplementation(() => new Promise(resolve => { finishList = resolve }))
        mocks.cache.token = 'token-b'
        mocks.cache.profile = { id: 'teacher-b', email: 'b@example.com' }
        await settle()
        expect(view.orders).toEqual([])
        finishQuery({ data: { ...pending, status: 'paid' } })
        await query
        expect(mocks.refresh).not.toHaveBeenCalled()
        mocks.cache.token = ''
        finishList(result())
        await settle()
        expect(view.orders).toEqual([])
        expect(view.checkingID).toBe('')
        expect(view.checkMessage).toBe('')
    })
    it('discards a query that resolves after leaving the page', async () => {
        const view = await mountOrders()
        let finish!: (value: { data: SubscriptionOrder }) => void
        mocks.get.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
        const query = view.checkOrder(pending.id)
        app?.unmount(); app = undefined
        finish({ data: { ...pending, status: 'paid' } })
        await query
        expect(view.orders[0]?.status).toBe('pending')
        expect(mocks.refresh).not.toHaveBeenCalled()
    })
})
