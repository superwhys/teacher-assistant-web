import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lotteryManager } from '../lottery'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/api/api', () => mocks)

beforeEach(() => vi.resetAllMocks())

describe('lottery configured prize weights', () => {
    const invalidWeights = [0, -1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, null]

    it.each([...invalidWeights, undefined])('rejects adding an invalid weight %s before requesting', async (weight) => {
        await expect(lotteryManager.addPrize(4, {
            name: '贴纸', weight: weight as number, enabled: true,
        })).rejects.toThrow('权重必须为正整数')
        expect(mocks.post).not.toHaveBeenCalled()
    })

    it.each(invalidWeights)('rejects updating to an invalid weight %s before requesting', async (weight) => {
        await expect(lotteryManager.updatePrize(4, '贴纸', {
            weight: weight as number, enabled: true,
        })).rejects.toThrow('权重必须为正整数')
        expect(mocks.put).not.toHaveBeenCalled()
    })

    it.each([1, 7])('preserves a valid configured weight %s when adding and editing', async (weight) => {
        await lotteryManager.addPrize(4, { name: '贴纸', weight, enabled: true })
        expect(mocks.post).toHaveBeenCalledWith('/lottery/pools/add-prize', {
            pool_id: 4, prizes: [{ name: '贴纸', weight, enabled: true }],
        })
        await lotteryManager.updatePrize(4, '贴纸', { weight, enabled: true })
        expect(mocks.put).toHaveBeenCalledWith('/lottery/pools/prizes/update', {
            pool_id: 4, name: '贴纸', weight, enabled: true,
        })
    })

    it('keeps weight absent from serialized disable and enable requests', async () => {
        for (const enabled of [false, true]) {
            await lotteryManager.updatePrize(4, '贴纸', { enabled })
            expect(JSON.parse(JSON.stringify(mocks.put.mock.lastCall?.[1]))).toEqual({
                pool_id: 4, name: '贴纸', enabled,
            })
        }
    })

    it('rejects invalid rename weight before removing the original prize', async () => {
        await expect(lotteryManager.renamePrize(4, '贴纸', '新贴纸', {
            weight: 0, enabled: true,
        })).rejects.toThrow('权重必须为正整数')
        expect(mocks.post).not.toHaveBeenCalled()
    })
})
