import { defineStore } from 'pinia'
import { ref } from 'vue'
import { asyncStorage, getUserStorageKey } from '@/utils/storage'
import type { Student } from '@/types/student'
import { useCacheStore } from './cacheStore'

type StudentRecords = Record<string, Student[]> // key: classId

const STORAGE_KEY_BASE = 'ta_student_store_v1'

function loadInitial(): StudentRecords {
    return {}
}

export const useStudentStore = defineStore('student', () => {
    const cacheStore = useCacheStore()
    const records = ref<StudentRecords>(loadInitial())

    function getStorageKey(): string {
        const userId = cacheStore.profile?.id || null
        return getUserStorageKey(STORAGE_KEY_BASE, userId)
    }

    function persist() {
        void asyncStorage.setItem<StudentRecords>(getStorageKey(), records.value)
    }

    async function hydrate() {
        const saved = await asyncStorage.getItem<StudentRecords>(getStorageKey())
        if (!saved) return
        if (saved && typeof saved === 'object') {
            records.value = saved
        }
    }

    function clear() {
        records.value = {}
    }

    function listByClassId(classId: string): Student[] {
        return records.value[classId] ?? []
    }

    function totalByClassId(classId: string): number {
        return listByClassId(classId).length
    }

    function addStudent(classId: string, student: Student) {
        const list = records.value[classId] ?? (records.value[classId] = [])
        const exists = list.some(s => s.studentName === student.studentName)
        if (!exists) {
            list.push(student)
            persist()
        }
    }

    function addStudentsBatch(classId: string, students: Student[]) {
        const list = records.value[classId] ?? (records.value[classId] = [])
        const existingNames = new Set(list.map(s => s.studentName))
        const filtered = students.filter(s => !existingNames.has(s.studentName))
        if (filtered.length === 0) return
        records.value[classId] = list.concat(filtered)
        persist()
    }

    function removeStudent(classId: string, studentName: string) {
        const list = records.value[classId]
        if (!list) return
        records.value[classId] = list.filter(s => s.studentName !== studentName)
        persist()
    }

    function updateStudent(classId: string, oldStudentName: string, updated: Student) {
        const list = records.value[classId]
        if (!list) return
        const index = list.findIndex(s => s.studentName === oldStudentName)
        if (index === -1) return
        const isRenaming = updated.studentName !== oldStudentName
        if (isRenaming && list.some((s, i) => i !== index && s.studentName === updated.studentName)) {
            return
        }
        list[index] = { ...updated }
        persist()
    }

    return {
        listByClassId,
        totalByClassId,
        addStudent,
        addStudentsBatch,
        removeStudent,
        updateStudent,
        persist,
        hydrate,
        clear,
    }
})


