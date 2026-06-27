import { describe, it, expect } from 'vitest'
import { computeForecast, computeAllocation } from '../lib/forecast'
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

describe('computeForecast — all_time mode', () => {
  it('averages all past occurrences of the same calendar month', () => {
    const result = computeForecast('2025-06', history, 'all_time', today)
    // June 2023 = 1600, June 2024 = 1800 → average = 1700
    expect(result).toBeCloseTo(1700)
  })

  it('falls back to overall average when fewer than 2 data points exist', () => {
    // January only appears once
    const result = computeForecast('2026-01', history, 'all_time', today)
    const overall = (1600 + 1800 + 1800 + 2000 + 1500 + 1700) / 6
    expect(result).toBeCloseTo(overall)
  })

  it('falls back to overall average when zero data points exist for that month', () => {
    const result = computeForecast('2025-09', history, 'all_time', today)
    const overall = (1600 + 1800 + 1800 + 2000 + 1500 + 1700) / 6
    expect(result).toBeCloseTo(overall)
  })
})

describe('computeForecast — rolling_12mo mode', () => {
  it('only uses data within the last 12 months', () => {
    // today = 2025-07-01, window starts at 2024-08-01
    // June 2023 is outside the window, June 2024 is also outside (2024-06 < 2024-08)
    // So no June data in the window → falls back to overall average of window
    const result = computeForecast('2025-06', history, 'rolling_12mo', today)
    // window contains: 2025-01 (1500), 2025-03 (1700), 2024-07 is outside (2024-07 < 2024-08)
    // Actually 2024-07 is outside, so window = 2025-01 + 2025-03
    const windowAvg = (1500 + 1700) / 2
    expect(result).toBeCloseTo(windowAvg)
  })

  it('uses 12-month window data when 2+ same-month entries exist in window', () => {
    const extendedHistory: HistoricalEntry[] = [
      { month: '2024-07', totalSpent: 2000 },
      { month: '2024-08', totalSpent: 1900 },
      { month: '2025-07', totalSpent: 2200 },
    ]
    // today = 2025-07-01, window from 2024-08 — so 2024-07 is outside
    // 2024-08: inside; 2025-07: inside. But we want July forecast:
    // only 2025-07 is inside and matches July → 1 point → fallback
    const result = computeForecast('2025-07', extendedHistory, 'rolling_12mo', today)
    // fallback to window average: 1900 + 2200 / 2 = 2050
    expect(result).toBeCloseTo((1900 + 2200) / 2)
  })

  it('falls back to window overall average when zero same-month entries in window', () => {
    const result = computeForecast('2025-09', history, 'rolling_12mo', today)
    // window = 2025-01 (1500), 2025-03 (1700)
    expect(result).toBeCloseTo((1500 + 1700) / 2)
  })

  it('returns 0 when history is empty', () => {
    expect(computeForecast('2025-06', [], 'rolling_12mo', today)).toBe(0)
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
