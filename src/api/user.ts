import { get, post, put } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type { UserProfile } from '@/types/user'

export const userApi = {
    updateName(name: string): Promise<ApiResponse<Pick<UserProfile, 'id' | 'name'>>> {
        return put<Pick<UserProfile, 'id' | 'name'>>('/user/profile', { name })
    },
    startTrial(): Promise<ApiResponse<UserProfile>> {
        return post<UserProfile>('/user/trial/start')
    },
    getUserProfile(): Promise<ApiResponse<UserProfile>> {
        return get<UserProfile>('/user/info')
    }
}
