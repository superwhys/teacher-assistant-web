import type { GrowthReport, GrowthRule } from '@/types/studentGrowth'

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

export function escapeReportText(value: unknown): string {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]!)
}

/** 报告不依赖网络、脚本或外部字体，可离线打开并通过浏览器打印为 PDF。 */
export function growthReportHtml(report: GrowthReport): string {
    const e = escapeReportText
    const summaryRows = [
        ['奖励记录', report.summary.awarded_count, report.previous_summary.awarded_count],
        ['提醒记录', report.summary.deducted_count, report.previous_summary.deducted_count],
        ['有记录天数', report.summary.recorded_days, report.previous_summary.recorded_days],
    ].map(([label, current, previous]) => `<tr><th>${e(label)}</th><td>${e(current)}</td><td>${e(previous)}</td></tr>`).join('')
    const rules = report.rules.map(rule => `<tr><td>${e(rule.rule_name)}</td><td>${rule.type === 1 ? '奖励' : '提醒'}</td><td>${e(rule.count)}</td><td>${e(rule.previous_count)}</td><td>${rule.type === 1 ? '+' : '-'}${e(Math.abs(rule.points))}</td></tr>`).join('')
    const daily = report.daily.map(day => `<tr><td>${e(day.date)}</td><td>${e(day.awarded_count)}</td><td>${e(day.deducted_count)}</td></tr>`).join('')
    const records = report.records.map(record => `<tr><td>#${e(record.id)}</td><td>${e(record.created_at)}</td><td>${e(record.description)}</td><td>${record.type === 1 ? '奖励' : '提醒'}</td><td>${record.type === 1 ? '+' : '-'}${e(Math.abs(record.amount))}</td></tr>`).join('')
    return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>${e(report.student_name)} · 学生成长报告</title>
<style>body{margin:0;background:#f4f6f3;color:#243d31;font:15px/1.7 system-ui,sans-serif}main{max-width:900px;margin:28px auto;padding:36px;background:white;border-radius:16px}h1{margin:0;font-size:28px}h2{margin-top:30px;font-size:19px}p{white-space:pre-wrap;overflow-wrap:anywhere}.meta,.note{color:#65746b;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}th,td{padding:9px;text-align:left;border-bottom:1px solid #dce4dd;overflow-wrap:anywhere}th{background:#f0f5f0}.message{padding:18px;background:#f0f5f0;border-radius:10px}@media(max-width:600px){main{margin:0;padding:18px;border-radius:0}table{font-size:12px}th,td{padding:6px}}@media print{body{background:white}main{margin:0;padding:0;max-width:none}h2{break-after:avoid}tr,.message{break-inside:avoid}.print-note{display:none}}</style></head>
<body><main><p class="meta">${e(report.class_name)} · ${e(report.semester_name)}</p><h1>${e(report.student_name)}的成长报告</h1><p>${e(report.from)} 至 ${e(report.to)}</p><p class="note">统计仅包含积分规则产生的奖励与提醒记录，不含兑换和导入。记录反映老师的记录情况，不能据此判断学生能力或成绩。</p>
${report.summary.records === 0 ? '<p class="message">本期暂无奖励或提醒记录，不代表学生没有表现或进步。</p>' : ''}
<h2>本期与上期</h2><p class="meta">上期：${e(report.previous_from)} 至 ${e(report.previous_to)}${report.previous_period_complete ? '' : '（数据覆盖不完整，暂不比较）'}</p><table><thead><tr><th>指标</th><th>本期</th><th>上期</th></tr></thead><tbody>${summaryRows}</tbody></table>
<h2>每日记录次数</h2><table><thead><tr><th>日期</th><th>奖励记录</th><th>提醒记录</th></tr></thead><tbody>${daily || '<tr><td colspan="3">暂无记录</td></tr>'}</tbody></table>
<h2>历史规则明细</h2><table><thead><tr><th>记录时规则</th><th>类型</th><th>本期次数</th><th>上期次数</th><th>本期积分</th></tr></thead><tbody>${rules || '<tr><td colspan="5">暂无规则记录</td></tr>'}</tbody></table>
<h2>老师寄语</h2><p class="message">${e(report.teacher_note) || '暂无寄语'}</p>
${report.interpretation ? `<h2>AI 解读</h2><p class="message">${e(report.interpretation)}</p><p class="note">AI 解读仅供参考，请结合课堂实际核对。</p>` : ''}
<h2>原始记录</h2><table><thead><tr><th>记录编号</th><th>时间</th><th>记录内容</th><th>类型</th><th>积分</th></tr></thead><tbody>${records || '<tr><td colspan="5">本期暂无记录</td></tr>'}</tbody></table><p class="meta">生成于 ${e(report.generated_at)}${report.id ? ` · 保存编号 ${e(report.id)}` : ' · 尚未保存'}</p><p class="note print-note">可离线打开此文件，使用浏览器“打印”保存为 PDF。</p></main></body></html>`
}
