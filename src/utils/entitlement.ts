import type { EntitlementState, UserEntitlement, UserProfile } from '@/types/user'

export type EffectiveEntitlementState = EntitlementState | 'unavailable'

export const PRO_IMPORT_EXPORT_MESSAGE = '批量导入导出仅限 Pro 版，普通版可逐条维护数据。'
export const PRO_GROUPING_MESSAGE = '学生分组仅限 Pro 版，普通版提供基础学生名单。'
export const PRO_GROWTH_REPORT_MESSAGE = '成长报告仅限有效的 Pro 订阅账号使用。'
export const PRO_AGENT_MESSAGE = 'AI 助手仅限 Pro 版，普通版可直接使用日常教学功能。'

const importExportPaths = new Set([
    '/student/create.batch', '/points/rule/record/import',
    '/points/rule/record/export/preview', '/points/rule/record/export',
])

export function isImportExportRequest(method: string, url: string): boolean {
    return method === 'POST' && importExportPaths.has(url.split('?')[0]!.split('#')[0]!)
}

const studentGroupWrites = new Set([
    '/student/group/create', '/student/group/random/apply',
    '/student/group/add_students', '/student/group/remove_students',
])

export function editionRequestMessage(profile: UserProfile | null, method: string, url: string, now = Date.now()): string {
    const path = url.split('?')[0]!.split('#')[0]!
    if (/^\/student\/[^/]+\/(?:growth-reports(?:\/[^/]+)?|growth-report(?:\/interpretation(?:\/[^/]+)?)?)$/.test(path)
        && !hasGrowthReportAccess(profile, now)) return PRO_GROWTH_REPORT_MESSAGE
    if (profile?.roleCode !== 'common') return ''
    if (path === '/agent' || path.startsWith('/agent/')) return PRO_AGENT_MESSAGE
    if ((method === 'POST' && studentGroupWrites.has(path))
        || (method === 'DELETE' && /^\/student\/group\/[^/]+$/.test(path))) return PRO_GROUPING_MESSAGE
    return isImportExportRequest(method, path) ? PRO_IMPORT_EXPORT_MESSAGE : ''
}

const states: readonly EntitlementState[] = [
    'not_started', 'trial_active', 'trial_expired', 'paid_active', 'paid_expired', 'permanent',
]

export function entitlementDeadline(value: string | null | undefined): number | null {
    if (typeof value !== 'string' || !value.trim()) return null
    const timestamp = Date.parse(value)
    return Number.isFinite(timestamp) ? timestamp : null
}

export function normalizeEntitlement(input: unknown): UserEntitlement | null {
    if (!input || typeof input !== 'object') return null
    const raw = input as Record<string, unknown>
    if (!states.includes(raw.state as EntitlementState) || typeof raw.permanent !== 'boolean') return null
    const fields = ['trial_started_at', 'trial_expires_at', 'paid_expires_at'] as const
    for (const field of fields) {
        if (raw[field] !== null && (typeof raw[field] !== 'string' || entitlementDeadline(raw[field] as string) === null)) return null
    }
    return {
        state: raw.state as EntitlementState,
        permanent: raw.permanent,
        trial_started_at: raw.trial_started_at as string | null,
        trial_expires_at: raw.trial_expires_at as string | null,
        paid_expires_at: raw.paid_expires_at as string | null,
    }
}

export function effectiveEntitlementState(profile: UserProfile | null, now = Date.now()): EffectiveEntitlementState {
    if (profile?.roleCode === 'admin') return 'permanent'
    const entitlement = normalizeEntitlement(profile?.entitlement)
    if (!entitlement) return 'unavailable'
    if (entitlement.state === 'permanent') return entitlement.permanent ? 'permanent' : 'unavailable'
    if (entitlement.state === 'trial_active' || entitlement.state === 'paid_active') {
        const deadline = entitlementDeadline(entitlement.state === 'trial_active' ? entitlement.trial_expires_at : entitlement.paid_expires_at)
        if (deadline === null) return 'unavailable'
        if (now >= deadline) return entitlement.state === 'trial_active' ? 'trial_expired' : 'paid_expired'
    }
    return entitlement.state
}

export function hasGrowthReportAccess(profile: UserProfile | null, now = Date.now()): boolean {
    if (profile?.roleCode === 'admin') return true
    if (profile?.roleCode !== 'pro') return false
    const state = effectiveEntitlementState(profile, now)
    return state === 'paid_active' || state === 'permanent'
}

export function hasCommercialAccess(state: EffectiveEntitlementState): boolean {
    return state === 'trial_active' || state === 'paid_active' || state === 'permanent'
}

export function entitlementMessage(state: EffectiveEntitlementState): string {
    switch (state) {
        case 'not_started': return '试用未开启，仅可新增班级、学生、分组和维护组员。准备好后可主动开启 14 天试用。'
        case 'trial_expired': return '试用已到期，仅可查看，不能修改、导入或导出数据。'
        case 'paid_expired': return '使用权益已到期，仅可查看，不能修改、导入或导出数据。'
        case 'trial_active': return '试用进行中'
        case 'paid_active': return '付费使用中'
        case 'permanent': return '长期使用权益有效'
        default: return '权益状态尚未同步，请刷新账号状态后重试。'
    }
}

export function entitlementStatusTitle(state: EffectiveEntitlementState, roleCode?: string | null): string {
    const edition = roleCode === 'common' ? '普通版' : roleCode === 'pro' ? 'Pro 版' : ''
    const prefix = edition ? `${edition} · ` : ''
    switch (state) {
        case 'not_started': return '试用尚未开启'
        case 'trial_active': return '免费试用中'
        case 'trial_expired': return '试用已到期 · 仅可查看'
        case 'paid_active': return `${prefix}付费权益有效`
        case 'paid_expired': return `${prefix}付费权益已到期 · 仅可查看`
        case 'permanent': return '长期使用权益'
        default: return '暂时无法获取使用权益'
    }
}

const preparationReads = new Set([
    '/user/info', '/class/list', '/student/list', '/student/list/ungrouped', '/student/group/list',
])
const preparationWrites = new Set([
    '/class/create', '/student/create', '/student/group/create', '/student/group/add_students', '/student/group/remove_students',
])

export function allowsEntitlementRequest(profile: UserProfile | null, method: string, url: string, now = Date.now()): boolean {
    const path = url.split('?')[0]!.split('#')[0]!
    if (path.startsWith('/auth/') || (method === 'POST' && path === '/user/trial/start')) return true
    if (method === 'PUT' && path === '/user/profile') return true
    if ((method === 'GET' && (path === '/subscription/plans' || path === '/subscription/orders'
        || /^\/subscription\/orders\/[^/]+$/.test(path)))
        || (method === 'POST' && (path === '/subscription/purchase-link'
            || /^\/subscription\/orders\/[^/]+\/cancel$/.test(path)))) return true
    if (editionRequestMessage(profile, method, path, now)) return false
    // Agent transport 本身不修改业务数据，工具读取及确认写入由服务端逐项校验。
    if (method === 'GET' && (path === '/agent/conversations'
        || /^\/agent\/(conversations\/[^/]+|runs\/[^/]+\/events)$/.test(path))) return true
    if (method === 'POST' && (path === '/agent/conversations'
        || /^\/agent\/(conversations\/[^/]+\/runs|runs\/[^/]+\/cancel|actions\/[^/]+\/decision)$/.test(path))) return true
    const state = effectiveEntitlementState(profile, now)
    if (hasCommercialAccess(state)) return true
    if (method === 'GET' && (preparationReads.has(path) || /^\/class\/[^/]+\/semester\/list$/.test(path))) return true
    if (state === 'not_started') return method === 'POST' && preparationWrites.has(path)
    if (method !== 'GET') return false
    return new Set([
        '/points/rule/group/list', '/points/rule/apply/list', '/points/ranking/class', '/points/ranking/rule',
        '/mall/prizes/list', '/mall/prizes/records', '/lottery/pools/list', '/lottery/records/list', '/dashboard/statistics',
    ]).has(path) || /^\/lottery\/pools\/[^/]+$/.test(path)
        || ((state === 'trial_expired' || state === 'paid_expired') && /^\/class\/\d+\/collection-tasks(?:\/\d+)?$/.test(path))
}
