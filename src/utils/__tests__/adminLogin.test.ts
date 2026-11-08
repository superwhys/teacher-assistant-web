import { describe, expect, it } from 'vitest'
import { buildTeacherAppLoginUrl } from '../adminLogin'

describe('administrator teacher login URL', () => {
    it('opens the current app under its deployment path with an isolated tab session', () => {
        const url = new URL(buildTeacherAppLoginUrl('teacher+token/with=symbols', 'https://school.example.com', '/teacher/'))

        expect(url.origin).toBe('https://school.example.com')
        expect(url.pathname).toBe('/teacher/')
        expect(url.searchParams.get('token')).toBe('teacher+token/with=symbols')
        expect(url.searchParams.get('session')).toBe('tab')
    })

    it('keeps the current origin even when assets use an absolute base URL', () => {
        const url = new URL(buildTeacherAppLoginUrl('teacher-token', 'http://localhost:5173', 'https://assets.example.com/teacher/'))

        expect(url.origin).toBe('http://localhost:5173')
        expect(url.pathname).toBe('/teacher/')
    })
})
