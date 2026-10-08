import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LotteryRecordDTO } from '@/types/lotteryApi'
import { lotteryManager } from '../lottery'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/api/api', () => mocks)

function dto(studentId = 0): LotteryRecordDTO {
    return {
        id: 21, pool_id: 4, client_id: 'record-1', prize_name: '贴纸', drawn_at: 1780000000000,
        student_id: studentId, student_name: studentId ? '小明' : '', student_class_id: 23,
    }
}

beforeEach(() => vi.resetAllMocks())

describe('lottery record class contract', () => {
    it('carries the class in every request and keeps it from creation through binding and unbinding', async () => {
        mocks.post.mockResolvedValue({ data: { records: [dto()] } })
        const created = await lotteryManager.createRecords('4', 23, [{
            id: 'record-1', prizeId: '贴纸', prizeName: '贴纸', drawnAt: 1780000000000, studentClassId: 23,
        }])
        expect(mocks.post).toHaveBeenCalledWith('/lottery/records/create', {
            pool_id: 4, class_id: 23,
            records: [{ client_id: 'record-1', prize_name: '贴纸', drawn_at: 1780000000000, student_id: undefined }],
        })
        expect(created[0]?.studentClassId).toBe(23)
        mocks.put.mockResolvedValueOnce({ data: dto(9) }).mockResolvedValueOnce({ data: dto() })
        expect((await lotteryManager.updateRecordStudent(21, 23, 9)).studentClassId).toBe(23)
        const unbound = await lotteryManager.updateRecordStudent(21, 23, null)
        expect(unbound.studentId).toBeUndefined()
        expect(unbound.studentClassId).toBe(23)
        expect(mocks.put).toHaveBeenLastCalledWith('/lottery/records/21/student', { class_id: 23, student_id: 0 })
        mocks.get.mockResolvedValue({ data: { records: [dto()] } })
        expect((await lotteryManager.listRecords('4', 23))[0]?.studentClassId).toBe(23)
        expect(mocks.get).toHaveBeenCalledWith('/lottery/records/list', { pool_id: 4, class_id: 23 })
        await lotteryManager.clearRecords('4', 23)
        expect(mocks.post).toHaveBeenLastCalledWith('/lottery/records/clear', { pool_id: 4, class_id: 23 })
    })

    it('rejects a mismatched class response instead of rendering another class record', async () => {
        mocks.get.mockResolvedValue({ data: { records: [{ ...dto(), student_class_id: 24 }] } })
        await expect(lotteryManager.listRecords('4', 23)).rejects.toThrow('班级不匹配')
        mocks.put.mockResolvedValue({ data: { ...dto(), student_class_id: 0 } })
        await expect(lotteryManager.updateRecordStudent(21, 23, null)).rejects.toThrow('班级不匹配')
    })
})
