import { useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../contexts/useAuth'
import { useUserSettings } from '../hooks/useUserSettings'

export function SettingsPage() {
  const { user } = useAuth()
  const { budgetingMode, annualTarget, loading, saving, error, updateBudgetingMode, updateAnnualTarget } =
    useUserSettings(user!.id)

  const [targetInput, setTargetInput] = useState('')
  const [editingTarget, setEditingTarget] = useState(false)

  function startEditTarget() {
    setTargetInput(annualTarget != null ? String(annualTarget) : '')
    setEditingTarget(true)
  }

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault()
    const val = targetInput.trim()
    const parsed = val === '' ? null : parseFloat(val)
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) return
    await updateAnnualTarget(parsed)
    setEditingTarget(false)
  }

  return (
    <AppLayout>
      <h2 className="page-title">Settings</h2>

      <div className="settings-grid">
        <div className="card">
          <div className="card-title">Annual spending target</div>
          <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            Set a yearly budget ceiling. The dashboard will show your progress and whether
            you're on track.
          </p>

          {error && <div className="msg msg-error">{error}</div>}

          {loading ? (
            <div className="spinner" style={{ margin: '16px auto' }} />
          ) : editingTarget ? (
            <form onSubmit={saveTarget} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label>Target (€)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  placeholder="e.g. 20000"
                  autoFocus
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: 'auto', marginTop: 21 }}>
                {saving ? '…' : 'Save'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setEditingTarget(false)}
                style={{ marginTop: 21 }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {annualTarget != null
                    ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(annualTarget)
                    : <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 400 }}>Not set</span>
                  }
                </div>
                {annualTarget != null && (
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 2 }}>per year</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-action btn-action-save" onClick={startEditTarget}>
                  {annualTarget != null ? 'Edit' : 'Set target'}
                </button>
                {annualTarget != null && (
                  <button className="btn-action btn-action-del" onClick={() => updateAnnualTarget(null)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Budgeting mode</div>
          <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            Controls how historical averages are computed for the forecast.
          </p>

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
                    Forecast only looks at the last 12 months of data.
                  </span>
                </div>
              </label>

              {saving && <p className="col-muted" style={{ fontSize: '.8rem' }}>Saving…</p>}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
