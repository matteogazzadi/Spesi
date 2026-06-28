import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { useTranslation } from '../contexts/LanguageContext'

type BaselineAdjustment = Database['public']['Tables']['baseline_adjustments']['Row']

interface Props {
  userId: string
}

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function LifeShiftsCard({ userId }: Props) {
  const { t, locale } = useTranslation()
  const fmtAmt = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      signDisplay: 'always',
      maximumFractionDigits: 0,
    }).format(n)

  const [adjustments, setAdjustments] = useState<BaselineAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [startMonth, setStartMonth] = useState(currentYearMonth())
  const [endMonth, setEndMonth] = useState('')

  useEffect(() => {
    supabase
      .from('baseline_adjustments')
      .select('*')
      .eq('user_id', userId)
      .order('start_month', { ascending: true })
      .then(({ data }) => {
        setAdjustments(data ?? [])
        setLoading(false)
      })
  }, [userId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt === 0 || !desc.trim() || !startMonth) return
    setAdding(true)
    const { data, error } = await supabase
      .from('baseline_adjustments')
      .insert({
        user_id: userId,
        description: desc.trim(),
        amount: amt,
        start_month: startMonth,
        end_month: endMonth || null,
      })
      .select()
      .single()
    setAdding(false)
    if (error || !data) return
    setAdjustments((prev) => [...prev, data].sort((a, b) => a.start_month.localeCompare(b.start_month)))
    setDesc('')
    setAmount('')
    setStartMonth(currentYearMonth())
    setEndMonth('')
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('baseline_adjustments').delete().eq('id', id)
    setAdjustments((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="card">
      <div className="card-title">{t('life.title')}</div>
      <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
        {t('life.desc')}
      </p>

      {loading ? (
        <div className="spinner" style={{ margin: '16px auto' }} />
      ) : (
        <>
          {adjustments.length === 0 && !showForm && (
            <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              {t('life.empty')}
            </p>
          )}

          {adjustments.length > 0 && (
            <div className="life-shifts-list">
              {adjustments.map((a) => (
                <div key={a.id} className="life-shift-row">
                  <div className="life-shift-info">
                    <span className="life-shift-desc">{a.description}</span>
                    <span className="life-shift-range">
                      {t('life.from')} {a.start_month}
                      {a.end_month ? ` → ${a.end_month}` : ` (${t('life.permanent')})`}
                    </span>
                  </div>
                  <span
                    className="life-shift-amount"
                    style={{ color: a.amount >= 0 ? 'var(--over)' : 'var(--accent)' }}
                  >
                    {fmtAmt(a.amount)}/mo
                  </span>
                  <button
                    className="btn-action btn-action-del"
                    onClick={() => handleDelete(a.id)}
                    title={t('common.delete')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {showForm ? (
            <form className="life-shift-form" onSubmit={handleAdd}>
              <div className="form-group">
                <label>{t('life.desc_col')}</label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder={t('life.desc_ph')}
                  required
                  autoFocus
                />
              </div>
              <div className="life-shift-form-row">
                <div className="form-group">
                  <label>{t('life.amount_col')}</label>
                  <input
                    type="number"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t('life.amount_ph')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('life.from')}</label>
                  <input
                    type="month"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('life.to')}</label>
                  <input
                    type="month"
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    min={startMonth}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" type="submit" disabled={adding} style={{ width: 'auto' }}>
                  {adding ? t('life.adding') : t('common.save')}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <button className="btn-ghost" style={{ marginTop: adjustments.length > 0 ? 12 : 0 }} onClick={() => setShowForm(true)}>
              {t('life.add')}
            </button>
          )}
        </>
      )}
    </div>
  )
}
