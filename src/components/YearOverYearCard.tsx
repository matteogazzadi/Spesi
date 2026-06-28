import type { Database } from '../lib/database.types'
import { useTranslation } from '../contexts/LanguageContext'

type MonthlyTotalRow = Database['public']['Tables']['monthly_totals']['Row']

interface Props {
  history: MonthlyTotalRow[]
}

const LINE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6']

export function YearOverYearCard({ history }: Props) {
  const { t, locale } = useTranslation()
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  // Generate locale-aware month abbreviations
  const monthLabels = Array.from({ length: 12 }, (_, mi) =>
    new Date(2000, mi, 1).toLocaleString(locale, { month: 'short' }).slice(0, 3)
  )

  const years = [...new Set(history.map(h => h.month.slice(0, 4)))].sort()
  if (years.length < 2) return null

  const visibleYears = years.slice(-4)

  const seriesData = visibleYears.map((year, i) => ({
    year,
    color: LINE_COLORS[i % LINE_COLORS.length],
    points: monthLabels.map((_, mi) => {
      const monthStr = `${year}-${String(mi + 1).padStart(2, '0')}`
      const entry = history.find(h => h.month === monthStr)
      return entry?.total_spent ?? null
    }),
  }))

  const allValues = seriesData.flatMap(s => s.points).filter((v): v is number => v !== null)
  if (allValues.length === 0) return null

  const maxVal = Math.max(...allValues)

  const W = 560
  const H = 100
  const PAD_LEFT = 4
  const PAD_RIGHT = 4
  const PAD_TOP = 8
  const PAD_BOT = 0
  const chartW = W - PAD_LEFT - PAD_RIGHT
  const chartH = H - PAD_TOP - PAD_BOT
  const xStep = chartW / 11

  function xPos(mi: number) { return PAD_LEFT + mi * xStep }
  function yPos(val: number) { return PAD_TOP + chartH - (val / maxVal) * chartH }

  function buildPolyline(points: (number | null)[]): string[] {
    const segments: string[] = []
    let current: string[] = []
    points.forEach((v, mi) => {
      if (v !== null) {
        current.push(`${xPos(mi).toFixed(1)},${yPos(v).toFixed(1)}`)
      } else {
        if (current.length > 0) {
          segments.push(current.join(' '))
          current = []
        }
      }
    })
    if (current.length > 0) segments.push(current.join(' '))
    return segments
  }

  return (
    <div className="card">
      <div className="yoy-header">
        <div className="card-title" style={{ marginBottom: 0 }}>{t('yoy.title')}</div>
        <div className="yoy-legend">
          {seriesData.map(s => (
            <span key={s.year} className="yoy-legend-item">
              <span className="yoy-legend-dot" style={{ background: s.color }} />
              {s.year}
            </span>
          ))}
        </div>
      </div>

      <div className="yoy-chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="yoy-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {seriesData.map(s => {
            const segments = buildPolyline(s.points)
            return (
              <g key={s.year}>
                {segments.map((pts, si) => (
                  <polyline
                    key={si}
                    points={pts}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                ))}
                {s.points.map((v, mi) =>
                  v !== null ? (
                    <circle
                      key={mi}
                      cx={xPos(mi).toFixed(1)}
                      cy={yPos(v).toFixed(1)}
                      r="3"
                      fill={s.color}
                      opacity="0.9"
                    >
                      <title>{`${s.year} ${monthLabels[mi]}: ${fmt(v)}`}</title>
                    </circle>
                  ) : null
                )}
              </g>
            )
          })}
        </svg>

        <div className="yoy-x-labels">
          {monthLabels.map((label) => (
            <span key={label} className="yoy-x-label">{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
