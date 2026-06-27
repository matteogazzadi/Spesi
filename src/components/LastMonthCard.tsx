import type { LastMonthSummary } from '../hooks/useMonthlyData'

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function monthName(ym: string): string {
  const [y, m] = ym.split('-')
  const s = new Date(Number(y), Number(m) - 1, 1).toLocaleString('it-IT', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface Props {
  summary: LastMonthSummary
}

export function LastMonthCard({ summary }: Props) {
  const { month, actual, forecast } = summary
  const hasForecast = forecast > 0
  const delta = actual - forecast
  const deltaPct = forecast > 0 ? (delta / forecast) * 100 : 0
  const isOver = delta > 0

  return (
    <div className="card last-month-card">
      <div className="card-title" style={{ marginBottom: 12 }}>Last month · {monthName(month)}</div>
      <div className="last-month-row">
        <div className="last-month-stat">
          <div className="last-month-label">Actual</div>
          <div className="last-month-value num">{fmt(actual)}</div>
        </div>
        {hasForecast && (
          <>
            <div className="last-month-stat">
              <div className="last-month-label">Forecast was</div>
              <div className="last-month-value num col-muted">{fmt(forecast)}</div>
            </div>
            <div className="last-month-stat">
              <div className="last-month-label">Delta</div>
              <div
                className="last-month-value num"
                style={{ color: isOver ? 'var(--over)' : 'var(--accent)' }}
              >
                {isOver ? '+' : ''}{fmt(delta)}
                <span className="last-month-pct"> ({isOver ? '+' : ''}{deltaPct.toFixed(0)}%)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
