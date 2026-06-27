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

  const sorted = [...relevantHistory].sort((a, b) => a.month.localeCompare(b.month))
  if (sorted.length === 0) return 0

  const globalMean = average(sorted.map((e) => e.totalSpent))
  if (globalMean === 0) return 0

  const targetCalMonth = calendarMonth(targetMonth)
  const sameMonthAmounts = sorted
    .filter((e) => calendarMonth(e.month) === targetCalMonth)
    .map((e) => e.totalSpent)

  // Seasonal factor: ratio of this calendar month's average to the overall mean.
  // 0 observations → no seasonal adjustment (factor = 1.0)
  // 1 observation  → blend 60% toward the observed ratio, 40% neutral (low confidence)
  // 2+ observations → full observed ratio (reliable signal)
  let seasonalFactor: number
  if (sameMonthAmounts.length === 0) {
    seasonalFactor = 1.0
  } else if (sameMonthAmounts.length === 1) {
    seasonalFactor = 0.6 * (sameMonthAmounts[0] / globalMean) + 0.4
  } else {
    seasonalFactor = average(sameMonthAmounts) / globalMean
  }

  // Base rate: average of the most recent months (up to 6) to capture the current
  // spending trend rather than a flat all-time mean.
  const windowSize = Math.min(6, sorted.length)
  const baseRate = average(sorted.slice(-windowSize).map((e) => e.totalSpent))

  return baseRate * seasonalFactor
}

export function computeAllocation(
  forecast: number,
  spentSoFar: number,
): number {
  return Math.max(0, forecast - spentSoFar)
}
