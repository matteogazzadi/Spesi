import * as XLSX from 'xlsx'

export interface Transaction {
  date: string        // YYYY-MM-DD
  month: string       // YYYY-MM
  description: string
  amount: number      // absolute value of Debito, always positive
}

export interface MonthlyTotal {
  month: string       // YYYY-MM
  totalSpent: number
}

const BALANCE_ROW_PREFIX = 'Saldo al'

function parseDebito(raw: unknown): number {
  if (raw === '.' || raw === null || raw === undefined || raw === '') return 0
  const n = Number(raw)
  return isNaN(n) ? 0 : Math.abs(n)
}

function parseDate(raw: unknown): { date: string; month: string } | null {
  if (typeof raw !== 'string') return null
  // expected DD/MM/YYYY
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  const date = `${yyyy}-${mm}-${dd}`
  const month = `${yyyy}-${mm}`
  return { date, month }
}

export function parseExcelFile(buffer: ArrayBuffer): Transaction[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets['ExportExcel']
  if (!sheet) throw new Error('Sheet "ExportExcel" not found')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: [
      'codice',
      'dataOperazione',
      'dataValuta',
      'descrizione',
      'divisa',
      'debito',
      'credito',
      'categoria',
      'sottocategoria',
      'etichette',
      'note',
    ],
    range: 1, // skip header row
    defval: '.',
  })

  const transactions: Transaction[] = []

  for (const row of rows) {
    const descrizione = String(row['descrizione'] ?? '')

    // skip trailing balance summary row
    if (descrizione.startsWith(BALANCE_ROW_PREFIX)) continue

    const parsed = parseDate(row['dataOperazione'])
    if (!parsed) continue

    const amount = parseDebito(row['debito'])
    if (amount === 0) continue // skip credits / zero rows

    transactions.push({
      date: parsed.date,
      month: parsed.month,
      description: descrizione,
      amount,
    })
  }

  return transactions
}

export function computeMonthlyTotals(transactions: Transaction[]): MonthlyTotal[] {
  const map = new Map<string, number>()
  for (const t of transactions) {
    map.set(t.month, (map.get(t.month) ?? 0) + t.amount)
  }
  return Array.from(map.entries())
    .map(([month, totalSpent]) => ({ month, totalSpent }))
    .sort((a, b) => a.month.localeCompare(b.month))
}
