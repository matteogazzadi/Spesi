export type BudgetingMode = 'all_time' | 'rolling_12mo'
export type ConfidenceLevel = 'low' | 'medium' | 'high'

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

// Exponentially weighted mean of sorted values (oldest → newest).
// DECAY = 0.88 gives a half-life of ~5.4 positions (similar to a 6-month window).
function ewma(values: number[], decay = 0.88): number {
  if (values.length === 0) return 0
  let wSum = 0
  let wTot = 0
  values.forEach((v, idx) => {
    const age = values.length - 1 - idx // 0 = most recent
    const w = Math.pow(decay, age)
    wSum += v * w
    wTot += w
  })
  return wTot > 0 ? wSum / wTot : 0
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

  const sorted = [...relevantHistory]
    .filter(e => e.month < targetMonth)
    .sort((a, b) => a.month.localeCompare(b.month))

  if (sorted.length === 0) return 0

  // Exponentially weighted global mean (captures recent spending trend)
  const globalMean = ewma(sorted.map(e => e.totalSpent))
  if (globalMean === 0) return 0

  const targetCalMonth = calendarMonth(targetMonth)
  const sameMonthEntries = sorted.filter(e => calendarMonth(e.month) === targetCalMonth)

  if (sameMonthEntries.length === 0) {
    // No same-month data — fall back to trend-only estimate
    return globalMean
  }

  // Exponentially weighted same-month average (seasonal signal)
  const sameMonthMean = ewma(sameMonthEntries.map(e => e.totalSpent))
  const rawSeasonalFactor = sameMonthMean / globalMean

  // Shrink toward 1.0 when few observations (reduces overfitting with sparse data)
  const shrinkage = sameMonthEntries.length === 1 ? 0.6
                  : sameMonthEntries.length === 2 ? 0.8
                  : 1.0
  const seasonalFactor = 1.0 * (1 - shrinkage) + rawSeasonalFactor * shrinkage

  return globalMean * seasonalFactor
}

/**
 * Leave-one-out bias calibration.
 *
 * For each historical entry (after the first 3), computes what the forecast
 * would have been using only prior data, then measures actual/forecast.
 * Returns an exponentially weighted average of these ratios — this is the
 * systematic bias correction factor to multiply onto future forecasts.
 *
 * Clamped to [0.65, 1.35] to avoid over-correction on sparse data.
 */
export function computeCalibrationFactor(
  history: HistoricalEntry[],
  mode: BudgetingMode,
  today: Date = new Date(),
): number {
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month))
  if (sorted.length < 4) return 1.0

  const DECAY = 0.85 // Heavier decay: recent errors matter more
  let weightedRatio = 0
  let totalWeight = 0

  for (let i = 3; i < sorted.length; i++) {
    const priorEntries = sorted.slice(0, i)
    const targetMonth = sorted[i].month
    const forecasted = computeForecast(targetMonth, priorEntries, mode, today)
    if (forecasted > 0) {
      const ratio = sorted[i].totalSpent / forecasted
      const age = sorted.length - 1 - i // 0 = most recent
      const w = Math.pow(DECAY, age)
      weightedRatio += ratio * w
      totalWeight += w
    }
  }

  if (totalWeight === 0) return 1.0

  const raw = weightedRatio / totalWeight
  return Math.max(0.65, Math.min(1.35, raw))
}

export function getConfidence(
  sameMonthCount: number,
  totalMonths: number,
): ConfidenceLevel {
  if (totalMonths < 3) return 'low'
  if (sameMonthCount >= 2 && totalMonths >= 12) return 'high'
  if (sameMonthCount >= 1 || totalMonths >= 6) return 'medium'
  return 'low'
}

export function computeAllocation(
  forecast: number,
  spentSoFar: number,
): number {
  return Math.max(0, forecast - spentSoFar)
}
