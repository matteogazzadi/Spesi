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

// globalMean = (1600+1800+1800+2000+1500+1700)/6 = 1733.33

describe('computeForecast — all_time mode', () => {
  it('uses seasonal factor when 2+ same-month data points exist', () => {
    // June: [1600, 1800] → seasonalFactor = 1700/1733.33 = 0.9808
    // baseRate = average of last 6 months = 1733.33
    // forecast ≈ 1700
    const result = computeForecast('2025-06', history, 'all_time', today)
    expect(result).toBeCloseTo(1700, 0)
  })

  it('applies partial seasonal adjustment with only 1 same-month observation', () => {
    // January appears once (1500). ratio = 1500/1733.33 = 0.8654
    // seasonalFactor = 0.6*0.8654 + 0.4 = 0.9192
    // baseRate = 1733.33 → forecast ≈ 1593
    const result = computeForecast('2026-01', history, 'all_time', today)
    const globalMean = (1600 + 1800 + 1800 + 2000 + 1500 + 1700) / 6
    const seasonalFactor = 0.6 * (1500 / globalMean) + 0.4
    expect(result).toBeCloseTo(globalMean * seasonalFactor, 0)
    // Forecast is below global mean, reflecting that January tends to be a low month
    expect(result).toBeLessThan(globalMean)
  })

  it('uses base rate without seasonal adjustment when no same-month data', () => {
    // September has no data → seasonalFactor = 1.0 → forecast = baseRate = globalMean
    const result = computeForecast('2025-09', history, 'all_time', today)
    const globalMean = (1600 + 1800 + 1800 + 2000 + 1500 + 1700) / 6
    expect(result).toBeCloseTo(globalMean, 0)
  })
})

describe('computeForecast — rolling_12mo mode', () => {
  it('only uses data within the last 12 months', () => {
    // today = 2025-07-01, window starts at 2024-08-01
    // window = 2025-01 (1500), 2025-03 (1700) — no June → seasonalFactor = 1.0
    // forecast = average(1500, 1700) = 1600
    const result = computeForecast('2025-06', history, 'rolling_12mo', today)
    expect(result).toBeCloseTo(1600, 0)
  })

  it('applies seasonal boost when the same-month entry is above the window average', () => {
    const extendedHistory: HistoricalEntry[] = [
      { month: '2024-07', totalSpent: 2000 },
      { month: '2024-08', totalSpent: 1900 },
      { month: '2025-07', totalSpent: 2200 },
    ]
    // Window from 2024-08: 2024-08 (1900), 2025-07 (2200)
    // globalMean = 2050; July in window: [2200] → 1 obs
    // seasonalFactor = 0.6*(2200/2050) + 0.4 = 1.044
    // baseRate = average(1900, 2200) = 2050
    // forecast = 2050 * 1.044 ≈ 2140 — above the window average, reflecting July is high
    const result = computeForecast('2025-07', extendedHistory, 'rolling_12mo', today)
    expect(result).toBeGreaterThan(2050)
    expect(result).toBeCloseTo(2140, -1)
  })

  it('uses base rate without seasonal adjustment when zero same-month entries in window', () => {
    const result = computeForecast('2025-09', history, 'rolling_12mo', today)
    // window = 2025-01 (1500), 2025-03 (1700) → average = 1600
    expect(result).toBeCloseTo((1500 + 1700) / 2, 0)
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
