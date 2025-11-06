export interface JwtUserPayload {
    id: number | string
    email: string
    status?: number | null
    name?: string | null
    avatar?: string | null
}

export interface JwtSecretPayload {
    id: number | string
    user_id: number | string
    secret: string
    permissions: number | string
    expires_at?: number | string | null
    status?: number | string | null
}

export interface JwtPayload {
    exp?: number
    user?: JwtUserPayload
    secret?: JwtSecretPayload | null
}


