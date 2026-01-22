import { get } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type { UserProfile } from '@/types/user'

interface UserInfoDto {
    id: number | string
    email: string
    name: string
    role_id?: number | null
    status?: number
    created_at?: string
    json_ext?: Record<string, any>
}

export interface UserInfoPayload {
    profile: UserProfile
    jsonExt: Record<string, any>
}

function mapUserProfile(dto: UserInfoDto): UserProfile {
    const createdAtMs = typeof dto.created_at === 'string' ? new Date(dto.created_at).getTime() : undefined
    return {
        id: dto.id !== undefined ? String(dto.id) : '',
        email: dto.email ?? '',
        name: dto.name ?? dto.email ?? '',
        avatar: null,
        createdAt: Number.isFinite(createdAtMs) ? createdAtMs : undefined,
    }
}

export const userApi = {
    async getUserInfo(): Promise<ApiResponse<UserInfoPayload>> {
        const res = await get<UserInfoDto>('/user/info')
        return {
            ...res,
            data: {
                profile: mapUserProfile(res.data),
                jsonExt: res.data?.json_ext ?? {},
            },
        }
    },
}
