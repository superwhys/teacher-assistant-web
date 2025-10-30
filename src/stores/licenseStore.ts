import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getLicenseInfoFromToken, type LicenseClaims, type LicenseVerifyResult } from '@/utils/license'
import { LicenseStatus, Permission, hasPermission } from '@/types/license'
import type { LicenseStatus as LicenseStatusType } from '@/types/license'

/**
 * 授权状态 Store（只读来源于 JWT + 公钥离线验签）
 */
const STORAGE_TOKEN_KEY = 'token'


export const useLicenseStore = defineStore('license', () => {
    const token = ref<string | null>(null)
    const claims = ref<LicenseClaims | null>(null)
    const validSignature = ref<boolean>(false)
    const expiresAt = ref<number | null>(null) // 秒级时间戳
    const lastCheckedAt = ref<number | null>(null)
    const permission = ref<string | number | null>(null)
    const status = ref<LicenseStatusType>(LicenseStatus.Missing)

    async function verifyCurrent(): Promise<LicenseVerifyResult | null> {
        const t = token.value || localStorage.getItem(STORAGE_TOKEN_KEY)
        if (!t) {
            status.value = LicenseStatus.Missing
            claims.value = null
            validSignature.value = false
            expiresAt.value = null
            lastCheckedAt.value = Date.now()
            permission.value = null
            return null
        }

        token.value = t
        const result = await getLicenseInfoFromToken(t)
        claims.value = result.claims
        validSignature.value = result.validSignature
        expiresAt.value = result.expiresAt
        lastCheckedAt.value = Date.now()

        const rawPerm: unknown = result.claims?.permissions
        if (typeof rawPerm === 'string') {
            permission.value = rawPerm
        } else if (typeof rawPerm === 'number' && Number.isFinite(rawPerm)) {
            permission.value = rawPerm
        } else {
            permission.value = null
        }
        if (!result.validSignature) status.value = LicenseStatus.Invalid
        else if (result.isExpired) status.value = LicenseStatus.Expired
        else status.value = LicenseStatus.Valid

        return result
    }

    function isTrialPermission(): boolean {
        console.log('permission', permission.value, hasPermission(permission.value, Permission.Trial))
        return hasPermission(permission.value, Permission.Trial)
    }

    async function setTokenAndVerify(newToken: string): Promise<LicenseVerifyResult | null> {
        localStorage.setItem(STORAGE_TOKEN_KEY, newToken)
        token.value = newToken
        return await verifyCurrent()
    }

    function clear(): void {
        token.value = null
        claims.value = null
        validSignature.value = false
        expiresAt.value = null
        lastCheckedAt.value = Date.now()
        status.value = LicenseStatus.Missing
        permission.value = null
    }

    return {
        token,
        claims,
        validSignature,
        expiresAt,
        lastCheckedAt,
        permission,
        status,
        isTrialPermission,
        verifyCurrent,
        setTokenAndVerify,
        clear,
    }
})


