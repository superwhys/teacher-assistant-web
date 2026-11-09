import { describe, expect, it } from 'vitest'
import type { SubscriptionPlan, SubscriptionPurchaseLink } from '@/types/subscription'
import {
    isSubscriptionPlanAvailable, isSubscriptionPurchaseLinkValid, subscriptionMiniProgramLink, subscriptionPrice,
} from '../subscription'

const plan: SubscriptionPlan = {
    id: 'common_month', edition: 'common', name: '普通版月卡', days: 30, price_fen: 190, available: true,
}
const now = Date.parse('2026-11-09T00:00:00Z')
const link: SubscriptionPurchaseLink = {
    qr_code: 'data:image/png;base64,QUJD', url_link: 'https://wxaurl.cn/example',
    expires_at: '2026-11-09T00:10:00Z', plan_id: 'common_month', account_name: 'Teacher',
}

describe('subscription presentation', () => {
    it('uses server prices and never offers an unconfigured amount as a free purchase', () => {
        expect(subscriptionPrice(plan)).toBe('¥1.90')
        expect(subscriptionPrice({ ...plan, price_fen: 1290 })).toBe('¥12.90')
        for (const price of [0, -1, 1.1, Number.NaN]) {
            expect(subscriptionPrice({ ...plan, price_fen: price })).toBe('暂未开放')
            expect(isSubscriptionPlanAvailable({ ...plan, price_fen: price })).toBe(false)
        }
        expect(isSubscriptionPlanAvailable({ ...plan, available: false })).toBe(false)
    })

    it('only exposes official HTTPS mini program links', () => {
        expect(subscriptionMiniProgramLink(link.url_link)).toBe(link.url_link)
        for (const value of ['', 'javascript:alert(1)', 'https://wxaurl.cn.evil.com/a', 'https://user@wxaurl.cn/a', 'http://wxaurl.cn/a']) {
            expect(subscriptionMiniProgramLink(value)).toBe('')
        }
    })

    it('rejects expired or malformed purchase codes and permits QR-only responses', () => {
        expect(isSubscriptionPurchaseLinkValid({ ...link, url_link: '' }, now)).toBe(true)
        expect(isSubscriptionPurchaseLinkValid(link, Date.parse(link.expires_at))).toBe(false)
        expect(isSubscriptionPurchaseLinkValid({ ...link, expires_at: 'invalid' }, now)).toBe(false)
        expect(isSubscriptionPurchaseLinkValid({ ...link, qr_code: 'https://example.com/code.png' }, now)).toBe(false)
    })
})
