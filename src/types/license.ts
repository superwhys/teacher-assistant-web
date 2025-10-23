/**
 * 授权状态常量与类型
 */
export const LicenseStatus = {
    Missing: 'missing',
    Invalid: 'invalid',
    Expired: 'expired',
    Valid: 'valid',
} as const

export type LicenseStatus = typeof LicenseStatus[keyof typeof LicenseStatus]

/**
 * 授权权限位（BigInt，安全支持高位 61/62/63）
 */
export const Permission = {
    Unknown: 0n,
    Trial: 1n << 1n,
    Common: 1n << 61n,
    Pro: 1n << 62n,
    Admin: 1n << 63n,
} as const

export type PermissionBit = typeof Permission[keyof typeof Permission]

export function toPermissionBigInt(value: unknown): bigint | null {
    if (typeof value === 'string') {
        try {
            return BigInt(value)
        } catch {
            return null
        }
    }
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) return null
        return BigInt(value)
    }
    if (typeof value === 'bigint') return value
    return null
}

export function hasPermission(value: unknown, flag: PermissionBit): boolean {
    const v = toPermissionBigInt(value)
    if (v === null) return false
    return (v & flag) === flag
}


