import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { StudentsSortOption } from '@/types/student'
import type { UserProfile } from '@/types/user'
import { generateSaltBase64, hashPassword, verifyPassword } from '@/utils/crypto'

const GLOBAL_CACHE_KEY = 'ta_cache_global_v1'
const USER_CACHE_PREFIX = 'ta_cache:'

type UserScopedCache = {
    activeClassId?: number | null
    activeClassName?: string | null
    activeSemesterName?: string | null
    studentsSort?: StudentsSortOption | null
    classLayout?: 'card' | 'list' | null
    pointsSelectedGroupByClass?: Record<string, number | null> | null
    pointsRankingTab?: 'total' | 'item' | null
    pointsRankingTimeRange?: 'all' | 'weekly' | 'monthly' | null
    pointsSortBy?: string | null
    pointsLayoutMode?: 'card' | 'list' | null
    isLocked?: boolean
    lockPasswordSalt?: string | null
    lockPasswordHash?: string | null
    dataVersion?: number
}

function safeParseJson<T>(raw: string | null): T | null {
    if (!raw) return null
    try {
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

export const useCacheStore = defineStore('cache', () => {
    let activeClassId = ref<number | null>(null)
    let activeClassName = ref<string | null>(null)
    let activeSemesterName = ref<string | null>(null)
    let studentsSort = ref<StudentsSortOption | null>(null)
    let classLayout = ref<'card' | 'list' | null>(null)
    let pointsSelectedGroupByClass = ref<Record<string, number | null>>({})
    let pointsRankingTab = ref<'total' | 'item'>('total')
    let pointsRankingTimeRange = ref<'all' | 'weekly' | 'monthly'>('all')
    let pointsSortBy = ref<string>('default')
    let pointsLayoutMode = ref<'card' | 'list'>('card')

    const token = ref<string | null>(null)
    const profile = ref<UserProfile | null>(null)
    const isTrial = ref<boolean>(false)
    const trialExpiresAt = ref<number | null>(null)
    const isExpired = ref<boolean>(false)

    const isLocked = ref<boolean>(false)
    const lockPasswordSalt = ref<string | null>(null)
    const lockPasswordHash = ref<string | null>(null)
    const dataVersion = ref<number>(1)

    function getUserCacheKey(userId: string | null | undefined): string | null {
        const uid = String(userId ?? '').trim()
        if (!uid) return null
        return `${USER_CACHE_PREFIX}${uid}`
    }

    function loadUserScopedCache(userId: string | null | undefined): void {
        const key = getUserCacheKey(userId)
        if (!key) return
        const obj = safeParseJson<UserScopedCache>(localStorage.getItem(key))
        if (!obj) return

        activeClassId.value = typeof obj.activeClassId === 'number' ? obj.activeClassId : null
        activeClassName.value = typeof obj.activeClassName === 'string' ? obj.activeClassName : null
        activeSemesterName.value = typeof obj.activeSemesterName === 'string' ? obj.activeSemesterName : null
        studentsSort.value = (obj.studentsSort as StudentsSortOption | null) ?? null
        classLayout.value = (obj.classLayout as any) ?? null
        pointsSelectedGroupByClass.value = (obj.pointsSelectedGroupByClass && typeof obj.pointsSelectedGroupByClass === 'object')
            ? (obj.pointsSelectedGroupByClass as Record<string, number | null>)
            : {}
        pointsRankingTab.value = obj.pointsRankingTab === 'item' ? 'item' : 'total'
        pointsRankingTimeRange.value = obj.pointsRankingTimeRange === 'weekly'
            ? 'weekly'
            : (obj.pointsRankingTimeRange === 'monthly' ? 'monthly' : 'all')
        pointsSortBy.value = typeof obj.pointsSortBy === 'string' && obj.pointsSortBy.trim()
            ? obj.pointsSortBy
            : 'default'
        pointsLayoutMode.value = obj.pointsLayoutMode === 'list' ? 'list' : 'card'
        isLocked.value = Boolean(obj.isLocked)
        lockPasswordSalt.value = typeof obj.lockPasswordSalt === 'string' ? obj.lockPasswordSalt : null
        lockPasswordHash.value = typeof obj.lockPasswordHash === 'string' ? obj.lockPasswordHash : null
        if (typeof obj.dataVersion === 'number' && Number.isFinite(obj.dataVersion)) {
            dataVersion.value = obj.dataVersion
        }
    }

    function saveUserScopedCache(userId: string | null | undefined): void {
        const key = getUserCacheKey(userId)
        if (!key) return
        const payload: UserScopedCache = {
            activeClassId: activeClassId.value,
            activeClassName: activeClassName.value,
            activeSemesterName: activeSemesterName.value,
            studentsSort: studentsSort.value,
            classLayout: classLayout.value,
            pointsSelectedGroupByClass: pointsSelectedGroupByClass.value,
            pointsRankingTab: pointsRankingTab.value,
            pointsRankingTimeRange: pointsRankingTimeRange.value,
            pointsSortBy: pointsSortBy.value,
            pointsLayoutMode: pointsLayoutMode.value,
            isLocked: isLocked.value,
            lockPasswordSalt: lockPasswordSalt.value,
            lockPasswordHash: lockPasswordHash.value,
            dataVersion: dataVersion.value,
        }
        try {
            localStorage.setItem(key, JSON.stringify(payload))
        } catch {
        }
    }

    function bumpDataVersion() {
        dataVersion.value += 1
    }

    function hasLockPassword(): boolean {
        return !!lockPasswordSalt.value && !!lockPasswordHash.value
    }

    async function setLockPassword(password: string): Promise<boolean> {
        const pwd = String(password ?? '').trim()
        if (!pwd || pwd.length < 4) return false
        const salt = generateSaltBase64()
        const hash = await hashPassword(pwd, salt)
        lockPasswordSalt.value = salt
        lockPasswordHash.value = hash
        bumpDataVersion()
        return true
    }

    function clearLockPassword(): void {
        lockPasswordSalt.value = null
        lockPasswordHash.value = null
        isLocked.value = false
        bumpDataVersion()
    }

    async function verifyLockPassword(password: string): Promise<boolean> {
        if (!hasLockPassword()) return false
        const pwd = String(password ?? '')
        return await verifyPassword(pwd, lockPasswordSalt.value!, lockPasswordHash.value!)
    }

    function lock(): void {
        if (!hasLockPassword()) return
        isLocked.value = true
        bumpDataVersion()
    }

    function unlock(): void {
        isLocked.value = false
        bumpDataVersion()
    }

    async function hydrate(): Promise<void> {
        // 兼容旧调用：全局信息由 pinia 持久化恢复；用户 scoped 信息由本地 key 恢复
        loadUserScopedCache(profile.value?.id)
    }

    function setActiveClassId(id: number) {
        activeClassId.value = id
    }

    function getActiveClassId() {
        const raw: any = activeClassId.value as any
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw
        if (typeof raw === 'string') {
            const n = Number(raw)
            if (Number.isFinite(n) && n > 0) {
                activeClassId.value = n
                return n
            }
        }
        return null
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

    function setActiveSemesterName(name: string) {
        activeSemesterName.value = name
    }

    function getActiveSemesterName() {
        return activeSemesterName.value
    }

    function clearActiveSemesterName() {
        activeSemesterName.value = null
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

    function getPointsSelectedGroupId(classId: number): { exists: boolean; groupId: number | null } {
        const key = String(classId)
        if (!key) return { exists: false, groupId: null }
        if (!Object.prototype.hasOwnProperty.call(pointsSelectedGroupByClass.value, key)) {
            return { exists: false, groupId: null }
        }
        const val = pointsSelectedGroupByClass.value[key]
        return { exists: true, groupId: typeof val === 'number' && val > 0 ? val : null }
    }

    function setPointsSelectedGroupId(classId: number, groupId: number | null): void {
        const key = String(classId)
        if (!key) return
        pointsSelectedGroupByClass.value = {
            ...pointsSelectedGroupByClass.value,
            [key]: typeof groupId === 'number' && groupId > 0 ? groupId : null,
        }
    }

    function getPointsRankingTab(): 'total' | 'item' {
        return pointsRankingTab.value
    }

    function setPointsRankingTab(tab: 'total' | 'item'): void {
        pointsRankingTab.value = tab === 'item' ? 'item' : 'total'
    }

    function getPointsRankingTimeRange(): 'all' | 'weekly' | 'monthly' {
        return pointsRankingTimeRange.value
    }

    function setPointsRankingTimeRange(range: 'all' | 'weekly' | 'monthly'): void {
        pointsRankingTimeRange.value = range === 'weekly' ? 'weekly' : (range === 'monthly' ? 'monthly' : 'all')
    }

    function getPointsSortBy(): string {
        return pointsSortBy.value
    }

    function setPointsSortBy(sort: string): void {
        const v = String(sort ?? '').trim()
        pointsSortBy.value = v || 'default'
    }

    function getPointsLayoutMode(): 'card' | 'list' {
        return pointsLayoutMode.value
    }

    function setPointsLayoutMode(mode: 'card' | 'list'): void {
        pointsLayoutMode.value = mode === 'list' ? 'list' : 'card'
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
        loadUserScopedCache(user?.id)
    }

    function setTokenOnly(tokenValue: string): void {
        token.value = tokenValue
    }

    function updateProfile(user: UserProfile): void {
        profile.value = user
    }

    function setExpired(expired: boolean): void {
        isExpired.value = expired
    }

    function logout(): void {
        // 退出前保存一次当前用户的 scoped 缓存
        saveUserScopedCache(profile.value?.id)
        token.value = null
        profile.value = null
        isTrial.value = false
        trialExpiresAt.value = null
        isExpired.value = false
        // 清空内存态（不删除本地 user cache，便于下次同账号登录恢复）
        activeClassId.value = null
        activeClassName.value = null
        activeSemesterName.value = null
        studentsSort.value = null
        classLayout.value = null
        pointsSelectedGroupByClass.value = {}
        pointsRankingTab.value = 'total'
        pointsRankingTimeRange.value = 'all'
        pointsSortBy.value = 'default'
        pointsLayoutMode.value = 'card'
        isLocked.value = false
        lockPasswordSalt.value = null
        lockPasswordHash.value = null
    }

    const isAuthenticated = computed<boolean>(() => !!token.value)
    const displayName = computed<string>(() => profile.value?.name || profile.value?.email || '')

    watch(() => profile.value?.id, (uid) => {
        if (uid) {
            loadUserScopedCache(uid)
        }
    }, { immediate: true })

    watch(
        [
            activeClassId,
            activeClassName,
            activeSemesterName,
            studentsSort,
            classLayout,
            pointsSelectedGroupByClass,
            pointsRankingTab,
            pointsRankingTimeRange,
            pointsSortBy,
            pointsLayoutMode,
            isLocked,
            lockPasswordSalt,
            lockPasswordHash,
            dataVersion
        ],
        () => {
            saveUserScopedCache(profile.value?.id)
        },
        { deep: false }
    )

    return {
        activeClassId,
        setActiveClassId,
        getActiveClassId,
        clearActiveClassId,
        activeClassName,
        setActiveClassName,
        getActiveClassName,
        clearActiveClassName,
        activeSemesterName,
        setActiveSemesterName,
        getActiveSemesterName,
        clearActiveSemesterName,
        studentsSort,
        setStudentsSort,
        getStudentsSort,
        clearStudentsSort,
        classLayout,
        setClassLayout,
        getClassLayout,
        clearClassLayout,
        getPointsSelectedGroupId,
        setPointsSelectedGroupId,
        getPointsRankingTab,
        setPointsRankingTab,
        getPointsRankingTimeRange,
        setPointsRankingTimeRange,
        getPointsSortBy,
        setPointsSortBy,
        getPointsLayoutMode,
        setPointsLayoutMode,
        token,
        profile,
        isTrial,
        trialExpiresAt,
        isExpired,
        isAuthenticated,
        displayName,
        isLocked,
        dataVersion,
        bumpDataVersion,
        hasLockPassword,
        setLockPassword,
        clearLockPassword,
        verifyLockPassword,
        lock,
        unlock,
        hydrate,
        setAuth,
        setTokenOnly,
        updateProfile,
        setExpired,
        logout,
    }
}, {
    persist: {
        key: GLOBAL_CACHE_KEY,
        storage: localStorage,
        pick: ['token', 'profile', 'isTrial', 'trialExpiresAt', 'isExpired'],
    }
})