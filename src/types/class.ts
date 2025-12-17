export type ClassInfo = {
    /** 班级唯一ID */
    id: string
    /** 班级名称 */
    name: string
    /** 创建时间戳 */
    createdAt: number
}

/**
 * 后端接口返回的班级结构（对应 swagger: dto.Class）
 */
export type ClassDTO = {
    id?: number
    name?: string
    teacher_id?: number
}

/**
 * 创建班级请求体（对应 swagger: dto.CreateClassReq）
 */
export type CreateClassReq = {
    name?: string
}

/**
 * 更新班级请求体（对应 swagger: dto.UpdateClassReq）
 */
export type UpdateClassReq = {
    id?: number
    name?: string
}

/**
 * 班级列表响应 data（对应 swagger: dto.ListClassesResp）
 */
export type ListClassesResp = {
    classes?: ClassDTO[]
}


