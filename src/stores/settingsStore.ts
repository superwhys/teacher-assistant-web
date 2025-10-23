import { defineStore } from 'pinia'
import { ref } from 'vue'
import { asyncStorage, exportAllKV } from '@/utils/storage'
import { generateSaltBase64, hashPassword, verifyPassword as verifyPasswordHash } from '@/utils/crypto'
import { cloudApi } from '@/api/cloud'

/**
 * 应用设置 Store（本地持久化）
 */
const STORAGE_KEY = 'ta_settings_v1'

export const useSettingsStore = defineStore('settings', () => {
    const cloudAutoSyncEnabled = ref<boolean>(false)
    const lastCloudSyncAt = ref<number | null>(null)
    const isCloudSyncing = ref<boolean>(false)
    const secretKey = ref<string | null>(null)
    const dataVersion = ref<number>(0)
    const isLocked = ref<boolean>(false)
    const lockSalt = ref<string | null>(null)
    const lockHash = ref<string | null>(null)

    function persist() {
        const payload = {
            cloudAutoSyncEnabled: cloudAutoSyncEnabled.value,
            lastCloudSyncAt: lastCloudSyncAt.value,
            secretKey: secretKey.value,
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
            secretKey?: string | null
            isLocked?: boolean
            lockSalt?: string | null
            lockHash?: string | null
        }>(STORAGE_KEY)
        if (!saved) return
        if (typeof saved.cloudAutoSyncEnabled === 'boolean') cloudAutoSyncEnabled.value = saved.cloudAutoSyncEnabled
        if (typeof saved.lastCloudSyncAt === 'number' || saved.lastCloudSyncAt === null) lastCloudSyncAt.value = saved.lastCloudSyncAt ?? null
        if (typeof saved.secretKey === 'string' || saved.secretKey === null) secretKey.value = saved.secretKey ?? null
        if (typeof saved.isLocked === 'boolean') isLocked.value = saved.isLocked
        if (typeof saved.lockSalt === 'string' || saved.lockSalt === null) lockSalt.value = saved.lockSalt ?? null
        if (typeof saved.lockHash === 'string' || saved.lockHash === null) lockHash.value = saved.lockHash ?? null
    }

    async function validateAndSaveSecretKey(key: string): Promise<boolean> {
        const trimmed = key.trim()
        // 简单校验：长度不少于 6，可按需替换为实际校验
        if (!trimmed || trimmed.length < 6) return false
        secretKey.value = trimmed
        persist()
        return true
    }

    function setCloudAutoSyncEnabled(val: boolean) {
        cloudAutoSyncEnabled.value = val
        persist()
    }

    async function syncToCloud(): Promise<void> {
        if (isCloudSyncing.value) return
        isCloudSyncing.value = true
        try {
            // 汇总本地所有 KV，排除 settings 配置
            const all = await exportAllKV()
            delete (all as any)[STORAGE_KEY]
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
        secretKey,
        dataVersion,
        isLocked,
        lockSalt,
        lockHash,
        setCloudAutoSyncEnabled,
        syncToCloud,
        validateAndSaveSecretKey,
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


