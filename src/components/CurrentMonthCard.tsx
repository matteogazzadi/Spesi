import type { MonthlyDataResult } from '../hooks/useMonthlyData'
import type { ConfidenceLevel } from '../lib/forecast'

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function monthName(ym: string): string {
  const [y, m] = ym.split('-')
  const s = new Date(Number(y), Number(m) - 1, 1).toLocaleString('it-IT', { month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; color: string }> = {
  high:   { label: 'High confidence',   color: '#10B981' },
  medium: { label: 'Medium confidence', color: '#F59E0B' },
  low:    { label: 'Low confidence',    color: '#94A3B8' },
}

interface Props {
  data: MonthlyDataResult
}

export function CurrentMonthCard({ data }: Props) {
  const { forecast, adjustedForecast, nextMonthForecast, nextMonthAdjustedForecast, currentMonth, nextMonth, confidence, trendPct } = data
  const conf = CONFIDENCE_CONFIG[confidence]
  const hasExtras = adjustedForecast > forecast
  const nextHasExtras = nextMonthAdjustedForecast > nextMonthForecast

  return (
    <div className="forecast-hero">
      <div className="forecast-hero-label">Budget forecast</div>

      <div className="forecast-hero-month">{monthName(currentMonth)}</div>

      {forecast > 0 ? (
        <>
          <div className="forecast-hero-amount num">{fmt(hasExtras ? adjustedForecast : forecast)}</div>
          {hasExtras && (
            <div className="forecast-hero-extras">
              Base {fmt(forecast)} + planned extras
            </div>
          )}
        </>
      ) : (
        <div className="forecast-hero-empty">Add past months to see your forecast</div>
      )}

      <div className="forecast-hero-confidence">
        <span className="confidence-dot" style={{ background: conf.color }} />
        {conf.label}
        {trendPct !== null && (
          <span className={`trend-badge ${trendPct > 0 ? 'trend-up' : 'trend-down'}`}>
            {trendPct > 0 ? '↑' : '↓'} {Math.abs(trendPct).toFixed(0)}%
          </span>
        )}
      </div>

      {nextMonthForecast > 0 && (
        <div className="forecast-hero-next">
          {monthName(nextMonth)}: {fmt(nextHasExtras ? nextMonthAdjustedForecast : nextMonthForecast)}
          {nextHasExtras && ' (incl. extras)'}
        </div>
      )}
    </div>
  )
}
