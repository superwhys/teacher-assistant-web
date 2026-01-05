import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DrawRecord } from '@/types/lottery'
import { useCacheStore } from '@/stores/cacheStore'

const STORAGE_KEY_BASE = 'ta_lottery_history_v1'

type LotteryHistoryData = {
    byPoolId: Record<string, DrawRecord[]>
}

function loadInitial(): LotteryHistoryData {
    return {
        byPoolId: {},
    }
}

function generateId(prefix: string = 'LR'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null
    try {
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

export const useLotteryHistoryStore = defineStore('lotteryHistory', () => {
    const cacheStore = useCacheStore()
    const data = ref<LotteryHistoryData>(loadInitial())

    function getStorageKey(): string {
        const userId = cacheStore.profile?.id || null
        return `${STORAGE_KEY_BASE}_${userId ?? 'guest'}`
    }

    function persist() {
        window.localStorage.setItem(getStorageKey(), JSON.stringify(data.value))
    }

    async function hydrate(): Promise<void> {
        const saved = safeParse<LotteryHistoryData>(window.localStorage.getItem(getStorageKey()))
        if (saved && typeof saved === 'object' && saved.byPoolId && typeof saved.byPoolId === 'object') {
            data.value = saved
        } else {
            data.value = loadInitial()
        }
    }

    function getRecords(poolId: string | null): DrawRecord[] {
        if (!poolId) return []
        return [...(data.value.byPoolId[poolId] ?? [])]
    }

    function addRecord(poolId: string, prizeName: string): DrawRecord {
        const pid = String(poolId ?? '').trim()
        const name = String(prizeName ?? '').trim()
        if (!pid) throw new Error('奖池 ID 无效')
        if (!name) throw new Error('奖品名称不能为空')

        const r: DrawRecord = {
            id: generateId('R'),
            prizeId: name,
            prizeName: name,
            drawnAt: Date.now(),
        }
        if (!data.value.byPoolId[pid]) data.value.byPoolId[pid] = []
        data.value.byPoolId[pid]!.unshift(r)
        persist()
        return r
    }

    function clearRecords(poolId: string): void {
        const pid = String(poolId ?? '').trim()
        if (!pid) return
        data.value.byPoolId[pid] = []
        persist()
    }

    function clearAll(): void {
        data.value = loadInitial()
        persist()
    }

    return {
        hydrate,
        getRecords,
        addRecord,
        clearRecords,
        clearAll,
    }
})


