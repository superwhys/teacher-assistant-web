import { defineStore } from 'pinia'
import { ref } from 'vue'
import { asyncStorage, getUserStorageKey } from '@/utils/storage'
import type { PointsGroup, PointsItem, PointsSign } from '@/types/pointsItem'
import { useUserStore } from './userStore'

type PointsConfig = {
    groups: PointsGroup[]
    items: PointsItem[]
}

const STORAGE_KEY_BASE = 'ta_points_item_store_v2'
const OLD_STORAGE_KEY_BASE = 'ta_points_item_store_v1'

function generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function loadInitial(): PointsConfig {
    return defaultConfig()
}

function defaultConfig(): PointsConfig {
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

export const usePointsItemStore = defineStore('pointsItem', () => {
    const userStore = useUserStore()
    const config = ref<PointsConfig>(loadInitial())

    function getStorageKey(): string {
        const userId = userStore.profile?.id || null
        return getUserStorageKey(STORAGE_KEY_BASE, userId)
    }

    function getOldStorageKey(): string {
        const userId = userStore.profile?.id || null
        return getUserStorageKey(OLD_STORAGE_KEY_BASE, userId)
    }

    function persist(cfg: PointsConfig) {
        void asyncStorage.setItem<PointsConfig>(getStorageKey(), cfg)
    }

    async function hydrate() {
        const v2Key = getStorageKey()
        const v1Key = getOldStorageKey()
        const saved = await asyncStorage.getItem<PointsConfig>(v2Key)
        if (saved && saved.groups && Array.isArray(saved.groups) && saved.items && Array.isArray(saved.items)) {
            config.value = saved
            // v2 已存在时，直接清理 v1
            await asyncStorage.removeItem(v1Key)
            return
        }

        const oldData = await asyncStorage.getItem<Record<string, PointsConfig>>(v1Key)
        if (oldData && typeof oldData === 'object') {
            const mergedGroups: PointsGroup[] = []
            const mergedItems: PointsItem[] = []
            const groupNameMap = new Map<string, string>()

            for (const classId in oldData) {
                const cfg = oldData[classId]
                if (!cfg || !cfg.groups || !cfg.items) continue

                for (const group of cfg.groups) {
                    const existingGroupId = groupNameMap.get(group.name)
                    if (!existingGroupId) {
                        mergedGroups.push({ ...group })
                        groupNameMap.set(group.name, group.id)
                    }
                }

                for (const item of cfg.items) {
                    const groupOfItem = cfg.groups.find(g => g.id === item.groupId)
                    const targetGroupId = (groupOfItem && groupNameMap.get(groupOfItem.name)) || item.groupId
                    mergedItems.push({ ...item, groupId: targetGroupId })
                }
            }

            if (mergedGroups.length > 0) {
                config.value = { groups: mergedGroups, items: mergedItems }
                persist(config.value)
            }
            // 迁移完成后，无论是否合并出数据，都清理 v1
            await asyncStorage.removeItem(v1Key)
        }
    }

    function clear() {
        config.value = loadInitial()
    }

    function listGroups(): PointsGroup[] {
        return config.value.groups
    }

    function listItems(sign: PointsSign | 'all' = 'all'): PointsItem[] {
        const items = config.value.items
        return sign === 'all' ? items : items.filter(i => i.sign === sign)
    }

    function listItemsByGroup(groupId: string, sign: PointsSign | 'all' = 'all'): PointsItem[] {
        const list = listItems(sign)
        return list.filter(i => i.groupId === groupId)
    }

    function addGroup(name: string, icon?: string): PointsGroup {
        const g: PointsGroup = { id: generateId('PG'), name, icon }
        config.value.groups.push(g)
        persist(config.value)
        return g
    }

    function addItem(groupId: string, name: string, value: number, sign: PointsSign): PointsItem {
        const it: PointsItem = { id: generateId('PI'), groupId, name, value: Math.abs(value), sign }
        config.value.items.push(it)
        persist(config.value)
        return it
    }

    function renameGroup(groupId: string, name: string, icon?: string) {
        const g = config.value.groups.find(x => x.id === groupId)
        if (!g) return
        g.name = name
        if (icon !== undefined) g.icon = icon
        persist(config.value)
    }

    function removeGroup(groupId: string) {
        config.value.groups = config.value.groups.filter(g => g.id !== groupId)
        config.value.items = config.value.items.filter(i => i.groupId !== groupId)
        persist(config.value)
    }

    function updateItem(itemId: string, payload: Partial<Pick<PointsItem, 'name' | 'value' | 'sign' | 'groupId'>>) {
        const it = config.value.items.find(x => x.id === itemId)
        if (!it) return
        if (payload.name !== undefined) it.name = payload.name
        if (payload.value !== undefined) it.value = Math.abs(payload.value)
        if (payload.sign !== undefined) it.sign = payload.sign
        if (payload.groupId !== undefined) it.groupId = payload.groupId
        persist(config.value)
    }

    function removeItem(itemId: string) {
        config.value.items = config.value.items.filter(i => i.id !== itemId)
        persist(config.value)
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


