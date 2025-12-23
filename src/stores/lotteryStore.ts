import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Prize, DrawRecord, PrizePool } from '@/types/lottery'
import type { ShopItem } from '@/types/shopItem'
import { asyncStorage, getUserStorageKey } from '@/utils/storage'
import { useCacheStore } from './cacheStore'

const STORAGE_KEY_BASE = 'ta_lottery_store_v2'

type LotteryStoreData = {
    pools: PrizePool[]
    currentPoolId: string | null
}

type LegacyLotteryStoreData = {
    prizes: Prize[]
    records: DrawRecord[]
}

function loadInitial(): LotteryStoreData {
    return {
        pools: [],
        currentPoolId: null,
    }
}

function generateId(prefix: string = 'LT'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export const useLotteryStore = defineStore('lottery', () => {
    const cacheStore = useCacheStore()
    const data = ref<LotteryStoreData>(loadInitial())

    function getStorageKey(): string {
        const userId = cacheStore.profile?.id || null
        return getUserStorageKey(STORAGE_KEY_BASE, userId)
    }

    function getLegacyStorageKey(): string {
        const userId = cacheStore.profile?.id || null
        return getUserStorageKey('ta_lottery_store_v1', userId)
    }

    function persist() {
        void asyncStorage.setItem<LotteryStoreData>(getStorageKey(), data.value)
    }

    async function hydrate() {
        const saved = await asyncStorage.getItem<LotteryStoreData>(getStorageKey())
        if (saved && typeof saved === 'object' && Array.isArray(saved.pools)) {
            data.value = saved
            if (data.value.pools.length > 0 && !data.value.currentPoolId) {
                data.value.currentPoolId = data.value.pools[0]!.id
            }
        } else {
            const legacy = await asyncStorage.getItem<LegacyLotteryStoreData>(getLegacyStorageKey())
            if (legacy && typeof legacy === 'object' && Array.isArray(legacy.prizes)) {
                const defaultPool: PrizePool = {
                    id: generateId('POOL'),
                    name: '默认奖池',
                    prizes: legacy.prizes || [],
                    records: legacy.records || [],
                    createdAt: Date.now(),
                }
                data.value = {
                    pools: [defaultPool],
                    currentPoolId: defaultPool.id,
                }
                persist()
                await asyncStorage.removeItem(getLegacyStorageKey())
            }
        }
        if (data.value.pools.length === 0) {
            const defaultPool = createPool('默认奖池')
            data.value.currentPoolId = defaultPool.id
            persist()
        }
    }

    function getCurrentPool(): PrizePool | null {
        if (!data.value.currentPoolId) return null
        return data.value.pools.find(p => p.id === data.value.currentPoolId) || null
    }

    const currentPool = computed(() => getCurrentPool())

    function createPool(name: string): PrizePool {
        const pool: PrizePool = {
            id: generateId('POOL'),
            name: name.trim() || '未命名奖池',
            prizes: [],
            records: [],
            createdAt: Date.now(),
        }
        data.value.pools.unshift(pool)
        persist()
        return pool
    }

    function updatePool(id: string, updates: Partial<Omit<PrizePool, 'id' | 'createdAt'>>) {
        const pool = data.value.pools.find(p => p.id === id)
        if (!pool) return false
        if (updates.name !== undefined) {
            pool.name = updates.name.trim() || '未命名奖池'
        }
        persist()
        return true
    }

    function deletePool(id: string) {
        const idx = data.value.pools.findIndex(p => p.id === id)
        if (idx === -1) return false
        if (data.value.pools.length === 1) return false
        data.value.pools.splice(idx, 1)
        if (data.value.currentPoolId === id) {
            data.value.currentPoolId = data.value.pools[0]?.id || null
        }
        persist()
        return true
    }

    function setCurrentPool(id: string) {
        const pool = data.value.pools.find(p => p.id === id)
        if (pool) {
            data.value.currentPoolId = id
            persist()
        }
    }

    function getAllPools(): PrizePool[] {
        return [...data.value.pools].sort((a, b) => b.createdAt - a.createdAt)
    }

    function getAllPrizes(): Prize[] {
        const pool = getCurrentPool()
        if (!pool) return []
        return [...pool.prizes].sort((a, b) => b.createdAt - a.createdAt)
    }

    function addPrize(payload: Omit<Prize, 'id' | 'createdAt'>) {
        const pool = getCurrentPool()
        if (!pool) return null
        const prize: Prize = {
            ...payload,
            id: generateId('P'),
            createdAt: Date.now(),
        }
        pool.prizes.unshift(prize)
        persist()
        return prize
    }

    function updatePrize(id: string, updates: Partial<Omit<Prize, 'id' | 'createdAt'>>) {
        const pool = getCurrentPool()
        if (!pool) return false
        const p = pool.prizes.find(x => x.id === id)
        if (!p) return false
        Object.assign(p, updates)
        persist()
        return true
    }

    function deletePrize(id: string) {
        const pool = getCurrentPool()
        if (!pool) return false
        const idx = pool.prizes.findIndex(x => x.id === id)
        if (idx === -1) return false
        pool.prizes.splice(idx, 1)
        persist()
        return true
    }

    function clearPrizes() {
        const pool = getCurrentPool()
        if (!pool) return
        pool.prizes = []
        persist()
    }

    function importFromShop(items: ShopItem[], weightStrategy: 'fixed' | 'stock' = 'fixed', overwrite: boolean = false) {
        const pool = getCurrentPool()
        if (!pool) return 0
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
            pool.prizes = newPrizes
        } else {
            pool.prizes.unshift(...newPrizes)
        }
        persist()
        return newPrizes.length
    }

    function addRecord(prize: Prize) {
        const pool = getCurrentPool()
        if (!pool) return null
        const r: DrawRecord = {
            id: generateId('R'),
            prizeId: prize.id,
            prizeName: prize.name,
            drawnAt: Date.now(),
        }
        pool.records.unshift(r)
        persist()
        return r
    }

    function getAllRecords(): DrawRecord[] {
        const pool = getCurrentPool()
        if (!pool) return []
        return [...pool.records]
    }

    function clearRecords() {
        const pool = getCurrentPool()
        if (!pool) return
        pool.records = []
        persist()
    }

    function clear() {
        data.value = loadInitial()
        const defaultPool = createPool('默认奖池')
        data.value.currentPoolId = defaultPool.id
    }

    return {
        hydrate,
        clear,
        currentPool,
        getAllPools,
        createPool,
        updatePool,
        deletePool,
        setCurrentPool,
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


