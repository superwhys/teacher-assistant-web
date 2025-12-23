
export type UserStatus = 1 | 2
export interface JwtUserPayload {
    id: number | string
    email: string
    status?: UserStatus | null
    name?: string | null
    avatar?: string | null
    role_id?: number
}


export interface JwtPayload {
    exp: number
    user?: JwtUserPayload
    is_trial: boolean
    secret?: string | null
}
