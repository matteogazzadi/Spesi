import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { parseExcelFile } from './parseExcel'
import { annotateTransactions } from './exclusionRules'
import type { AnnotatedTransaction, ExclusionRule } from './exclusionRules'

export type { AnnotatedTransaction }

export function computeTotalSpent(transactions: AnnotatedTransaction[]): number {
  return transactions
    .filter((t) => !t.excluded)
    .reduce((sum, t) => sum + t.amount, 0)
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target!.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

async function fetchActiveRules(
  userId: string,
  db: SupabaseClient<Database>,
): Promise<ExclusionRule[]> {
  const { data, error } = await db
    .from('exclusion_rules')
    .select('id, pattern, match_type, active')
    .eq('user_id', userId)
    .eq('active', true)

  if (error) throw new Error(`Failed to fetch exclusion rules: ${error.message}`)

  return (data ?? []).map((r) => ({
    id: r.id,
    pattern: r.pattern,
    matchType: r.match_type,
    active: r.active,
  }))
}

async function upsertMonthlyTotal(
  userId: string,
  month: string,
  db: SupabaseClient<Database>,
): Promise<string> {
  const { data, error } = await db
    .from('monthly_totals')
    .upsert(
      { user_id: userId, month, total_spent: 0, last_imported_at: new Date().toISOString() },
      { onConflict: 'user_id,month', ignoreDuplicates: false },
    )
    .select('id')
    .single()

  if (error) throw new Error(`Failed to upsert monthly_total for ${month}: ${error.message}`)
  return data.id
}

async function replaceTransactions(
  userId: string,
  monthlyTotalId: string,
  annotated: AnnotatedTransaction[],
  db: SupabaseClient<Database>,
): Promise<void> {
  // Full overwrite: delete existing, insert new
  const { error: delError } = await db
    .from('transactions')
    .delete()
    .eq('monthly_total_id', monthlyTotalId)

  if (delError) throw new Error(`Failed to delete transactions: ${delError.message}`)

  if (annotated.length === 0) return

  const rows = annotated.map((t) => ({
    user_id: userId,
    monthly_total_id: monthlyTotalId,
    date: t.date,
    description: t.description,
    amount: t.amount,
    excluded: t.excluded,
    excluded_by_rule_id: t.excludedByRuleId,
  }))

  const { error: insError } = await db.from('transactions').insert(rows)
  if (insError) throw new Error(`Failed to insert transactions: ${insError.message}`)
}

async function updateTotalSpent(
  monthlyTotalId: string,
  totalSpent: number,
  db: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await db
    .from('monthly_totals')
    .update({ total_spent: totalSpent })
    .eq('id', monthlyTotalId)

  if (error) throw new Error(`Failed to update total_spent: ${error.message}`)
}

export async function importFile(
  file: File,
  userId: string,
  db: SupabaseClient<Database>,
): Promise<{ monthsImported: string[] }> {
  const buffer = await readFileAsArrayBuffer(file)
  const transactions = parseExcelFile(buffer)
  const rules = await fetchActiveRules(userId, db)
  const annotated = annotateTransactions(transactions, rules)

  // Group by month
  const byMonth = new Map<string, AnnotatedTransaction[]>()
  for (const t of annotated) {
    const list = byMonth.get(t.month) ?? []
    list.push(t)
    byMonth.set(t.month, list)
  }

  const monthsImported: string[] = []

  for (const [month, monthTxs] of byMonth) {
    const monthlyTotalId = await upsertMonthlyTotal(userId, month, db)
    await replaceTransactions(userId, monthlyTotalId, monthTxs, db)
    const totalSpent = computeTotalSpent(monthTxs)
    await updateTotalSpent(monthlyTotalId, totalSpent, db)
    monthsImported.push(month)
  }

  return { monthsImported: monthsImported.sort() }
}

// Recalculates excluded flags for ALL of a user's transactions when rules change,
// then updates affected monthly_totals.total_spent.
export async function recalculateExclusions(
  userId: string,
  db: SupabaseClient<Database>,
): Promise<void> {
  const rules = await fetchActiveRules(userId, db)

  const { data: txRows, error: txError } = await db
    .from('transactions')
    .select('id, description, amount, monthly_total_id')
    .eq('user_id', userId)

  if (txError) throw new Error(`Failed to fetch transactions: ${txError.message}`)
  if (!txRows || txRows.length === 0) return

  // Compute new excluded state per transaction
  const updates = txRows.map((row) => {
    const matched = rules.find(
      (r) =>
        (r.matchType === 'exact'
          ? row.description.toLowerCase() === r.pattern.toLowerCase()
          : row.description.toLowerCase().includes(r.pattern.toLowerCase())) && r.active,
    )
    return {
      id: row.id,
      excluded: matched !== undefined,
      excluded_by_rule_id: matched?.id ?? null,
      monthly_total_id: row.monthly_total_id,
      amount: row.amount,
    }
  })

  // Batch-update each transaction
  await Promise.all(
    updates.map((u) =>
      db
        .from('transactions')
        .update({ excluded: u.excluded, excluded_by_rule_id: u.excluded_by_rule_id })
        .eq('id', u.id),
    ),
  )

  // Recompute total_spent per affected monthly_total
  const totalsMap = new Map<string, number>()
  for (const u of updates) {
    if (!u.excluded) {
      totalsMap.set(u.monthly_total_id, (totalsMap.get(u.monthly_total_id) ?? 0) + u.amount)
    } else {
      if (!totalsMap.has(u.monthly_total_id)) totalsMap.set(u.monthly_total_id, 0)
    }
  }

  await Promise.all(
    Array.from(totalsMap.entries()).map(([id, total]) =>
      db.from('monthly_totals').update({ total_spent: total }).eq('id', id),
    ),
  )
}
