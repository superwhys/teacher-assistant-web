/**
 * Excel 积分导入：解析文件为可导入的行数据
 */

import * as XLSX from 'xlsx'

export type ImportRow = {
    studentName: string
    delta: number
    itemName?: string
    itemSign: 'plus' | 'minus'
}

function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null
    const n = Number(String(value).toString().replace(/[^\d+\-\.]/g, ''))
    return Number.isFinite(n) ? n : null
}


async function readArrayBuffer(file: File): Promise<ArrayBuffer> {
    return await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

function normalizeHeaderKey(key: any): string {
    return String(key)
        .toLowerCase()
        .replace(/[\s\u00A0\u3000\u200B\uFEFF]/g, '')
        .trim()
}

function getByHeaderCandidates(row: Record<string, any>, candidates: string[]) {
    const map: Record<string, string> = {}
    for (const k of Object.keys(row)) {
        const nk = normalizeHeaderKey(k)
        if (!(nk in map)) map[nk] = k
    }
    for (const c of candidates) {
        const nc = normalizeHeaderKey(c)
        const real = map[nc]
        if (real !== undefined) return row[real]
    }
    return undefined
}

export async function parseExcelToImportRows(
    file: File,
    validStudentNames: Iterable<string>,
): Promise<{ rows: ImportRow[]; skipped: number }> {
    const arrayBuffer = await readArrayBuffer(file)
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) throw new Error('Excel 文件没有工作表')
    const worksheet = workbook.Sheets[firstSheetName]!
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

    const nameKeys = ['姓名', 'name', 'Name', '学生姓名', 'studentname', 'StudentName']
    const deltaKeys = ['分值', 'delta', 'Delta', '积分', 'points', 'Points', '变动', 'change']
    const itemKeys = ['项目', '原因', '备注', 'item', 'Item', 'itemName', 'ItemName']

    const studentSet = new Set(validStudentNames)

    let skipped = 0
    const parsed: ImportRow[] = []
    for (const row of rows) {
        const nameVal = getByHeaderCandidates(row, nameKeys)
        if (!nameVal) { skipped += 1; continue }
        const rawDelta = getByHeaderCandidates(row, deltaKeys)
        const rawItem = getByHeaderCandidates(row, itemKeys)

        const n = parseNumber(rawDelta)
        if (n === null) { skipped += 1; continue }
        const sign: 'plus' | 'minus' = n >= 0 ? 'plus' : 'minus'
        const abs = Math.abs(n)
        const delta = sign === 'minus' ? -abs : abs

        const studentName = String(nameVal).trim()
        if (!studentSet.has(studentName)) { skipped += 1; continue }

        parsed.push({
            studentName,
            delta,
            itemName: rawItem ? String(rawItem).trim() : undefined,
            itemSign: sign,
        })
    }

    return { rows: parsed, skipped }
}

export type ImportItemRow = {
    groupName: string
    itemName: string
    value: number
    sign: 'plus' | 'minus'
}

export async function parseItemsExcelToRows(file: File): Promise<{ rows: ImportItemRow[]; skipped: number }> {
    const arrayBuffer = await readArrayBuffer(file)
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) throw new Error('Excel 文件没有工作表')
    const worksheet = workbook.Sheets[firstSheetName]!
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

    const groupKeys = ['积分组', '组名', '分组', 'group', 'Group', '组', 'groupName', 'GroupName']
    const itemKeys = ['积分名', '项目', '项目名', '名称', 'name', 'Name', 'item', 'Item']
    const valueKeys = ['积分值', '分值', '积分', 'value', 'Value', 'Delta', 'delta', 'Points', 'points']

    

    const parsed: ImportItemRow[] = []
    let skipped = 0

    for (const r of rows) {
        const g = getByHeaderCandidates(r, groupKeys)
        const i = getByHeaderCandidates(r, itemKeys)
        const v = getByHeaderCandidates(r, valueKeys)
        const n = parseNumber(v)
        if (!g || !i || n === null) { skipped += 1; continue }
        const sign: 'plus' | 'minus' = n >= 0 ? 'plus' : 'minus'
        const abs = Math.abs(n)
        parsed.push({ groupName: String(g).trim(), itemName: String(i).trim(), value: abs, sign })
    }

    return { rows: parsed, skipped }
}


