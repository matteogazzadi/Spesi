import { useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../contexts/useAuth'
import { useExclusionRules } from '../hooks/useExclusionRules'

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export function RulesPage() {
  const { user } = useAuth()
  const { rules, loading, error, addRule, toggleRule, deleteRule } = useExclusionRules(user!.id)

  const [pattern, setPattern] = useState('')
  const [matchType, setMatchType] = useState<'contains' | 'exact'>('contains')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!pattern.trim()) return
    setAdding(true); setAddError('')
    try {
      await addRule(pattern.trim(), matchType)
      setPattern('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add rule')
    } finally {
      setAdding(false)
    }
  }

  return (
    <AppLayout>
      <h2 className="page-title">Exclusion rules</h2>
      <p className="page-subtitle">
        Transactions matching a rule are excluded from monthly totals. They remain visible but don't count toward your spending.
      </p>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Add rule</div>
        {addError && <div className="msg msg-error">{addError}</div>}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <label>Description pattern</label>
            <input
              type="text"
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="e.g. Affitto Mario"
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Match type</label>
            <select
              value={matchType}
              onChange={e => setMatchType(e.target.value as 'contains' | 'exact')}
              className="select-input"
            >
              <option value="contains">Contains</option>
              <option value="exact">Exact</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={adding} style={{ width: 'auto' }}>
            {adding ? 'Adding…' : 'Add rule'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Active rules</div>
        {error && <div className="msg msg-error">{error}</div>}
        {loading ? (
          <div className="spinner" style={{ margin: '20px auto' }} />
        ) : rules.length === 0 ? (
          <p className="col-muted" style={{ fontSize: '.875rem' }}>No rules yet. Add one above.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Pattern</th>
                <th>Match</th>
                <th>Impact</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id} style={{ opacity: rule.active ? 1 : 0.5 }}>
                  <td><code className="pattern">{rule.pattern}</code></td>
                  <td><span className="badge">{rule.match_type}</span></td>
                  <td>
                    {rule.impactCount > 0 ? (
                      <span className="impact-badge">
                        {rule.impactCount} tx · {fmt(rule.impactAmount)}
                      </span>
                    ) : (
                      <span className="col-muted" style={{ fontSize: '.8rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={rule.active}
                        onChange={e => toggleRule(rule.id, e.target.checked)}
                      />
                      <span className="toggle-track" />
                    </label>
                  </td>
                  <td>
                    <button
                      className="btn-ghost col-over"
                      onClick={() => {
                        if (window.confirm(`Delete rule "${rule.pattern}"?`)) deleteRule(rule.id)
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  )
}
