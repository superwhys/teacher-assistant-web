import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DrawRecord } from '@/types/lottery'
import { useCacheStore } from '@/stores/cacheStore'
import { lotteryManager } from '@/managers/lottery'

const STORAGE_KEY_BASE = 'ta_lottery_pending_v2'

type LotteryHistoryData = {
    byPoolId: Record<string, DrawRecord[]>
}

function loadInitial(): LotteryHistoryData {
    return {
        byPoolId: {},
    }
}

function generateId(prefix: string = 'LR'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function safeParse(raw: string | null): unknown {
    if (!raw) return null
    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

export const useLotteryHistoryStore = defineStore('lotteryHistory', () => {
    const cacheStore = useCacheStore()
    const data = ref<LotteryHistoryData>(loadInitial())
    const remoteByPoolId = ref<Record<string, DrawRecord[]>>({})
    const pendingPersistenceFailed = ref(false)
    const syncTasks = new Map<string, Promise<void>>()
    const recordVersions = new Map<string, number>()
    const scopeCache = new Map<string, {
        data: LotteryHistoryData
        remote: Record<string, DrawRecord[]>
        persistenceFailed: boolean
    }>()
    let scopeVersion = 0
    let hydratedClassId: number | null = null
    let hydratedKey = ''

    function getStorageKey(classId: number | null): string {
        if (!classId) return ''
        const userId = cacheStore.profile?.id || null
        return `${STORAGE_KEY_BASE}_${userId ?? 'guest'}_class_${classId}`
    }

    function assertClassId(classId?: number | null): number {
        if (!classId || !Number.isSafeInteger(classId) || classId <= 0) throw new Error('请先选择班级')
        return classId
    }

    function persist(key = hydratedKey, history = data.value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(history))
            if (key === hydratedKey && history === data.value) pendingPersistenceFailed.value = false
        } catch (error) {
            if (key === hydratedKey && history === data.value) pendingPersistenceFailed.value = true
            console.warn('抽奖待同步记录暂时无法写入本地存储', error)
        }
    }

    function currentScope() {
        return { version: scopeVersion, key: hydratedKey, classId: hydratedClassId }
    }

    function isCurrentScope(scope: ReturnType<typeof currentScope>): boolean {
        return scope.version === scopeVersion && scope.classId === hydratedClassId
            && scope.key === getStorageKey(scope.classId)
    }

    function hydrate(classId?: number | null): void {
        if (hydratedKey) {
            scopeCache.set(hydratedKey, {
                data: data.value,
                remote: remoteByPoolId.value,
                persistenceFailed: pendingPersistenceFailed.value,
            })
        }
        scopeVersion += 1
        hydratedClassId = classId && Number.isSafeInteger(classId) && classId > 0 ? classId : null
        hydratedKey = getStorageKey(hydratedClassId)
        data.value = loadInitial()
        remoteByPoolId.value = {}
        pendingPersistenceFailed.value = false
        if (!hydratedClassId) return
        const cached = scopeCache.get(hydratedKey)
        if (cached) {
            data.value = cached.data
            remoteByPoolId.value = cached.remote
            pendingPersistenceFailed.value = cached.persistenceFailed
            return
        }
        let saved: unknown
        try {
            saved = safeParse(window.localStorage.getItem(hydratedKey))
        } catch (error) {
            pendingPersistenceFailed.value = true
            console.warn('抽奖待同步记录暂时无法读取本地存储', error)
            return
        }
        if (!saved || typeof saved !== 'object' || !('byPoolId' in saved)) return
        const byPoolId = saved.byPoolId
        if (!byPoolId || typeof byPoolId !== 'object') return

        for (const [poolId, records] of Object.entries(byPoolId)) {
            if (!Number.isSafeInteger(Number(poolId)) || Number(poolId) <= 0 || !Array.isArray(records)) continue
            data.value.byPoolId[poolId] = records.filter((record): record is DrawRecord => {
                return record && typeof record === 'object'
                    && typeof record.id === 'string' && record.id.length > 0 && record.id.length <= 128
                    && typeof record.prizeName === 'string' && record.prizeName.trim().length > 0
                    && record.prizeName.length <= 255
                    && Number.isSafeInteger(record.drawnAt) && record.drawnAt > 0
                    && record.studentClassId === hydratedClassId
            }).map(record => ({ ...record, syncPending: true }))
        }
    }

    function getRecords(poolId: string | null, classId?: number | null): DrawRecord[] {
        if (!poolId || !classId || classId !== hydratedClassId || hydratedKey !== getStorageKey(classId)) return []
        const records = new Map<string, DrawRecord>()
        for (const record of data.value.byPoolId[poolId] ?? []) {
            records.set(record.id, { ...record, syncPending: true })
        }
        for (const record of remoteByPoolId.value[poolId] ?? []) {
            records.set(record.id, record)
        }
        return [...records.values()].sort((a, b) => b.drawnAt - a.drawnAt || (b.serverId ?? 0) - (a.serverId ?? 0))
    }

    async function syncRecords(poolId: string): Promise<void> {
        const scope = currentScope()
        const classId = assertClassId(scope.classId)
        const taskKey = `${scope.key}:${scope.version}:${poolId}`
        const existing = syncTasks.get(taskKey)
        if (existing) return existing
        const task = (async () => {
            while (isCurrentScope(scope) && (data.value.byPoolId[poolId]?.length ?? 0) > 0) {
                const batch = data.value.byPoolId[poolId]!.slice(0, 200)
                const saved = await lotteryManager.createRecords(poolId, classId, batch)
                if (!isCurrentScope(scope)) return
                const savedIds = new Set(saved.map(record => record.id))
                if (batch.some(record => !savedIds.has(record.id))) {
                    throw new Error('抽奖记录未完整保存，请重试同步')
                }
                const remote = new Map((remoteByPoolId.value[poolId] ?? []).map(record => [record.id, record]))
                saved.forEach(record => remote.set(record.id, record))
                remoteByPoolId.value[poolId] = [...remote.values()]
                data.value.byPoolId[poolId] = data.value.byPoolId[poolId]!.filter(record => !savedIds.has(record.id))
                bumpRecordVersion(scope.key, poolId)
                persist()
            }
        })()
        syncTasks.set(taskKey, task)
        try {
            await task
        } finally {
            syncTasks.delete(taskKey)
        }
    }

    async function loadRecords(poolId: string, classId: number): Promise<void> {
        assertClassId(classId)
        if (hydratedClassId !== classId || hydratedKey !== getStorageKey(classId)) hydrate(classId)
        const scope = currentScope()
        let syncError: unknown
        try {
            await syncRecords(poolId)
        } catch (error) {
            syncError = error
        }
        if (!isCurrentScope(scope)) return
        const versionKey = `${scope.key}:${poolId}`
        const version = recordVersions.get(versionKey) ?? 0
        const records = await lotteryManager.listRecords(poolId, classId)
        if (!isCurrentScope(scope)) return
        if (version === (recordVersions.get(versionKey) ?? 0)) remoteByPoolId.value[poolId] = records
        if (syncError) throw syncError
    }

    async function addRecord(poolId: string, prizeName: string, classId?: number): Promise<DrawRecord> {
        const validClassId = assertClassId(classId)
        if (hydratedClassId !== validClassId || hydratedKey !== getStorageKey(validClassId)) hydrate(validClassId)
        const pid = String(poolId ?? '').trim()
        const name = String(prizeName ?? '').trim()
        if (!pid) throw new Error('奖池 ID 无效')
        if (!name) throw new Error('奖品名称不能为空')

        const r: DrawRecord = {
            id: generateId('R'),
            prizeId: name,
            prizeName: name,
            drawnAt: Date.now(),
            syncPending: true,
            studentClassId: validClassId,
        }
        if (!data.value.byPoolId[pid]) data.value.byPoolId[pid] = []
        data.value.byPoolId[pid]!.unshift(r)
        persist()
        await syncRecords(pid)
        return getRecords(pid, validClassId).find(record => record.id === r.id) ?? r
    }

    async function clearRecords(poolId: string, classId?: number): Promise<void> {
        const validClassId = assertClassId(classId)
        if (hydratedClassId !== validClassId || hydratedKey !== getStorageKey(validClassId)) hydrate(validClassId)
        const scope = currentScope()
        const pid = String(poolId ?? '').trim()
        if (!pid) return
        const syncing = syncTasks.get(`${scope.key}:${scope.version}:${pid}`)
        if (syncing) await syncing.catch(() => undefined)
        if (!isCurrentScope(scope)) return
        const scopedData = data.value
        const scopedRemote = remoteByPoolId.value
        await lotteryManager.clearRecords(pid, validClassId)
        scopedData.byPoolId[pid] = []
        scopedRemote[pid] = []
        bumpRecordVersion(scope.key, pid)
        persist(scope.key, scopedData)
    }

    async function updateStudent(poolId: string, recordId: number, studentId: number | null, classId: number): Promise<void> {
        assertClassId(classId)
        if (hydratedClassId !== classId || hydratedKey !== getStorageKey(classId)) hydrate(classId)
        const scope = currentScope()
        const scopedRemote = remoteByPoolId.value
        const saved = await lotteryManager.updateRecordStudent(recordId, classId, studentId)
        scopedRemote[poolId] = (scopedRemote[poolId] ?? []).map(record => (
            record.serverId === recordId ? saved : record
        ))
        bumpRecordVersion(scope.key, poolId)
    }

    function bumpRecordVersion(storageKey: string, poolId: string): void {
        const key = `${storageKey}:${poolId}`
        recordVersions.set(key, (recordVersions.get(key) ?? 0) + 1)
    }

    return {
        hydrate,
        getRecords,
        addRecord,
        clearRecords,
        loadRecords,
        updateStudent,
        pendingPersistenceFailed,
    }
})
