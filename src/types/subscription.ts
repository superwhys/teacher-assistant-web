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

export interface SubscriptionOrder {
    id: string
    plan_id: SubscriptionPlanID
    status: 'pending' | 'paid' | 'refunded'
    amount_fen: number
    created_at: string
    paid_expires_at?: string | null
    refund_review_required: boolean
}

export interface SubscriptionOrders {
    orders: SubscriptionOrder[]
    total: number
    page: number
    page_size: number
}
