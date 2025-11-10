import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Prize, DrawRecord } from '@/types/lottery'
import type { ShopItem } from '@/types/shopItem'
import { asyncStorage, getUserStorageKey } from '@/utils/storage'
import { useUserStore } from './userStore'

const STORAGE_KEY_BASE = 'ta_lottery_store_v1'

type LotteryStoreData = {
    prizes: Prize[]
    records: DrawRecord[]
}

function loadInitial(): LotteryStoreData {
    return {
        prizes: [],
        records: [],
    }
}

function generateId(prefix: string = 'LT'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export const useLotteryStore = defineStore('lottery', () => {
    const userStore = useUserStore()
    const data = ref<LotteryStoreData>(loadInitial())

    function getStorageKey(): string {
        const userId = userStore.profile?.id || null
        return getUserStorageKey(STORAGE_KEY_BASE, userId)
    }

    function persist() {
        void asyncStorage.setItem<LotteryStoreData>(getStorageKey(), data.value)
    }

    async function hydrate() {
        const saved = await asyncStorage.getItem<LotteryStoreData>(getStorageKey())
        if (saved && typeof saved === 'object') {
            data.value = saved
        }
    }

    function clear() {
        data.value = loadInitial()
    }

    function getAllPrizes(): Prize[] {
        return [...data.value.prizes].sort((a, b) => b.createdAt - a.createdAt)
    }

    function addPrize(payload: Omit<Prize, 'id' | 'createdAt'>) {
        const prize: Prize = {
            ...payload,
            id: generateId('P'),
            createdAt: Date.now(),
        }
        data.value.prizes.unshift(prize)
        persist()
        return prize
    }

    function updatePrize(id: string, updates: Partial<Omit<Prize, 'id' | 'createdAt'>>) {
        const p = data.value.prizes.find(x => x.id === id)
        if (!p) return false
        Object.assign(p, updates)
        persist()
        return true
    }

    function deletePrize(id: string) {
        const idx = data.value.prizes.findIndex(x => x.id === id)
        if (idx === -1) return false
        data.value.prizes.splice(idx, 1)
        persist()
        return true
    }

    function clearPrizes() {
        data.value.prizes = []
        persist()
    }

    function importFromShop(items: ShopItem[], weightStrategy: 'fixed' | 'stock' = 'fixed', overwrite: boolean = false) {
        const newPrizes: Prize[] = items.map((it) => ({
            id: generateId('P'),
            name: it.name,
            weight: weightStrategy === 'stock' ? Math.max(1, Number(it.stock || 0)) : 1,
            enabled: true,
            source: 'shop',
            shopItemId: it.id,
            createdAt: Date.now(),
        }))
        if (overwrite) {
            data.value.prizes = newPrizes
        } else {
            data.value.prizes.unshift(...newPrizes)
        }
        persist()
        return newPrizes.length
    }

    function addRecord(prize: Prize) {
        const r: DrawRecord = {
            id: generateId('R'),
            prizeId: prize.id,
            prizeName: prize.name,
            drawnAt: Date.now(),
        }
        data.value.records.unshift(r)
        persist()
        return r
    }

    function getAllRecords(): DrawRecord[] {
        return [...data.value.records]
    }

    function clearRecords() {
        data.value.records = []
        persist()
    }

    return {
        hydrate,
        clear,
        getAllPrizes,
        addPrize,
        updatePrize,
        deletePrize,
        clearPrizes,
        importFromShop,
        addRecord,
        getAllRecords,
        clearRecords,
    }
})


