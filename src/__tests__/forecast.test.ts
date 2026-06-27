import { describe, it, expect } from 'vitest'
import { computeForecast, computeCalibrationFactor, computeAllocation } from '../lib/forecast'
import type { HistoricalEntry } from '../lib/forecast'

const today = new Date('2025-07-01')

const history: HistoricalEntry[] = [
  { month: '2023-06', totalSpent: 1600 },
  { month: '2023-07', totalSpent: 1800 },
  { month: '2024-06', totalSpent: 1800 },
  { month: '2024-07', totalSpent: 2000 },
  { month: '2025-01', totalSpent: 1500 },
  { month: '2025-03', totalSpent: 1700 },
]

// EWM (decay=0.88) of all 6 entries ≈ 1729

describe('computeForecast — all_time mode', () => {
  it('applies seasonal boost for June (above-average months)', () => {
    // June has 2 obs [1600, 1800] — EWM ~1706, below global ~1729 but close
    // seasonalFactor shrinkage=0.8 → final forecast is between 1700 and 1730
    const result = computeForecast('2025-06', history, 'all_time', today)
    expect(result).toBeGreaterThan(1680)
    expect(result).toBeLessThan(1750)
  })

  it('applies partial seasonal dampening for January (low-spend month)', () => {
    // Jan has 1 obs (1500), below global EWM. shrinkage=0.6 → factor < 1
    const result = computeForecast('2026-01', history, 'all_time', today)
    const globalMean = computeForecast('2025-09', history, 'all_time', today) // no same-month → = globalMean
    expect(result).toBeLessThan(globalMean)
    expect(result).toBeGreaterThan(1400)
  })

  it('returns global EWM when no same-month data exists', () => {
    // September has no data → forecast = globalMean, no seasonal adjustment
    const result = computeForecast('2025-09', history, 'all_time', today)
    // Should be close to the EWM of all 6 entries (~1729)
    expect(result).toBeGreaterThan(1700)
    expect(result).toBeLessThan(1760)
  })

  it('returns 0 when history is empty', () => {
    expect(computeForecast('2025-06', [], 'all_time', today)).toBe(0)
  })
})

describe('computeForecast — rolling_12mo mode', () => {
  it('only uses data within the last 12 months', () => {
    // today = 2025-07-01, window starts 2024-08-01
    // only 2025-01 (1500) and 2025-03 (1700) qualify; no June → seasonal factor 1.0
    const result = computeForecast('2025-06', history, 'rolling_12mo', today)
    // EWM of [1500, 1700] ≈ 1606
    expect(result).toBeGreaterThan(1580)
    expect(result).toBeLessThan(1640)
  })

  it('applies seasonal boost for historically high months', () => {
    // Testing July 2026 so that July 2025 is in history and within the rolling window
    const extendedHistory: HistoricalEntry[] = [
      { month: '2024-07', totalSpent: 2000 },
      { month: '2024-08', totalSpent: 1900 },
      { month: '2025-07', totalSpent: 2200 },
    ]
    // window for today=2025-07-01: 2024-08 + 2025-07 are within 12 months
    // globalEWM ≈ 2060; July seasonal EWM = 2200 → factor > 1
    const result = computeForecast('2026-07', extendedHistory, 'rolling_12mo', today)
    expect(result).toBeGreaterThan(2050)
  })

  it('returns 0 when history is empty', () => {
    expect(computeForecast('2025-06', [], 'rolling_12mo', today)).toBe(0)
  })
})

describe('computeCalibrationFactor', () => {
  it('returns 1.0 with fewer than 4 entries', () => {
    expect(computeCalibrationFactor(history.slice(0, 3), 'all_time', today)).toBe(1.0)
  })

  it('returns a value in the clamped range [0.65, 1.35]', () => {
    const factor = computeCalibrationFactor(history, 'all_time', today)
    expect(factor).toBeGreaterThanOrEqual(0.65)
    expect(factor).toBeLessThanOrEqual(1.35)
  })

  it('returns a calibration factor near 1.0 for consistent data', () => {
    // Flat spending should produce a factor close to 1
    const flat: HistoricalEntry[] = Array.from({ length: 12 }, (_, i) => ({
      month: `2024-${String(i + 1).padStart(2, '0')}`,
      totalSpent: 2000,
    }))
    const factor = computeCalibrationFactor(flat, 'all_time', today)
    expect(factor).toBeCloseTo(1.0, 1)
  })
})

describe('computeAllocation', () => {
  it('returns forecast minus spent when positive', () => {
    expect(computeAllocation(1700, 900)).toBeCloseTo(800)
  })

  it('is floored at 0 when already over forecast', () => {
    expect(computeAllocation(1700, 2000)).toBe(0)
  })

  it('returns full forecast when nothing spent yet', () => {
    expect(computeAllocation(1700, 0)).toBeCloseTo(1700)
  })
})
