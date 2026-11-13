import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, reactive } from "vue"
import { ApiRequestError } from "@/types/api"
import { useRollCall } from "../useRollCall"

const mocks = vi.hoisted(() => ({ students: vi.fn(), groups: vi.fn(), apply: vi.fn() }))
vi.mock("@/api/points", () => ({ pointsApi: { listGroups: mocks.groups, applyRule: mocks.apply } }))
vi.mock("@/managers/student", () => ({ studentManager: { list: mocks.students } }))
vi.mock("element-plus", () => ({ ElMessage: { warning: vi.fn() } }))

const context = reactive({ classId: 1, semesterId: 2, status: 1, token: "teacher", canWrite: true })
vi.mock("@/stores/cacheStore", () => ({ useCacheStore: () => ({
    get token() { return context.token },
    getActiveClassId: () => context.classId, getActiveSemesterId: () => context.semesterId,
    getActiveSemesterStatus: () => context.status,
}) }))
vi.mock("@/stores/sessionStore", () => ({ useSessionStore: () => context }))

let activeScope: ReturnType<typeof effectScope>
const studentList = [{ id: 10, name: "小张", available_points: 9 }, { id: 12, name: "小林", available_points: 6 }]
const ruleGroup = { id: 4, name: "课堂", rules: [
    { id: 3, name: "积极发言", points: 2, points_type: 1 },
    { id: 7, name: "提醒", points: 1, points_type: 2 },
] }
function deferred<T>() {
    let resolve!: (result: T) => void
    const promise = new Promise<T>(done => { resolve = done })
    return { promise, resolve }
}

async function settle() {
    await new Promise(resolve => setTimeout(resolve, 0))
    await nextTick()
}
async function start() {
    const roll = activeScope.run(() => useRollCall())!
    await settle()
    return roll
}

beforeEach(() => {
    vi.resetAllMocks()
    Object.assign(context, { classId: 1, semesterId: 2, status: 1, token: "teacher", canWrite: true })
    mocks.students.mockResolvedValue(studentList)
    mocks.groups.mockResolvedValue({ data: { groups: [ruleGroup] } })
    mocks.apply.mockResolvedValue({ data: { student_id: 12, available_points: 8 } })
    vi.spyOn(Math, "random").mockReturnValue(0.75)
    activeScope = effectScope()
})
afterEach(() => { activeScope.stop(); vi.restoreAllMocks() })

describe("点名后直接评分", () => {
    it("只给实际抽中的学生评分，提交时锁定对象，成功后下一位可继续使用刚才的规则", async () => {
        const roll = await start()
        expect(roll.selected.value).toBeNull()
        await roll.applyRule({ id: 3 })
        expect(mocks.groups).not.toHaveBeenCalled()
        expect(mocks.apply).not.toHaveBeenCalled()
        roll.draw()
        await settle()
        expect(roll.selected.value?.name).toBe("小林")
        expect(roll.quickRules.value.map(rule => rule.id)).toEqual([3])

        const request = deferred<{ data: { student_id: number; available_points: number } }>()
        mocks.apply.mockReturnValueOnce(request.promise)
        const first = roll.applyRule({ id: 3 })
        await roll.applyRule({ id: 3 })
        vi.mocked(Math.random).mockReturnValue(0.1)
        roll.draw()
        expect(mocks.apply).toHaveBeenCalledExactlyOnceWith({ class_id: 1, semester_id: 2, student_id: 12, rule_id: 3, count: 1 })
        expect(roll.selected.value?.id).toBe(12)
        request.resolve({ data: { student_id: 12, available_points: 8 } })
        await first
        expect(roll.selected.value?.availablePoints).toBe(8)
        expect(roll.feedback.value?.text).toContain("小林 · 积极发言 +2 分")
        await roll.applyRule({ id: 3 })
        expect(mocks.apply).toHaveBeenCalledTimes(1)

        roll.draw()
        roll.openSelector()
        expect(roll.selected.value?.id).toBe(10)
        await roll.applyRule({ id: 7 }, 3)
        expect(mocks.apply).toHaveBeenLastCalledWith({ class_id: 1, semester_id: 2, student_id: 10, rule_id: 7, count: 3 })
        expect(roll.feedback.value?.text).toContain("−3 分")
        expect(roll.selectorVisible.value).toBe(false)
        expect(roll.quickRules.value[0]?.id).toBe(7)
    })

    it("归档、到期和跨学期切换阻止旧弹窗继续评分", async () => {
        const roll = await start()
        roll.draw()
        await settle()
        roll.openSelector()
        context.status = 2
        await nextTick()
        expect(roll.selectorVisible.value).toBe(false)
        await roll.applyRule({ id: 3 })
        context.status = 1
        context.canWrite = false
        await roll.applyRule({ id: 3 })
        context.canWrite = true
        context.semesterId = 4
        await roll.applyRule({ id: 3 })
        expect(roll.selected.value).toBeNull()
        expect(mocks.apply).not.toHaveBeenCalled()
    })

    it("晚返回的旧班名册、积分结果不能覆盖当前班级", async () => {
        const roll = await start()
        roll.draw()
        await settle()
        const write = deferred<{ data: { available_points: number } }>()
        mocks.apply.mockReturnValueOnce(write.promise)
        const pending = roll.applyRule({ id: 3 })
        const staleRoster = deferred<typeof studentList>()
        mocks.students.mockReturnValueOnce(staleRoster.promise).mockResolvedValueOnce([{ id: 88, name: "新班", available_points: 1 }])
        context.classId = 5
        context.classId = 6
        await settle()
        roll.draw()
        staleRoster.resolve(studentList)
        write.resolve({ data: { available_points: 88 } })
        await pending
        await settle()
        expect(roll.students.value.map(student => student.id)).toEqual([88])
        expect(roll.selected.value?.availablePoints).toBe(1)
        expect(roll.feedback.value).toBeNull()
    })

    it("名单和规则读取失败可以重试，评分结果未知时不能在同一次点名重复发出", async () => {
        mocks.students.mockRejectedValueOnce(new Error("断线"))
        const roll = await start()
        expect(roll.rosterError.value).toBe(true)
        await roll.loadRoster()
        mocks.groups.mockRejectedValueOnce(new Error("断线"))
        roll.draw()
        await settle()
        expect(roll.rulesError.value).toContain("失败")
        roll.openSelector()
        await settle()
        expect(roll.rulesError.value).toBe("")
        await roll.applyRule({ id: 999 })
        await roll.applyRule({ id: 3 }, 0)
        expect(mocks.apply).not.toHaveBeenCalled()
        mocks.apply.mockRejectedValueOnce(new ApiRequestError("拒绝", 200402))
        await roll.applyRule({ id: 3 })
        expect(roll.feedback.value).toBeNull()
        mocks.apply.mockRejectedValueOnce(new TypeError("网络断开"))
        await roll.applyRule({ id: 3 })
        expect(roll.feedback.value?.uncertain).toBe(true)
        roll.openSelector()
        expect(roll.selectorVisible.value).toBe(false)
        await roll.applyRule({ id: 3 })
        expect(mocks.apply).toHaveBeenCalledTimes(2)
    })
})
