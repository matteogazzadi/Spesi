import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../contexts/useAuth'
import { useUserSettings } from '../hooks/useUserSettings'

export function SettingsPage() {
  const { user } = useAuth()
  const { budgetingMode, loading, saving, error, updateBudgetingMode } = useUserSettings(user!.id)

  return (
    <AppLayout>
      <h2 className="page-title">Settings</h2>

      <div className="card" style={{ marginTop: 20, maxWidth: 480 }}>
        <div className="card-title">Budgeting mode</div>
        <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Controls how historical averages are computed for the forecast.
        </p>

        {error && <div className="msg msg-error">{error}</div>}

        {loading ? (
          <div className="spinner" style={{ margin: '16px auto' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="radio-option">
              <input
                type="radio"
                name="budgetingMode"
                value="all_time"
                checked={budgetingMode === 'all_time'}
                onChange={() => updateBudgetingMode('all_time')}
                disabled={saving}
              />
              <div>
                <span className="radio-label">All-time</span>
                <span className="radio-desc">
                  Forecast uses every past occurrence of this calendar month across all years.
                </span>
              </div>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                name="budgetingMode"
                value="rolling_12mo"
                checked={budgetingMode === 'rolling_12mo'}
                onChange={() => updateBudgetingMode('rolling_12mo')}
                disabled={saving}
              />
              <div>
                <span className="radio-label">Rolling 12 months</span>
                <span className="radio-desc">
                  Forecast only looks at the last 12 months of data. Falls back to the
                  12-month overall average if fewer than 2 matching months are available.
                </span>
              </div>
            </label>

            {saving && <p className="col-muted" style={{ fontSize: '.8rem' }}>Saving…</p>}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
