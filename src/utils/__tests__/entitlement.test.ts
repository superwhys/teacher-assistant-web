import { describe, expect, it } from 'vitest'
import type { UserEntitlement, UserProfile } from '@/types/user'
import { allowsEntitlementRequest, effectiveEntitlementState, entitlementStatusTitle, normalizeEntitlement } from '../entitlement'
import { computeTrialFromProfile, normalizeUserProfile } from '../userProfile'

const now = Date.parse('2026-11-02T00:00:00Z')
function profile(state: UserEntitlement['state'], deadline: string | null = null): UserProfile {
    return { id: 'teacher', name: 'Teacher', email: '', roleId: 7, roleCode: 'common',
        entitlement: { state, permanent: state === 'permanent', trial_started_at: null, trial_expires_at: deadline, paid_expires_at: deadline } }
}

const growthRequests = [
    ['GET', '/student/1/growth-report?semester_id=7'],
    ['GET', '/student/1/growth-reports'], ['GET', '/student/1/growth-reports/42'],
    ['POST', '/student/1/growth-reports'],
    ['GET', '/student/1/growth-report/interpretation?semester_id=7&snapshot_hash=hash'],
    ['GET', '/student/1/growth-report/interpretation/task-id'],
    ['POST', '/student/1/growth-report/interpretation'],
]

describe('independent commercial access', () => {
    it.each(['common', 'trial', 'custom', 'pro'])('rejects growth report reads and writes for inactive or non-Pro %s accounts', roleCode => {
        const states = roleCode === 'pro' ? ['not_started', 'trial_active', 'trial_expired', 'paid_expired'] as const
            : ['not_started', 'trial_active', 'trial_expired', 'paid_active', 'paid_expired', 'permanent'] as const
        for (const state of states) {
            for (const [method, path] of growthRequests) {
                expect(allowsEntitlementRequest({ ...profile(state, '2026-12-01T00:00:00Z'), roleCode }, method!, path!, now)).toBe(false)
            }
        }
    })
    it.each(['pro', 'admin'])('allows every growth report endpoint for an active %s account', roleCode => {
        for (const state of ['paid_active', 'permanent'] as const) {
            for (const [method, path] of growthRequests) {
                expect(allowsEntitlementRequest({ ...profile(state, '2026-12-01T00:00:00Z'), roleCode }, method!, path!, now)).toBe(true)
            }
        }
    })
    it('rejects a Pro report request at its exact subscription deadline and when account state is missing', () => {
        const teacher = { ...profile('paid_active', '2026-11-02T00:00:00Z'), roleCode: 'pro' }
        expect(allowsEntitlementRequest(teacher, 'GET', '/student/1/growth-report', now - 1)).toBe(true)
        expect(allowsEntitlementRequest(teacher, 'GET', '/student/1/growth-report', now)).toBe(false)
        expect(allowsEntitlementRequest({ ...teacher, entitlement: null }, 'GET', '/student/1/growth-report', now)).toBe(false)
        expect(allowsEntitlementRequest(null, 'GET', '/student/1/growth-reports', now)).toBe(false)
    })
    it('names only the actual paid edition and preserves other entitlement states', () => {
        expect(entitlementStatusTitle('paid_active', 'common')).toBe('普通版 · 付费权益有效')
        expect(entitlementStatusTitle('paid_expired', 'pro')).toBe('Pro 版 · 付费权益已到期 · 仅可查看')
        expect(entitlementStatusTitle('paid_active', 'custom')).toBe('付费权益有效')
        expect(entitlementStatusTitle('trial_active', 'pro')).toBe('免费试用中')
        expect(entitlementStatusTitle('trial_expired', 'common')).toBe('试用已到期 · 仅可查看')
        expect(entitlementStatusTitle('permanent', 'admin')).toBe('长期使用权益')
        expect(entitlementStatusTitle('not_started', 'common')).toBe('试用尚未开启')
        expect(entitlementStatusTitle('unavailable', 'pro')).toBe('暂时无法获取使用权益')
    })
    it.each(['not_started', 'trial_expired', 'paid_expired', 'unavailable'] as const)('allows updating the current profile name when state is %s', state => {
        const teacher = state === 'unavailable' ? null : profile(state)
        expect(allowsEntitlementRequest(teacher, 'PUT', '/user/profile', now)).toBe(true)
        expect(allowsEntitlementRequest(teacher, 'POST', '/user/profile', now)).toBe(false)
        expect(allowsEntitlementRequest(teacher, 'PUT', '/user/profile/other', now)).toBe(false)
        expect(allowsEntitlementRequest(teacher, 'PUT', '/user/other', now)).toBe(false)
    })
    it.each(['not_started', 'trial_expired', 'paid_expired'] as const)('permits only supported subscription requests when commercial state is %s', state => {
        const teacher = profile(state)
        expect(allowsEntitlementRequest(teacher, 'GET', '/subscription/plans', now)).toBe(true)
        expect(allowsEntitlementRequest(teacher, 'GET', '/subscription/orders?page=2&page_size=20', now)).toBe(true)
        expect(allowsEntitlementRequest(teacher, 'GET', '/subscription/orders/own-order', now)).toBe(true)
        expect(allowsEntitlementRequest(teacher, 'POST', '/subscription/orders/own-order/cancel', now)).toBe(true)
        expect(allowsEntitlementRequest(teacher, 'DELETE', '/subscription/orders/own-order', now)).toBe(false)
        expect(allowsEntitlementRequest(teacher, 'GET', '/subscription/orders/own-order/cancel', now)).toBe(false)
        expect(allowsEntitlementRequest(teacher, 'POST', '/subscription/orders/own-order/cancel/future', now)).toBe(false)
        expect(allowsEntitlementRequest(teacher, 'POST', '/subscription/orders/own-order', now)).toBe(false)
        expect(allowsEntitlementRequest(teacher, 'GET', '/subscription/orders/own-order/confirm', now)).toBe(false)
        expect(allowsEntitlementRequest(teacher, 'POST', '/subscription/purchase-link', now)).toBe(true)
        expect(allowsEntitlementRequest(teacher, 'POST', '/subscription/future-write', now)).toBe(false)
        expect(allowsEntitlementRequest(teacher, 'PUT', '/subscription/purchase-link', now)).toBe(false)
    })
    it.each(['not_started', 'trial_expired', 'paid_expired'] as const)('allows only the supported Agent transports when commercial state is %s', state => {
        const teacher = { ...profile(state), roleCode: 'pro' }
        for (const [method, path] of [
            ['POST', '/agent/conversations'], ['GET', '/agent/conversations/conversation'],
            ['GET', '/agent/conversations?class_id=7&semester_id=9&page=1'],
            ['POST', '/agent/conversations/conversation/runs'], ['GET', '/agent/runs/run/events?after_event_id=4'],
            ['POST', '/agent/runs/run/cancel'], ['POST', '/agent/actions/action/decision'],
        ]) {
            expect(allowsEntitlementRequest(teacher, method!, path!, now)).toBe(true)
        }
        for (const [method, path] of [
            ['POST', '/agent/future-write'], ['POST', '/agent/conversations/conversation/delete'],
            ['GET', '/agent/actions/action'], ['GET', '/agent/runs/run/events/export'],
            ['DELETE', '/agent/conversations/conversation'], ['PUT', '/agent/actions/action/decision'],
            ['POST', '/agent/runs/run/events'], ['POST', '/points/rule/apply'],
        ]) {
            expect(allowsEntitlementRequest(teacher, method!, path!, now)).toBe(false)
        }
    })
    it('uses the server deadline and never invents seven days from registration or a role', () => {
        const teacher = normalizeUserProfile({ id: 'teacher', role_id: 7, created_at: '2020-01-01T00:00:00Z', entitlement: profile('trial_active', '2026-11-16T00:00:00Z').entitlement })
        expect(computeTrialFromProfile(teacher)).toEqual({ trial: true, expiresAt: Date.parse('2026-11-16T00:00:00Z') / 1000 })
        expect(computeTrialFromProfile({ id: 'old-cache', name: '', email: '', createdAt: 1 })).toEqual({ trial: false, expiresAt: null })
        expect(effectiveEntitlementState({ ...teacher, entitlement: null }, now)).toBe('unavailable')
    })

    it.each([null, undefined, {}, { state: 'unknown', permanent: false }, { state: 'permanent', permanent: 'true' },
        { ...profile('trial_active').entitlement, trial_expires_at: 'invalid' },
    ])('does not grant malformed commercial state %#', input => {
        expect(normalizeEntitlement(input)).toBeNull()
    })

    it('treats the exact deadline as expired and keeps authoritative expiry even if the client clock is behind', () => {
        const teacher = profile('trial_active', '2026-11-02T00:00:00Z')
        expect(effectiveEntitlementState(teacher, now - 1)).toBe('trial_active')
        expect(effectiveEntitlementState(teacher, now)).toBe('trial_expired')
        expect(effectiveEntitlementState(profile('trial_expired', '2026-11-16T00:00:00Z'), now)).toBe('trial_expired')
    })

    it('allows only preparation operations before activation, including member maintenance but not imports', () => {
        const teacher = { ...profile('not_started'), roleCode: 'trial' }
        for (const path of ['/class/create', '/student/create', '/student/group/create', '/student/group/add_students', '/student/group/remove_students']) {
            expect(allowsEntitlementRequest(teacher, 'POST', path, now)).toBe(true)
        }
        for (const path of ['/student/create.batch', '/student/group/random/apply', '/points/rule/apply', '/points/rule/record/export/preview']) {
            expect(allowsEntitlementRequest(teacher, 'POST', path, now)).toBe(false)
        }
        expect(allowsEntitlementRequest(teacher, 'PUT', '/student/1', now)).toBe(false)
        expect(allowsEntitlementRequest(teacher, 'GET', '/dashboard/statistics', now)).toBe(false)
        expect(allowsEntitlementRequest(teacher, 'GET', '/class/1/semester/list', now)).toBe(true)
    })

    it('allows reads and authentication at expiry while rejecting all writes and export previews', () => {
        const teacher = profile('trial_expired', '2026-11-01T00:00:00Z')
        expect(allowsEntitlementRequest(teacher, 'GET', '/points/ranking/class?class_id=1', now)).toBe(true)
        expect(allowsEntitlementRequest(teacher, 'POST', '/auth/logout', now)).toBe(true)
        expect(allowsEntitlementRequest(teacher, 'POST', '/auth/wechat/bind-email', now)).toBe(true)
        for (const path of ['/student/create', '/points/rule/record/export', '/points/rule/record/export/preview']) {
            expect(allowsEntitlementRequest(teacher, 'POST', path, now)).toBe(false)
        }
        expect(allowsEntitlementRequest(teacher, 'GET', '/future/export', now)).toBe(false)
    })

    it('requires a real entitlement for common and pro roles, with a separate administrator exception', () => {
        for (const roleCode of ['common', 'pro', 'trial']) {
            expect(allowsEntitlementRequest({ ...profile('trial_expired'), roleCode }, 'POST', '/points/rule/apply', now)).toBe(false)
        }
        expect(allowsEntitlementRequest({ ...profile('not_started'), roleCode: 'admin' }, 'PUT', '/admin/user/1/entitlement', now)).toBe(true)
    })
})
