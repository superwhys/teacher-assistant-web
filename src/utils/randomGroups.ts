export type RandomGroupingMode = 'count' | 'size'

export interface RandomGroupStudent {
    id: number
    name: string
}

export interface RandomStudentGroup {
    name: string
    students: RandomGroupStudent[]
}

/** 打散全班学生并均分，人数模式的输入为每组人数上限。 */
export function createRandomGroups(
    students: readonly RandomGroupStudent[],
    mode: RandomGroupingMode,
    amount: number,
    random: () => number = Math.random
): RandomStudentGroup[] {
    if (!students.length) throw new Error('请先添加学生')
    if (!Number.isSafeInteger(amount) || amount < 1) throw new Error('请输入有效的正整数')
    if (mode === 'count' && amount > students.length) throw new Error('组数不能超过学生人数')
    const ids = new Set<number>()
    for (const student of students) {
        if (!Number.isSafeInteger(student.id) || student.id < 1) throw new Error('学生名单无效，请刷新后重试')
        if (ids.has(student.id)) throw new Error('学生名单存在重复，请刷新后重试')
        ids.add(student.id)
    }

    const shuffled = [...students]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const target = Math.floor(random() * (index + 1))
        const student = shuffled[index]!
        shuffled[index] = shuffled[target]!
        shuffled[target] = student
    }

    const count = mode === 'count' ? amount : Math.ceil(students.length / amount)
    const baseSize = Math.floor(students.length / count)
    const remainder = students.length % count
    let offset = 0
    return Array.from({ length: count }, (_, index) => {
        const size = baseSize + (index < remainder ? 1 : 0)
        const members = shuffled.slice(offset, offset + size)
        offset += size
        return { name: `第 ${index + 1} 组`, students: members }
    })
}
