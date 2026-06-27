import { useAuth } from '../contexts/useAuth'
import { useMonthlyData } from '../hooks/useMonthlyData'
import { CurrentMonthCard } from '../components/CurrentMonthCard'
import { HistoryStrip } from '../components/HistoryStrip'
import { UploadZone } from '../components/UploadZone'

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const userId = user!.id
  const data = useMonthlyData(userId)

  return (
    <>
      <header className="app-header">
        <h1>Spesi</h1>
        <button className="btn-ghost" onClick={signOut}>Sign out</button>
      </header>

      <main className="app-main">
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
            <HistoryStrip
              history={data.history}
              budgetingMode={data.budgetingMode}
              currentMonth={data.currentMonth}
            />
            <UploadZone userId={userId} onImported={data.refetch} />
          </>
        )}
      </main>
    </>
  )
}
