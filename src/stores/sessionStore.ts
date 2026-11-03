import { computed, onScopeDispose, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { fetchSessionInit } from '@/api/session'
import { userApi } from '@/api/user'
import { useCacheStore } from '@/stores/cacheStore'
import type { SessionRole, SidebarMenu } from '@/types/session'
import { ApiRequestError, isApiRequestError } from '@/types/api'
import { canAccessPath, firstAllowedPath, normalizeSidebar } from '@/utils/menuAccess'
import { computeTrialFromProfile, normalizeUserProfile } from '@/utils/userProfile'
import { effectiveEntitlementState, entitlementDeadline, entitlementMessage as describeEntitlement, hasCommercialAccess } from '@/utils/entitlement'
import { ENTITLEMENT_REJECTED_EVENT } from '@/utils/entitlementEvents'

export const useSessionStore = defineStore('session', () => {
    const cacheStore = useCacheStore()
    const allSidebar = ref<SidebarMenu[]>([])
    const role = ref<SessionRole | null>(null)
    const initialized = ref(false)
    const loading = ref(false)
    const error = ref('')
    const startingTrial = ref(false)
    const now = ref(Date.now())
    let inFlight: Promise<void> | null = null
    let trialRequest: Promise<void> | null = null
    let generation = 0
    let trialVersion = 0
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined

    const entitlementState = computed(() => effectiveEntitlementState(cacheStore.profile, now.value))
    const trialExpiresAt = computed(() => entitlementDeadline(cacheStore.profile?.entitlement?.trial_expires_at))
    const paidExpiresAt = computed(() => entitlementDeadline(cacheStore.profile?.entitlement?.paid_expires_at))
    const canWrite = computed(() => hasCommercialAccess(entitlementState.value))
    const canPrepare = computed(() => canWrite.value || entitlementState.value === 'not_started')
    const canImportExport = computed(() => canWrite.value)
    const isPreparation = computed(() => entitlementState.value === 'not_started')
    const isReadOnly = computed(() => !canPrepare.value)
    const entitlementMessage = computed(() => describeEntitlement(entitlementState.value))
    const canUseAgent = computed(() => allSidebar.value.some(menu => menu.code === 'agent'))
    const sidebar = computed(() => {
        const menus = allSidebar.value.filter(menu => menu.code !== 'agent')
        if (isPreparation.value || entitlementState.value === 'unavailable') {
            return menus.filter(menu => menu.route_key === 'students' || menu.route_key === 'settings')
        }
        return menus
    })
    const firstRoute = computed(() => firstAllowedPath(sidebar.value))

    function updateClock(): void {
        now.value = Date.now()
        clearTimeout(deadlineTimer)
        const deadline = cacheStore.profile?.entitlement?.state === 'paid_active'
            ? paidExpiresAt.value : trialExpiresAt.value
        if (deadline !== null && deadline > now.value && canWrite.value) {
            deadlineTimer = setTimeout(updateClock, Math.min(deadline - now.value + 1, 2147483647))
        }
    }

    watch(() => cacheStore.profile, updateClock, { immediate: true, deep: true })

    function reset() {
        generation += 1
        allSidebar.value = []
        role.value = null
        initialized.value = false
        loading.value = false
        error.value = ''
        inFlight = null
        trialRequest = null
        startingTrial.value = false
        trialVersion += 1
        clearTimeout(deadlineTimer)
    }

    watch(() => cacheStore.token, (token, previous) => {
        if (token !== previous) reset()
    }, { flush: 'sync' })

    async function initialize(force = false): Promise<void> {
        const token = cacheStore.token
        if (!token) {
            reset()
            return
        }
        if (initialized.value && !force) return
        if (inFlight) return inFlight
        const version = generation
        const hadSession = initialized.value
        const task = (async () => {
            loading.value = true
            error.value = ''
            try {
                const response = await fetchSessionInit()
                if (cacheStore.token !== token || version !== generation) return
                const profile = normalizeUserProfile(response.data?.user, cacheStore.profile?.email ?? '')
                if (!profile.roleCode) profile.roleCode = response.data?.role?.code ?? null
                const trial = computeTrialFromProfile(profile)
                cacheStore.setAuth(token, profile, trial.trial, trial.expiresAt)
                allSidebar.value = normalizeSidebar(response.data?.config?.sidebar)
                role.value = response.data?.role ?? null
                initialized.value = true
                updateClock()
            } catch (err) {
                if (cacheStore.token === token && version === generation && !hadSession) {
                    initialized.value = false
                    allSidebar.value = []
                    role.value = null
                    error.value = err instanceof Error ? err.message : '会话初始化失败，请稍后重试'
                }
                throw err
            } finally {
                if (version === generation) {
                    loading.value = false
                    inFlight = null
                }
            }
        })()
        inFlight = task
        return task
    }

    function startTrial(): Promise<void> {
        if (trialRequest) return trialRequest
        const token = cacheStore.token
        if (!token || entitlementState.value !== 'not_started') {
            ElMessage.warning(entitlementMessage.value)
            return Promise.reject(new ApiRequestError(entitlementMessage.value))
        }
        startingTrial.value = true
        const version = ++trialVersion
        const task = (async () => {
            try {
                const response = await userApi.startTrial()
                if (cacheStore.token !== token) throw new ApiRequestError('账号已切换，请刷新当前账号状态')
                const profile = normalizeUserProfile(response.data, cacheStore.profile?.email ?? '')
                if (profile.id !== cacheStore.profile?.id) throw new Error('领取结果与当前账号不一致，请刷新账号状态')
                // 先保存已经领取成功的结果，后续同步失败也不能诱导再次领取。
                cacheStore.updateProfile(profile)
                generation += 1
                inFlight = null
                updateClock()
                ElMessage.success('14 天试用已开启')
                try {
                    await initialize(true)
                } catch {
                    if (cacheStore.token === token) ElMessage.warning('试用已开启，状态同步失败，请刷新页面重试同步')
                }
            } catch (err) {
                if (!isApiRequestError(err)) ElMessage.error(err instanceof Error ? err.message : '开启试用失败，请稍后重试')
                throw err
            } finally {
                if (version === trialVersion) {
                    startingTrial.value = false
                    trialRequest = null
                }
            }
        })()
        trialRequest = task
        return task
    }

    function canAccess(path: string): boolean {
        if (path === '/settings/mini-program') return true
        if (!canWrite.value && (path === '/tools/timer' || path === '/tools/rollcall')) return false
        return canAccessPath(sidebar.value, path)
    }

    function refreshEntitlement(event?: Event): void {
        if (event?.type === ENTITLEMENT_REJECTED_EVENT) {
            const detail = (event as CustomEvent<{ token: string }>).detail
            if (detail?.token !== cacheStore.token) return
            // 拒绝响应比此前发出的会话快照更新，禁止旧快照覆盖刚刚的降级。
            generation += 1
            inFlight = null
        }
        updateClock()
        if (cacheStore.token && initialized.value) void initialize(true).catch(() => {
            // 保留当前可查看的会话，下次切回页面或手动刷新可重试同步。
        })
    }

    function onVisibilityChange(): void {
        if (document.visibilityState === 'visible') refreshEntitlement()
    }

    if (typeof window !== 'undefined') {
        window.addEventListener(ENTITLEMENT_REJECTED_EVENT, refreshEntitlement)
        window.addEventListener('focus', refreshEntitlement)
        document.addEventListener('visibilitychange', onVisibilityChange)
        onScopeDispose(() => {
            window.removeEventListener(ENTITLEMENT_REJECTED_EVENT, refreshEntitlement)
            window.removeEventListener('focus', refreshEntitlement)
            document.removeEventListener('visibilitychange', onVisibilityChange)
        })
    }
    onScopeDispose(() => clearTimeout(deadlineTimer))

    return {
        sidebar, role, initialized, loading, error, firstRoute, initialize, reset, canAccess, canUseAgent,
        entitlementState, trialExpiresAt, paidExpiresAt, canWrite, canPrepare, canImportExport,
        isPreparation, isReadOnly, entitlementMessage, startingTrial, startTrial,
    }
})
