import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { asyncStorage } from '@/utils/storage'
import type { UserProfile } from '@/types/user'

const STORAGE_KEY = 'ta_user_store_v1'
const TOKEN_STORAGE_KEY = 'auth_token'

export const useUserStore = defineStore('user', () => {
    const token = ref<string | null>(null)
    const profile = ref<UserProfile | null>(null)
    const hydrated = ref<boolean>(false)
    const isTrial = ref<boolean>(false)
    const trialExpiresAt = ref<number | null>(null)

    function persist(): void {
        const payload = {
            token: token.value,
            profile: profile.value,
            isTrial: isTrial.value,
            trialExpiresAt: trialExpiresAt.value,
        }
        void asyncStorage.setItem(STORAGE_KEY, payload)
        if (token.value) {
            localStorage.setItem(TOKEN_STORAGE_KEY, token.value)
        } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY)
        }
    }

    async function hydrate(): Promise<void> {
        if (hydrated.value) return
        const saved = await asyncStorage.getItem<{ token?: string | null; profile?: UserProfile | null; isTrial?: boolean; trialExpiresAt?: number | null }>(STORAGE_KEY)
        if (saved) {
            if (typeof saved.token === 'string') token.value = saved.token
            else if (saved.token === null) token.value = null
            if (saved.profile && typeof saved.profile === 'object') profile.value = saved.profile
            if (typeof saved.isTrial === 'boolean') isTrial.value = saved.isTrial
            if (typeof saved.trialExpiresAt === 'number' || saved.trialExpiresAt === null) trialExpiresAt.value = saved.trialExpiresAt ?? null
        }
        if (!token.value) {
            const localToken = localStorage.getItem(TOKEN_STORAGE_KEY)
            token.value = localToken ?? null
        }
        hydrated.value = true
    }

    function setAuth(tokenValue: string, user: UserProfile, trial: boolean, expiresAt?: number | null): void {
        token.value = tokenValue
        profile.value = user
        isTrial.value = trial
        trialExpiresAt.value = typeof expiresAt === 'number' ? expiresAt : null
        persist()
    }

    function setTokenOnly(tokenValue: string, trial: boolean, expiresAt?: number | null): void {
        token.value = tokenValue
        isTrial.value = trial
        trialExpiresAt.value = typeof expiresAt === 'number' ? expiresAt : null
        persist()
    }

    function updateProfile(user: UserProfile): void {
        profile.value = user
        persist()
    }

    function logout(): void {
        token.value = null
        profile.value = null
        isTrial.value = false
        trialExpiresAt.value = null
        persist()
    }

    const isAuthenticated = computed<boolean>(() => !!token.value)
    const displayName = computed<string>(() => profile.value?.name || profile.value?.email || '')
    return {
        token,
        profile,
        hydrated,
        isTrial,
        trialExpiresAt,
        isAuthenticated,
        displayName,
        persist,
        hydrate,
        setAuth,
        setTokenOnly,
        updateProfile,
        logout,
    }
})


