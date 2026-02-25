import { get, post, put, del } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type {
    ClassDTO,
    CreateClassReq,
    ListClassesResp,
    ListSemestersResp,
    NextSemesterReq,
    UpdateClassReq,
    UpdateSemesterReq
} from '@/types/class'

export const classApi = {
    create(data: CreateClassReq): Promise<ApiResponse<ClassDTO>> {
        return post<ClassDTO>('/class/create', data)
    },
    list(): Promise<ApiResponse<ListClassesResp>> {
        return get<ListClassesResp>('/class/list')
    },
    update(classId: number, data: UpdateClassReq): Promise<ApiResponse<null>> {
        return put<null>(`/class/${classId}`, data)
    },
    delete(classId: number): Promise<ApiResponse<null>> {
        return del<null>(`/class/${classId}`)
    },
    nextSemester(classId: number, data: NextSemesterReq): Promise<ApiResponse<null>> {
        return post<null>(`/class/${classId}/semester/next`, data)
    },
    listSemesters(classId: number): Promise<ApiResponse<ListSemestersResp>> {
        return get<ListSemestersResp>(`/class/${classId}/semester/list`)
    },
    updateSemester(classId: number, data: UpdateSemesterReq): Promise<ApiResponse<null>> {
        return put<null>(`/class/${classId}/semester/update`, data)
    },
}
