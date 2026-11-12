import { describe, expect, it } from 'vitest'
import { constrainGrowthPeriod, growthComparison, growthPeriodError, growthSemesterDate, previousGrowthPeriod, shanghaiToday } from '../studentGrowth'

describe('growth report dates', () => {
    const now = new Date('2026-11-11T02:00:00Z')

    it('uses complete Monday–Sunday weeks and Shanghai calendar boundaries', () => {
        expect(previousGrowthPeriod('week', now)).toEqual({ from: '2026-11-02', to: '2026-11-08' })
        expect(shanghaiToday(new Date('2026-11-01T16:00:00Z'))).toBe('2026-11-02')
        expect(previousGrowthPeriod('week', new Date('2026-11-01T16:00:00Z'))).toEqual({ from: '2026-10-26', to: '2026-11-01' })
    })

    it('handles leap February and January year transitions', () => {
        expect(previousGrowthPeriod('month', new Date('2024-03-01T00:00:00Z'))).toEqual({ from: '2024-02-01', to: '2024-02-29' })
        expect(previousGrowthPeriod('month', new Date('2026-01-01T00:00:00Z'))).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    })

    it('accepts 1–93 inclusive days and rejects invalid, reversed and future dates', () => {
        expect(growthPeriodError({ from: '2026-11-11', to: '2026-11-11' }, now)).toBe('')
        expect(growthPeriodError({ from: '2026-08-01', to: '2026-11-01' }, now)).toBe('')
        expect(growthPeriodError({ from: '2026-08-01', to: '2026-11-02' }, now)).toContain('93')
        expect(growthPeriodError({ from: '2026-02-30', to: '2026-03-01' }, now)).toContain('有效')
        expect(growthPeriodError({ from: '2026-11-08', to: '2026-11-02' }, now)).toContain('早于')
        expect(growthPeriodError({ from: '2026-11-11', to: '2026-11-12' }, now)).toContain('今天')
    })

    it('keeps new and archived semester defaults within their actual dates', () => {
        const week = previousGrowthPeriod('week', now)
        expect(constrainGrowthPeriod(week, '2026-11-10', '2026-11-11', 7)).toEqual({ from: '2026-11-10', to: '2026-11-11' })
        expect(constrainGrowthPeriod(week, '2026-02-01', '2026-06-30', 7)).toEqual({ from: '2026-06-24', to: '2026-06-30' })
        expect(constrainGrowthPeriod(week, '2026-11-04', '2026-11-11', 7)).toEqual({ from: '2026-11-04', to: '2026-11-08' })
    })

    it('normalizes semester timestamps to Shanghai dates rather than slicing UTC dates', () => {
        expect(growthSemesterDate('2026-11-09T18:00:00Z')).toBe('2026-11-10')
        expect(growthSemesterDate('2026-11-09')).toBe('2026-11-09')
        expect(growthSemesterDate('0001-01-01T00:00:00Z')).toBe('')
    })
})

describe('growth report comparisons', () => {
    it('uses new-record wording for zero baselines and suppresses incomplete comparisons', () => {
        expect(growthComparison(2, 0)).toBe('新增 2 次')
        expect(growthComparison(0, 0)).toBe('两期均无记录')
        expect(growthComparison(2, 0, false)).toContain('不完整')
        expect(growthComparison(3, 1)).toBe('比上期多 2 次')
    })

})
