import localforage from 'localforage'
import { toRaw, isProxy } from 'vue'

const lf = localforage.createInstance({
    name: 'ta_localforage',
    storeName: 'kv',
})

export const asyncStorage = {
    async getItem<T>(key: string): Promise<T | null> {
        try {
            const v = await lf.getItem(key)
            return v as T | null
        } catch {
            console.error('Failed to get item', key)
            return null
        }
    },
    async setItem<T>(key: string, value: T): Promise<void> {
        try {
            const plain = deepUnwrap(value)
            await lf.setItem(key, plain as any)
        } catch {
            console.error('Failed to set item', key, value)
        }
    },
    async removeItem(key: string): Promise<void> {
        try {
            await lf.removeItem(key)
        } catch {
            console.error('Failed to remove item', key)
        }
    },
}

function deepUnwrap(val: any): any {
    if (val === null || val === undefined) return val
    if (typeof val !== 'object') return val
    const raw = isProxy(val) ? toRaw(val) : val
    if (Array.isArray(raw)) {
        return raw.map((item) => deepUnwrap(item))
    }
    const out: any = {}
    for (const key in raw) {
        out[key] = deepUnwrap(raw[key])
    }
    return out
}


export async function exportAllKV(): Promise<Record<string, any>> {
    const out: Record<string, any> = {}
    try {
        await lf.iterate((value, key) => {
            out[key as string] = value
        })
    } catch (err) {
        console.error('Failed to export all KV', err)
    }
    return out
}


export async function importAllKV(payload: Record<string, any>): Promise<void> {
    if (!payload || typeof payload !== 'object') return
    const entries = Object.entries(payload)
    for (const [key, value] of entries) {
        try {
            await lf.setItem(key, value)
        } catch (err) {
            console.error('Failed to import key', key, err)
        }
    }
}

/**
 * 全量替换本地 KV：删除本地不存在于 payload 的键（保留指定键），再写入 payload
 */
export async function replaceAllKV(payload: Record<string, any>, preserveKeys: string[] = ['ta_settings_v1']): Promise<void> {
    if (!payload || typeof payload !== 'object') payload = {}
    const keep = new Set(preserveKeys)
    const payloadKeys = new Set(Object.keys(payload))
    const existingKeys: string[] = []
    try {
        await lf.iterate((_value, key) => {
            existingKeys.push(String(key))
        })
    } catch (err) {
        console.error('Failed to list existing keys', err)
    }
    for (const key of existingKeys) {
        if (keep.has(key)) continue
        if (!payloadKeys.has(key)) {
            try {
                await lf.removeItem(key)
            } catch (err) {
                console.error('Failed to remove key', key, err)
            }
        }
    }
    await importAllKV(payload)
}

export function getUserStorageKey(baseKey: string, userId: string | null): string {
    if (!userId) return baseKey
    return `${baseKey}_user_${userId}`
}

export function removeUserIdFromKey(key: string): string {
    return key.replace(/_user_[^_]+$/, '')
}

export function extractUserIdFromKey(key: string): string | null {
    const match = key.match(/_user_([^_]+)$/)
    return match ? (match[1] ?? null) : null
}

export async function exportUserData(userId: string | null): Promise<Record<string, any>> {
    const out: Record<string, any> = {}
    if (!userId) {
        console.warn('exportUserData: userId is null, no data will be exported')
        return out
    }
    
    try {
        await lf.iterate((value, key) => {
            const keyStr = String(key)
            if (keyStr === 'ta_user_store_v1') {
                return
            }
            
            if (keyStr.endsWith(`_user_${userId}`)) {
                const cleanKey = removeUserIdFromKey(keyStr)
                // 用户信息键不导出
                if (cleanKey === 'ta_user_store_v1') {
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

export async function importUserData(payload: Record<string, any>, userId: string | null): Promise<void> {
    if (!payload || typeof payload !== 'object') {
        console.error('importUserData: invalid payload', payload)
        return
    }
    
    if (!userId) {
        console.warn('importUserData: userId is null, data will be imported without user suffix')
    }
    
    const entries = Object.entries(payload)
    for (const [key, value] of entries) {
        if (key === 'ta_user_store_v1') {
            continue
        }
        
        const storageKey = userId ? `${key}_user_${userId}` : key
        
        try {
            await lf.setItem(storageKey, value)
        } catch (err) {
            console.error('Failed to import key', key, err)
        }
    }
}

export type AsyncStorage = typeof asyncStorage

