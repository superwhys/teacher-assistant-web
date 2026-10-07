import { post } from '@/api/api'
import type {
    ApiResponse, RegisterRequest, LoginRequest, LoginResponse,
    SendEmailCodeRequest, VerifySecretRequest, PasswordResetRequest,
    QrLoginCreateRequest, QrLoginCreateResponse, QrLoginPollRequest, QrLoginPollResponse,
    QrBindingPollResponse,
} from '@/types/api'
import type { UserProfile } from '@/types/user'

export const authApi = {
    register(data: RegisterRequest): Promise<ApiResponse<UserProfile>> {
        return post<UserProfile>('/auth/register', data)
    },
    login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
        return post<LoginResponse>('/auth/login', data)
    },
    createQrLogin(data: QrLoginCreateRequest): Promise<ApiResponse<QrLoginCreateResponse>> {
        return post<QrLoginCreateResponse>('/auth/qr/create', data)
    },
    pollQrLogin(data: QrLoginPollRequest): Promise<ApiResponse<QrLoginPollResponse>> {
        return post<QrLoginPollResponse>('/auth/qr/poll', data)
    },
    createQrBinding(data: QrLoginCreateRequest): Promise<ApiResponse<QrLoginCreateResponse>> {
        return post<QrLoginCreateResponse>('/auth/wechat/bind-qr/create', data)
    },
    pollQrBinding(data: QrLoginPollRequest): Promise<ApiResponse<QrBindingPollResponse>> {
        return post<QrBindingPollResponse>('/auth/wechat/bind-qr/poll', data)
    },
    sendEmailCode(data: SendEmailCodeRequest): Promise<ApiResponse<null>> {
        return post<null>('/auth/send-code', { email: data.email, scene: 1 })
    },
    passwordReset(data: PasswordResetRequest): Promise<ApiResponse<null>> {
        return post<null>('/auth/password-reset', data)
    },
    verifySecret(data: VerifySecretRequest): Promise<ApiResponse<string>> {
        return post<string>('/secret/verify', data)
    },
}
