import { mallApi } from '@/api/mall'
import type {
    CreatePrizeReq,
    ExchangePrizeReq,
    ListPrizeRecordsQuery,
    PaginatedPrizeRecordResp,
    Prize,
    PrizeRecord,
    UndoExchangePrizeReq,
    UpdatePrizeReq,
} from '@/types/mall'

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

export const shopManager = {
    async listPrizes(): Promise<Prize[]> {
        const resp = await mallApi.listPrizes()
        return resp.data?.items ?? []
    },

    async createPrize(data: CreatePrizeReq): Promise<void> {
        await mallApi.createPrize(data)
    },

    async updatePrize(prizeId: number, data: UpdatePrizeReq): Promise<void> {
        await mallApi.updatePrize(prizeId, { ...data, id: prizeId })
    },

    async deletePrize(prizeId: number): Promise<void> {
        await mallApi.deletePrize(prizeId)
    },

    async listPrizeRecords(query?: ListPrizeRecordsQuery): Promise<PaginatedPrizeRecordResp> {
        const resp = await mallApi.listPrizeRecords(query)
        return resp.data ?? {}
    },

    async listAllPrizeRecords(chunkSize = 2000, maxItems = 20000): Promise<PrizeRecord[]> {
        const items: PrizeRecord[] = []
        let offset = 0

        while (items.length < maxItems) {
            const resp = await this.listPrizeRecords({ limit: chunkSize, offset })
            const batch = resp.items ?? []
            items.push(...batch)
            if (batch.length < chunkSize) break
            offset += chunkSize
        }

        return items
    },

    async exchangePrize(classId: number, prizeId: number, studentId: number, count: number): Promise<void> {
        const payload: ExchangePrizeReq = {
            class_id: classId,
            prize_id: prizeId,
            student_id: studentId,
            count,
        }
        await mallApi.exchangePrize(payload)
    },

    async undoExchangePrize(orderId: number): Promise<void> {
        const payload: UndoExchangePrizeReq = {
            order_id: orderId,
        }
        await mallApi.undoExchangePrize(payload)
    },

    normalizePrizeId(prize: Prize): number {
        return toNumber(prize.id, 0)
    },

    normalizeRecordId(record: PrizeRecord): number {
        return toNumber(record.id, 0)
    },
}


