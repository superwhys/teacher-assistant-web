import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { StudentsSortOption } from '@/types/student'
import type { UserProfile } from '@/types/user'

export const useCacheStore = defineStore('cache', () => {
    let activeClassId = ref<number | null>(null)
    let activeClassName = ref<string | null>(null)
    let studentsSort = ref<StudentsSortOption | null>(null)
    let classLayout = ref<'card' | 'list' | null>(null)

    const token = ref<string | null>(null)
    const profile = ref<UserProfile | null>(null)
    const isTrial = ref<boolean>(false)
    const trialExpiresAt = ref<number | null>(null)
    const isExpired = ref<boolean>(false)


    function setActiveClassId(id: number) {
        activeClassId.value = id
    }

    function getActiveClassId() {
        return activeClassId.value
    }

    function clearActiveClassId() {
        activeClassId.value = null
    }

    function setActiveClassName(name: string) {
        activeClassName.value = name
    }

    function getActiveClassName() {
        return activeClassName.value
    }

    function clearActiveClassName() {
        activeClassName.value = null
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

    function setAuth(
        tokenValue: string,
        user: UserProfile,
        trial: boolean,
        expiresAt?: number | null,
    ): void {
        token.value = tokenValue
        profile.value = user
        isTrial.value = trial
        trialExpiresAt.value = typeof expiresAt === 'number' ? expiresAt : null
        isExpired.value = false
    }

    function setTokenOnly(tokenValue: string, trial: boolean, expiresAt?: number | null): void {
        token.value = tokenValue
        isTrial.value = trial
        trialExpiresAt.value = typeof expiresAt === 'number' ? expiresAt : null
        isExpired.value = false
    }

    function updateProfile(user: UserProfile): void {
        profile.value = user
    }

    function setExpired(expired: boolean): void {
        isExpired.value = expired
    }

    function logout(): void {
        token.value = null
        profile.value = null
        isTrial.value = false
        trialExpiresAt.value = null
        isExpired.value = false
    }

    const isAuthenticated = computed<boolean>(() => !!token.value)
    const displayName = computed<string>(() => profile.value?.name || profile.value?.email || '')

    return {
        activeClassId,
        setActiveClassId,
        getActiveClassId,
        clearActiveClassId,
        activeClassName,
        setActiveClassName,
        getActiveClassName,
        clearActiveClassName,
        studentsSort,
        setStudentsSort,
        getStudentsSort,
        clearStudentsSort,
        classLayout,
        setClassLayout,
        getClassLayout,
        clearClassLayout,
        token,
        profile,
        isTrial,
        trialExpiresAt,
        isExpired,
        isAuthenticated,
        displayName,
        setAuth,
        setTokenOnly,
        updateProfile,
        setExpired,
        logout,
    }
}, {
    persist: {
        key: 'ta_cache_v1',
        storage: localStorage,
    }
})