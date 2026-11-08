import type { SidebarMenu } from '@/types/session'
import { routeKeyForPath } from '@/utils/menuAccess'

export const PLATFORM_MENUS: readonly SidebarMenu[] = [
    { id: -1, code: 'platform_users', name: '用户管理', route_key: 'platform/users', icon: 'User', sort: 1 },
    { id: -2, code: 'platform_permissions', name: '权限配置', route_key: 'platform/permissions', icon: 'Key', sort: 2 },
    { id: -3, code: 'platform_menus', name: '侧栏菜单', route_key: 'platform/menus', icon: 'Grid', sort: 3 },
    { id: -4, code: 'platform_opinions', name: '意见反馈', route_key: 'platform/opinions', icon: 'ChatDotRound', sort: 4 },
]

export function isPlatformPath(path: string): boolean {
    const key = routeKeyForPath(path)
    return key === 'platform' || key.startsWith('platform/')
}

export function isPlatformPage(path: string): boolean {
    const key = routeKeyForPath(path)
    return PLATFORM_MENUS.some(menu => menu.route_key === key)
}
