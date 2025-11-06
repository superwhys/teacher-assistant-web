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

export interface AuthResponse<T = unknown> {
    token: string;
    user: T;
}

export interface SendEmailCodeRequest {
    email: string;
}

export interface LoginResponse {
    token: string;
}

export interface VerifySecretRequest {
    secret: string;
}

export interface VerifySecretResponse {
    token: string;
}