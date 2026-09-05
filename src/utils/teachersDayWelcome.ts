const TEACHERS_DAY_MONTH_INDEX = 8
const TEACHERS_DAY_DATE = 10
const TEACHERS_DAY_STORAGE_KEY_PREFIX = 'teacher-assistant-teachers-day-welcome-seen'

/** 判断给定本地日期是否为中国教师节（9 月 10 日）。 */
export function isTeachersDay(date: Date): boolean {
    if (Number.isNaN(date.getTime())) return false
    return date.getMonth() === TEACHERS_DAY_MONTH_INDEX && date.getDate() === TEACHERS_DAY_DATE
}

/** 返回按年份和用户隔离的教师节欢迎弹窗本地标记。 */
export function getTeachersDayWelcomeStorageKey(
    date: Date,
    userId: string | number | null | undefined,
): string {
    const normalizedUserId = String(userId ?? '').trim() || 'default'
    return `${TEACHERS_DAY_STORAGE_KEY_PREFIX}:${date.getFullYear()}:${normalizedUserId}`
}
