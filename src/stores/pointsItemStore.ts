import { defineStore } from 'pinia'
import { ref } from 'vue'
import { asyncStorage, getUserStorageKey } from '@/utils/storage'
import type { PointsGroup, PointsItem, PointsSign } from '@/types/pointsItem'
import { useUserStore } from './userStore'

type ClassId = string

type ClassPointsConfig = {
    groups: PointsGroup[]
    items: PointsItem[]
}

type Records = Record<ClassId, ClassPointsConfig>

const STORAGE_KEY_BASE = 'ta_points_item_store_v1'

function generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function loadInitial(): Records {
    return {}
}

function defaultConfig(): ClassPointsConfig {
    const gidHomework = generateId('PG')
    const gidBehavior = generateId('PG')
    const groups: PointsGroup[] = [
        { id: gidHomework, name: '作业', icon: '🎓' },
        { id: gidBehavior, name: '课堂表现', icon: '📚' },
    ]
    const items: PointsItem[] = [
        { id: generateId('PI'), groupId: gidHomework, name: '按时完成', value: 2, sign: 'plus' },
        { id: generateId('PI'), groupId: gidHomework, name: '优秀完成', value: 3, sign: 'plus' },
        { id: generateId('PI'), groupId: gidHomework, name: '未交作业', value: 2, sign: 'minus' },

        { id: generateId('PI'), groupId: gidBehavior, name: '积极举手', value: 1, sign: 'plus' },
        { id: generateId('PI'), groupId: gidBehavior, name: '帮助同学', value: 2, sign: 'plus' },
        { id: generateId('PI'), groupId: gidBehavior, name: '影响课堂', value: 1, sign: 'minus' },
    ]
    return { groups, items }
}

function ensureClass(records: Records, classId: string): ClassPointsConfig {
    if (!records[classId]) {
        records[classId] = defaultConfig()
    }
    return records[classId]
}

export const usePointsItemStore = defineStore('pointsItem', () => {
    const userStore = useUserStore()
    const records = ref<Records>(loadInitial())

    function getStorageKey(): string {
        const userId = userStore.profile?.id || null
        return getUserStorageKey(STORAGE_KEY_BASE, userId)
    }

    function persist(records: Records) {
        void asyncStorage.setItem<Records>(getStorageKey(), records)
    }

    async function hydrate() {
        const saved = await asyncStorage.getItem<Records>(getStorageKey())
        if (!saved) return
        if (saved && typeof saved === 'object') {
            records.value = saved
        }
    }

    function clear() {
        records.value = {}
    }

    function listGroups(classId: string | null): PointsGroup[] {
        if (!classId) return []
        return ensureClass(records.value, classId).groups
    }

    function listItems(classId: string | null, sign: PointsSign | 'all' = 'all'): PointsItem[] {
        if (!classId) return []
        const { items } = ensureClass(records.value, classId)
        return sign === 'all' ? items : items.filter(i => i.sign === sign)
    }

    function listItemsByGroup(classId: string | null, groupId: string, sign: PointsSign | 'all' = 'all'): PointsItem[] {
        if (!classId) return []
        const list = listItems(classId, sign)
        return list.filter(i => i.groupId === groupId)
    }

    // CRUD 略，预留接口
    function addGroup(classId: string, name: string, icon?: string): PointsGroup {
        const cfg = ensureClass(records.value, classId)
        const g: PointsGroup = { id: generateId('PG'), name, icon }
        cfg.groups.push(g)
        persist(records.value)
        return g
    }

    function addItem(classId: string, groupId: string, name: string, value: number, sign: PointsSign): PointsItem {
        const cfg = ensureClass(records.value, classId)
        const it: PointsItem = { id: generateId('PI'), groupId, name, value: Math.abs(value), sign }
        cfg.items.push(it)
        persist(records.value)
        return it
    }

    function renameGroup(classId: string, groupId: string, name: string, icon?: string) {
        const cfg = ensureClass(records.value, classId)
        const g = cfg.groups.find(x => x.id === groupId)
        if (!g) return
        g.name = name
        g.icon = icon
        persist(records.value)
    }

    function removeGroup(classId: string, groupId: string) {
        const cfg = ensureClass(records.value, classId)
        cfg.groups = cfg.groups.filter(g => g.id !== groupId)
        cfg.items = cfg.items.filter(i => i.groupId !== groupId)
        persist(records.value)
    }

    function updateItem(classId: string, itemId: string, payload: Partial<Pick<PointsItem, 'name' | 'value' | 'sign' | 'groupId'>>) {
        const cfg = ensureClass(records.value, classId)
        const it = cfg.items.find(x => x.id === itemId)
        if (!it) return
        if (payload.name !== undefined) it.name = payload.name
        if (payload.value !== undefined) it.value = Math.abs(payload.value)
        if (payload.sign !== undefined) it.sign = payload.sign
        if (payload.groupId !== undefined) it.groupId = payload.groupId
        persist(records.value)
    }

    function removeItem(classId: string, itemId: string) {
        const cfg = ensureClass(records.value, classId)
        cfg.items = cfg.items.filter(i => i.id !== itemId)
        persist(records.value)
    }

    return {
        listGroups,
        listItems,
        listItemsByGroup,
        addGroup,
        addItem,
        renameGroup,
        removeGroup,
        updateItem,
        removeItem,
        hydrate,
        clear,
    }
})


