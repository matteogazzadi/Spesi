import type { MonthlyDataResult } from '../hooks/useMonthlyData'

function fmt(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' })
}

interface Props {
  data: MonthlyDataResult
}

export function CurrentMonthCard({ data }: Props) {
  const { forecast, nextMonthForecast, currentMonth, nextMonth } = data

  return (
    <div className="budget-overview">
      <div className="card budget-card">
        <div className="card-title">Current month</div>
        <div className="budget-month-name">{monthLabel(currentMonth)}</div>
        <div className="budget-label">Your budget is</div>
        {forecast > 0 ? (
          <div className="num num-xl col-muted">{fmt(forecast)}</div>
        ) : (
          <div className="budget-empty">Add past months to get a forecast</div>
        )}
      </div>
      <div className="card budget-card">
        <div className="card-title">Next month</div>
        <div className="budget-month-name">{monthLabel(nextMonth)}</div>
        <div className="budget-label">Your budget is</div>
        {nextMonthForecast > 0 ? (
          <div className="num num-xl col-muted">{fmt(nextMonthForecast)}</div>
        ) : (
          <div className="budget-empty">Add past months to get a forecast</div>
        )}
      </div>
    </div>
  )
}
