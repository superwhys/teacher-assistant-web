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

export type AsyncStorage = typeof asyncStorage

