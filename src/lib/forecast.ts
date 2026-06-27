export type BudgetingMode = 'all_time' | 'rolling_12mo'

export interface HistoricalEntry {
  month: string   // YYYY-MM
  totalSpent: number
}

function calendarMonth(month: string): string {
  return month.slice(5, 7) // MM
}

function isWithinLast12Months(month: string, today: Date): boolean {
  const [y, m] = month.split('-').map(Number)
  const entryDate = new Date(y, m - 1, 1)
  const cutoff = new Date(today.getFullYear(), today.getMonth() - 11, 1)
  return entryDate >= cutoff
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function computeForecast(
  targetMonth: string,
  history: HistoricalEntry[],
  mode: BudgetingMode,
  today: Date = new Date(),
): number {
  const relevantHistory =
    mode === 'rolling_12mo'
      ? history.filter((e) => isWithinLast12Months(e.month, today))
      : history

  const targetCalMonth = calendarMonth(targetMonth)

  const sameCalendarMonth = relevantHistory
    .filter((e) => calendarMonth(e.month) === targetCalMonth)
    .map((e) => e.totalSpent)

  if (sameCalendarMonth.length >= 2) {
    return average(sameCalendarMonth)
  }

  // fallback: overall average across the relevant window
  const allAmounts = relevantHistory.map((e) => e.totalSpent)
  return average(allAmounts)
}

export function computeAllocation(
  forecast: number,
  spentSoFar: number,
): number {
  return Math.max(0, forecast - spentSoFar)
}
