import { get, post, put } from '@/api/api'
import type { CollectionTaskDetail, CollectionTaskSummary, CollectionUpdate } from '@/types/collectionTask'

const taskPath = (classId: number) => `/class/${classId}/collection-tasks`

export const collectionTaskApi = {
    list(classId: number, semesterId: number) {
        return get<{ tasks: CollectionTaskSummary[] }>(taskPath(classId), { semester_id: semesterId })
    },
    create(classId: number, data: { semester_id: number; title: string; client_request_id: string }) {
        return post<CollectionTaskDetail>(taskPath(classId), data)
    },
    detail(classId: number, taskId: number, semesterId: number) {
        return get<CollectionTaskDetail>(`${taskPath(classId)}/${taskId}`, { semester_id: semesterId })
    },
    update(classId: number, taskId: number, data: { semester_id: number; version: number; updates: CollectionUpdate[] }) {
        return put<CollectionTaskDetail>(`${taskPath(classId)}/${taskId}`, data)
    },
    award(classId: number, taskId: number, data: { semester_id: number; version: number; rule_id: number; expected_points: number }) {
        return post<CollectionTaskDetail>(`${taskPath(classId)}/${taskId}/award`, data)
    },
}
