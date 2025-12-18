import { studentApi } from "@/api/student"
import type { ApiGender, CreateStudentReq, StudentDTO, StudentGroupDTO } from "@/types/student"

export const studentManager = {
    // delete 删除学生
    async delete(studentId: number): Promise<void> {
        await studentApi.delete(studentId)
    },
    // create 创建学生
    async create(classId: number,name: string, gender: ApiGender): Promise<void> {
        await studentApi.create({ 
            class_id: classId, 
            name: name, 
            gender: gender,
         })
    },
    // update 更新学生
    async update(studentId: number, name: string, gender: ApiGender): Promise<void> {
        await studentApi.update(studentId, {
            id: studentId,
            name: name,
            gender: gender,
        })
    },
    // createBatch 创建学生批量
    async createBatch(classId: number, students: CreateStudentReq[]): Promise<void> {
        await studentApi.createBatch({ class_id: classId, students: students })
    },
    // list 获取学生列表
    async list(classId: number, groupId?: number): Promise<StudentDTO[]> {
        const resp = await studentApi.list({ class_id: classId, group_id: groupId })
        return resp.data?.students ?? []
    },
    // listGroups 获取学生分组列表
    async listGroups(classId: number): Promise<StudentGroupDTO[]> {
        const resp = await studentApi.listGroups(classId)
        return resp.data?.groups ?? []
    },
    // listungrouped 获取未分组学生列表
    async listUngrouped(classId: number): Promise<StudentDTO[]> {
        const resp = await studentApi.listUngrouped({ class_id: classId })
        return resp.data?.students ?? []
    },
    // createGroup 创建学生分组
    async createGroup(classId: number, name: string): Promise<StudentGroupDTO> {
        const resp = await studentApi.createGroup({ class_id: classId, name: name })
        return resp.data
    },
    // deleteGroup 删除学生分组
    async deleteGroup(groupId: number): Promise<void> {
        await studentApi.deleteGroup(groupId)
    },
    // addStudentsToGroup 将学生加入学生分组
    async addStudentsToGroup(groupId: number, studentIds: number[]): Promise<void> {
        await studentApi.addStudentsToGroup({ group_id: groupId, student_ids: studentIds })
    },
    // removeStudentsFromGroup 从学生分组中移除学生
    async removeStudentsFromGroup(groupId: number, studentIds: number[]): Promise<void> {
        await studentApi.removeStudentsFromGroup({ group_id: groupId, student_ids: studentIds })
    },
}