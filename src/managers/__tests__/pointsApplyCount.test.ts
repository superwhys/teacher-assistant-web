import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pointsManager } from '../points'

const mocks = vi.hoisted(() => ({ applyRule: vi.fn() }))
vi.mock('@/api/points', () => ({ pointsApi: mocks }))

beforeEach(() => {
    vi.resetAllMocks()
    mocks.applyRule.mockResolvedValue({ data: { available_points: 20 } })
})

describe('points rule application count', () => {
    it('defaults to one application for existing callers', async () => {
        await pointsManager.applyRule(7, 3, 1)
        expect(mocks.applyRule).toHaveBeenCalledWith({ class_id: 7, rule_id: 3, student_id: 1, count: 1 })
    })

    it.each([1, 5, 100])('sends count %s once per student', async (count) => {
        await pointsManager.applyRuleBatch(7, 3, [1, 2], count)
        expect(mocks.applyRule).toHaveBeenCalledTimes(2)
        expect(mocks.applyRule).toHaveBeenNthCalledWith(1, { class_id: 7, rule_id: 3, student_id: 1, count })
        expect(mocks.applyRule).toHaveBeenNthCalledWith(2, { class_id: 7, rule_id: 3, student_id: 2, count })
    })

    it.each([0, -1, 1.5, 101, NaN, Infinity])('rejects invalid count %s before requesting', async (count) => {
        await expect(pointsManager.applyRule(7, 3, 1, count)).rejects.toThrow('1–100')
        expect(mocks.applyRule).not.toHaveBeenCalled()
    })
})
