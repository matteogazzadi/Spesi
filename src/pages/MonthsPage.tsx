import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../contexts/useAuth'
import { useTranslation } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { importFile } from '../lib/importService'
import { UploadZone } from '../components/UploadZone'
import type { Database } from '../lib/database.types'

type MonthRow = Database['public']['Tables']['monthly_totals']['Row']

interface MonthWithStats extends MonthRow {
  txCount: number
  excludedCount: number
}

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function MonthsPage() {
  const { user } = useAuth()
  const { t, locale } = useTranslation()
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
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

  const [selectedYear, setSelectedYear] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

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

      const all = (monthsRes.data ?? []).map(m => ({
        ...m,
        txCount: counts.get(m.id)?.total ?? 0,
        excludedCount: counts.get(m.id)?.excluded ?? 0,
      }))
      setMonths(all)

      // Auto-select current year, or latest year with data
      if (!selectedYear && all.length > 0) {
        const currentYear = String(new Date().getFullYear())
        const hasCurrentYear = all.some(m => m.month.startsWith(currentYear))
        setSelectedYear(hasCurrentYear ? currentYear : all[0].month.slice(0, 4))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load months')
    } finally {
      setLoading(false)
    }
  }, [userId, selectedYear])

  useEffect(() => { fetchMonths() }, [fetchMonths])

  const years = [...new Set(months.map(m => m.month.slice(0, 4)))].sort((a, b) => b.localeCompare(a))
  const visible = months.filter(m => m.month.startsWith(selectedYear))

  // Medals: top 3 cheapest completed months (all-time, not just visible year)
  const currentYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const completedMonths = months.filter(m => m.month < currentYM)
  const medalMap = new Map<string, 1 | 2 | 3>()
  ;[...completedMonths].sort((a, b) => a.total_spent - b.total_spent).slice(0, 3).forEach((m, idx) => {
    medalMap.set(m.month, (idx + 1) as 1 | 2 | 3)
  })

  function exportCSV() {
    const rows = [
      ['Month', 'Total Spent (EUR)', 'Transactions', 'Last Updated'],
      ...months.map(m => [
        m.month,
        m.total_spent.toFixed(2),
        String(m.txCount),
        new Date(m.last_imported_at).toLocaleDateString('it-IT'),
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spesi-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
    // Switch to the year of the saved entry
    setSelectedYear(manualMonth.slice(0, 4))
    await fetchMonths()
  }

  function startEdit(m: MonthWithStats) {
    setEditingId(m.id)
    setEditAmount(String(m.total_spent))
    setEditNote(m.note ?? '')
  }

  async function saveEdit(m: MonthWithStats) {
    const amount = parseFloat(editAmount)
    if (isNaN(amount) || amount < 0) return
    setSavingEdit(true)
    const { error: err } = await supabase
      .from('monthly_totals')
      .update({ total_spent: amount, note: editNote.trim() || null, last_imported_at: new Date().toISOString() })
      .eq('id', m.id)
      .eq('user_id', userId)
    setSavingEdit(false)
    if (err) { setError(err.message); return }
    setEditingId(null)
    await fetchMonths()
  }

  async function handleDelete(m: MonthWithStats) {
    const label = m.txCount > 0
      ? `Delete ${m.month} and its ${m.txCount} transactions?`
      : `Delete ${m.month}?`
    if (!window.confirm(label + ' This cannot be undone.')) return
    const { error: err } = await supabase
      .from('monthly_totals')
      .delete()
      .eq('id', m.id)
      .eq('user_id', userId)
    if (err) { setError(err.message); return }
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
      <h2 className="page-title">{t('months.title')}</h2>

      <input ref={fileInputRef} type="file" accept=".xls,.xlsx" style={{ display: 'none' }} onChange={handleFileSelected} />

      <div className="add-month-grid">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">{t('months.add_manually')}</div>
          <form onSubmit={handleManualSave} className="manual-entry-form">
            <div className="form-group">
              <label>{t('months.month')}</label>
              <input
                type="month"
                value={manualMonth}
                onChange={e => setManualMonth(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('months.total')}</label>
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
              {savingManual ? t('months.saving') : t('months.save')}
            </button>
          </form>
          {manualError && <div className="msg msg-error" style={{ marginTop: 12, marginBottom: 0 }}>{manualError}</div>}
          {manualSuccess && <div className="msg msg-success" style={{ marginTop: 12, marginBottom: 0 }}>{manualSuccess}</div>}
        </div>

        <UploadZone userId={userId} onImported={fetchMonths} />
      </div>

      {error && <div className="msg msg-error" style={{ marginTop: 16 }}>{error}</div>}

      <div className="card" style={{ marginTop: 20 }}>
        {years.length > 1 && (
          <div className="year-tabs">
            {years.map(y => (
              <button
                key={y}
                className={`year-tab${selectedYear === y ? ' active' : ''}`}
                onClick={() => setSelectedYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        )}
        <div className="months-header">
          <div className="card-title" style={{ marginBottom: 0 }}>
            {selectedYear ? t('months.spending', { year: selectedYear }) : t('months.history')}
          </div>
          {months.length > 0 && (
            <button className="btn-action" onClick={exportCSV} title={t('common.export_csv')}>
              {t('common.export_csv')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="spinner" style={{ margin: '20px auto' }} />
        ) : visible.length === 0 ? (
          <p className="col-muted" style={{ fontSize: '.875rem' }}>{t('months.no_data', { year: selectedYear })}</p>
        ) : (
          <div className="months-list">
            {visible.map(m => {
              const isEditing = editingId === m.id
              const raw = new Date(m.month + '-01').toLocaleString(locale, { month: 'long', year: 'numeric' })
              const monthLabel = raw.charAt(0).toUpperCase() + raw.slice(1)
              const medal = medalMap.get(m.month)
              const txLabel = m.txCount === 1
                ? t('months.tx', { n: m.txCount })
                : t('months.tx_plural', { n: m.txCount })
              return (
                <div key={m.id} className="month-row">
                  <div className="month-row-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {m.txCount > 0
                        ? <Link to={`/months/${m.month}`} className="month-row-name month-link">{monthLabel}</Link>
                        : <span className="month-row-name">{monthLabel}</span>
                      }
                      {medal && (
                        <span
                          className="medal-badge"
                          title={t(`months.medal_title_${medal}`)}
                        >
                          {t(`months.medal_${medal}`)}
                        </span>
                      )}
                    </div>
                    <div className="month-row-meta">
                      {m.txCount > 0
                        ? `${txLabel}${m.excludedCount > 0 ? ` ${t('months.excl', { n: m.excludedCount })}` : ''}`
                        : t('months.manual')
                      }
                      {' · '}{t('months.updated', { date: fmtDate(m.last_imported_at, locale) })}
                    </div>
                    {medal && !isEditing && !m.note && (
                      <div className="medal-congrats">{t(`months.best_${medal}`)}</div>
                    )}
                    {isEditing ? (
                      <input
                        className="inline-edit month-note-edit"
                        type="text"
                        value={editNote}
                        onChange={e => setEditNote(e.target.value)}
                        placeholder={t('months.note')}
                        maxLength={200}
                        style={{ marginTop: 6, width: '100%' }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(m)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                    ) : m.note ? (
                      <div className="month-row-note">{m.note}</div>
                    ) : null}
                  </div>
                  <div className="month-row-right">
                    {isEditing ? (
                      <input
                        className="inline-edit"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        autoFocus
                        style={{ width: 110 }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(m)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                    ) : (
                      <span className="num month-row-amount">{fmt(m.total_spent)}</span>
                    )}
                    <div className="row-actions">
                      {isEditing ? (
                        <>
                          <button className="btn-action btn-action-save" onClick={() => saveEdit(m)} disabled={savingEdit}>
                            {savingEdit ? '…' : t('common.save')}
                          </button>
                          <button className="btn-action" onClick={() => setEditingId(null)}>{t('common.cancel')}</button>
                        </>
                      ) : (
                        <>
                          {m.txCount > 0 && (
                            <button
                              className="btn-action"
                              onClick={() => handleReuploadClick(m.month)}
                              disabled={uploading === m.month}
                            >
                              {uploading === m.month ? '…' : t('common.re_upload')}
                            </button>
                          )}
                          <button className="btn-action" onClick={() => startEdit(m)}>{t('common.edit')}</button>
                          <button className="btn-action btn-action-del" onClick={() => handleDelete(m)}>{t('common.delete')}</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
