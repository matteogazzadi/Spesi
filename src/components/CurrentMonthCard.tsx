import type { MonthlyDataResult } from '../hooks/useMonthlyData'

function fmt(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  data: MonthlyDataResult
}

export function CurrentMonthCard({ data }: Props) {
  const { forecast, actualSoFar, allocation, expectedByNow, pctElapsed, currentMonth } = data

  const [year, month] = currentMonth.split('-')
  const label = new Date(Number(year), Number(month) - 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' })

  const pctActual = forecast > 0 ? Math.min(actualSoFar / forecast, 1.5) : 0
  const pctExpected = Math.min(pctElapsed, 1)
  const isOver = actualSoFar > expectedByNow

  return (
    <div className="card">
      <div className="card-title">{label}</div>

      <div className="month-grid">
        <div className="month-stat">
          <span className="month-stat-label">Forecast</span>
          <span className={`num num-xl col-muted`}>{fmt(forecast)}</span>
        </div>
        <div className="month-stat">
          <span className="month-stat-label">Spent so far</span>
          <span className={`num num-xl ${isOver ? 'col-over' : 'col-under'}`}>{fmt(actualSoFar)}</span>
        </div>
        <div className="month-stat">
          <span className="month-stat-label">Set aside</span>
          <span className={`num num-xl ${allocation === 0 ? 'col-over' : ''}`}>{fmt(allocation)}</span>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-label">
          <span>Actual spend</span>
          <span>{Math.round(pctElapsed * 100)}% of month elapsed · expected {fmt(expectedByNow)}</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(pctActual * 100, 100)}%`,
              background: isOver ? 'var(--over)' : 'var(--under)',
            }}
          />
          <div
            className="progress-expected-marker"
            style={{ left: `${Math.min(pctExpected * 100, 99)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
