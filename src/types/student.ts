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
    // 预留：后端可直接返回积分字段，供积分页一次性渲染（后续由后端补齐）
    available_points?: number
    gender?: ApiGender
    group_id?: number
    id?: number
    name?: string
    total_points?: number
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
 * 创建学生批量请求体
 */
export type CreateStudentBatchReq = {
    class_id?: number
    students?: CreateStudentReq[]
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
    group_id?: number
}

export type GetStudentGroupQuery = {
    group_id: number
}

export type StudentsSortOption = 'default' | 'name-asc' | 'name-desc' | 'points-desc' | 'points-asc'

/**
 * 兼容旧版本地存储结构（stores / 旧组件仍在使用）
 */
export type Gender = 'male' | 'female'

/**
 * 兼容旧版本地存储结构（stores / 旧组件仍在使用）
 */
export type Student = {
    studentName: string
    gender: Gender
}


