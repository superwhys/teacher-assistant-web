import type { SidebarMenu } from '@/types/session'

const MENU_CODE_RE = /^[a-z][a-z0-9_]*$/
const MENU_ROUTE_RE = /^[a-z0-9][a-z0-9/_-]*$/

export function normalizeSidebar(input: unknown): SidebarMenu[] {
    if (!Array.isArray(input)) return []
    const seenCodes = new Set<string>()
    const seenRoutes = new Set<string>()
    const menus: SidebarMenu[] = []
    for (const raw of input) {
        if (!raw || typeof raw !== 'object') continue
        const item = raw as Partial<SidebarMenu>
        const code = String(item.code ?? '').trim()
        const routeKey = String(item.route_key ?? '').trim().replace(/^\/+|\/+$/g, '')
        const name = String(item.name ?? '').trim()
        const icon = String(item.icon ?? '').trim() || 'Menu'
        if (
            !MENU_CODE_RE.test(code)
            || !MENU_ROUTE_RE.test(routeKey)
            || routeKey.includes('..')
            || routeKey.includes('//')
            || !name
            || seenCodes.has(code)
            || seenRoutes.has(routeKey)
        ) {
            continue
        }
        seenCodes.add(code)
        seenRoutes.add(routeKey)
        menus.push({
            id: Number(item.id) || 0,
            code,
            name,
            route_key: routeKey,
            icon,
            sort: Number(item.sort) || 0,
        })
    }
    return menus.sort((a, b) => a.sort - b.sort || a.id - b.id)
}

export function routeKeyForPath(path: string): string {
    return String(path ?? '')
        .split('?')[0]!
        .split('#')[0]!
        .replace(/^\/+|\/+$/g, '')
}

export function findMenuForPath(menus: SidebarMenu[], path: string): SidebarMenu | null {
    const routeKey = routeKeyForPath(path)
    return [...menus]
        .sort((a, b) => b.route_key.length - a.route_key.length)
        .find((menu) => routeKey === menu.route_key || routeKey.startsWith(`${menu.route_key}/`))
        ?? null
}

export function canAccessPath(menus: SidebarMenu[], path: string): boolean {
    return findMenuForPath(menus, path) !== null
}

export function firstAllowedPath(menus: SidebarMenu[]): string | null {
    return menus[0] ? `/${menus[0].route_key}` : null
}
