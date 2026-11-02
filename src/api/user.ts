import { get, post } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type { UserProfile } from '@/types/user'

export const userApi = {
    startTrial(): Promise<ApiResponse<UserProfile>> {
        return post<UserProfile>('/user/trial/start')
    },
    getUserProfile(): Promise<ApiResponse<UserProfile>> {
        return get<UserProfile>('/user/info')
    }
}
