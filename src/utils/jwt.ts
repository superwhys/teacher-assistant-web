function base64UrlDecode(input: string): string {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
    const padLength = (4 - (normalized.length % 4)) % 4
    const padded = normalized + '='.repeat(padLength)
    const binary = atob(padded)
    let output = ''
    for (let i = 0; i < binary.length; i++) {
        output += String.fromCharCode(binary.charCodeAt(i))
    }
    return output
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


