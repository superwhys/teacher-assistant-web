import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Content, ContentTable } from 'pdfmake/interfaces'
import { downloadGrowthReportPdf, growthReportPdfDefinition } from '../studentGrowthPdf'
import { growthReportFixture } from './growthReportFixture'

const engine = vi.hoisted(() => ({ getBlob: vi.fn(), addFonts: vi.fn(), createPdf: vi.fn() }))
vi.mock('pdfmake/build/pdfmake', () => ({ default: engine }))

describe('growth report PDF content', () => {
    it('uses the current interpretation and never includes deprecated teacher notes', () => {
        const report = { ...growthReportFixture({ interpretation: '老师核对后的解读\n补充具体观察。' }), teacher_note: '废弃的历史寄语' }
        const definition = growthReportPdfDefinition(report)
        const content = JSON.stringify(definition.content)
        expect(content).toContain('老师核对后的解读\\n补充具体观察。')
        expect(content).not.toContain('废弃的历史寄语')
        expect(content).not.toContain('老师寄语')
        expect(content).toContain('尚未保存')
    })

    it('keeps all long-report records in tables with repeating headers', () => {
        const report = growthReportFixture()
        report.records = Array.from({ length: 250 }, (_, index) => ({ ...report.records[0]!, id: index + 1, description: `课堂观察 ${index + 1}` }))
        const definition = growthReportPdfDefinition(report)
        const tables = (definition.content as Content[]).filter((node): node is ContentTable => typeof node === 'object' && node !== null && 'table' in node)
        const records = tables[tables.length - 1]!
        expect(records.table.headerRows).toBe(1)
        expect(records.table.body).toHaveLength(251)
        expect(records.table.body[records.table.body.length - 1]).toContain('课堂观察 250')
        expect(records.table.body[records.table.body.length - 1]).toContain('#250')
    })

    it('explains empty data and partial comparison coverage without creating empty tables', () => {
        const report = growthReportFixture({ previous_period_complete: false, daily: [], rules: [], records: [] })
        report.summary.records = 0
        const content = JSON.stringify(growthReportPdfDefinition(report).content)
        expect(content).toContain('不代表学生没有表现或进步')
        expect(content).toContain('数据覆盖不完整，暂不比较')
        expect(content).not.toContain('"body":[]')
    })

    it('treats HTML and remote URLs in report text as plain text', () => {
        const text = '<img src="https://example.invalid/tracker">'
        const report = growthReportFixture({ student_name: text, interpretation: text })
        const content = JSON.stringify(growthReportPdfDefinition(report).content)
        expect(content).toContain(JSON.stringify(text).slice(1, -1))
        expect(content).not.toMatch(/"(?:image|link|attachment|svg)":/)
    })
})

describe('direct PDF download', () => {
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
        engine.getBlob.mockResolvedValue(new Blob(['%PDF-1.7'], { type: 'application/pdf' }))
        engine.createPdf.mockReturnValue({ getBlob: engine.getBlob })
        vi.stubGlobal('window', { location: { href: 'https://school.example/v3/students' } })
        vi.stubGlobal('document', { createElement: () => link, body: { appendChild: vi.fn() } })
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-pdf')
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    })
    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('downloads a PDF with a safe filename and releases the temporary URL', async () => {
        await downloadGrowthReportPdf(growthReportFixture({ student_name: '小明/一班' }), {
            signal: new AbortController().signal, canDownload: () => true,
        })
        expect(link.download).toBe('小明_一班_成长报告_2026-11-02_2026-11-08.pdf')
        expect(link.href).toBe('blob:test-pdf')
        expect(link.click).toHaveBeenCalledOnce()
        expect(link.remove).toHaveBeenCalledOnce()
        expect(engine.addFonts).toHaveBeenCalledWith(expect.objectContaining({ NotoSansSC: expect.objectContaining({
            normal: 'https://school.example/fonts/NotoSansSC-Regular.ttf',
        }) }))
        await vi.advanceTimersByTimeAsync(1000)
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-pdf')
    })

    it.each(['scope', 'permission'])('does not download when %s is revoked during PDF generation', async reason => {
        let finish!: (blob: Blob) => void
        engine.getBlob.mockReturnValueOnce(new Promise<Blob>(resolve => { finish = resolve }))
        const scope = new AbortController()
        const canDownload = vi.fn(() => true)
        const pending = downloadGrowthReportPdf(growthReportFixture(), { signal: scope.signal, canDownload })
        await vi.waitFor(() => expect(engine.getBlob).toHaveBeenCalledOnce())
        if (reason === 'scope') scope.abort()
        else canDownload.mockReturnValue(false)
        finish(new Blob(['%PDF-1.7']))
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
        expect(URL.createObjectURL).not.toHaveBeenCalled()
        expect(link.click).not.toHaveBeenCalled()
    })

    it('propagates generation failure without creating a download', async () => {
        const failure = new Error('font failed')
        engine.getBlob.mockRejectedValueOnce(failure)
        await expect(downloadGrowthReportPdf(growthReportFixture(), {
            signal: new AbortController().signal, canDownload: () => true,
        })).rejects.toBe(failure)
        expect(URL.createObjectURL).not.toHaveBeenCalled()
    })
})
