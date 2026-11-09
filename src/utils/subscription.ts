import type { SubscriptionPlan, SubscriptionPurchaseLink } from '@/types/subscription'

export function subscriptionPrice(plan: SubscriptionPlan): string {
    if (!Number.isSafeInteger(plan.price_fen) || plan.price_fen <= 0) return '暂未开放'
    return `¥${(plan.price_fen / 100).toFixed(2).replace(/\.00$/, '')}`
}

export function isSubscriptionPlanAvailable(plan: SubscriptionPlan): boolean {
    return plan.available && Number.isSafeInteger(plan.price_fen) && plan.price_fen > 0
}

export function subscriptionMiniProgramLink(value: string): string {
    if (!value) return ''
    try {
        const url = new URL(value)
        return url.protocol === 'https:' && url.hostname === 'wxaurl.cn' && !url.username && !url.password
            ? url.href : ''
    } catch {
        return ''
    }
}

export function isSubscriptionPurchaseLinkValid(link: SubscriptionPurchaseLink, now: number): boolean {
    return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(link.qr_code)
        && Number.isFinite(Date.parse(link.expires_at)) && Date.parse(link.expires_at) > now
}
