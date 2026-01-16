import { get } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type { UserProfile } from '@/types/user'

export const userApi = {
    getUserProfile(): Promise<ApiResponse<UserProfile>> {
        return get<UserProfile>('/user/info')
    }
}