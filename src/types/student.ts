export type Gender = 'male' | 'female'

export type Student = {
    /** 姓名 */
    studentName: string
    /** 性别 */
    gender: Gender
}

/**
 * 后端接口性别枚举
 * 0: unknown, 1: male, 2: female
 */
export type ApiGender = 0 | 1 | 2

/**
 * 后端接口返回的学生结构
 */
export type StudentDTO = {
    class_id?: number
    gender?: ApiGender
    group_id?: number
    id?: number
    name?: string
}

/**
 * 创建学生请求体
 */
export type CreateStudentReq = {
    class_id?: number
    gender?: ApiGender
    name?: string
}

/**
 * 更新学生请求体
 */
export type UpdateStudentReq = {
    gender?: ApiGender
    id: number
    name?: string
}

/**
 * 学生列表响应 data
 */
export type ListStudentsResp = {
    students?: StudentDTO[]
}

/**
 * 创建学生组请求体
 */
export type CreateStudentGroupReq = {
    class_id: number
    name: string
}

/**
 * 学生组结构
 */
export type StudentGroupDTO = {
    class_id?: number
    id?: number
    name?: string
    students?: StudentDTO[]
    teacher_id?: number
}

/**
 * 学生组列表响应 data
 */
export type ListStudentGroupsResp = {
    groups?: StudentGroupDTO[]
}

/**
 * 获取学生组信息响应 data
 */
export type StudentGroupInfoResp = {
    group?: StudentGroupDTO
    students?: StudentDTO[]
}

/**
 * 将多个学生加入某个组请求体
 */
export type AddStudentsToGroupReq = {
    group_id: number
    student_ids: number[]
}

/**
 * 将多个学生移除某个组请求体
 */
export type RemoveStudentsFromGroupReq = {
    group_id: number
    student_ids: number[]
}

export type ListStudentsQuery = {
    class_id: number
}

export type GetStudentGroupQuery = {
    group_id: number
}


