import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { computeForecast } from '../lib/forecast'
import type { BudgetingMode } from '../lib/forecast'
import type { Database } from '../lib/database.types'

type MonthlyTotalRow = Database['public']['Tables']['monthly_totals']['Row']
type UserSettingsRow = Database['public']['Tables']['user_settings']['Row']

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextYearMonth(current: string): string {
  const [y, m] = current.split('-').map(Number)
  const d = new Date(y, m, 1) // m is 1-indexed; as 0-indexed it already points to next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface MonthlyDataResult {
  loading: boolean
  error: string | null
  history: MonthlyTotalRow[]
  budgetingMode: BudgetingMode
  currentMonth: string
  nextMonth: string
  forecast: number
  nextMonthForecast: number
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
  const nextMonth = nextYearMonth(currentMonth)

  const historicalEntries = history
    .filter((h) => h.month < currentMonth)
    .map((h) => ({ month: h.month, totalSpent: h.total_spent }))

  const forecast = computeForecast(currentMonth, historicalEntries, budgetingMode)
  const nextMonthForecast = computeForecast(nextMonth, historicalEntries, budgetingMode)

  return {
    loading,
    error,
    history,
    budgetingMode,
    currentMonth,
    nextMonth,
    forecast,
    nextMonthForecast,
    refetch: fetchData,
  }
}
