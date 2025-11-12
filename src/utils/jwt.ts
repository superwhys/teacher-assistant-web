function base64UrlDecode(input: string): string {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
    const padLength = (4 - (normalized.length % 4)) % 4
    const padded = normalized + '='.repeat(padLength)
    const binary = atob(padded)
    const length = binary.length
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    if (typeof TextDecoder === 'function') {
        const decoder = new TextDecoder('utf-8')
        return decoder.decode(bytes)
    }
    let escaped = ''
    for (let i = 0; i < length; i++) {
        const byte = bytes[i]
        if (byte === undefined) continue
        escaped += `%${byte.toString(16).padStart(2, '0')}`
    }
    return decodeURIComponent(escaped)
}

export function decodeJwtPayload<T = unknown>(token: string): T | null {
    try {
        const parts = token.split('.')
        if (parts.length < 2) return null
        const payloadPart = parts[1]!
        const json = base64UrlDecode(payloadPart)
        return JSON.parse(json) as T
    } catch {
        return null
    }
}


