export type BudgetingMode = 'all_time' | 'rolling_12mo'
export type ConfidenceLevel = 'low' | 'medium' | 'high'

export interface HistoricalEntry {
  month: string   // YYYY-MM
  totalSpent: number
}

const DEFAULT_DECAY = 0.88
const CANDIDATE_DECAYS = [0.50, 0.60, 0.70, 0.80, 0.85, 0.88, 0.90, 0.92, 0.95, 0.98]

function calendarMonth(month: string): string {
  return month.slice(5, 7) // MM
}

function isWithinLast12Months(month: string, today: Date): boolean {
  const [y, m] = month.split('-').map(Number)
  const entryDate = new Date(y, m - 1, 1)
  const cutoff = new Date(today.getFullYear(), today.getMonth() - 11, 1)
  return entryDate >= cutoff
}

// Exponentially weighted mean (oldest → newest). DECAY=0.88 ≈ 6-month half-life.
function ewma(values: number[], decay = DEFAULT_DECAY): number {
  if (values.length === 0) return 0
  let wSum = 0
  let wTot = 0
  values.forEach((v, idx) => {
    const age = values.length - 1 - idx
    const w = Math.pow(decay, age)
    wSum += v * w
    wTot += w
  })
  return wTot > 0 ? wSum / wTot : 0
}

// #3 — Winsorize values at [Q1 − 1.5·IQR, Q3 + 1.5·IQR] to down-weight outlier months.
// Only applied when we have at least 5 observations (otherwise IQR is unreliable).
function winsorize(values: number[]): number[] {
  if (values.length < 5) return values
  const s = [...values].sort((a, b) => a - b)
  const q = (p: number) => {
    const i = (s.length - 1) * p
    const lo = Math.floor(i)
    return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo)
  }
  const q1 = q(0.25)
  const q3 = q(0.75)
  const iqr = q3 - q1
  const lo = q1 - 1.5 * iqr
  const hi = q3 + 1.5 * iqr
  return values.map(v => Math.max(lo, Math.min(hi, v)))
}

export function computeForecast(
  targetMonth: string,
  history: HistoricalEntry[],
  mode: BudgetingMode,
  today: Date = new Date(),
  decay: number = DEFAULT_DECAY,
): number {
  const relevantHistory =
    mode === 'rolling_12mo'
      ? history.filter((e) => isWithinLast12Months(e.month, today))
      : history

  const sorted = [...relevantHistory]
    .filter(e => e.month < targetMonth)
    .sort((a, b) => a.month.localeCompare(b.month))

  if (sorted.length === 0) return 0

  // #3: Winsorize global values to mute outlier months before trend estimation
  const globalValues = winsorize(sorted.map(e => e.totalSpent))
  const globalMean = ewma(globalValues, decay)
  if (globalMean === 0) return 0

  const targetCalMonth = calendarMonth(targetMonth)
  const sameMonthEntries = sorted.filter(e => calendarMonth(e.month) === targetCalMonth)

  if (sameMonthEntries.length === 0) return globalMean

  const sameMonthMean = ewma(sameMonthEntries.map(e => e.totalSpent), decay)
  const rawSeasonalFactor = sameMonthMean / globalMean

  const shrinkage = sameMonthEntries.length === 1 ? 0.6
                  : sameMonthEntries.length === 2 ? 0.8
                  : 1.0
  const seasonalFactor = 1.0 * (1 - shrinkage) + rawSeasonalFactor * shrinkage

  return globalMean * seasonalFactor
}

/**
 * #4 — Adaptive decay: grid-searches EWMA decay in [0.50, 0.98] via leave-one-out CV,
 * minimising mean absolute percentage error. Falls back to DEFAULT_DECAY with < 6 entries.
 */
export function findOptimalDecay(
  history: HistoricalEntry[],
  mode: BudgetingMode,
  today: Date = new Date(),
): number {
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month))
  if (sorted.length < 6) return DEFAULT_DECAY

  let bestDecay = DEFAULT_DECAY
  let bestMAPE = Infinity

  for (const d of CANDIDATE_DECAYS) {
    let totalErr = 0
    let count = 0
    for (let i = 3; i < sorted.length; i++) {
      const prior = sorted.slice(0, i)
      const fc = computeForecast(sorted[i].month, prior, mode, today, d)
      if (fc > 0 && sorted[i].totalSpent > 0) {
        totalErr += Math.abs(sorted[i].totalSpent - fc) / sorted[i].totalSpent
        count++
      }
    }
    const mape = count > 0 ? totalErr / count : Infinity
    if (mape < bestMAPE) { bestMAPE = mape; bestDecay = d; }
  }

  return bestDecay
}

/**
 * Leave-one-out bias calibration: EWMA of actual/forecast ratios for past months.
 * Clamped to [0.65, 1.35]. Returns 1.0 with fewer than 4 entries.
 */
export function computeCalibrationFactor(
  history: HistoricalEntry[],
  mode: BudgetingMode,
  today: Date = new Date(),
  decay: number = DEFAULT_DECAY,
): number {
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month))
  if (sorted.length < 4) return 1.0

  const RATIO_DECAY = 0.85
  let weightedRatio = 0
  let totalWeight = 0

  for (let i = 3; i < sorted.length; i++) {
    const prior = sorted.slice(0, i)
    const fc = computeForecast(sorted[i].month, prior, mode, today, decay)
    if (fc > 0) {
      const ratio = sorted[i].totalSpent / fc
      const age = sorted.length - 1 - i
      const w = Math.pow(RATIO_DECAY, age)
      weightedRatio += ratio * w
      totalWeight += w
    }
  }

  if (totalWeight === 0) return 1.0
  return Math.max(0.65, Math.min(1.35, weightedRatio / totalWeight))
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
