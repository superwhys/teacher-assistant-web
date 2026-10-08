import { describe, expect, it } from 'vitest'
import { createRandomGroups } from '../randomGroups'

const students = Array.from({ length: 23 }, (_, index) => ({ id: index + 1, name: `学生${index + 1}` }))

describe('random student groups', () => {
    it('includes every student once and balances the specified number of groups', () => {
        const groups = createRandomGroups(students, 'count', 5, () => 0.25)
        const sizes = groups.map(group => group.students.length)
        expect(groups).toHaveLength(5)
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
        expect(groups.flatMap(group => group.students.map(student => student.id)).sort((a, b) => a - b))
            .toEqual(students.map(student => student.id))
        expect(students.map(student => student.id)).toEqual(Array.from({ length: 23 }, (_, index) => index + 1))
    })

    it('treats group size as an upper limit while keeping groups balanced', () => {
        const groups = createRandomGroups(students, 'size', 6)
        expect(groups).toHaveLength(4)
        expect(groups.map(group => group.students.length)).toEqual([6, 6, 6, 5])
        expect(createRandomGroups(students.slice(0, 10), 'size', 6).map(group => group.students.length))
            .toEqual([5, 5])
    })

    it('handles one student, one group and one student per group without empty groups', () => {
        expect(createRandomGroups(students.slice(0, 1), 'count', 1)[0]?.students).toHaveLength(1)
        expect(createRandomGroups(students, 'count', 1)[0]?.students).toHaveLength(23)
        expect(createRandomGroups(students, 'size', 1).every(group => group.students.length === 1)).toBe(true)
        expect(createRandomGroups(students, 'size', 100)[0]?.students).toHaveLength(23)
    })

    it('produces different memberships from different random draws', () => {
        expect(createRandomGroups(students, 'count', 3, () => 0))
            .not.toEqual(createRandomGroups(students, 'count', 3, () => 0.9))
    })

    it('rejects empty classes, invalid amounts, excess group counts and duplicate students', () => {
        expect(() => createRandomGroups([], 'count', 1)).toThrow('学生')
        for (const amount of [0, -1, 1.5, NaN, Infinity]) {
            expect(() => createRandomGroups(students, 'count', amount)).toThrow('正整数')
        }
        expect(() => createRandomGroups(students, 'count', 24)).toThrow('学生人数')
        expect(() => createRandomGroups([students[0]!, students[0]!], 'count', 1)).toThrow('重复')
        expect(() => createRandomGroups([{ id: 0, name: '无效学生' }], 'count', 1)).toThrow('名单')
    })
})
