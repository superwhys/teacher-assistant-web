import { post } from '@/api/api'
import type { ApiResponse, RegisterRequest, LoginRequest, LoginResponse, SendEmailCodeRequest, VerifySecretRequest, VerifySecretResponse } from '@/types/api'
import type { UserProfile } from '@/types/user'

export const authApi = {
    register(data: RegisterRequest): Promise<ApiResponse<UserProfile>> {
        return post<UserProfile>('/auth/register', data)
    },
    login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
        return post<LoginResponse>('/auth/login', data)
    },
    sendEmailCode(data: SendEmailCodeRequest): Promise<ApiResponse<null>> {
        return post<null>('/auth/send-code', { email: data.email, scene: 1 })
    },
    verifySecret(data: VerifySecretRequest): Promise<ApiResponse<VerifySecretResponse>> {
        return post<VerifySecretResponse>('/secret/verify', data)
    },
}


