import * as XLSX from 'xlsx'
import type { Transaction } from './parseExcel'

export interface CsvColumnMapping {
  dateColumn: string
  amountColumn: string
  debitsAreNegative: boolean
}

export interface CsvPreview {
  headers: string[]
  sampleRows: Record<string, string>[]
}

function readWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: 'array', cellDates: true })
}

function getFirstSheet(wb: XLSX.WorkBook): XLSX.WorkSheet {
  const name = wb.SheetNames[0]
  if (!name) throw new Error('No sheets found in file')
  return wb.Sheets[name]
}

function cellToString(cell: XLSX.CellObject | undefined): string {
  if (!cell) return ''
  if (cell.t === 'd' && cell.v instanceof Date) {
    const d = cell.v
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return cell.w ?? String(cell.v ?? '')
}

export function previewFile(buffer: ArrayBuffer): CsvPreview {
  const wb = readWorkbook(buffer)
  const sheet = getFirstSheet(wb)
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  })

  if (rows.length === 0) return { headers: [], sampleRows: [] }

  const headers = (rows[0] as unknown[]).map((h) => String(h ?? ''))
  const sampleRows: Record<string, string>[] = rows.slice(1, 4).map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = String((row as unknown[])[i] ?? '') })
    return obj
  })

  return { headers, sampleRows }
}

function tryParseDate(raw: string): { date: string; month: string } | null {
  if (!raw) return null

  // ISO YYYY-MM-DD
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, month: `${m[1]}-${m[2]}` }

  // European DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  m = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    const yyyy = m[3]
    return { date: `${yyyy}-${mm}-${dd}`, month: `${yyyy}-${mm}` }
  }

  // US MM/DD/YYYY
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const mm = m[1].padStart(2, '0')
    const dd = m[2].padStart(2, '0')
    const yyyy = m[3]
    return { date: `${yyyy}-${mm}-${dd}`, month: `${yyyy}-${mm}` }
  }

  return null
}

function parseAmount(raw: string, debitsAreNegative: boolean): number | null {
  if (!raw) return null
  // Remove currency symbols and spaces, normalise decimal separator
  const cleaned = raw.replace(/[€$£\s]/g, '').replace(/,(\d{2})$/, '.$1').replace(/[,]/g, '')
  const n = parseFloat(cleaned)
  if (isNaN(n) || n === 0) return null
  if (debitsAreNegative) {
    // Expenses are negative — take absolute value of negative amounts
    return n < 0 ? Math.abs(n) : null
  } else {
    // Expenses are positive
    return n > 0 ? n : null
  }
}

export function parseWithMapping(buffer: ArrayBuffer, mapping: CsvColumnMapping): Transaction[] {
  const wb = readWorkbook(buffer)
  const sheet = getFirstSheet(wb)

  // Use cellDates-aware approach: iterate cells directly for date columns
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1')
  const rows: Record<string, string>[] = []

  // Read header row
  const headers: string[] = []
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })]
    headers[c - range.s.c] = cellToString(cell)
  }

  // Read data rows
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const row: Record<string, string> = {}
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })]
      row[headers[c - range.s.c]] = cellToString(cell)
    }
    rows.push(row)
  }

  const transactions: Transaction[] = []
  for (const row of rows) {
    const rawDate = row[mapping.dateColumn] ?? ''
    const parsed = tryParseDate(rawDate)
    if (!parsed) continue

    const rawAmount = row[mapping.amountColumn] ?? ''
    const amount = parseAmount(rawAmount, mapping.debitsAreNegative)
    if (amount === null) continue

    const description = Object.entries(row)
      .filter(([k]) => k !== mapping.dateColumn && k !== mapping.amountColumn)
      .map(([, v]) => v)
      .filter(Boolean)
      .join(' | ')
      .trim() || 'Transaction'

    transactions.push({ date: parsed.date, month: parsed.month, description, amount })
  }

  return transactions
}
