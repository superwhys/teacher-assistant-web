import { get } from '@/api/api'
import type { ApiResponse } from '@/types/api'
import type { SessionInitResponse } from '@/types/session'

export function fetchSessionInit(): Promise<ApiResponse<SessionInitResponse>> {
    return get<SessionInitResponse>('/auth/session/init')
}
