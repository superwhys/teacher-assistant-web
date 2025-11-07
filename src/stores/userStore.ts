import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserProfile } from '@/types/user'

export const useUserStore = defineStore('user', () => {
    const token = ref<string | null>(null)
    const profile = ref<UserProfile | null>(null)
    const isTrial = ref<boolean>(false)
    const trialExpiresAt = ref<number | null>(null)

    function setAuth(tokenValue: string, user: UserProfile, trial: boolean, expiresAt?: number | null): void {
        token.value = tokenValue
        profile.value = user
        isTrial.value = trial
        trialExpiresAt.value = typeof expiresAt === 'number' ? expiresAt : null
    }

    function setTokenOnly(tokenValue: string, trial: boolean, expiresAt?: number | null): void {
        token.value = tokenValue
        isTrial.value = trial
        trialExpiresAt.value = typeof expiresAt === 'number' ? expiresAt : null
    }

    function updateProfile(user: UserProfile): void {
        profile.value = user
    }

    function logout(): void {
        token.value = null
        profile.value = null
        isTrial.value = false
        trialExpiresAt.value = null
    }

    const isAuthenticated = computed<boolean>(() => !!token.value)
    const displayName = computed<string>(() => profile.value?.name || profile.value?.email || '')
    
    return {
        token,
        profile,
        isTrial,
        trialExpiresAt,
        isAuthenticated,
        displayName,
        setAuth,
        setTokenOnly,
        updateProfile,
        logout,
    }
}, {
    persist: {
        key: 'ta_user_store_v1',
        storage: localStorage,
    }
})


