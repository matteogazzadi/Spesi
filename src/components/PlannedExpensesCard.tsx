import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PlannedExpense } from '../hooks/useMonthlyData'
import { useTranslation } from '../contexts/LanguageContext'
import { useCurrency } from '../contexts/CurrencyContext'

function monthLabel(ym: string, locale: string): string {
  const [y, m] = ym.split('-')
  const s = new Date(Number(y), Number(m) - 1, 1).toLocaleString(locale, { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

type PctMode = 'full' | 'partial' | 'none'

interface Props {
  userId: string
  expenses: PlannedExpense[]
  currentMonth: string
  nextMonth: string
  onRefetch: () => void
}

export function PlannedExpensesCard({ userId, expenses, currentMonth, nextMonth, onRefetch }: Props) {
  const { t, locale } = useTranslation()
  const { currency } = useCurrency()
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [month, setMonth] = useState(nextMonth)
  const [pctMode, setPctMode] = useState<PctMode>('full')
  const [customPct, setCustomPct] = useState('50')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const unplannedPct = pctMode === 'full' ? 100 : pctMode === 'none' ? 0 : Math.max(0, Math.min(100, Number(customPct) || 0))
  const parsedAmount = parseFloat(amount)
  const impact = !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount * (unplannedPct / 100) : 0

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!desc.trim() || isNaN(parsedAmount) || parsedAmount <= 0 || !month) return
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('planned_expenses').insert({
      user_id: userId,
      month,
      description: desc.trim(),
      amount: parsedAmount,
      unplanned_pct: unplannedPct,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setDesc(''); setAmount(''); setPctMode('full'); setCustomPct('50')
    onRefetch()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('planned_expenses').delete().eq('id', id).eq('user_id', userId)
    setDeleting(null)
    onRefetch()
  }

  const upcoming = expenses.filter(e => e.month >= currentMonth)
  const byMonth = upcoming.reduce<Record<string, PlannedExpense[]>>((acc, e) => {
    acc[e.month] = [...(acc[e.month] ?? []), e]
    return acc
  }, {})
  const sortedMonths = Object.keys(byMonth).sort()

  return (
    <div className="card planned-card">
      <div className="card-title">{t('planned.title')}</div>

      {sortedMonths.length > 0 && (
        <div className="planned-list">
          {sortedMonths.map(m => {
            const items = byMonth[m]
            const totalExtra = items.reduce((s, e) => s + e.amount * (e.unplanned_pct / 100), 0)
            return (
              <div key={m} className="planned-month-group">
                <div className="planned-month-label">
                  {monthLabel(m, locale)}
                  {totalExtra > 0 && (
                    <span className="planned-month-extra">{t('planned.to_budget', { amount: fmt(totalExtra) })}</span>
                  )}
                </div>
                {items.map(e => {
                  const extra = e.amount * (e.unplanned_pct / 100)
                  return (
                    <div key={e.id} className="planned-item">
                      <div className="planned-item-info">
                        <span className="planned-item-desc">{e.description}</span>
                        <span className="planned-item-meta">
                          {fmt(e.amount)}
                          {e.unplanned_pct === 100 && ` ${t('planned.tag_full')}`}
                          {e.unplanned_pct === 0 && ` ${t('planned.tag_none')}`}
                          {e.unplanned_pct > 0 && e.unplanned_pct < 100 && ` ${t('planned.tag_pct', { pct: e.unplanned_pct, amount: fmt(extra) })}`}
                        </span>
                      </div>
                      <button
                        className="btn-action btn-action-del planned-del"
                        onClick={() => handleDelete(e.id)}
                        disabled={deleting === e.id}
                        aria-label="Remove"
                      >
                        {deleting === e.id ? '…' : '×'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      <form onSubmit={handleAdd} className="planned-form">
        <div className="planned-form-row">
          <input
            className="planned-input planned-input-desc"
            type="text"
            placeholder={t('planned.desc')}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            maxLength={120}
            required
          />
          <input
            className="planned-input planned-input-amount"
            type="number"
            placeholder={t('planned.amount')}
            min="0"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
          <input
            className="planned-input planned-input-month"
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            required
          />
        </div>

        <div className="planned-pct-row">
          <span className="planned-pct-label">{t('planned.above')}</span>
          <label className="planned-pct-option">
            <input type="radio" name="pct" checked={pctMode === 'full'} onChange={() => setPctMode('full')} />
            <span>{t('planned.full')}</span>
          </label>
          <label className="planned-pct-option">
            <input type="radio" name="pct" checked={pctMode === 'partial'} onChange={() => setPctMode('partial')} />
            <span>{t('planned.partial')}</span>
          </label>
          {pctMode === 'partial' && (
            <div className="planned-pct-custom">
              <input
                type="number"
                min="1"
                max="99"
                value={customPct}
                onChange={e => setCustomPct(e.target.value)}
                className="planned-pct-input"
              />
              <span>%</span>
            </div>
          )}
          <label className="planned-pct-option">
            <input type="radio" name="pct" checked={pctMode === 'none'} onChange={() => setPctMode('none')} />
            <span>{t('planned.none')}</span>
          </label>
        </div>

        {impact > 0 && (
          <div className="planned-impact">
            {t('planned.impact', { amount: fmt(impact), month: monthLabel(month, locale) })}
          </div>
        )}

        {error && <div className="msg msg-error" style={{ marginTop: 8, marginBottom: 0 }}>{error}</div>}

        <button className="btn btn-primary planned-submit" type="submit" disabled={saving}>
          {saving ? t('planned.adding') : t('planned.add')}
        </button>
      </form>
    </div>
  )
}
