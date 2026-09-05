import { describe, expect, it } from 'vitest'
import { getTeachersDayWelcomeStorageKey, isTeachersDay } from '../teachersDayWelcome'

describe('teachers day welcome', () => {
    it('only matches September 10 in the browser local timezone', () => {
        expect(isTeachersDay(new Date(2026, 8, 10, 9))).toBe(true)
        expect(isTeachersDay(new Date(2026, 8, 9, 23, 59))).toBe(false)
        expect(isTeachersDay(new Date(2026, 8, 11))).toBe(false)
        expect(isTeachersDay(new Date('invalid'))).toBe(false)
    })

    it('separates the dismissed state by year and user', () => {
        expect(getTeachersDayWelcomeStorageKey(new Date(2026, 8, 10), 12))
            .toBe('teacher-assistant-teachers-day-welcome-seen:2026:12')
        expect(getTeachersDayWelcomeStorageKey(new Date(2027, 8, 10), ' teacher-a '))
            .toBe('teacher-assistant-teachers-day-welcome-seen:2027:teacher-a')
        expect(getTeachersDayWelcomeStorageKey(new Date(2026, 8, 10), null))
            .toBe('teacher-assistant-teachers-day-welcome-seen:2026:default')
    })
})
