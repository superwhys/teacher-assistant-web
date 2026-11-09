export type SubscriptionPlanID = string

export interface SubscriptionPlan {
    id: SubscriptionPlanID
    edition: 'common' | 'pro'
    name: string
    days: number
    price_fen: number
    available: boolean
    purchase_disabled_reason?: string
}

export interface SubscriptionPlans {
    plans: SubscriptionPlan[]
    auto_renew: false
    can_purchase: boolean
    purchase_disabled_reason: string
    ios_available: boolean
}

export interface SubscriptionPurchaseLink {
    qr_code: string
    url_link: string
    expires_at: string
    plan_id: SubscriptionPlanID
    account_name: string
}
