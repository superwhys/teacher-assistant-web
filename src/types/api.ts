export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    code: string;
}

export type LoginType = 'password' | 'code'

export interface LoginRequest {
    email: string;
    login_type: LoginType;
    password: string;
    code: string;
}

export interface SendEmailCodeRequest {
    email: string;
}

export interface PasswordResetRequest {
    email: string;
    password: string;
    code: string;
}

export interface LoginResponse {
    token: string;
}

export interface QrLoginCreateRequest {
    serial_no: string;
}

export interface QrLoginCreateResponse {
    serial_no: string;
    claim_secret: string;
    expires_at: number;
    qr_code: string;
}

export interface QrLoginPollRequest {
    serial_no: string;
    claim_secret: string;
}

export interface QrLoginPollResponse {
    status: 'pending' | 'expired' | 'consumed' | 'success';
    token?: string;
}

export interface VerifySecretRequest {
    secret: string;
}

export interface VerifySecretResponse {
    token: string;
}

// 云端同步
export type CloudSyncType = 'manual' | 'auto'

export interface CloudSyncDataReq {
    sync_type: CloudSyncType
    data: Record<string, any>
}

export type CloudBackupsMap = Record<CloudSyncType, number[]>

export class ApiRequestError extends Error {
    readonly isApiRequestError = true;

    constructor(message: string) {
        super(message);
        this.name = "ApiRequestError";
    }
}

export function isApiRequestError(err: unknown): err is ApiRequestError {
    return !!(err && typeof err === "object" && "isApiRequestError" in err);
}
