export type PointsSign = 'plus' | 'minus'

export type PointsGroup = {
    /** 分组唯一ID */
    id: string
    /** 分组名称 */
    name: string
    /** 显示图标，可用 emoji 文本 */
    icon?: string
}

export type PointsItem = {
    /** 项唯一ID */
    id: string
    /** 所属分组ID */
    groupId: string
    /** 名称，例如：作业完成 */
    name: string
    /** 分值绝对值 */
    value: number
    /** 方向：加分或扣分 */
    sign: PointsSign
}


