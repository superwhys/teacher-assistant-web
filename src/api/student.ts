import { get, post, put, del } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type {
    AddStudentsToGroupReq,
    CreateStudentGroupReq,
    CreateStudentReq,
    ListStudentGroupsResp,
    ListStudentsQuery,
    ListStudentsResp,
    RemoveStudentsFromGroupReq,
    StudentGroupDTO,
    UpdateStudentReq,
    CreateStudentBatchReq,
} from '@/types/student'

export const studentApi = {
    create(data: CreateStudentReq): Promise<ApiResponse<null>> {
        return post<null>('/student/create', data)
    },
    createBatch(data: CreateStudentBatchReq): Promise<ApiResponse<null>> {
        return post<null>('/student/create/batch', data)
    },
    delete(studentId: number): Promise<ApiResponse<null>> {
        return del<null>(`/student/${studentId}`)
    },
    update(studentId: number, data: UpdateStudentReq): Promise<ApiResponse<null>> {
        return put<null>(`/student/${studentId}`, data)
    },

    list(query: ListStudentsQuery): Promise<ApiResponse<ListStudentsResp>> {
        return get<ListStudentsResp>('/student/list', query)
    },
    listUngrouped(query: ListStudentsQuery): Promise<ApiResponse<ListStudentsResp>> {
        return get<ListStudentsResp>('/student/list/ungrouped', query)
    },

    createGroup(data: CreateStudentGroupReq): Promise<ApiResponse<StudentGroupDTO>> {
        return post<StudentGroupDTO>('/student/group/create', data)
    },
    deleteGroup(groupId: number): Promise<ApiResponse<null>> {
        return del<null>(`/student/group/${groupId}`)
    },
    listGroups(classId: number): Promise<ApiResponse<ListStudentGroupsResp>> {
        return get<ListStudentGroupsResp>('/student/group/list', { class_id: classId })
    },
    addStudentsToGroup(data: AddStudentsToGroupReq): Promise<ApiResponse<null>> {
        return post<null>('/student/group/add_students', data)
    },
    removeStudentsFromGroup(data: RemoveStudentsFromGroupReq): Promise<ApiResponse<null>> {
        return post<null>('/student/group/remove_students', data)
    },
}
