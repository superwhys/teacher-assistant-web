import { defineStore } from 'pinia'
import { ref } from 'vue'
import { asyncStorage, getUserStorageKey } from '@/utils/storage'
import type { ShopItem, ExchangeRecord } from '@/types/shopItem'
import { useCacheStore } from './cacheStore'

const STORAGE_KEY_BASE = 'ta_shop_store_v1'

type ShopStoreData = {
    items: ShopItem[]
    records: ExchangeRecord[]
}

function loadInitial(): ShopStoreData {
    return {
        items: [],
        records: []
    }
}

function generateId(prefix: string = 'SI'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export const useShopStore = defineStore('shop', () => {
    const cacheStore = useCacheStore()
    const data = ref<ShopStoreData>(loadInitial())

    function getStorageKey(): string {
        const userId = cacheStore.profile?.id || null
        return getUserStorageKey(STORAGE_KEY_BASE, userId)
    }

    function persist(data: ShopStoreData) {
        void asyncStorage.setItem<ShopStoreData>(getStorageKey(), data)
    }

    async function hydrate() {
        const saved = await asyncStorage.getItem<ShopStoreData>(getStorageKey())
        if (saved && typeof saved === 'object') {
            data.value = saved
        }
    }

    function clear() {
        data.value = {
            items: [],
            records: []
        }
    }

    function addItem(item: Omit<ShopItem, 'id' | 'createdAt'>) {
        const newItem: ShopItem = {
            ...item,
            id: generateId('SI'),
            createdAt: Date.now()
        }
        data.value.items.push(newItem)
        persist(data.value)
        return newItem
    }

    function updateItem(id: string, updates: Partial<Omit<ShopItem, 'id' | 'createdAt'>>) {
        const item = data.value.items.find(i => i.id === id)
        if (!item) return false
        Object.assign(item, updates)
        persist(data.value)
        return true
    }

    function deleteItem(id: string) {
        const idx = data.value.items.findIndex(i => i.id === id)
        if (idx === -1) return false
        data.value.items.splice(idx, 1)
        persist(data.value)
        return true
    }

    function getItemById(id: string): ShopItem | undefined {
        return data.value.items.find(i => i.id === id)
    }

    function getAllItems(): ShopItem[] {
        return [...data.value.items]
    }

    function addExchangeRecord(record: Omit<ExchangeRecord, 'id' | 'exchangedAt'>) {
        const item = getItemById(record.shopItemId)
        if (!item) {
            throw new Error('商品不存在')
        }
        if (item.stock < record.quantity) {
            throw new Error('商品库存不足')
        }

        const newRecord: ExchangeRecord = {
            ...record,
            id: generateId('ER'),
            exchangedAt: Date.now()
        }

        item.stock -= record.quantity
        data.value.records.push(newRecord)
        persist(data.value)
        return newRecord
    }

    function undoExchange(recordId: string) {
        const idx = data.value.records.findIndex(r => r.id === recordId)
        if (idx === -1) return null

        const record = data.value.records[idx]
        if (!record) return null
        
        const item = getItemById(record.shopItemId)
        
        if (item) {
            item.stock += record.quantity
        }

        data.value.records.splice(idx, 1)
        persist(data.value)
        return record
    }

    function getRecordsByClass(classId: string): ExchangeRecord[] {
        return data.value.records.filter(r => r.classId === classId)
    }

    function getRecordsByStudent(classId: string, studentName: string): ExchangeRecord[] {
        return data.value.records.filter(r => r.classId === classId && r.studentName === studentName)
    }

    function getAllRecords(): ExchangeRecord[] {
        return [...data.value.records].sort((a, b) => b.exchangedAt - a.exchangedAt)
    }

    function importItems(items: Omit<ShopItem, 'id' | 'createdAt'>[]) {
        const newItems = items.map(item => ({
            ...item,
            id: generateId('SI'),
            createdAt: Date.now()
        }))
        data.value.items.push(...newItems)
        persist(data.value)
        return newItems.length
    }

    function clearAllItems() {
        data.value.items = []
        persist(data.value)
    }

    return {
        items: data.value.items,
        addItem,
        updateItem,
        deleteItem,
        getItemById,
        getAllItems,
        addExchangeRecord,
        undoExchange,
        getRecordsByClass,
        getRecordsByStudent,
        getAllRecords,
        importItems,
        clearAllItems,
        hydrate,
        clear,
    }
})

