const PBKDF2_ITERATIONS = 150000
const DERIVED_KEY_BITS = 256

function bufToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary)
}

function base64ToBuf(b64: string): ArrayBuffer {
    const binary = atob(b64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
}

export function generateSaltBase64(length = 16): string {
    const arr = new Uint8Array(length)
    crypto.getRandomValues(arr)
    let binary = ''
    for (const b of arr) binary += String.fromCharCode(b)
    return btoa(binary)
}

async function deriveBits(password: string, saltBase64: string): Promise<ArrayBuffer> {
    const enc = new TextEncoder()
    const baseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    )
    const salt = base64ToBuf(saltBase64)
    return crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        baseKey,
        DERIVED_KEY_BITS
    )
}

export async function hashPassword(password: string, saltBase64: string): Promise<string> {
    const bits = await deriveBits(password, saltBase64)
    return bufToBase64(bits)
}

export async function verifyPassword(password: string, saltBase64: string, hashBase64: string): Promise<boolean> {
    const calc = await hashPassword(password, saltBase64)
    return calc === hashBase64
}


