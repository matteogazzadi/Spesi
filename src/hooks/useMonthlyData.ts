import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { computeForecast, computeCalibrationFactor, getConfidence } from '../lib/forecast'
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

  const calibration = computeCalibrationFactor(historicalEntries, budgetingMode)
  const forecast = computeForecast(currentMonth, historicalEntries, budgetingMode) * calibration
  const nextMonthForecast = computeForecast(nextMonth, historicalEntries, budgetingMode) * calibration

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
    projectedRemaining += computeForecast(month, historicalEntries, budgetingMode) * calibration
  }
  const projectedAnnual = yearToDate + projectedRemaining

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
    refetch: fetchData,
  }
}
