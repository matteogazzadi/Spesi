import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { computeForecast, computeAllocation } from '../lib/forecast'
import type { BudgetingMode } from '../lib/forecast'
import type { Database } from '../lib/database.types'

type MonthlyTotalRow = Database['public']['Tables']['monthly_totals']['Row']
type UserSettingsRow = Database['public']['Tables']['user_settings']['Row']

function currentYearMonth(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function percentMonthElapsed(): number {
  const now = new Date()
  const day = now.getDate()
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return day / total
}

export interface MonthlyDataResult {
  loading: boolean
  error: string | null
  history: MonthlyTotalRow[]
  budgetingMode: BudgetingMode
  currentMonth: string
  forecast: number
  actualSoFar: number
  allocation: number
  expectedByNow: number
  pctElapsed: number
  refetch: () => void
}

export function useMonthlyData(userId: string): MonthlyDataResult {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<MonthlyTotalRow[]>([])
  const [budgetingMode, setBudgetingMode] = useState<BudgetingMode>('all_time')

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
          .select('budgeting_mode')
          .eq('user_id', userId)
          .maybeSingle(),
      ])

      if (totalsRes.error) throw new Error(totalsRes.error.message)
      setHistory(totalsRes.data ?? [])

      const settings = settingsRes.data as UserSettingsRow | null
      setBudgetingMode(settings?.budgeting_mode ?? 'all_time')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchData() }, [fetchData])

  const currentMonth = currentYearMonth()
  const pctElapsed = percentMonthElapsed()

  // history entries before current month feed the forecast
  const historicalEntries = history
    .filter((h) => h.month < currentMonth)
    .map((h) => ({ month: h.month, totalSpent: h.total_spent }))

  const forecast = computeForecast(currentMonth, historicalEntries, budgetingMode)

  const currentRow = history.find((h) => h.month === currentMonth)
  const actualSoFar = currentRow?.total_spent ?? 0

  const allocation = computeAllocation(forecast, actualSoFar)
  const expectedByNow = forecast * pctElapsed

  return {
    loading,
    error,
    history,
    budgetingMode,
    currentMonth,
    forecast,
    actualSoFar,
    allocation,
    expectedByNow,
    pctElapsed,
    refetch: fetchData,
  }
}
