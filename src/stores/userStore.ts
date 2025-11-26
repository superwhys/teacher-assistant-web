import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserProfile } from '@/types/user'

export const useUserStore = defineStore('user', () => {
    const token = ref<string | null>(null)
    const profile = ref<UserProfile | null>(null)
    const isTrial = ref<boolean>(false)
    const trialExpiresAt = ref<number | null>(null)
    const isExpired = ref<boolean>(false)

    function setAuth(tokenValue: string, user: UserProfile, trial: boolean, expiresAt?: number | null): void {
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
        key: 'ta_user_store_v1',
        storage: localStorage,
    }
})


