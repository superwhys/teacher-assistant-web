import type { GrowthRule } from '@/types/studentGrowth'

export interface GrowthPeriod { from: string; to: string }
const DAY = 86400000

export function shanghaiToday(now = new Date()): string {
    return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10)
}

export function growthSemesterDate(value?: string): string {
    if (!value || value.startsWith('0001-')) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? shanghaiToday(date) : ''
}

export function previousGrowthPeriod(preset: 'week' | 'month', now = new Date()): GrowthPeriod {
    const today = new Date(`${shanghaiToday(now)}T00:00:00Z`)
    if (preset === 'month') {
        return {
            from: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)).toISOString().slice(0, 10),
            to: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)).toISOString().slice(0, 10),
        }
    }
    const monday = today.getTime() - ((today.getUTCDay() + 6) % 7) * DAY
    return {
        from: new Date(monday - 7 * DAY).toISOString().slice(0, 10),
        to: new Date(monday - DAY).toISOString().slice(0, 10),
    }
}

export function growthPeriodError(period: GrowthPeriod, now = new Date()): string {
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
        && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
        && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
    if (!validDate(period.from) || !validDate(period.to)) return '请选择有效的起止日期'
    const days = (Date.parse(period.to) - Date.parse(period.from)) / DAY + 1
    if (days < 1) return '结束日期不能早于开始日期'
    if (days > 93) return '报告周期最多为 93 天'
    if (period.to > shanghaiToday(now)) return '结束日期不能晚于今天'
    return ''
}

export function constrainGrowthPeriod(period: GrowthPeriod, start: string, end: string, fallbackDays: number): GrowthPeriod {
    const from = start && period.from < start ? start : period.from
    const to = period.to > end ? end : period.to
    if (from <= to) return { from, to }
    const fallbackFrom = new Date(Date.parse(`${end}T00:00:00Z`) - (fallbackDays - 1) * DAY).toISOString().slice(0, 10)
    return { from: start && fallbackFrom < start ? start : fallbackFrom, to: end }
}

export function growthComparison(current: number, previous: number, complete = true): string {
    if (!complete) return '上期覆盖不完整，暂不比较'
    if (previous === 0) return current === 0 ? '两期均无记录' : `新增 ${current} 次`
    const delta = current - previous
    return delta === 0 ? '与上期相同' : `${delta > 0 ? '比上期多' : '比上期少'} ${Math.abs(delta)} 次`
}

export function growthRuleKey(rule: Pick<GrowthRule, 'rule_id' | 'rule_name' | 'type'>): string {
    return JSON.stringify([rule.rule_id, rule.rule_name, rule.type])
}
