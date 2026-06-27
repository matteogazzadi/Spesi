import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../contexts/useAuth'
import { supabase } from '../lib/supabase'
import { importFile } from '../lib/importService'
import type { Database } from '../lib/database.types'

type MonthRow = Database['public']['Tables']['monthly_totals']['Row']

interface MonthWithStats extends MonthRow {
  txCount: number
  excludedCount: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
      <h2 className="page-title">Loaded months</h2>

      <input ref={fileInputRef} type="file" accept=".xls,.xlsx" style={{ display: 'none' }} onChange={handleFileSelected} />

      {error && <div className="msg msg-error" style={{ marginTop: 16 }}>{error}</div>}

      <div className="card" style={{ marginTop: 20 }}>
        {loading ? (
          <div className="spinner" style={{ margin: '20px auto' }} />
        ) : months.length === 0 ? (
          <p className="col-muted" style={{ fontSize: '.875rem' }}>No data imported yet. Upload a file from the dashboard.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th style={{ textAlign: 'right' }}>Total spent</th>
                <th style={{ textAlign: 'right' }}>Transactions</th>
                <th>Last import</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.id}>
                  <td>
                    <Link to={`/months/${m.month}`} className="month-link">{m.month}</Link>
                  </td>
                  <td style={{ textAlign: 'right' }}><span className="num">{fmt(m.total_spent)}</span></td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '.875rem' }}>
                    {m.txCount}
                    {m.excludedCount > 0 && <span style={{ color: 'var(--over)', marginLeft: 4 }}>({m.excludedCount} excl.)</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{fmtDate(m.last_imported_at)}</td>
                  <td>
                    <button
                      className="btn-ghost"
                      onClick={() => handleReuploadClick(m.month)}
                      disabled={uploading === m.month}
                    >
                      {uploading === m.month ? 'Uploading…' : 'Re-upload'}
                    </button>
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
