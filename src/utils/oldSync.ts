import localforage from 'localforage'
import { post } from '@/api/api'
import type { ApiResponse, CloudSyncType } from '@/types/api'

/**
 * 复制自 settingsStore.ts 与相关依赖的云同步逻辑
 */
const lf = localforage.createInstance({
    name: 'ta_localforage',
    storeName: 'kv',
})

export function getUserStorageKeyCopy(baseKey: string, userId: string | null): string {
    if (!userId) return baseKey
    return `${baseKey}_user_${userId}`
}

export function removeUserIdFromKeyCopy(key: string): string {
    return key.replace(/_user_[^_]+$/, '')
}

export async function exportUserDataCopy(userId: string | null): Promise<Record<string, any>> {
    const out: Record<string, any> = {}
    if (!userId) {
        console.warn('exportUserData: userId is null, no data will be exported')
        return out
    }
    
    // 需要排除的基础键（不带 user 后缀）
    const EXCLUDED_BASE_KEYS = new Set<string>([
        'ta_user_store_v1',
        'ta_settings_v1', // 本地设置仅本地隔离，不参与导入导出/云同步
        'ta_points_item_store_v1', // 旧版积分项配置不再导出
        'ta_lottery_store_v1', // 旧版抽奖配置不再导出
    ])

    try {
        await lf.iterate((value, key) => {
            const keyStr = String(key)
            if (keyStr === 'ta_user_store_v1') {
                return
            }
            
            if (keyStr.endsWith(`_user_${userId}`)) {
                const cleanKey = removeUserIdFromKeyCopy(keyStr)
                // 排除不应导出的键
                if (EXCLUDED_BASE_KEYS.has(cleanKey)) {
                    return
                }
                out[cleanKey] = value
            }
        })
    } catch (err) {
        console.error('Failed to export user data', err)
    }
    return out
}

export const cloudApiCopy = {
    sync(data: Record<string, any>, syncType: CloudSyncType): Promise<ApiResponse<string>> {
        return post('/cloud/sync', { sync_type: syncType, data })
    },
    importFromV1(): Promise<ApiResponse<any>> {
        return post("/cloud/import", {});
    },
    skipMigration(): Promise<ApiResponse<any>> {
        return post('/cloud/migrate.skip', {})
    },
}

export async function syncToCloudCopy(
    userId: string | null,
    syncType: CloudSyncType = 'manual',
): Promise<void> {
    const all = await exportUserDataCopy(userId)
    await cloudApiCopy.sync(all, syncType)
}

export async function hasOldSyncData(userId: string | null): Promise<boolean> {
    const all = await exportUserDataCopy(userId)
    return Object.keys(all).length > 0
}

export async function onImportMigration() {
    await cloudApiCopy.importFromV1()
}

export async function skipOldMigration() {
    await cloudApiCopy.skipMigration()
}
