import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchSessionInit } from '@/api/session'
import { useCacheStore } from '@/stores/cacheStore'
import type { SessionRole, SidebarMenu } from '@/types/session'
import { canAccessPath, firstAllowedPath, normalizeSidebar } from '@/utils/menuAccess'
import { computeTrialFromProfile, normalizeUserProfile } from '@/utils/userProfile'

export const useSessionStore = defineStore('session', () => {
    const sidebar = ref<SidebarMenu[]>([])
    const role = ref<SessionRole | null>(null)
    const initialized = ref(false)
    const loading = ref(false)
    const error = ref('')
    let inFlight: Promise<void> | null = null

    const firstRoute = computed(() => firstAllowedPath(sidebar.value))

    function reset() {
        sidebar.value = []
        role.value = null
        initialized.value = false
        loading.value = false
        error.value = ''
        inFlight = null
    }

    async function initialize(force = false): Promise<void> {
        const cacheStore = useCacheStore()
        if (!cacheStore.token) {
            reset()
            return
        }
        if (initialized.value && !force) return
        if (inFlight) return inFlight

        const task = (async () => {
            loading.value = true
            error.value = ''
            try {
                const response = await fetchSessionInit()
                const profile = normalizeUserProfile(response.data?.user, cacheStore.profile?.email ?? '')
                const trialState = computeTrialFromProfile(profile)
                cacheStore.setAuth(cacheStore.token!, profile, trialState.trial, trialState.expiresAt)
                sidebar.value = normalizeSidebar(response.data?.config?.sidebar)
                role.value = response.data?.role ?? null
                initialized.value = true
            } catch (err) {
                initialized.value = false
                sidebar.value = []
                role.value = null
                if (cacheStore.token) {
                    error.value = err instanceof Error ? err.message : '会话初始化失败，请稍后重试'
                }
                throw err
            } finally {
                loading.value = false
                inFlight = null
            }
        })()
        inFlight = task
        return task
    }

    function canAccess(path: string): boolean {
        return canAccessPath(sidebar.value, path)
    }

    return { sidebar, role, initialized, loading, error, firstRoute, initialize, reset, canAccess }
})
