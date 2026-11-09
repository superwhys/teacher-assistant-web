import { get, post } from '@/api/api'
import type { SubscriptionOrder, SubscriptionOrders, SubscriptionPlanID, SubscriptionPlans, SubscriptionPurchaseLink } from '@/types/subscription'

export function fetchSubscriptionPlans() {
    return get<SubscriptionPlans>('/subscription/plans')
}

export function createSubscriptionPurchaseLink(planID: SubscriptionPlanID) {
    return post<SubscriptionPurchaseLink>('/subscription/purchase-link', { plan_id: planID })
}

export function fetchSubscriptionOrders(page = 1, pageSize = 20) {
    return get<SubscriptionOrders>('/subscription/orders', { page, page_size: pageSize })
}

export function fetchSubscriptionOrder(orderID: string) {
    return get<SubscriptionOrder>(`/subscription/orders/${encodeURIComponent(orderID)}`)
}
