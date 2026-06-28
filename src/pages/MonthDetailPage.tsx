import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../contexts/useAuth'
import { useTranslation } from '../contexts/LanguageContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { supabase } from '../lib/supabase'
import { importFile, recalculateMonthTotal } from '../lib/importService'
import type { Database } from '../lib/database.types'

type TxRow = Database['public']['Tables']['transactions']['Row']
type RuleRow = Database['public']['Tables']['exclusion_rules']['Row']

interface EditState {
  id: string
  field: 'description' | 'amount'
  value: string
}

export function MonthDetailPage() {
  const { month } = useParams<{ month: string }>()
  const { user } = useAuth()
  const { locale } = useTranslation()
  const { currency } = useCurrency()
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)
  const userId = user!.id

  const [monthlyTotalId, setMonthlyTotalId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<TxRow[]>([])
  const [rules, setRules] = useState<Pick<RuleRow, 'id' | 'pattern'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    if (!month) return
    setLoading(true); setError(null)
    try {
      const mtRes = await supabase
        .from('monthly_totals')
        .select('id')
        .eq('user_id', userId)
        .eq('month', month)
        .maybeSingle()

      if (!mtRes.data) { setTransactions([]); setLoading(false); return }
      const mtId = mtRes.data.id
      setMonthlyTotalId(mtId)

      const [txRes, rulesRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('monthly_total_id', mtId)
          .order('date')
          .order('created_at'),
        supabase.from('exclusion_rules').select('id, pattern').eq('user_id', userId),
      ])

      if (txRes.error) throw new Error(txRes.error.message)
      setTransactions(txRes.data ?? [])
      setRules(rulesRes.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [month, userId])

  useEffect(() => { fetchData() }, [fetchData])

  function rulePattern(ruleId: string | null): string {
    if (!ruleId) return ''
    return rules.find(r => r.id === ruleId)?.pattern ?? ''
  }

  function startEdit(tx: TxRow, field: 'description' | 'amount') {
    setEdit({ id: tx.id, field, value: field === 'amount' ? String(tx.amount) : tx.description })
  }

  async function commitEdit() {
    if (!edit || !monthlyTotalId) return
    setSaving(true)
    try {
      const update =
        edit.field === 'amount'
          ? { amount: Math.abs(parseFloat(edit.value) || 0) }
          : { description: edit.value.trim() }

      const { error: err } = await supabase.from('transactions').update(update).eq('id', edit.id)
      if (err) throw new Error(err.message)
      await recalculateMonthTotal(monthlyTotalId, supabase)
      setEdit(null)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTx(id: string) {
    if (!window.confirm('Delete this transaction?') || !monthlyTotalId) return
    setSaving(true)
    try {
      const { error: err } = await supabase.from('transactions').delete().eq('id', id)
      if (err) throw new Error(err.message)
      await recalculateMonthTotal(monthlyTotalId, supabase)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  function handleReuploadClick() {
    if (!window.confirm(`Re-uploading will fully overwrite all transactions for ${month}. Continue?`)) return
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true); setError(null)
    try {
      await importFile(file, userId, supabase)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const totalSpent = transactions.filter(t => !t.excluded).reduce((s, t) => s + t.amount, 0)

  return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Link to="/months" className="back-link">← Months</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 className="page-title" style={{ marginBottom: 0 }}>{month}</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {uploading && <span className="col-muted" style={{ fontSize: '.85rem' }}>Uploading…</span>}
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleReuploadClick} disabled={uploading}>
            Re-upload file
          </button>
          <input ref={fileInputRef} type="file" accept=".xls,.xlsx" style={{ display: 'none' }} onChange={handleFileSelected} />
        </div>
      </div>

      {error && <div className="msg msg-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        {loading ? (
          <div className="spinner" style={{ margin: '20px auto' }} />
        ) : transactions.length === 0 ? (
          <p className="col-muted" style={{ fontSize: '.875rem' }}>No transactions for this month.</p>
        ) : (
          <>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title" style={{ margin: 0 }}>{transactions.length} transactions</span>
              <span className="num num-lg">Total: {fmt(totalSpent)}</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Excluded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} style={{ opacity: tx.excluded ? 0.55 : 1 }}>
                    <td style={{ fontSize: '.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{tx.date}</td>
                    <td>
                      {edit?.id === tx.id && edit.field === 'description' ? (
                        <input
                          className="inline-edit"
                          value={edit.value}
                          onChange={e => setEdit({ ...edit, value: e.target.value })}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEdit(null) }}
                          autoFocus
                          disabled={saving}
                        />
                      ) : (
                        <span
                          className="editable-cell"
                          onClick={() => startEdit(tx, 'description')}
                          title="Click to edit"
                        >
                          {tx.description}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {edit?.id === tx.id && edit.field === 'amount' ? (
                        <input
                          className="inline-edit"
                          type="number"
                          min="0"
                          step="0.01"
                          value={edit.value}
                          onChange={e => setEdit({ ...edit, value: e.target.value })}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEdit(null) }}
                          autoFocus
                          disabled={saving}
                          style={{ width: 90, textAlign: 'right' }}
                        />
                      ) : (
                        <span
                          className="num editable-cell"
                          onClick={() => startEdit(tx, 'amount')}
                          title="Click to edit"
                        >
                          {fmt(tx.amount)}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '.78rem', color: 'var(--over)' }}>
                      {tx.excluded && (
                        <span title={`Rule: ${rulePattern(tx.excluded_by_rule_id)}`}>
                          excluded{rulePattern(tx.excluded_by_rule_id) ? ` (${rulePattern(tx.excluded_by_rule_id)})` : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-ghost col-over"
                        style={{ fontSize: '.8rem' }}
                        onClick={() => deleteTx(tx.id)}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </AppLayout>
  )
}
