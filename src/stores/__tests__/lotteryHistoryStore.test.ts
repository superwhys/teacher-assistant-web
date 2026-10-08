import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { DrawRecord } from '@/types/lottery'
import { useLotteryHistoryStore } from '../lotteryHistoryStore'

const mocks = vi.hoisted(() => ({
    listRecords: vi.fn(),
    createRecords: vi.fn(),
    clearRecords: vi.fn(),
    updateRecordStudent: vi.fn(),
    profile: { id: 7 },
}))

vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => ({ profile: mocks.profile }) }))
vi.mock('@/managers/lottery', () => ({ lotteryManager: mocks }))

const pendingKey = 'ta_lottery_pending_v2_7_class_23'
const oldKey = 'ta_lottery_history_v1_7'
let storage: Map<string, string>

function record(id: string, serverId?: number): DrawRecord {
    return { id, prizeId: '贴纸', prizeName: '贴纸', drawnAt: 1780000000000, serverId, studentClassId: 23 }
}

function pendingRecords(poolId = '4'): DrawRecord[] {
    return JSON.parse(storage.get(pendingKey) ?? '{}').byPoolId?.[poolId] ?? []
}

beforeEach(() => {
    vi.resetAllMocks()
    mocks.profile.id = 7
    setActivePinia(createPinia())
    storage = new Map()
    vi.stubGlobal('window', { localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
    } })
    mocks.listRecords.mockResolvedValue([])
    mocks.createRecords.mockImplementation(async (_poolId: string, _classId: number, records: DrawRecord[]) => (
        records.map((item, index) => ({ ...item, serverId: index + 1, syncPending: undefined }))
    ))
    mocks.clearRecords.mockResolvedValue(undefined)
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

describe('lottery database history', () => {
    it('does not adopt another class scope when two class loads start before their hydration awaits resume', async () => {
        let finishClassA!: (records: DrawRecord[]) => void
        mocks.listRecords.mockImplementation(async (_poolId: string, classId: number) => {
            if (classId === 23) return new Promise<DrawRecord[]>(resolve => { finishClassA = resolve })
            return [{ ...record('class-b', 22), studentClassId: 24 }]
        })
        const history = useLotteryHistoryStore()
        await history.hydrate(null)
        const loadA = history.loadRecords('4', 23)
        const loadB = history.loadRecords('4', 24)
        await loadB
        if (finishClassA) finishClassA([record('class-a', 21)])
        await loadA
        expect(history.getRecords('4', 24)).toEqual([{ ...record('class-b', 22), studentClassId: 24 }])
    })

    it('saves a draw to its captured class when another class load starts during scope preparation', async () => {
        const history = useLotteryHistoryStore()
        await history.hydrate(null)
        const saveA = history.addRecord('4', '贴纸', 23)
        const loadB = history.loadRecords('4', 24)
        await Promise.all([saveA, loadB])
        expect(mocks.createRecords).toHaveBeenCalledWith('4', 23, [expect.objectContaining({ studentClassId: 23 })])
        expect(history.getRecords('4', 24)).toEqual([])
        expect(storage.has('ta_lottery_pending_v2_7_class_24')).toBe(false)
    })
    it('isolates records for two classes using the same teacher prize pool', async () => {
        const classARecord = record('class-a', 21)
        const classBRecord = { ...record('class-b', 22), studentClassId: 24 }
        mocks.listRecords.mockImplementation(async (_poolId: string, classId: number) => (
            classId === 23 ? [classARecord] : [classBRecord]
        ))
        const history = useLotteryHistoryStore()
        await history.hydrate(23)
        await history.loadRecords('4', 23)
        expect(history.getRecords('4', 23)).toEqual([classARecord])
        expect(history.getRecords('4', 24)).toEqual([])

        await history.hydrate(24)
        await history.loadRecords('4', 24)
        expect(history.getRecords('4', 24)).toEqual([classBRecord])
        expect(history.getRecords('4', 23)).toEqual([])
        expect(mocks.listRecords).toHaveBeenLastCalledWith('4', 24)
    })

    it('retries a failed draw only in its original class and never reads an unscoped old queue', async () => {
        const unscopedKey = 'ta_lottery_pending_v1_7'
        const original = JSON.stringify({ byPoolId: { '4': [record('old-unscoped')] } })
        storage.set(unscopedKey, original)
        mocks.createRecords.mockRejectedValueOnce(new Error('offline'))
        const history = useLotteryHistoryStore()
        await history.hydrate(23)
        await expect(history.addRecord('4', '贴纸', 23)).rejects.toThrow('offline')
        const pending = pendingRecords()[0]!

        await history.hydrate(24)
        await history.loadRecords('4', 24)
        expect(mocks.createRecords).toHaveBeenCalledOnce()
        expect(history.getRecords('4', 24)).toEqual([])
        expect(pendingRecords()[0]?.id).toBe(pending.id)
        await history.hydrate(23)
        mocks.listRecords.mockResolvedValue([{ ...pending, serverId: 1, syncPending: undefined }])
        await history.loadRecords('4', 23)
        expect(mocks.createRecords).toHaveBeenLastCalledWith('4', 23, [expect.objectContaining({ id: pending.id })])
        expect(pendingRecords()).toEqual([])
        expect(storage.get(unscopedKey)).toBe(original)
    })

    it('rejects record operations without a class before making any database requests', async () => {
        const history = useLotteryHistoryStore()
        await history.hydrate(null)
        await expect(history.addRecord('4', '贴纸')).rejects.toThrow('班级')
        await expect(history.loadRecords('4', 0)).rejects.toThrow('班级')
        await expect(history.clearRecords('4')).rejects.toThrow('班级')
        await expect(history.updateStudent('4', 21, null, 0)).rejects.toThrow('班级')
        expect(history.getRecords('4')).toEqual([])
        expect(mocks.createRecords).not.toHaveBeenCalled()
        expect(mocks.listRecords).not.toHaveBeenCalled()
        expect(mocks.clearRecords).not.toHaveBeenCalled()
        expect(mocks.updateRecordStudent).not.toHaveBeenCalled()
        expect(storage.size).toBe(0)
    })

    it('ignores an old class load response after switching classes', async () => {
        let finishOldLoad!: (records: DrawRecord[]) => void
        mocks.listRecords.mockImplementationOnce(() => new Promise<DrawRecord[]>(resolve => { finishOldLoad = resolve }))
        const history = useLotteryHistoryStore()
        await history.hydrate(23)
        const oldLoad = history.loadRecords('4', 23)
        await vi.waitFor(() => expect(mocks.listRecords).toHaveBeenCalledOnce())
        await history.hydrate(24)
        const classBRecord = { ...record('class-b', 22), studentClassId: 24 }
        mocks.listRecords.mockResolvedValue([classBRecord])
        await history.loadRecords('4', 24)
        finishOldLoad([record('class-a', 21)])
        await oldLoad
        expect(history.getRecords('4', 24)).toEqual([classBRecord])
    })

    it('clears only the current class and preserves the other class retry queue', async () => {
        storage.set(pendingKey, JSON.stringify({ byPoolId: { '4': [record('class-a-pending')] } }))
        const classBKey = 'ta_lottery_pending_v2_7_class_24'
        const classBPending = JSON.stringify({ byPoolId: { '4': [{ ...record('class-b-pending'), studentClassId: 24 }] } })
        storage.set(classBKey, classBPending)
        const history = useLotteryHistoryStore()
        await history.hydrate(23)
        await history.clearRecords('4', 23)
        expect(mocks.clearRecords).toHaveBeenCalledExactlyOnceWith('4', 23)
        expect(pendingRecords()).toEqual([])
        expect(storage.get(classBKey)).toBe(classBPending)
    })

    it('keeps a failed in-memory queue in its original class when storage is unavailable during class switches', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('storage unavailable') })
        mocks.createRecords.mockRejectedValueOnce(new Error('offline'))
        const history = useLotteryHistoryStore()
        await history.hydrate(23)
        await expect(history.addRecord('4', '贴纸', 23)).rejects.toThrow('offline')
        const pending = history.getRecords('4', 23)[0]!
        await history.hydrate(24)
        expect(history.getRecords('4', 24)).toEqual([])
        await history.hydrate(23)
        expect(history.getRecords('4', 23)[0]?.id).toBe(pending.id)
        expect(history.pendingPersistenceFailed).toBe(true)
    })

    it('cleans the original class queue after a delayed clear while leaving the newly selected class untouched', async () => {
        storage.set(pendingKey, JSON.stringify({ byPoolId: { '4': [record('class-a-pending')] } }))
        let finishClear!: () => void
        mocks.clearRecords.mockImplementationOnce(() => new Promise<void>(resolve => { finishClear = resolve }))
        const history = useLotteryHistoryStore()
        await history.hydrate(23)
        const oldClear = history.clearRecords('4', 23)
        await history.hydrate(24)
        const classBRecord = { ...record('class-b', 22), studentClassId: 24 }
        mocks.listRecords.mockResolvedValue([classBRecord])
        await history.loadRecords('4', 24)
        finishClear()
        await oldClear
        expect(pendingRecords()).toEqual([])
        expect(history.getRecords('4', 24)).toEqual([classBRecord])
        expect(storage.has('ta_lottery_pending_v2_7_class_24')).toBe(false)
    })

    it('applies a successful binding to its original class after switching away and back before the response', async () => {
        let finishUpdate!: (saved: DrawRecord) => void
        const unbound = record('class-a', 21)
        mocks.listRecords.mockResolvedValue([unbound])
        mocks.updateRecordStudent.mockImplementationOnce(() => new Promise<DrawRecord>(resolve => { finishUpdate = resolve }))
        const history = useLotteryHistoryStore()
        history.hydrate(23)
        await history.loadRecords('4', 23)
        const update = history.updateStudent('4', 21, 9, 23)
        history.hydrate(24)
        history.hydrate(23)
        await history.loadRecords('4', 23)
        const bound = { ...unbound, studentId: 9, studentName: '小明' }
        finishUpdate(bound)
        await update
        expect(history.getRecords('4', 23)).toEqual([bound])
    })

    it('does not replace a completed student binding with an earlier delayed list response', async () => {
        const unbound = record('class-a', 21)
        mocks.listRecords.mockResolvedValueOnce([unbound])
        const history = useLotteryHistoryStore()
        history.hydrate(23)
        await history.loadRecords('4', 23)
        let finishList!: (records: DrawRecord[]) => void
        mocks.listRecords.mockImplementationOnce(() => new Promise<DrawRecord[]>(resolve => { finishList = resolve }))
        const oldList = history.loadRecords('4', 23)
        await vi.waitFor(() => expect(mocks.listRecords).toHaveBeenCalledTimes(2))
        const bound = { ...unbound, studentId: 9, studentName: '小明' }
        mocks.updateRecordStudent.mockResolvedValueOnce(bound)
        await history.updateStudent('4', 21, 9, 23)
        finishList([unbound])
        await oldList
        expect(history.getRecords('4', 23)).toEqual([bound])
    })
    it('loads server history and leaves original local history untouched', async () => {
        const originalHistory = JSON.stringify({ byPoolId: { '4': [record('old-record')] } })
        storage.set(oldKey, originalHistory)
        mocks.listRecords.mockResolvedValue([record('server-record', 21)])
        const history = useLotteryHistoryStore()

        await history.hydrate(23)
        await history.loadRecords('4', 23)

        expect(history.getRecords('4', 23)).toEqual([record('server-record', 21)])
        expect(mocks.createRecords).not.toHaveBeenCalled()
        expect(storage.get(oldKey)).toBe(originalHistory)
    })

    it('keeps a failed draw across reload and retries with the same client id', async () => {
        mocks.createRecords.mockRejectedValueOnce(new Error('offline'))
        const history = useLotteryHistoryStore()
        await history.hydrate(23)

        await expect(history.addRecord('4', '贴纸', 23)).rejects.toThrow('offline')
        const pending = pendingRecords()[0]!
        expect(history.getRecords('4', 23)).toEqual([expect.objectContaining({ id: pending.id, syncPending: true })])

        setActivePinia(createPinia())
        const reloaded = useLotteryHistoryStore()
        await reloaded.hydrate(23)
        mocks.listRecords.mockResolvedValue([{ ...pending, serverId: 1, syncPending: undefined }])
        await reloaded.loadRecords('4', 23)

        expect(mocks.createRecords.mock.calls[1]?.[2][0].id).toBe(pending.id)
        expect(pendingRecords()).toEqual([])
        expect(reloaded.getRecords('4', 23)).toEqual([expect.objectContaining({ id: pending.id, serverId: 1 })])
    })

    it('uploads at most 200 records and retains the failed batch while displaying server history', async () => {
        const pending = Array.from({ length: 201 }, (_, index) => record(`pending-${index}`))
        storage.set(pendingKey, JSON.stringify({ byPoolId: { '4': pending } }))
        mocks.createRecords.mockImplementationOnce(async (_poolId: string, _classId: number, records: DrawRecord[]) => (
            records.map((item, index) => ({ ...item, serverId: index + 1 }))
        )).mockRejectedValueOnce(new Error('offline'))
        const saved = pending.slice(0, 200).map((item, index) => ({ ...item, serverId: index + 1 }))
        mocks.listRecords.mockResolvedValue(saved)
        const history = useLotteryHistoryStore()
        await history.hydrate(23)

        await expect(history.loadRecords('4', 23)).rejects.toThrow('offline')

        expect(mocks.createRecords.mock.calls.map(call => call[2].length)).toEqual([200, 1])
        expect(pendingRecords().map(item => item.id)).toEqual(['pending-200'])
        expect(history.getRecords('4', 23)).toHaveLength(201)
        expect(history.getRecords('4', 23).filter(item => item.syncPending)).toHaveLength(1)
    })

    it('retains the queue if the server does not confirm the entire submitted batch', async () => {
        mocks.createRecords.mockResolvedValue([])
        const history = useLotteryHistoryStore()
        await history.hydrate(23)

        await expect(history.addRecord('4', '贴纸', 23)).rejects.toThrow('未完整保存')

        expect(pendingRecords()).toHaveLength(1)
        expect(history.getRecords('4', 23)[0]?.syncPending).toBe(true)
    })

    it('clears local and displayed records only after database clear succeeds', async () => {
        storage.set(pendingKey, JSON.stringify({ byPoolId: {
            '4': [record('pending')], '5': [record('other-pool')],
        } }))
        storage.set(oldKey, 'original-local-history')
        mocks.createRecords.mockRejectedValue(new Error('offline'))
        mocks.listRecords.mockResolvedValue([record('server-record', 21)])
        const history = useLotteryHistoryStore()
        await history.hydrate(23)
        await expect(history.loadRecords('4', 23)).rejects.toThrow('offline')
        mocks.clearRecords.mockRejectedValueOnce(new Error('clear failed'))

        await expect(history.clearRecords('4', 23)).rejects.toThrow('clear failed')
        expect(history.getRecords('4', 23)).toHaveLength(2)
        expect(pendingRecords()).toHaveLength(1)
        await history.clearRecords('4', 23)

        expect(history.getRecords('4', 23)).toEqual([])
        expect(pendingRecords()).toEqual([])
        expect(pendingRecords('5')).toHaveLength(1)
        expect(storage.get(oldKey)).toBe('original-local-history')
    })

    it('preserves student binding on failure and applies binding and unbinding after success', async () => {
        const unbound = record('server-record', 21)
        const bound = { ...unbound, studentId: 9, studentName: '小明', studentClassId: 23 }
        mocks.listRecords.mockResolvedValue([unbound])
        mocks.updateRecordStudent.mockRejectedValueOnce(new Error('update failed'))
        const history = useLotteryHistoryStore()
        await history.hydrate(23)
        await history.loadRecords('4', 23)

        await expect(history.updateStudent('4', 21, 9, 23)).rejects.toThrow('update failed')
        expect(history.getRecords('4', 23)).toEqual([unbound])
        mocks.updateRecordStudent.mockResolvedValueOnce(bound)
        await history.updateStudent('4', 21, 9, 23)
        expect(history.getRecords('4', 23)).toEqual([bound])
        mocks.updateRecordStudent.mockResolvedValueOnce(unbound)
        await history.updateStudent('4', 21, null, 23)
        expect(mocks.updateRecordStudent).toHaveBeenLastCalledWith(21, 23, null)
        expect(history.getRecords('4', 23)).toEqual([unbound])
    })

    it('continues saving and clearing the database when browser storage is unavailable', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('quota exceeded') })
        const history = useLotteryHistoryStore()
        await history.hydrate(23)

        const saved = await history.addRecord('4', '贴纸', 23)

        expect(saved.serverId).toBe(1)
        expect(mocks.createRecords).toHaveBeenCalledOnce()
        expect(history.getRecords('4', 23)).toHaveLength(1)
        expect(history.pendingPersistenceFailed).toBe(true)
        await history.clearRecords('4', 23)
        expect(mocks.clearRecords).toHaveBeenCalledExactlyOnceWith('4', 23)
        expect(history.getRecords('4', 23)).toEqual([])
    })

    it('keeps an in-memory retry queue when both storage and the database are unavailable', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('storage unavailable') })
        mocks.createRecords.mockRejectedValueOnce(new Error('offline'))
        const history = useLotteryHistoryStore()
        await history.hydrate(23)

        await expect(history.addRecord('4', '贴纸', 23)).rejects.toThrow('offline')

        expect(mocks.createRecords).toHaveBeenCalledOnce()
        expect(history.getRecords('4', 23)[0]?.syncPending).toBe(true)
        expect(history.pendingPersistenceFailed).toBe(true)
        const pending = history.getRecords('4', 23)[0]!
        mocks.listRecords.mockResolvedValue([{ ...pending, serverId: 1, syncPending: undefined }])
        await history.loadRecords('4', 23)
        expect(history.getRecords('4', 23)[0]?.serverId).toBe(1)
        expect(history.getRecords('4', 23)[0]?.syncPending).toBeUndefined()
    })

    it('ignores an old account upload after hydration switches account and stops further old batches', async () => {
        const pending = Array.from({ length: 201 }, (_, index) => record(`old-${index}`))
        storage.set(pendingKey, JSON.stringify({ byPoolId: { '4': pending } }))
        let finishUpload!: (records: DrawRecord[]) => void
        mocks.createRecords.mockImplementationOnce(() => new Promise<DrawRecord[]>(resolve => { finishUpload = resolve }))
        const history = useLotteryHistoryStore()
        await history.hydrate(23)
        const oldUpload = history.loadRecords('4', 23)
        mocks.profile.id = 8
        await history.hydrate(23)
        mocks.listRecords.mockResolvedValue([record('new-account-record', 90)])
        await history.loadRecords('4', 23)
        finishUpload(pending.slice(0, 200).map((item, index) => ({ ...item, serverId: index + 1 })))
        await oldUpload

        expect(mocks.createRecords).toHaveBeenCalledOnce()
        expect(history.getRecords('4', 23)).toEqual([record('new-account-record', 90)])
        expect(storage.has('ta_lottery_pending_v2_8_class_23')).toBe(false)
        expect(pendingRecords()).toHaveLength(201)
    })

    it('does not apply an old account clear response to newly loaded account records', async () => {
        let finishClear!: () => void
        mocks.clearRecords.mockImplementationOnce(() => new Promise<void>(resolve => { finishClear = resolve }))
        mocks.listRecords.mockResolvedValue([record('old-account-record', 21)])
        const history = useLotteryHistoryStore()
        await history.hydrate(23)
        await history.loadRecords('4', 23)
        const oldClear = history.clearRecords('4', 23)
        mocks.profile.id = 8
        await history.hydrate(23)
        mocks.listRecords.mockResolvedValue([record('new-account-record', 90)])
        await history.loadRecords('4', 23)
        finishClear()
        await oldClear

        expect(history.getRecords('4', 23)).toEqual([record('new-account-record', 90)])
        expect(storage.has('ta_lottery_pending_v2_8_class_23')).toBe(false)
    })
})
