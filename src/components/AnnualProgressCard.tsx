import { useTranslation } from '../contexts/LanguageContext'

interface Props {
  year: string
  yearToDate: number
  projectedAnnual: number
  annualTarget: number | null
  currentMonth: string
}

export function AnnualProgressCard({ year, yearToDate, projectedAnnual, annualTarget, currentMonth }: Props) {
  const { t, locale } = useTranslation()
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  if (!annualTarget && yearToDate === 0 && projectedAnnual === 0) return null

  const target = annualTarget ?? projectedAnnual
  const pct = target > 0 ? Math.min((yearToDate / target) * 100, 100) : 0
  const projectedPct = target > 0 ? Math.min((projectedAnnual / target) * 100, 100) : 0
  const isOver = annualTarget != null && projectedAnnual > annualTarget
  const delta = annualTarget != null ? projectedAnnual - annualTarget : 0

  const currentMonthNum = Number(currentMonth.slice(5, 7))
  const monthsRemaining = 13 - currentMonthNum
  const budgetRemaining = annualTarget != null ? Math.max(0, annualTarget - yearToDate) : null
  const monthlyAllowance = budgetRemaining != null && monthsRemaining > 0
    ? budgetRemaining / monthsRemaining
    : null

  return (
    <div className="card annual-card">
      <div className="annual-card-header">
        <div className="card-title" style={{ marginBottom: 0 }}>{t('annual.spending', { year })}</div>
        {annualTarget && (
          <div className="annual-target-badge">
            {t('annual.target', { amount: fmt(annualTarget) })}
          </div>
        )}
      </div>

      <div className="annual-amounts">
        <div>
          <div className="annual-amount-label">{t('annual.spent')}</div>
          <div className="annual-amount-value num">{fmt(yearToDate)}</div>
        </div>
        <div>
          <div className="annual-amount-label">{t('annual.projected')}</div>
          <div className="annual-amount-value num" style={{ color: isOver ? 'var(--over)' : 'inherit' }}>
            {fmt(projectedAnnual)}
          </div>
        </div>
        {annualTarget && (
          <div>
            <div className="annual-amount-label">{isOver ? t('annual.over') : t('annual.under')}</div>
            <div
              className="annual-amount-value num"
              style={{ color: isOver ? 'var(--over)' : 'var(--accent)' }}
            >
              {isOver ? '+' : '-'}{fmt(Math.abs(delta))}
            </div>
          </div>
        )}
      </div>

      {annualTarget && (
        <div className="annual-progress-wrap">
          <div className="annual-progress-track">
            <div
              className="annual-progress-spent"
              style={{ width: `${pct}%` }}
            />
            {projectedPct > pct && (
              <div
                className="annual-progress-projected"
                style={{ left: `${pct}%`, width: `${projectedPct - pct}%` }}
              />
            )}
          </div>
          <div className="annual-progress-legend">
            <span><span className="legend-dot" style={{ background: 'var(--accent)' }} />{t('annual.spent_pct', { pct: pct.toFixed(0) })}</span>
            <span><span className="legend-dot" style={{ background: 'var(--border)', border: '1.5px dashed var(--text-muted)' }} />{t('annual.projected_label')}</span>
          </div>
        </div>
      )}

      {monthlyAllowance != null && monthsRemaining > 1 && (
        <div className="budget-runway">
          <span className="budget-runway-label">{t('annual.allowance')}</span>
          <span className="budget-runway-value num">{fmt(monthlyAllowance)}</span>
          <span className="budget-runway-sub">{t('annual.remaining', { n: monthsRemaining })}</span>
        </div>
      )}
    </div>
  )
}
