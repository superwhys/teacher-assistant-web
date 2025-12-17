import { get, post, put, del } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type { ClassDTO, CreateClassReq, ListClassesResp, UpdateClassReq } from '@/types/class'

export const classApi = {
    create(data: CreateClassReq): Promise<ApiResponse<ClassDTO>> {
        return post<ClassDTO>('/class/create', data)
    },
    list(): Promise<ApiResponse<ListClassesResp>> {
        return get<ListClassesResp>('/class/list')
    },
    update(classId: number, data: UpdateClassReq): Promise<ApiResponse<null>> {
        return put<null>(`/class/update/${classId}`, data)
    },
    delete(classId: number): Promise<ApiResponse<null>> {
        return del<null>(`/class/delete/${classId}`)
    },
}
