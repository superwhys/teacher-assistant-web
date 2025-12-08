/**
 * 日期时间工具函数：提供中文日期与 HH:mm 时间格式化
 */

export function formatTimeHHmm(date: Date): string {
    const twoDigits = (n: number) => n.toString().padStart(2, '0')
    const hours = twoDigits(date.getHours())
    const minutes = twoDigits(date.getMinutes())
    return `${hours}:${minutes}`
}

export function formatChineseDateWithWeek(date: Date): string {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const week = weekNames[date.getDay()]
    return `${year}年${month}月${day}日${week}`
}

export function formatChineseDateTime(date: Date): string {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const twoDigits = (n: number) => n.toString().padStart(2, '0')
    const hours = twoDigits(date.getHours())
    const minutes = twoDigits(date.getMinutes())
    const seconds = twoDigits(date.getSeconds())
    return `${year}-${twoDigits(month)}-${twoDigits(day)} ${hours}:${minutes}:${seconds}`
}

export function getStartOfWeek(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

export function getStartOfMonth(date: Date): Date {
    const d = new Date(date)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
}
