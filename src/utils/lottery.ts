import type { DrawRecord, Prize } from '@/types/lottery'

/** 按当前自然日中奖次数降低有效权重，保留奖池中的原始配置。 */
export function dailyLotteryPrizes<T extends Pick<Prize, 'name' | 'weight' | 'enabled'>>(
    prizes: T[],
    records: Pick<DrawRecord, 'prizeName' | 'drawnAt'>[],
    now = Date.now()
): T[] {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const counts = new Map<string, number>()
    for (const record of records) {
        if (record.drawnAt >= start.getTime() && record.drawnAt < end.getTime()) {
            counts.set(record.prizeName, (counts.get(record.prizeName) ?? 0) + 1)
        }
    }
    return prizes
        .filter(prize => prize.enabled && Number.isFinite(prize.weight) && prize.weight > 0)
        .map(prize => ({ ...prize, weight: prize.weight / ((counts.get(prize.name) ?? 0) + 1) }))
}
