import { describe, expect, it } from 'vitest'
import { dailyLotteryPrizes } from '../lottery'

const now = new Date(2026, 10, 2, 12).getTime()
const prizes = [
    { name: '贴纸', weight: 6, enabled: true },
    { name: '铅笔', weight: 2, enabled: true },
]

describe('daily lottery weights', () => {
    it('divides the configured weight by today’s win count plus one without changing the configuration', () => {
        const records = [
            { prizeName: '贴纸', drawnAt: now - 1000 },
            { prizeName: '贴纸', drawnAt: now },
        ]
        const adjusted = dailyLotteryPrizes(prizes, records, now)
        expect(adjusted.map(prize => prize.weight)).toEqual([2, 2])
        expect(prizes.map(prize => prize.weight)).toEqual([6, 2])
        expect(adjusted[0]).not.toBe(prizes[0])
    })

    it('uses the local calendar day, including midnight and excluding adjacent days', () => {
        const start = new Date(2026, 10, 2).getTime()
        const end = new Date(2026, 10, 3).getTime()
        const records = [start - 1, start, end - 1, end].map(drawnAt => ({ prizeName: '贴纸', drawnAt }))
        expect(dailyLotteryPrizes(prizes, records, now)[0]?.weight).toBe(2)
        expect(dailyLotteryPrizes(prizes, records.slice(0, 3), end)[0]?.weight).toBe(6)
    })

    it('counts pending records and matches prizes by name', () => {
        const records = [
            { prizeName: '贴纸', drawnAt: now, syncPending: true },
            { prizeName: '已删除的奖品', drawnAt: now },
        ]
        expect(dailyLotteryPrizes(prizes, records, now).map(prize => prize.weight)).toEqual([3, 2])
    })

    it('keeps a repeatedly won single prize eligible and filters disabled or invalid weights', () => {
        const adjusted = dailyLotteryPrizes([
            ...prizes.slice(0, 1),
            { name: '停用', weight: 99, enabled: false },
            ...[0, -1, NaN, Infinity].map(weight => ({ name: '无效', weight, enabled: true })),
        ], [{ prizeName: '贴纸', drawnAt: now }], now)
        expect(adjusted).toEqual([{ ...prizes[0], weight: 3 }])
        expect(dailyLotteryPrizes([], [], now)).toEqual([])
    })
})
