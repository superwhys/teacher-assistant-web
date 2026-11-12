import type { Content, ContentTable, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { GrowthReport } from '@/types/studentGrowth'

const dateTime = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', dateStyle: 'short', timeStyle: 'short',
})
const formatTime = (value: string) => Number.isFinite(Date.parse(value)) ? dateTime.format(new Date(value)) : value

function section(text: string): Content {
    return { text, style: 'section', headlineLevel: 1 }
}

function table(headers: string[], rows: string[][], widths: (number | '*')[]): ContentTable {
    return {
        table: {
            headerRows: 1,
            keepWithHeaderRows: 1,
            widths,
            body: [headers.map(text => ({ text, fillColor: '#eaf2ed', color: '#234333' })), ...rows],
        },
        layout: 'lightHorizontalLines',
        fontSize: 9,
        margin: [0, 4, 0, 8],
    }
}

/** 只从报告统计和当前解读构建 PDF，旧版寄语等额外字段不进入文档。 */
export function growthReportPdfDefinition(report: GrowthReport): TDocumentDefinitions {
    const content: Content[] = [
        { text: `${report.class_name} · ${report.semester_name}`, style: 'caption' },
        { text: `${report.student_name}的成长报告`, style: 'title' },
        { text: `${report.from} 至 ${report.to}`, margin: [0, 4, 0, 10] },
        {
            text: `统计生成于 ${formatTime(report.generated_at)} · ${report.id ? `保存编号 ${report.id}` : '尚未保存'}`,
            style: 'caption',
        },
        {
            text: '统计仅包含积分规则产生的奖励与提醒记录，不含兑换和导入。记录反映老师的记录情况，不能据此判断学生能力或成绩。',
            style: 'caption', margin: [0, 8, 0, 4],
        },
    ]
    if (report.summary.records === 0) content.push({
        text: '本期暂无奖励或提醒记录，不代表学生没有表现或进步。', margin: [0, 8, 0, 0],
    })
    content.push(
        section('本期与上期'),
        {
            text: `上期：${report.previous_from} 至 ${report.previous_to}${report.previous_period_complete ? '' : '（数据覆盖不完整，暂不比较）'}`,
            style: 'caption',
        },
        table(['指标', '本期', '上期'], [
            ['奖励记录', `${report.summary.awarded_count}`, `${report.previous_summary.awarded_count}`],
            ['提醒记录', `${report.summary.deducted_count}`, `${report.previous_summary.deducted_count}`],
            ['有记录天数', `${report.summary.recorded_days}`, `${report.previous_summary.recorded_days}`],
        ], ['*', 100, 100]),
    )
    if (report.interpretation.trim()) content.push(
        section('AI 解读'),
        { text: report.interpretation, lineHeight: 1.2 },
        { text: 'AI 解读仅供参考，请老师结合课堂实际核对。', style: 'caption', margin: [0, 6, 0, 0] },
    )
    content.push(
        section('每日记录次数'),
        report.daily.length ? table(['日期', '奖励记录', '提醒记录'], report.daily.map(day => [
            day.date, `${day.awarded_count}`, `${day.deducted_count}`,
        ]), ['*', 100, 100]) : { text: '暂无记录', style: 'caption' },
        section('历史规则明细'),
        report.rules.length ? table(['记录时规则', '类型', '本期次数', '上期次数', '本期积分'], report.rules.map(rule => [
            rule.rule_name, rule.type === 1 ? '奖励' : '提醒', `${rule.count}`, `${rule.previous_count}`,
            `${rule.type === 1 ? '+' : '-'}${Math.abs(rule.points)}`,
        ]), ['*', 42, 60, 60, 60]) : { text: '暂无规则记录', style: 'caption' },
        section('原始记录'),
        report.records.length ? table(['编号', '时间', '记录内容', '类型', '积分'], report.records.map(record => [
            `#${record.id}`, formatTime(record.created_at), record.description,
            record.type === 1 ? '奖励' : '提醒', `${record.type === 1 ? '+' : '-'}${Math.abs(record.amount)}`,
        ]), [42, 84, '*', 32, 36]) : { text: '本期暂无记录', style: 'caption' },
    )
    return {
        info: { title: `${report.student_name}的成长报告`, creator: 'Teacher Assistant' },
        pageSize: 'A4',
        pageMargins: [36, 40, 36, 40],
        defaultStyle: { font: 'NotoSansSC', fontSize: 10, lineHeight: 1.15, color: '#243d31' },
        styles: {
            title: { fontSize: 24, margin: [0, 6, 0, 0] },
            section: { fontSize: 14, margin: [0, 12, 0, 6], color: '#234333' },
            caption: { fontSize: 8.5, color: '#65746b', lineHeight: 1.25 },
        },
        footer: (page, pages) => ({ text: `${page} / ${pages}`, alignment: 'center', style: 'caption', margin: [0, 12, 0, 0] }),
        pageBreakBefore: (node, container) => node.headlineLevel === 1 && container.getFollowingNodesOnPage().length === 0,
        content,
    }
}

/** 导出时才加载排版库和本站中文字体，报告内容始终在浏览器本地处理。 */
export async function downloadGrowthReportPdf(report: GrowthReport, options: {
    signal: AbortSignal
    canDownload: () => boolean
}): Promise<void> {
    const assertActive = () => {
        if (options.signal.aborted || !options.canDownload()) throw new DOMException('Export canceled', 'AbortError')
    }
    assertActive()
    const { default: pdfMake } = await import('pdfmake/build/pdfmake')
    assertActive()
    const font = new URL(`${import.meta.env.BASE_URL}fonts/NotoSansSC-Regular.ttf`, window.location.href).href
    pdfMake.addFonts({ NotoSansSC: { normal: font, bold: font, italics: font, bolditalics: font } })
    const filename = `${report.student_name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')}_成长报告_${report.from}_${report.to}.pdf`
    const blob = await pdfMake.createPdf(growthReportPdfDefinition(report)).getBlob()
    assertActive()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    try {
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
    } finally {
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
}
