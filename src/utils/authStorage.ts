type AuthStorage = Pick<Storage, 'getItem' | 'setItem'>

const TAB_SCOPE_KEY = 'ta_auth_tab_scope_v1'
let storage: AuthStorage | undefined

/** 在消费 URL 凭证前确定认证存储；代登录标签页不使用全局认证缓存。 */
export function ensureAuthStorage(): AuthStorage {
    if (storage) return storage

    const tabRequested = typeof window !== 'undefined'
        && new URLSearchParams(window.location?.search ?? '').get('session') === 'tab'

    if (tabRequested) {
        try {
            const tabStorage = window.sessionStorage
            tabStorage.setItem(TAB_SCOPE_KEY, '1')
            if (tabStorage.getItem(TAB_SCOPE_KEY) !== '1') throw new Error('标签页存储不可用')
            storage = tabStorage
            return storage
        } catch {
            throw new Error('无法创建独立的代登录会话，请允许标签页存储后重试')
        }
    }

    try {
        const tabStorage = typeof window !== 'undefined' ? window.sessionStorage : undefined
        if (tabStorage?.getItem(TAB_SCOPE_KEY) === '1') {
            storage = tabStorage
            return storage
        }
    } catch {
        // URL 清理后也不能因无法读取标签页标志而误用全局认证。
        throw new Error('无法读取标签页会话，请允许标签页存储后重试')
    }

    storage = localStorage
    return storage
}

export const authStorage: AuthStorage = {
    getItem(key) {
        return ensureAuthStorage().getItem(key)
    },
    setItem(key, value) {
        ensureAuthStorage().setItem(key, value)
    },
}
