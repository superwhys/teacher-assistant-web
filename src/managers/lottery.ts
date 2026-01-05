import { lotteryApi } from '@/api/lottery'
import type { LotteryPoolDTO, LotteryPrizeDTO } from '@/types/lotteryApi'
import type { ShopItem } from '@/types/shopItem'

export type UiLotteryPrize = {
    name: string
    weight: number
    enabled: boolean
    source?: 'custom' | 'shop'
    shopItemId?: string
}

export type UiLotteryPool = {
    id: string
    name: string
    prizes: UiLotteryPrize[]
}

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

function normalizePrize(dto: LotteryPrizeDTO): UiLotteryPrize | null {
    const name = String(dto?.name ?? '').trim()
    if (!name) return null
    return {
        name,
        weight: Math.max(0, toNumber(dto?.weight, 0)),
        enabled: Boolean(dto?.enabled),
        source: 'custom',
    }
}

function normalizePool(dto: LotteryPoolDTO): UiLotteryPool | null {
    const idNum = toNumber(dto?.id, 0)
    if (!idNum) return null
    const name = String(dto?.name ?? '').trim() || '未命名奖池'
    const prizes = (dto?.prizes ?? [])
        .map(p => normalizePrize(p))
        .filter(Boolean) as UiLotteryPrize[]

    return {
        id: String(idNum),
        name,
        prizes,
    }
}

function assertPoolId(poolId: string | number): number {
    const id = toNumber(poolId, 0)
    if (!id) throw new Error('奖池 ID 无效')
    return id
}

export const lotteryManager = {
    async listPools(): Promise<UiLotteryPool[]> {
        const resp = await lotteryApi.listPools()
        const pools = resp.data?.pools ?? []
        return pools.map(p => normalizePool(p)).filter(Boolean) as UiLotteryPool[]
    },

    async getPool(poolId: string | number): Promise<UiLotteryPool | null> {
        const id = assertPoolId(poolId)
        const resp = await lotteryApi.getPool(id)
        return normalizePool(resp.data) ?? null
    },

    async ensureDefaultPool(): Promise<UiLotteryPool> {
        const pools = await this.listPools()
        if (pools.length > 0) return pools[0]!
        const created = await this.createPool('默认奖池')
        return created
    },

    async createPool(name: string): Promise<UiLotteryPool> {
        const n = String(name ?? '').trim()
        if (!n) throw new Error('奖池名称不能为空')
        const resp = await lotteryApi.createPool({ name: n })
        const pool = normalizePool(resp.data)
        if (!pool) throw new Error('创建奖池失败：后端返回数据异常')
        return pool
    },

    async updatePool(poolId: string | number, name: string): Promise<void> {
        const id = assertPoolId(poolId)
        const n = String(name ?? '').trim()
        if (!n) throw new Error('奖池名称不能为空')
        await lotteryApi.updatePool({ id, name: n })
    },

    async clearPool(poolId: string | number): Promise<void> {
        const id = assertPoolId(poolId)
        await lotteryApi.clearPool({ pool_id: id })
    },

    async addPrize(poolId: string | number, prize: UiLotteryPrize): Promise<void> {
        const id = assertPoolId(poolId)
        const name = String(prize?.name ?? '').trim()
        if (!name) throw new Error('奖品名称不能为空')
        const weight = Math.max(0, toNumber(prize?.weight, 0))
        await lotteryApi.addPrizeToPool({
            pool_id: id,
            name,
            weight,
            enabled: Boolean(prize?.enabled),
        })
    },

    async updatePrize(poolId: string | number, prizeName: string, updates: Partial<UiLotteryPrize>): Promise<void> {
        const id = assertPoolId(poolId)
        const name = String(prizeName ?? '').trim()
        if (!name) throw new Error('奖品名称不能为空')
        await lotteryApi.updatePrizeInPool({
            pool_id: id,
            name,
            enabled: updates.enabled !== undefined ? Boolean(updates.enabled) : undefined,
            weight: updates.weight !== undefined ? Math.max(0, toNumber(updates.weight, 0)) : undefined,
        })
    },

    async removePrize(poolId: string | number, prizeName: string): Promise<void> {
        const id = assertPoolId(poolId)
        const name = String(prizeName ?? '').trim()
        if (!name) throw new Error('奖品名称不能为空')
        await lotteryApi.removePrizeFromPool({
            pool_id: id,
            name,
        })
    },

    async renamePrize(poolId: string | number, fromName: string, toName: string, payload: Pick<UiLotteryPrize, 'weight' | 'enabled'>): Promise<void> {
        const from = String(fromName ?? '').trim()
        const to = String(toName ?? '').trim()
        if (!from || !to) throw new Error('奖品名称不能为空')
        if (from === to) return

        await this.removePrize(poolId, from)
        await this.addPrize(poolId, { name: to, enabled: payload.enabled, weight: payload.weight, source: 'custom' })
    },

    async importFromShop(
        poolId: string | number,
        items: ShopItem[],
        weightStrategy: 'fixed' | 'stock' = 'fixed',
        overwrite = false,
    ): Promise<number> {
        const id = assertPoolId(poolId)
        const list = items ?? []
        if (overwrite) {
            await this.clearPool(id)
        }

        let count = 0
        for (const it of list) {
            const name = String(it?.name ?? '').trim()
            if (!name) continue
            const weight = weightStrategy === 'stock' ? Math.max(1, toNumber((it as any)?.stock, 0)) : 1
            await this.addPrize(id, { name, weight, enabled: true, source: 'shop', shopItemId: String(it?.id ?? '') })
            count += 1
        }
        return count
    },
}


