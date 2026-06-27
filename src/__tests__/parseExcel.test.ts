import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseExcelFile, computeMonthlyTotals } from '../lib/parseExcel'

function makeWorkbook(rows: Record<string, unknown>[]): ArrayBuffer {
  const header = [
    'Codice identificativo',
    'Data operazione',
    'Data valuta',
    'Descrizione',
    'Divisa',
    'Debito',
    'Credito',
    'Categoria',
    'Sottocategoria',
    'Etichette',
    'Note',
  ]
  const data = [header, ...rows.map((r) => Object.values(r))]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ExportExcel')
  return XLSX.write(wb, { type: 'array', bookType: 'xls' }) as ArrayBuffer
}

const baseRow = {
  codice: '1',
  dataOperazione: '15/06/2024',
  dataValuta: '15/06/2024',
  descrizione: 'Supermercato',
  divisa: 'EUR',
  debito: -45.5,
  credito: '.',
  categoria: '',
  sottocategoria: '',
  etichette: '',
  note: '',
}

describe('parseExcelFile', () => {
  it('parses a normal expense row', () => {
    const buf = makeWorkbook([baseRow])
    const txs = parseExcelFile(buf)
    expect(txs).toHaveLength(1)
    expect(txs[0].month).toBe('2024-06')
    expect(txs[0].date).toBe('2024-06-15')
    expect(txs[0].amount).toBeCloseTo(45.5)
    expect(txs[0].description).toBe('Supermercato')
  })

  it('treats "." in Debito as zero and skips the row', () => {
    const row = { ...baseRow, debito: '.', credito: 100 }
    const buf = makeWorkbook([row])
    const txs = parseExcelFile(buf)
    expect(txs).toHaveLength(0)
  })

  it('excludes the Saldo al balance summary row', () => {
    const balanceRow = {
      ...baseRow,
      descrizione: 'Saldo al 30/06/2024 23:59:59',
      debito: '.',
      divisa: '5432.10',
    }
    const buf = makeWorkbook([baseRow, balanceRow])
    const txs = parseExcelFile(buf)
    expect(txs).toHaveLength(1)
    expect(txs[0].description).toBe('Supermercato')
  })

  it('parses DD/MM/YYYY dates correctly', () => {
    const row = { ...baseRow, dataOperazione: '01/12/2023' }
    const buf = makeWorkbook([row])
    const txs = parseExcelFile(buf)
    expect(txs[0].date).toBe('2023-12-01')
    expect(txs[0].month).toBe('2023-12')
  })

  it('takes absolute value of negative Debito', () => {
    const row = { ...baseRow, debito: -123.45 }
    const buf = makeWorkbook([row])
    const txs = parseExcelFile(buf)
    expect(txs[0].amount).toBeCloseTo(123.45)
  })
})

describe('computeMonthlyTotals', () => {
  it('sums Debito per calendar month', () => {
    const txs = [
      { date: '2024-06-01', month: '2024-06', description: 'A', amount: 100 },
      { date: '2024-06-15', month: '2024-06', description: 'B', amount: 50 },
      { date: '2024-07-01', month: '2024-07', description: 'C', amount: 200 },
    ]
    const totals = computeMonthlyTotals(txs)
    expect(totals).toHaveLength(2)
    expect(totals[0]).toEqual({ month: '2024-06', totalSpent: 150 })
    expect(totals[1]).toEqual({ month: '2024-07', totalSpent: 200 })
  })

  it('returns empty array for empty input', () => {
    expect(computeMonthlyTotals([])).toEqual([])
  })
})
