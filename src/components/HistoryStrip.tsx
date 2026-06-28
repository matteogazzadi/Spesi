import { computeForecast } from '../lib/forecast'
import type { BudgetingMode } from '../lib/forecast'
import type { Database } from '../lib/database.types'
import { useTranslation } from '../contexts/LanguageContext'

type MonthlyTotalRow = Database['public']['Tables']['monthly_totals']['Row']

interface Props {
  history: MonthlyTotalRow[]
  budgetingMode: BudgetingMode
  currentMonth: string
}

function shortLabel(month: string, locale: string): string {
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString(locale, { month: 'short' })
    .slice(0, 3)
}

export function HistoryStrip({ history, budgetingMode, currentMonth }: Props) {
  const { t, locale } = useTranslation()
  const past = history.filter((h) => h.month < currentMonth)
  const recent = past.slice(-12)

  if (recent.length === 0) {
    return (
      <div className="card">
        <div className="card-title">{t('history.title')}</div>
        <p className="col-muted" style={{ fontSize: '.875rem' }}>
          {t('history.empty')}
        </p>
      </div>
    )
  }

  const barsData = recent.map((h) => {
    const before = past.slice(0, past.indexOf(h)).map((e) => ({
      month: e.month,
      totalSpent: e.total_spent,
    }))
    const forecast = computeForecast(h.month, before, budgetingMode)
    const delta = forecast > 0 ? Math.round(((h.total_spent - forecast) / forecast) * 100) : null
    return {
      month: h.month,
      actual: h.total_spent,
      forecast,
      delta,
      isOver: h.total_spent > forecast && forecast > 0,
    }
  })

  const maxVal = Math.max(...barsData.map((b) => Math.max(b.actual, b.forecast)), 1)

  return (
    <div className="card">
      <div className="card-title">{t('history.title')}</div>
      <div className="history-strip-scroll">
      <div className="history-strip">
        {barsData.map((b) => {
          const actualPct = (b.actual / maxVal) * 100
          const forecastPct = (b.forecast / maxVal) * 100
          return (
            <div
              key={b.month}
              className="history-bar-wrap"
              title={`${b.month}: €${Math.round(b.actual)}${b.delta !== null ? ` (${b.delta > 0 ? '+' : ''}${b.delta}%)` : ''}`}
            >
              {b.delta !== null && (
                <div
                  className="history-bar-delta"
                  style={{ color: b.isOver ? 'var(--over)' : 'var(--under)' }}
                >
                  {b.delta > 0 ? '+' : ''}{b.delta}%
                </div>
              )}
              <div className="history-bar-area">
                <div
                  className="history-bar-actual"
                  style={{
                    height: `${actualPct}%`,
                    background: b.isOver ? 'var(--over)' : 'var(--under)',
                    opacity: 0.8,
                  }}
                />
                {b.forecast > 0 && (
                  <div
                    className="history-forecast-line"
                    style={{ bottom: `${forecastPct}%` }}
                  />
                )}
              </div>
              <span className="history-bar-label">{shortLabel(b.month, locale)}</span>
            </div>
          )
        })}
      </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: '.72rem', color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: 'var(--under)', borderRadius: 2, display: 'inline-block', opacity: .8 }} />
          {t('history.under')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: 'var(--over)', borderRadius: 2, display: 'inline-block', opacity: .8 }} />
          {t('history.over')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 16, height: 2, background: 'var(--text-muted)', display: 'inline-block', opacity: .5 }} />
          {t('history.forecast')}
        </span>
      </div>
    </div>
  )
}
