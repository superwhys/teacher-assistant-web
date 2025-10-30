/**
 * 授权与试用校验工具（基于 WebCrypto 的 RS256 验签）
 */

type JwtHeader = {
    alg: string
    typ?: string
    [k: string]: unknown
}

export type LicenseClaims = {
    exp?: number
    iat?: number
    nbf?: number
    sub?: string
    jti?: string
    permissions?: number | string
    secret?: string
    [k: string]: unknown
}

export type LicenseVerifyResult = {
    validSignature: boolean
    isExpired: boolean
    claims: LicenseClaims | null
    header: JwtHeader | null
    expiresAt: number | null
    reason?: string
}

function base64UrlToUint8Array(input: string): Uint8Array {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad === 2) base64 += '=='
    else if (pad === 3) base64 += '='
    else if (pad !== 0) throw new Error('Invalid base64url string')
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

function base64UrlToString(input: string): string {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad === 2) base64 += '=='
    else if (pad === 3) base64 += '='
    else if (pad !== 0) throw new Error('Invalid base64url string')
    return atob(base64)
}

function strToUint8Array(s: string): Uint8Array {
    return new TextEncoder().encode(s)
}

function parsePemToDer(pem: string): ArrayBuffer {
    const cleaned = pem
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s+/g, '')
    // PEM 是 base64（非 url 变体）
    const binary = atob(cleaned)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer as ArrayBuffer
}

async function importPublicKeyFromPem(pem: string): Promise<CryptoKey> {
    const der = parsePemToDer(pem)
    return await crypto.subtle.importKey(
        'spki',
        der,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: { name: 'SHA-256' },
        },
        false,
        ['verify']
    )
}

function nowEpochSeconds(): number {
    return Math.floor(Date.now() / 1000)
}

export async function verifyJwtRS256(token: string, publicKeyPem: string): Promise<LicenseVerifyResult> {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return { validSignature: false, isExpired: true, claims: null, header: null, expiresAt: null, reason: 'Malformed JWT' }

        const encodedHeader = parts[0]!
        const encodedPayload = parts[1]!
        const encodedSignature = parts[2]!
        const headerJson = base64UrlToString(encodedHeader)
        const payloadJson = base64UrlToString(encodedPayload)
        const header = JSON.parse(headerJson) as JwtHeader
        const claims = JSON.parse(payloadJson) as LicenseClaims

        if (header.alg !== 'RS256') {
            return { validSignature: false, isExpired: true, claims, header, expiresAt: claims.exp ?? null, reason: 'Unsupported alg' }
        }

        const publicKey = await importPublicKeyFromPem(publicKeyPem)
        const signingInput = `${encodedHeader}.${encodedPayload}`
        const signature = base64UrlToUint8Array(encodedSignature)
        const ok = await crypto.subtle.verify(
            { name: 'RSASSA-PKCS1-v1_5' },
            publicKey,
            signature.buffer as ArrayBuffer,
            strToUint8Array(signingInput).buffer as ArrayBuffer
        )

        const now = nowEpochSeconds()
        const exp = claims.exp
        const nbf = claims.nbf
        const isExpired = typeof exp === 'number' ? now >= exp : false
        const notBeforeBlocked = typeof nbf === 'number' ? now < nbf : false

        return {
            validSignature: ok,
            isExpired: isExpired || notBeforeBlocked,
            claims,
            header,
            expiresAt: exp ?? null,
            reason: ok ? undefined : '密钥异常，请联系管理员',
        }
    } catch (e) {
        return { validSignature: false, isExpired: true, claims: null, header: null, expiresAt: null, reason: (e as Error).message }
    }
}

export async function getLicenseInfoFromToken(token: string): Promise<LicenseVerifyResult> {
    const pem = import.meta.env.VITE_JWT_PUBLIC_KEY as string | undefined
    if (!pem || typeof pem !== 'string' || pem.trim().length === 0) {
        return { 
            validSignature: false, 
            isExpired: true, 
            claims: null, 
            header: null, 
            expiresAt: null, 
            reason: '密钥配置验证失败，请联系管理员',
        }
    }
    return await verifyJwtRS256(token, pem.trim())
}


