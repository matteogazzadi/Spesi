import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { computeForecast, computeCalibrationFactor, findOptimalDecay, getConfidence } from '../lib/forecast'
import type { BudgetingMode, ConfidenceLevel } from '../lib/forecast'
import type { Database } from '../lib/database.types'

type MonthlyTotalRow = Database['public']['Tables']['monthly_totals']['Row']

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextYearMonth(current: string): string {
  const [y, m] = current.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface LastMonthSummary {
  month: string
  actual: number
  forecast: number
}

export interface MonthlyDataResult {
  loading: boolean
  error: string | null
  history: MonthlyTotalRow[]
  budgetingMode: BudgetingMode
  annualTarget: number | null
  currentMonth: string
  nextMonth: string
  forecast: number
  nextMonthForecast: number
  confidence: ConfidenceLevel
  yearToDate: number
  projectedAnnual: number
  trendPct: number | null
  lastMonthSummary: LastMonthSummary | null
  refetch: () => void
}

export function useMonthlyData(userId: string): MonthlyDataResult {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<MonthlyTotalRow[]>([])
  const [budgetingMode, setBudgetingMode] = useState<BudgetingMode>('all_time')
  const [annualTarget, setAnnualTarget] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [totalsRes, settingsRes] = await Promise.all([
        supabase
          .from('monthly_totals')
          .select('*')
          .eq('user_id', userId)
          .order('month', { ascending: true }),
        supabase
          .from('user_settings')
          .select('budgeting_mode, annual_target')
          .eq('user_id', userId)
          .maybeSingle(),
      ])

      if (totalsRes.error) throw new Error(totalsRes.error.message)
      setHistory(totalsRes.data ?? [])
      setBudgetingMode(settingsRes.data?.budgeting_mode ?? 'all_time')
      setAnnualTarget(settingsRes.data?.annual_target ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchData() }, [fetchData])

  const currentMonth = currentYearMonth()
  const nextMonth = nextYearMonth(currentMonth)
  const currentYear = currentMonth.slice(0, 4)

  const historicalEntries = history
    .filter((h) => h.month < currentMonth)
    .map((h) => ({ month: h.month, totalSpent: h.total_spent }))

  // #4 adaptive decay — tuned per user's data via leave-one-out CV
  const decay = findOptimalDecay(historicalEntries, budgetingMode)
  const calibration = computeCalibrationFactor(historicalEntries, budgetingMode, new Date(), decay)
  const forecast = computeForecast(currentMonth, historicalEntries, budgetingMode, new Date(), decay) * calibration
  const nextMonthForecast = computeForecast(nextMonth, historicalEntries, budgetingMode, new Date(), decay) * calibration

  const targetCalMonth = currentMonth.slice(5, 7)
  const sameMonthCount = historicalEntries.filter(
    (e) => e.month.slice(5, 7) === targetCalMonth,
  ).length
  const confidence = getConfidence(sameMonthCount, historicalEntries.length)

  // Year-to-date actual + full-year projection
  const yearToDate = history
    .filter((h) => h.month.startsWith(currentYear) && h.month < currentMonth)
    .reduce((sum, h) => sum + h.total_spent, 0)

  const currentMonthNum = Number(currentMonth.slice(5, 7))
  let projectedRemaining = 0
  for (let m = currentMonthNum; m <= 12; m++) {
    const month = `${currentYear}-${String(m).padStart(2, '0')}`
    projectedRemaining += computeForecast(month, historicalEntries, budgetingMode, new Date(), decay) * calibration
  }
  const projectedAnnual = yearToDate + projectedRemaining

  // Last completed month summary (actual vs what we would have forecast)
  const sortedHistory = [...history].sort((a, b) => b.month.localeCompare(a.month))
  const lastCompleted = sortedHistory.find(h => h.month < currentMonth) ?? null
  let lastMonthSummary: LastMonthSummary | null = null
  if (lastCompleted) {
    const priorEntries = historicalEntries.filter(e => e.month < lastCompleted.month)
    const lastForecast = priorEntries.length > 0
      ? computeForecast(lastCompleted.month, priorEntries, budgetingMode, new Date(), decay) *
        computeCalibrationFactor(priorEntries, budgetingMode, new Date(), decay)
      : 0
    lastMonthSummary = { month: lastCompleted.month, actual: lastCompleted.total_spent, forecast: lastForecast }
  }

  // Trend: compare recent 3-month avg vs prior 3-month avg
  const pastMonths = sortedHistory.filter(h => h.month < currentMonth).slice(0, 6)
  let trendPct: number | null = null
  if (pastMonths.length >= 4) {
    const recent = pastMonths.slice(0, 3).reduce((s, h) => s + h.total_spent, 0) / 3
    const prior = pastMonths.slice(3, 6).reduce((s, h) => s + h.total_spent, 0) / Math.min(pastMonths.length - 3, 3)
    if (prior > 0) trendPct = ((recent - prior) / prior) * 100
  }

  return {
    loading,
    error,
    history,
    budgetingMode,
    annualTarget,
    currentMonth,
    nextMonth,
    forecast,
    nextMonthForecast,
    confidence,
    yearToDate,
    projectedAnnual,
    trendPct,
    lastMonthSummary,
    refetch: fetchData,
  }
}
