import { defineStore } from 'pinia'
import { ref } from 'vue'
import { asyncStorage } from '@/utils/storage'
import type { Student } from '@/types/student'
import type { StudentGroup } from '@/types/studentGroup'

type GroupRecords = Record<string, StudentGroup[]> // key: classId

const STORAGE_KEY = 'ta_student_group_store_v1'

function generateId(prefix: string = 'G'): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function loadInitial(): GroupRecords {
    return {}
}

export const useStudentGroupStore = defineStore('studentGroup', () => {
    const records = ref<GroupRecords>(loadInitial())

    function persist() {
        void asyncStorage.setItem<GroupRecords>(STORAGE_KEY, records.value)
    }

    async function hydrate() {
        const saved = await asyncStorage.getItem<GroupRecords>(STORAGE_KEY)
        if (!saved) return
        if (saved && typeof saved === 'object') {
            records.value = saved
        }
    }

    function listByClassId(classId: string | null): StudentGroup[] {
        if (!classId) return []
        return records.value[classId] ?? []
    }

    function addGroup(classId: string, name: string): StudentGroup {
        const list = records.value[classId] ?? (records.value[classId] = [])
        const newGroup: StudentGroup = { id: generateId('G'), name, members: [] }
        list.push(newGroup)
        persist()
        return newGroup
    }

    function renameGroup(classId: string, groupId: string, name: string) {
        const list = records.value[classId]
        if (!list) return
        const g = list.find(x => x.id === groupId)
        if (!g) return
        g.name = name
        persist()
    }

    function removeGroup(classId: string, groupId: string) {
        const list = records.value[classId]
        if (!list) return
        records.value[classId] = list.filter(g => g.id !== groupId)
        persist()
    }

    function setGroupMembers(classId: string, groupId: string, members: string[]) {
        const list = records.value[classId]
        if (!list) return
        const g = list.find(x => x.id === groupId)
        if (!g) return
        const unique = Array.from(new Set(members))
        g.members = unique
        persist()
    }

    function removeStudentFromAll(classId: string, studentName: string) {
        const list = records.value[classId]
        if (!list) return
        for (const g of list) {
            if (g.members.includes(studentName)) {
                g.members = g.members.filter(m => m !== studentName)
            }
        }
        persist()
    }

    function renameStudentInAll(classId: string, oldName: string, newName: string) {
        const list = records.value[classId]
        if (!list) return
        for (const g of list) {
            let changed = false
            g.members = g.members.map(m => {
                if (m === oldName) {
                    changed = true
                    return newName
                }
                return m
            })
            if (changed) {
                g.members = Array.from(new Set(g.members))
            }
        }
        persist()
    }

    function listUnassigned(classId: string, classStudents: Student[]): string[] {
        const names = new Set(classStudents.map(s => s.studentName))
        const groups = records.value[classId] ?? []
        for (const g of groups) {
            for (const m of g.members) names.delete(m)
        }
        return Array.from(names)
    }

    return {
        listByClassId,
        addGroup,
        renameGroup,
        removeGroup,
        setGroupMembers,
        removeStudentFromAll,
        renameStudentInAll,
        listUnassigned,
        persist,
        hydrate,
    }
})


