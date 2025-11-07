import { defineStore } from 'pinia'
import { ref } from 'vue'
import { asyncStorage, exportUserData } from '@/utils/storage'
import { generateSaltBase64, hashPassword, verifyPassword as verifyPasswordHash } from '@/utils/crypto'
import { cloudApi } from '@/api/cloud'
import { useUserStore } from './userStore'

/**
 * 应用设置 Store（本地持久化）
 */
const STORAGE_KEY = 'ta_settings_v1'

export const useSettingsStore = defineStore('settings', () => {
    const userStore = useUserStore()
    const cloudAutoSyncEnabled = ref<boolean>(false)
    const lastCloudSyncAt = ref<number | null>(null)
    const isCloudSyncing = ref<boolean>(false)
    const dataVersion = ref<number>(0)
    const isLocked = ref<boolean>(false)
    const lockSalt = ref<string | null>(null)
    const lockHash = ref<string | null>(null)

    function persist() {
        const payload = {
            cloudAutoSyncEnabled: cloudAutoSyncEnabled.value,
            lastCloudSyncAt: lastCloudSyncAt.value,
            isLocked: isLocked.value,
            lockSalt: lockSalt.value,
            lockHash: lockHash.value,
        }
        void asyncStorage.setItem(STORAGE_KEY, payload)
    }

    async function hydrate() {
        const saved = await asyncStorage.getItem<{
            cloudAutoSyncEnabled?: boolean
            lastCloudSyncAt?: number | null
            isLocked?: boolean
            lockSalt?: string | null
            lockHash?: string | null
        }>(STORAGE_KEY)
        if (!saved) return
        if (typeof saved.cloudAutoSyncEnabled === 'boolean') cloudAutoSyncEnabled.value = saved.cloudAutoSyncEnabled
        if (typeof saved.lastCloudSyncAt === 'number' || saved.lastCloudSyncAt === null) lastCloudSyncAt.value = saved.lastCloudSyncAt ?? null
        if (typeof saved.isLocked === 'boolean') isLocked.value = saved.isLocked
        if (typeof saved.lockSalt === 'string' || saved.lockSalt === null) lockSalt.value = saved.lockSalt ?? null
        if (typeof saved.lockHash === 'string' || saved.lockHash === null) lockHash.value = saved.lockHash ?? null
    }

    function setCloudAutoSyncEnabled(val: boolean) {
        cloudAutoSyncEnabled.value = val
        persist()
    }

    async function syncToCloud(): Promise<void> {
        if (isCloudSyncing.value) return
        isCloudSyncing.value = true
        try {
            const userId = userStore.profile?.id || null
            const all = await exportUserData(userId)
            await cloudApi.sync(all)
            lastCloudSyncAt.value = Date.now()
            persist()
        } finally {
            isCloudSyncing.value = false
        }
    }

    function bumpVersion() {
        dataVersion.value++
    }

    function hasLockPassword(): boolean {
        return !!(lockSalt.value && lockHash.value)
    }

    async function setLockPassword(newPassword: string): Promise<boolean> {
        const pwd = newPassword.trim()
        if (!pwd || pwd.length < 4) return false
        const salt = generateSaltBase64()
        const h = await hashPassword(pwd, salt)
        lockSalt.value = salt
        lockHash.value = h
        persist()
        return true
    }

    function clearLockPassword(): void {
        lockSalt.value = null
        lockHash.value = null
        persist()
    }

    async function verifyLockPassword(input: string): Promise<boolean> {
        if (!lockSalt.value || !lockHash.value) return false
        return await verifyPasswordHash(input.trim(), lockSalt.value, lockHash.value)
    }

    function lock(): void {
        if (hasLockPassword()) {
            isLocked.value = true
            persist()
        }
    }

    function unlock(): void {
        isLocked.value = false
        persist()
    }

    return {
        cloudAutoSyncEnabled,
        lastCloudSyncAt,
        isCloudSyncing,
        dataVersion,
        isLocked,
        lockSalt,
        lockHash,
        setCloudAutoSyncEnabled,
        syncToCloud,
        persist,
        hydrate,
        bumpVersion,
        hasLockPassword,
        setLockPassword,
        clearLockPassword,
        verifyLockPassword,
        lock,
        unlock,
    }
})


