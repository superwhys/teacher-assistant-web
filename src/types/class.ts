export type ClassInfo = {
    /** 班级唯一ID */
    id: string
    /** 班级名称 */
    name: string
    /** 创建时间戳 */
    createdAt: number
}

/**
 * 后端接口返回的班级结构
 */
export type ClassDTO = {
    id?: number
    name?: string
    semester_id?: number
    semester_name?: string
    teacher_id?: number
}

/**
 * 创建班级请求体
 */
export type CreateClassReq = {
    name?: string
    semester_name?: string
}

/**
 * 更新班级请求体
 */
export type UpdateClassReq = {
    id?: number
    name?: string
}

/**
 * 切换到下一学期请求体
 */
export type NextSemesterReq = {
    semester_name?: string
    is_clear_points?: boolean
}

/**
 * 班级列表响应 data
 */
export type ListClassesResp = {
    classes?: ClassDTO[]
}


