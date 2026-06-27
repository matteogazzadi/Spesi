import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../contexts/useAuth'
import { supabase } from '../lib/supabase'
import { importFile } from '../lib/importService'
import { UploadZone } from '../components/UploadZone'
import type { Database } from '../lib/database.types'

type MonthRow = Database['public']['Tables']['monthly_totals']['Row']

interface MonthWithStats extends MonthRow {
  txCount: number
  excludedCount: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function MonthsPage() {
  const { user } = useAuth()
  const userId = user!.id
  const [months, setMonths] = useState<MonthWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingMonthRef = useRef<string | null>(null)

  const [manualMonth, setManualMonth] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [savingManual, setSavingManual] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualSuccess, setManualSuccess] = useState<string | null>(null)

  const fetchMonths = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [monthsRes, txRes] = await Promise.all([
        supabase.from('monthly_totals').select('*').eq('user_id', userId).order('month', { ascending: false }),
        supabase.from('transactions').select('monthly_total_id, excluded').eq('user_id', userId),
      ])
      if (monthsRes.error) throw new Error(monthsRes.error.message)

      const counts = new Map<string, { total: number; excluded: number }>()
      for (const tx of txRes.data ?? []) {
        const curr = counts.get(tx.monthly_total_id) ?? { total: 0, excluded: 0 }
        curr.total++
        if (tx.excluded) curr.excluded++
        counts.set(tx.monthly_total_id, curr)
      }

      setMonths(
        (monthsRes.data ?? []).map(m => ({
          ...m,
          txCount: counts.get(m.id)?.total ?? 0,
          excludedCount: counts.get(m.id)?.excluded ?? 0,
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load months')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchMonths() }, [fetchMonths])

  async function handleManualSave(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(manualAmount)
    if (!manualMonth || isNaN(amount) || amount < 0) return
    setSavingManual(true); setManualError(null); setManualSuccess(null)
    const { error: err } = await supabase
      .from('monthly_totals')
      .upsert(
        { user_id: userId, month: manualMonth, total_spent: amount, last_imported_at: new Date().toISOString() },
        { onConflict: 'user_id,month' },
      )
    setSavingManual(false)
    if (err) { setManualError(err.message); return }
    setManualSuccess(`Saved ${manualMonth}`)
    setManualMonth(''); setManualAmount('')
    await fetchMonths()
  }

  function handleReuploadClick(month: string) {
    if (!window.confirm(`Re-uploading will fully overwrite all transactions for ${month}. Continue?`)) return
    pendingMonthRef.current = month
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pendingMonthRef.current) return
    e.target.value = ''
    const month = pendingMonthRef.current
    pendingMonthRef.current = null
    setUploading(month)
    try {
      await importFile(file, userId, supabase)
      await fetchMonths()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  return (
    <AppLayout>
      <h2 className="page-title">Months</h2>

      <input ref={fileInputRef} type="file" accept=".xls,.xlsx" style={{ display: 'none' }} onChange={handleFileSelected} />

      <div className="add-month-grid">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">Add month manually</div>
          <form onSubmit={handleManualSave} className="manual-entry-form">
            <div className="form-group">
              <label>Month</label>
              <input
                type="month"
                value={manualMonth}
                onChange={e => setManualMonth(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Total spent (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualAmount}
                onChange={e => setManualAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <button className="btn btn-primary manual-submit" type="submit" disabled={savingManual}>
              {savingManual ? 'Saving…' : 'Save'}
            </button>
          </form>
          {manualError && <div className="msg msg-error" style={{ marginTop: 12, marginBottom: 0 }}>{manualError}</div>}
          {manualSuccess && <div className="msg msg-success" style={{ marginTop: 12, marginBottom: 0 }}>{manualSuccess}</div>}
        </div>

        <UploadZone userId={userId} onImported={fetchMonths} />
      </div>

      {error && <div className="msg msg-error" style={{ marginTop: 16 }}>{error}</div>}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">History</div>
        {loading ? (
          <div className="spinner" style={{ margin: '20px auto' }} />
        ) : months.length === 0 ? (
          <p className="col-muted" style={{ fontSize: '.875rem' }}>No months added yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th style={{ textAlign: 'right' }}>Total spent</th>
                <th style={{ textAlign: 'right' }}>Transactions</th>
                <th>Last updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.id}>
                  <td>
                    {m.txCount > 0
                      ? <Link to={`/months/${m.month}`} className="month-link">{m.month}</Link>
                      : <span>{m.month}</span>
                    }
                  </td>
                  <td style={{ textAlign: 'right' }}><span className="num">{fmt(m.total_spent)}</span></td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '.875rem' }}>
                    {m.txCount > 0 ? (
                      <>
                        {m.txCount}
                        {m.excludedCount > 0 && (
                          <span style={{ color: 'var(--over)', marginLeft: 4 }}>({m.excludedCount} excl.)</span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontStyle: 'italic' }}>manual</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{fmtDate(m.last_imported_at)}</td>
                  <td>
                    {m.txCount > 0 && (
                      <button
                        className="btn-ghost"
                        onClick={() => handleReuploadClick(m.month)}
                        disabled={uploading === m.month}
                      >
                        {uploading === m.month ? 'Uploading…' : 'Re-upload'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  )
}
