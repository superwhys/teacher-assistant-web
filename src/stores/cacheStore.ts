import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StudentsSortOption } from '@/types/student'

export const useCacheStore = defineStore('cache', () => {
    let activeClassId = ref<number | null>(null)
    let studentsSort = ref<StudentsSortOption | null>(null)
    let classLayout = ref<'card' | 'list' | null>(null)


    function setActiveClassId(id: number) {
        activeClassId.value = id
    }

    function getActiveClassId() {
        return activeClassId.value
    }

    function clearActiveClassId() {
        activeClassId.value = null
    }

    function setStudentsSort(sort: StudentsSortOption) {
        studentsSort.value = sort
    }

    function getStudentsSort() {
        return studentsSort.value
    }

    function clearStudentsSort() {
        studentsSort.value = null
    }

    function setClassLayout(layout: 'card' | 'list') {
        classLayout.value = layout
    }

    function getClassLayout() {
        return classLayout.value
    }

    function clearClassLayout() {
        classLayout.value = null
    }

    return {
        activeClassId,
        setActiveClassId,
        getActiveClassId,
        clearActiveClassId,
        studentsSort,
        setStudentsSort,
        getStudentsSort,
        clearStudentsSort,
        classLayout,
        setClassLayout,
        getClassLayout,
        clearClassLayout,
    }
}, {
    persist: {
        key: 'ta_user_cache_v1',
        storage: localStorage,
    }
})