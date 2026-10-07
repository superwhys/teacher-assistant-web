import { describe, expect, it } from 'vitest'
import { normalizeUserProfile } from '../userProfile'

describe('user profile mini-program binding', () => {
    it.each([true, false])('preserves a boolean wechat_bound value of %s', (wechatBound) => {
        const profile = normalizeUserProfile({
            id: 17, name: '老师', email: 'teacher@example.com', wechat_bound: wechatBound,
        })

        expect(profile.wechatBound).toBe(wechatBound)
        expect(profile.id).toBe('17')
        expect(profile.name).toBe('老师')
        expect(profile.email).toBe('teacher@example.com')
    })

    it('leaves binding unknown when the API omits wechat_bound', () => {
        expect(normalizeUserProfile({ id: 17 }).wechatBound).toBeUndefined()
    })

    it.each([
        { value: undefined }, { value: null }, { value: 'true' }, { value: 'false' },
        { value: 0 }, { value: 1 }, { value: {} }, { value: [] },
    ])('leaves binding unknown for a non-boolean value $value', ({ value }) => {
        expect(normalizeUserProfile({ id: 17, wechat_bound: value }).wechatBound).toBeUndefined()
    })

    it.each([{ raw: null }, { raw: undefined }, { raw: '' }])('handles an absent profile $raw', ({ raw }) => {
        expect(normalizeUserProfile(raw).wechatBound).toBeUndefined()
    })
})
