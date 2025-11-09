import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { asyncStorage, getUserStorageKey } from '@/utils/storage'
import type { ClassInfo } from '@/types/class'
import { useUserStore } from './userStore'

const STORAGE_KEY_BASE = 'ta_class_store_v1'

function generateId(prefix: string = 'cls'): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

const defaultInitial: { classes: ClassInfo[]; activeClassId: string | null } = {
    classes: [],
    activeClassId: null,
}

export const useClassStore = defineStore('class', () => {
    const initial = defaultInitial
    const userStore = useUserStore()

    const classes = ref<ClassInfo[]>(initial.classes)
    const activeClassId = ref<string | null>(initial.activeClassId)

    const activeClass = computed<ClassInfo | null>(() => classes.value.find(c => c.id === activeClassId.value) ?? null)

    function getStorageKey(): string {
        const userId = userStore.profile?.id || null
        return getUserStorageKey(STORAGE_KEY_BASE, userId)
    }

    function persist() {
        const payload = { classes: classes.value, activeClassId: activeClassId.value }
        void asyncStorage.setItem(getStorageKey(), payload)
    }

    async function hydrate() {
        const saved = await asyncStorage.getItem<{ classes: ClassInfo[]; activeClassId: string | null }>(getStorageKey())
        if (!saved) return
        classes.value = Array.isArray(saved.classes) ? saved.classes : []
        activeClassId.value = saved.activeClassId ?? null
    }

    function clear() {
        classes.value = []
        activeClassId.value = null
    }

    function setActiveClass(id: string) {
        if (classes.value.some(c => c.id === id)) {
            activeClassId.value = id
            persist()
        }
    }

    function addClass(name: string) {
        const newClass: ClassInfo = {
            id: generateId('C'),
            name,
            createdAt: Date.now(),
        }
        classes.value.push(newClass)
        if (!activeClassId.value) activeClassId.value = newClass.id
        persist()
    }

    function removeClass(id: string) {
        const index = classes.value.findIndex(c => c.id === id)
        if (index === -1) return
        classes.value.splice(index, 1)
        if (activeClassId.value === id) {
            activeClassId.value = classes.value[0]?.id ?? null
        }
        persist()
    }

    function updateClassName(id: string, newName: string) {
        const cls = classes.value.find(c => c.id === id)
        if (cls) {
            cls.name = newName
            persist()
        }
    }

    return {
        classes,
        activeClassId,
        activeClass,
        setActiveClass,
        addClass,
        removeClass,
        updateClassName,
        persist,
        hydrate,
        clear,
    }
})


