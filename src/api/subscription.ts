import { get, post } from '@/api/api'
import type { SubscriptionPlanID, SubscriptionPlans, SubscriptionPurchaseLink } from '@/types/subscription'

export function fetchSubscriptionPlans() {
    return get<SubscriptionPlans>('/subscription/plans')
}

export function createSubscriptionPurchaseLink(planID: SubscriptionPlanID) {
    return post<SubscriptionPurchaseLink>('/subscription/purchase-link', { plan_id: planID })
}
