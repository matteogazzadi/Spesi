import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { BudgetingMode } from '../lib/forecast'

export function useUserSettings(userId: string) {
  const [budgetingMode, setBudgetingMode] = useState<BudgetingMode>('all_time')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('user_settings')
      .select('budgeting_mode')
      .eq('user_id', userId)
      .maybeSingle()
    setBudgetingMode(data?.budgeting_mode ?? 'all_time')
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  async function updateBudgetingMode(mode: BudgetingMode) {
    setSaving(true); setError(null)
    try {
      const { error: err } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, budgeting_mode: mode }, { onConflict: 'user_id' })
      if (err) throw new Error(err.message)
      setBudgetingMode(mode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return { budgetingMode, loading, saving, error, updateBudgetingMode }
}
