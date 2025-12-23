import { defineStore } from 'pinia'
import { ref } from 'vue'
import { asyncStorage, getUserStorageKey } from '@/utils/storage'
import { generateSaltBase64, hashPassword, verifyPassword as verifyPasswordHash } from '@/utils/crypto'
import { useCacheStore } from './cacheStore'

/**
 * 应用设置 Store（本地持久化）
 */
const STORAGE_KEY = 'ta_settings_v1'

export const useSettingsStore = defineStore('settings', () => {
    const cacheStore = useCacheStore()
    const dataVersion = ref<number>(0)
    const isLocked = ref<boolean>(false)
    const lockSalt = ref<string | null>(null)
    const lockHash = ref<string | null>(null)

    function getStorageKey(): string {
        const userId = cacheStore.profile?.id || null
        return getUserStorageKey(STORAGE_KEY, userId)
    }

    function persist() {
        const payload = {
            isLocked: isLocked.value,
            lockSalt: lockSalt.value,
            lockHash: lockHash.value,
        }
        void asyncStorage.setItem(getStorageKey(), payload)
    }

    async function hydrate() {
        const currentKey = getStorageKey()
        let saved = await asyncStorage.getItem<{
            isLocked?: boolean
            lockSalt?: string | null
            lockHash?: string | null
        }>(currentKey)
        // 向后兼容：检查旧的全局键
        const legacy =
            currentKey !== STORAGE_KEY
                ? await asyncStorage.getItem<{
                    isLocked?: boolean
                    lockSalt?: string | null
                    lockHash?: string | null
                }>(STORAGE_KEY)
                : null
        // 迁移与清理策略：
        // 1) 如果当前键没有数据但旧键有：迁移到当前键并删除旧键
        // 2) 如果当前键与旧键同时存在：优先使用当前键并删除旧键
        if (!saved && legacy) {
            await asyncStorage.setItem(currentKey, legacy)
            await asyncStorage.removeItem(STORAGE_KEY)
            saved = legacy
        } else if (saved && legacy) {
            await asyncStorage.removeItem(STORAGE_KEY)
        }
        if (!saved) return
        if (typeof saved.isLocked === 'boolean') isLocked.value = saved.isLocked
        if (typeof saved.lockSalt === 'string' || saved.lockSalt === null) lockSalt.value = saved.lockSalt ?? null
        if (typeof saved.lockHash === 'string' || saved.lockHash === null) lockHash.value = saved.lockHash ?? null
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
        dataVersion,
        isLocked,
        lockSalt,
        lockHash,
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


