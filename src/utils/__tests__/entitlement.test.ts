import { describe, expect, it } from 'vitest'
import type { UserEntitlement, UserProfile } from '@/types/user'
import { allowsEntitlementRequest, effectiveEntitlementState, normalizeEntitlement } from '../entitlement'
import { computeTrialFromProfile, normalizeUserProfile } from '../userProfile'

const now = Date.parse('2026-11-02T00:00:00Z')
function profile(state: UserEntitlement['state'], deadline: string | null = null): UserProfile {
    return { id: 'teacher', name: 'Teacher', email: '', roleId: 7, roleCode: 'common',
        entitlement: { state, permanent: state === 'permanent', trial_started_at: null, trial_expires_at: deadline, paid_expires_at: deadline } }
}

describe('independent commercial access', () => {
    it.each(['not_started', 'trial_expired', 'paid_expired'] as const)('allows only the supported Agent transports when commercial state is %s', state => {
        const teacher = profile(state)
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
        const teacher = profile('not_started')
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
