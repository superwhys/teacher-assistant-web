import { describe, expect, it } from 'vitest'
import { canAccessPath, findMenuForPath, firstAllowedPath, normalizeSidebar, routeKeyForPath } from '../menuAccess'

describe('menu access', () => {
    const menus = normalizeSidebar([
        { id: 2, code: 'tools', name: '课堂工具', route_key: 'tools', icon: 'Tools', sort: 20 },
        { id: 1, code: 'dashboard', name: '班级总览', route_key: 'dashboard', icon: 'HomeFilled', sort: 10 },
        { id: 3, code: 'reports', name: '数据报表', route_key: 'reports/weekly', icon: 'DataAnalysis', sort: 30 },
    ])

    it('accepts and sorts database-defined menus', () => {
        expect(menus.map((item) => item.code)).toEqual(['dashboard', 'tools', 'reports'])
    })

    it('inherits a menu permission for nested routes', () => {
        expect(routeKeyForPath('/tools/timer')).toBe('tools/timer')
        expect(canAccessPath(menus, '/tools/timer')).toBe(true)
        expect(canAccessPath(menus, '/reports/weekly/detail')).toBe(true)
        expect(canAccessPath(menus, '/students')).toBe(false)
    })

    it('uses the most specific database menu for a path', () => {
        const nested = normalizeSidebar([
            ...menus,
            { id: 4, code: 'tools_timer', name: '计时器', route_key: 'tools/timer', icon: 'Timer', sort: 40 },
        ])
        expect(findMenuForPath(nested, '/tools/timer')?.code).toBe('tools_timer')
    })

    it('returns first permitted route and handles empty menus', () => {
        expect(firstAllowedPath(menus)).toBe('/dashboard')
        expect(firstAllowedPath([])).toBeNull()
    })
})
