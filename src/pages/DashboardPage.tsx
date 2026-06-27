import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../contexts/useAuth'
import { useMonthlyData } from '../hooks/useMonthlyData'
import { CurrentMonthCard } from '../components/CurrentMonthCard'
import { AnnualProgressCard } from '../components/AnnualProgressCard'
import { HistoryStrip } from '../components/HistoryStrip'
import { YearOverYearCard } from '../components/YearOverYearCard'

export function DashboardPage() {
  const { user } = useAuth()
  const userId = user!.id
  const data = useMonthlyData(userId)

  return (
    <AppLayout>
      {data.error && (
        <div className="msg msg-error" style={{ marginBottom: 20 }}>{data.error}</div>
      )}
      {data.loading ? (
        <div className="spinner-wrap" style={{ minHeight: 300 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <CurrentMonthCard data={data} />
          <AnnualProgressCard
            year={data.currentMonth.slice(0, 4)}
            yearToDate={data.yearToDate}
            projectedAnnual={data.projectedAnnual}
            annualTarget={data.annualTarget}
          />
          <HistoryStrip
            history={data.history}
            budgetingMode={data.budgetingMode}
            currentMonth={data.currentMonth}
          />
          <YearOverYearCard history={data.history} />
        </>
      )}
    </AppLayout>
  )
}
