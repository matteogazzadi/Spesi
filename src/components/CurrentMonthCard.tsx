import type { MonthlyDataResult } from '../hooks/useMonthlyData'
import type { ConfidenceLevel } from '../lib/forecast'
import { useTranslation } from '../contexts/LanguageContext'

function monthName(ym: string, locale: string): string {
  const [y, m] = ym.split('-')
  const s = new Date(Number(y), Number(m) - 1, 1).toLocaleString(locale, { month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high:   '#10B981',
  medium: '#F59E0B',
  low:    '#94A3B8',
}

interface Props {
  data: MonthlyDataResult
}

export function CurrentMonthCard({ data }: Props) {
  const { t, locale } = useTranslation()
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  const { forecast, adjustedForecast, nextMonthForecast, nextMonthAdjustedForecast,
          currentMonth, nextMonth, confidence, trendPct, forecastLow, forecastHigh } = data
  const confColor = CONFIDENCE_COLORS[confidence]
  const hasExtras = adjustedForecast > forecast
  const nextHasExtras = nextMonthAdjustedForecast > nextMonthForecast

  return (
    <div className="forecast-hero">
      <div className="forecast-hero-label">{t('forecast.title')}</div>

      <div className="forecast-hero-month">{monthName(currentMonth, locale)}</div>

      {forecast > 0 ? (
        <>
          <div className="forecast-hero-amount num">{fmt(hasExtras ? adjustedForecast : forecast)}</div>
          {hasExtras && (
            <div className="forecast-hero-extras">
              {t('forecast.base_extras', { amount: fmt(forecast) })}
            </div>
          )}
        </>
      ) : (
        <div className="forecast-hero-empty">{t('forecast.empty')}</div>
      )}

      <div className="forecast-hero-confidence">
        <span className="confidence-dot" style={{ background: confColor }} />
        {t(`confidence.${confidence}`)}
        {trendPct !== null && (
          <span className={`trend-badge ${trendPct > 0 ? 'trend-up' : 'trend-down'}`}>
            {trendPct > 0 ? '↑' : '↓'} {Math.abs(trendPct).toFixed(0)}%
          </span>
        )}
      </div>

      {forecastLow !== null && forecastHigh !== null && forecast > 0 && (
        <div className="forecast-range">
          <span className="forecast-range-label">{t('forecast.range_label')}:</span>
          <span className="forecast-range-low" title={t('forecast.low_conf')}>{fmt(forecastLow)}</span>
          <span className="forecast-range-sep">–</span>
          <span className="forecast-range-high" title={t('forecast.high_conf')}>{fmt(forecastHigh)}</span>
        </div>
      )}

      {nextMonthForecast > 0 && (
        <div className="forecast-hero-next">
          {monthName(nextMonth, locale)}: {fmt(nextHasExtras ? nextMonthAdjustedForecast : nextMonthForecast)}
          {nextHasExtras && ` ${t('forecast.next_incl')}`}
        </div>
      )}
    </div>
  )
}
