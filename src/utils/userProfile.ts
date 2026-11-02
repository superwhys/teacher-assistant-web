import type { UserProfile } from '@/types/user'
import { normalizeEntitlement } from '@/utils/entitlement'

type UserInfoApi = {
    id?: number | string | null
    name?: string | null
    email?: string | null
    avatar?: string | null
    status?: number | null
    role_id?: number | null
    roleId?: number | null
    roleCode?: string | null
    role?: { code?: string | null } | null
    entitlement?: unknown
    wechat_bound?: boolean | null
    created_at?: string | number | null
    createdAt?: number | null
    updated_at?: string | number | null
    updatedAt?: number | null
}

function parseDateToSeconds(input: string | number | null | undefined): number | undefined {
    if (typeof input === 'number' && Number.isFinite(input)) {
        return input > 1e12 ? Math.floor(input / 1000) : Math.floor(input)
    }
    if (typeof input === 'string' && input.trim()) {
        const ms = new Date(input).getTime()
        if (Number.isFinite(ms)) {
            return Math.floor(ms / 1000)
        }
        const asNumber = Number(input)
        if (Number.isFinite(asNumber)) {
            return asNumber > 1e12 ? Math.floor(asNumber / 1000) : Math.floor(asNumber)
        }
    }
    return undefined
}

export function normalizeUserProfile(raw: unknown, fallbackEmail?: string): UserProfile {
    const u = (raw || {}) as UserInfoApi

    const idRaw = u.id
    const id = (typeof idRaw === 'number' && Number.isFinite(idRaw))
        ? String(idRaw)
        : (typeof idRaw === 'string' && idRaw.trim() ? idRaw.trim() : '')

    const email = (typeof u.email === 'string' && u.email.trim())
        ? u.email.trim()
        : (String(fallbackEmail ?? '').trim())

    const name = (typeof u.name === 'string' && u.name.trim())
        ? u.name.trim()
        : (email || id || '已登录')

    const roleId = (typeof u.roleId === 'number' && Number.isFinite(u.roleId))
        ? u.roleId
        : ((typeof u.role_id === 'number' && Number.isFinite(u.role_id)) ? u.role_id : null)

    const createdAt = parseDateToSeconds(u.createdAt ?? u.created_at)
    const updatedAt = parseDateToSeconds(u.updatedAt ?? u.updated_at)

    return {
        id: id || email || 'unknown',
        name,
        email: email || '',
        avatar: typeof u.avatar === 'string' ? u.avatar : null,
        status: typeof u.status === 'number' ? u.status : null,
        roleId,
        roleCode: typeof u.role?.code === 'string' ? u.role.code : (typeof u.roleCode === 'string' ? u.roleCode : null),
        entitlement: normalizeEntitlement(u.entitlement),
        wechatBound: typeof u.wechat_bound === 'boolean' ? u.wechat_bound : undefined,
        createdAt,
        updatedAt,
    }
}

export function computeTrialFromProfile(profile: UserProfile): { trial: boolean; expiresAt: number | null } {
    const trial = profile.entitlement?.state === 'trial_active' || profile.entitlement?.state === 'trial_expired'
    const expiresAt = profile.entitlement?.trial_expires_at
        ? parseDateToSeconds(profile.entitlement.trial_expires_at) ?? null
        : null
    return { trial, expiresAt: trial ? expiresAt : null }
}

