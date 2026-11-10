import type { SubscriptionOrder } from '@/types/subscription'

export function subscriptionOrderName(planID: string): string {
    const names: Record<string, string> = {
        common_month: '普通版月卡', common_year: '普通版年卡', pro_month: 'Pro 月卡', pro_year: 'Pro 年卡',
    }
    return names[planID] || '角色开通'
}

export function subscriptionOrderStatus(order: SubscriptionOrder): string {
    if (order.status === 'canceled') return '已取消（本地）'
    if (order.status === 'refunded') return order.refund_review_required ? '已退款 · 待人工核对' : '已退款'
    if (order.status === 'paid') {
        if (!order.paid_expires_at) return order.refund_review_required ? '已付款 · 需人工核对' : '付款已确认 · 开通待核对'
        return order.refund_review_required ? '已开通 · 待人工核对' : '已付款并开通'
    }
    return '待确认付款'
}

export function subscriptionOrderAmount(amountFen: number): string {
    return Number.isSafeInteger(amountFen) && amountFen > 0 ? `¥${(amountFen / 100).toFixed(2)}` : '金额待核对'
}

export function subscriptionOrderTime(value?: string | null): string {
    if (!value || !Number.isFinite(Date.parse(value))) return '—'
    return new Date(value).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
}
