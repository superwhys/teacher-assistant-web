import { describe, expect, it } from 'vitest'
import type { SubscriptionOrder } from '@/types/subscription'
import { subscriptionOrderAmount, subscriptionOrderName, subscriptionOrderStatus } from '../subscriptionOrder'

const pending: SubscriptionOrder = { id: 'order', plan_id: 'common_month', status: 'pending', amount_fen: 990,
    created_at: '2026-11-09T12:00:00Z', paid_expires_at: null, refund_review_required: false }

describe('subscription order presentation', () => {
    it('shows immutable historical amounts rather than current SKU prices', () => {
        expect(subscriptionOrderName(pending.plan_id)).toBe('普通版月卡')
        expect(subscriptionOrderAmount(pending.amount_fen)).toBe('¥9.90')
        expect(subscriptionOrderName('future-plan')).toBe('角色开通')
        expect(subscriptionOrderAmount(1.5)).toBe('金额待核对')
    })
    it('distinguishes unconfirmed payment, fulfillment, manual review and refunds', () => {
        expect(subscriptionOrderStatus(pending)).toBe('待确认付款')
        expect(subscriptionOrderStatus({ ...pending, status: 'canceled' })).toBe('已取消（本地）')
        expect(subscriptionOrderStatus({ ...pending, status: 'paid', refund_review_required: true })).toBe('已付款 · 需人工核对')
        expect(subscriptionOrderStatus({ ...pending, status: 'paid' })).toBe('付款已确认 · 开通待核对')
        const paid = { ...pending, status: 'paid' as const, paid_expires_at: '2026-12-09T12:00:00Z' }
        expect(subscriptionOrderStatus(paid)).toBe('已付款并开通')
        expect(subscriptionOrderStatus({ ...paid, refund_review_required: true })).toBe('已开通 · 待人工核对')
        expect(subscriptionOrderStatus({ ...paid, status: 'refunded' })).toBe('已退款')
        expect(subscriptionOrderStatus({ ...paid, status: 'refunded', refund_review_required: true })).toBe('已退款 · 待人工核对')
    })
})
