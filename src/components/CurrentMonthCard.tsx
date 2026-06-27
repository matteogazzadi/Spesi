import type { MonthlyDataResult } from '../hooks/useMonthlyData'

function fmt(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function monthName(ym: string): string {
  const [y, m] = ym.split('-')
  const s = new Date(Number(y), Number(m) - 1, 1).toLocaleString('it-IT', { month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface Props {
  data: MonthlyDataResult
}

export function CurrentMonthCard({ data }: Props) {
  const { forecast, nextMonthForecast, currentMonth, nextMonth } = data

  return (
    <div className="forecast-hero">
      <div className="forecast-current">
        <span className="forecast-month">{monthName(currentMonth)}</span>
        <span className="forecast-sep">:</span>
        {forecast > 0 ? (
          <span className="forecast-amount num">{fmt(forecast)}</span>
        ) : (
          <span className="forecast-no-data">add past months to see your forecast</span>
        )}
      </div>
      {nextMonthForecast > 0 && (
        <div className="forecast-next">
          {monthName(nextMonth)}: {fmt(nextMonthForecast)}
        </div>
      )}
    </div>
  )
}
