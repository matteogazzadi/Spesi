import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { recalculateExclusions } from '../lib/importService'
import type { Database } from '../lib/database.types'

type RuleRow = Database['public']['Tables']['exclusion_rules']['Row']

export interface RuleWithImpact extends RuleRow {
  impactCount: number
  impactAmount: number
}

export function useExclusionRules(userId: string) {
  const [rules, setRules] = useState<RuleWithImpact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [rulesRes, impactRes] = await Promise.all([
        supabase.from('exclusion_rules').select('*').eq('user_id', userId).order('created_at'),
        supabase
          .from('transactions')
          .select('excluded_by_rule_id, amount')
          .eq('user_id', userId)
          .eq('excluded', true),
      ])
      if (rulesRes.error) throw new Error(rulesRes.error.message)

      // Group impact by rule id client-side
      const impact = new Map<string, { count: number; amount: number }>()
      for (const tx of impactRes.data ?? []) {
        if (!tx.excluded_by_rule_id) continue
        const curr = impact.get(tx.excluded_by_rule_id) ?? { count: 0, amount: 0 }
        curr.count++
        curr.amount += tx.amount
        impact.set(tx.excluded_by_rule_id, curr)
      }

      setRules(
        (rulesRes.data ?? []).map((r) => ({
          ...r,
          impactCount: impact.get(r.id)?.count ?? 0,
          impactAmount: impact.get(r.id)?.amount ?? 0,
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchRules() }, [fetchRules])

  async function addRule(pattern: string, matchType: 'contains' | 'exact') {
    const { error: err } = await supabase.from('exclusion_rules').insert({
      user_id: userId,
      pattern,
      match_type: matchType,
    })
    if (err) throw new Error(err.message)
    await recalculateExclusions(userId, supabase)
    await fetchRules()
  }

  async function toggleRule(id: string, active: boolean) {
    const { error: err } = await supabase
      .from('exclusion_rules')
      .update({ active })
      .eq('id', id)
    if (err) throw new Error(err.message)
    await recalculateExclusions(userId, supabase)
    await fetchRules()
  }

  async function deleteRule(id: string) {
    const { error: err } = await supabase.from('exclusion_rules').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await recalculateExclusions(userId, supabase)
    await fetchRules()
  }

  return { rules, loading, error, addRule, toggleRule, deleteRule, refetch: fetchRules }
}
