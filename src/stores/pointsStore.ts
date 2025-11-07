import { defineStore } from 'pinia'
import { ref } from 'vue'
import { asyncStorage } from '@/utils/storage'
import type { PointsSign } from '@/types/pointsItem'

type ClassId = string
type StudentName = string

export type StudentPoints = {
    total: number
    available: number
}

type PointsMap = Record<StudentName, StudentPoints>

export type PointAction = {
    id: string
    at: number
    studentNames: StudentName[]
    delta: number
    itemId?: string
    itemName?: string
    itemSign?: PointsSign
    itemValue?: number
    type?: 'points' | 'shop'
}

type ClassPointsRecord = {
    points: PointsMap
    history: PointAction[]
}

type PointsRecords = Record<ClassId, ClassPointsRecord>

const STORAGE_KEY = 'ta_points_store_v1'

function loadInitial(): PointsRecords {
    return {}
}

function persist(records: PointsRecords) {
    void asyncStorage.setItem<PointsRecords>(STORAGE_KEY, records)
}

function ensureClass(rec: PointsRecords, classId: string): ClassPointsRecord {
    if (!rec[classId]) {
        rec[classId] = { points: {}, history: [] }
    }
    return rec[classId]
}

function ensureStudentPoints(points: PointsMap, studentName: string): StudentPoints {
    if (!points[studentName]) {
        points[studentName] = { total: 0, available: 0 }
    } else if (typeof points[studentName] === 'number') {
        const oldValue = points[studentName] as unknown as number
        points[studentName] = { total: oldValue, available: oldValue }
    }
    return points[studentName]
}

function generateId(prefix: string = 'PA'): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export const usePointsStore = defineStore('points', () => {
    const records = ref<PointsRecords>(loadInitial())

    function normalizeHistory() {
        let mutated = false
        for (const clsId of Object.keys(records.value)) {
            const cls = records.value[clsId]
            if (!cls || !Array.isArray(cls.history)) continue
            for (const action of cls.history) {
                if (action && (action.itemName === undefined || action.itemSign === undefined || action.itemValue === undefined || action.type === undefined)) {
                    if (action.itemName === undefined) action.itemName = '快速操作'
                    if (action.itemSign === undefined) action.itemSign = action.delta > 0 ? ('plus' as PointsSign) : ('minus' as PointsSign)
                    if (action.itemValue === undefined) action.itemValue = Math.abs(action.delta)
                    if (action.type === undefined) action.type = 'points'
                    mutated = true
                }
            }
        }
        if (mutated) persist(records.value)
    }

    // 初始化时也进行一次规范化
    normalizeHistory()

    async function hydrate() {
        const saved = await asyncStorage.getItem<PointsRecords>(STORAGE_KEY)
        if (!saved) return
        if (saved && typeof saved === 'object') {
            records.value = saved
            normalizeHistory()
        }
    }

    function getPointsOf(classId: string | null): PointsMap {
        if (!classId) return {}
        return ensureClass(records.value, classId).points
    }

    function getPointOfStudent(classId: string | null, studentName: string, type: 'total' | 'available' = 'available'): number {
        if (!classId) return 0
        const cls = ensureClass(records.value, classId)
        const points = ensureStudentPoints(cls.points, studentName)
        return points[type]
    }
    
    function getTotalPoints(classId: string | null, studentName: string): number {
        return getPointOfStudent(classId, studentName, 'total')
    }
    
    function getAvailablePoints(classId: string | null, studentName: string): number {
        return getPointOfStudent(classId, studentName, 'available')
    }

    function addPoints(
        classId: string | null,
        studentNames: string[],
        delta: number,
        meta?: { itemId?: string; itemName?: string; itemSign?: PointsSign; itemValue?: number }
    ) {
        if (!classId || !delta || studentNames.length === 0) return
        const cls = ensureClass(records.value, classId)
        for (const name of studentNames) {
            const points = ensureStudentPoints(cls.points, name)
            points.total += delta
            points.available += delta
        }
        cls.history.push({
            id: generateId(),
            at: Date.now(),
            studentNames: [...studentNames],
            delta,
            itemId: meta?.itemId,
            itemName: meta?.itemName,
            itemSign: meta?.itemSign,
            itemValue: meta?.itemValue,
            type: 'points',
        })
        // 限制历史长度，避免无限增长
        if (cls.history.length > 500) cls.history.splice(0, cls.history.length - 500)
        persist(records.value)
    }

    function undoLast(classId: string | null): PointAction | null {
        if (!classId) return null
        const cls = ensureClass(records.value, classId)
        const last = cls.history.pop()
        if (!last) return null
        const reverseDelta = -last.delta
        const actionType = last.type || 'points'
        
        for (const name of last.studentNames) {
            const points = ensureStudentPoints(cls.points, name)
            if (actionType === 'points') {
                points.total += reverseDelta
                points.available += reverseDelta
            } else {
                points.available += reverseDelta
            }
        }
        persist(records.value)
        return last
    }

    function getHistoryOf(classId: string | null): PointAction[] {
        if (!classId) return []
        return ensureClass(records.value, classId).history
    }

    function undoById(classId: string | null, actionId: string): PointAction | null {
        if (!classId) return null
        const cls = ensureClass(records.value, classId)
        const idx = cls.history.findIndex(a => a.id === actionId)
        if (idx === -1) return null
        const [action] = cls.history.splice(idx, 1)
        if (!action) return null
        const reverseDelta = -action.delta
        const actionType = action.type || 'points'
        
        for (const name of action.studentNames) {
            const points = ensureStudentPoints(cls.points, name)
            if (actionType === 'points') {
                points.total += reverseDelta
                points.available += reverseDelta
            } else {
                points.available += reverseDelta
            }
        }
        persist(records.value)
        return action
    }

    function clearHistory(classId: string | null) {
        if (!classId) return
        const cls = ensureClass(records.value, classId)
        cls.history = []
        persist(records.value)
    }

    function clearStudent(classId: string | null, studentName: string) {
        if (!classId) return
        const cls = ensureClass(records.value, classId)
        delete cls.points[studentName]
        persist(records.value)
    }
    
    function consumePoints(
        classId: string | null,
        studentNames: string[],
        amount: number,
        meta?: { itemId?: string; itemName?: string }
    ) {
        if (!classId || amount <= 0 || studentNames.length === 0) return
        const cls = ensureClass(records.value, classId)
        
        for (const name of studentNames) {
            const points = ensureStudentPoints(cls.points, name)
            if (points.available < amount) {
                throw new Error(`${name} 可用积分不足`)
            }
        }
        
        for (const name of studentNames) {
            const points = ensureStudentPoints(cls.points, name)
            points.available -= amount
        }
        
        cls.history.push({
            id: generateId(),
            at: Date.now(),
            studentNames: [...studentNames],
            delta: -amount,
            itemId: meta?.itemId,
            itemName: meta?.itemName || '商城兑换',
            itemSign: 'minus',
            itemValue: amount,
            type: 'shop',
        })
        
        if (cls.history.length > 500) cls.history.splice(0, cls.history.length - 500)
        persist(records.value)
    }

    return {
        getPointsOf,
        getPointOfStudent,
        getTotalPoints,
        getAvailablePoints,
        addPoints,
        consumePoints,
        undoLast,
        getHistoryOf,
        undoById,
        clearHistory,
        clearStudent,
        hydrate,
    }
})


