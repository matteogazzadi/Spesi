import { useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../contexts/useAuth'
import { useUserSettings } from '../hooks/useUserSettings'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from '../contexts/LanguageContext'
import { LANGUAGES, type LangCode } from '../lib/translations'
import { LifeShiftsCard } from '../components/LifeShiftsCard'

export function SettingsPage() {
  const { user } = useAuth()
  const { budgetingMode, annualTarget, loading, saving, error, updateBudgetingMode, updateAnnualTarget } =
    useUserSettings(user!.id)
  const { theme, toggleTheme } = useTheme()
  const { t, lang, locale, setLang } = useTranslation()

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

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
      <h2 className="page-title">{t('settings.title')}</h2>

      <div className="settings-grid">
        <div className="card">
          <div className="card-title">{t('settings.annual')}</div>
          <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            {t('settings.annual_desc')}
          </p>

          {error && <div className="msg msg-error">{error}</div>}

          {loading ? (
            <div className="spinner" style={{ margin: '16px auto' }} />
          ) : editingTarget ? (
            <form onSubmit={saveTarget} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label>{t('settings.target_label')}</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  placeholder={t('settings.target_ph')}
                  autoFocus
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: 'auto', marginTop: 21 }}>
                {saving ? t('common.saving') : t('common.save')}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setEditingTarget(false)}
                style={{ marginTop: 21 }}
              >
                {t('common.cancel')}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {annualTarget != null
                    ? fmt(annualTarget)
                    : <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 400 }}>{t('common.not_set')}</span>
                  }
                </div>
                {annualTarget != null && (
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{t('common.per_year')}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-action btn-action-save" onClick={startEditTarget}>
                  {annualTarget != null ? t('common.edit') : t('settings.set')}
                </button>
                {annualTarget != null && (
                  <button className="btn-action btn-action-del" onClick={() => updateAnnualTarget(null)}>
                    {t('settings.remove')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">{t('settings.mode')}</div>
          <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            {t('settings.mode_desc')}
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
                  <span className="radio-label">{t('settings.all_time')}</span>
                  <span className="radio-desc">{t('settings.all_time_desc')}</span>
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
                  <span className="radio-label">{t('settings.rolling')}</span>
                  <span className="radio-desc">{t('settings.rolling_desc')}</span>
                </div>
              </label>

              {saving && <p className="col-muted" style={{ fontSize: '.8rem' }}>{t('common.saving')}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">{t('settings.appearance')}</div>
        <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          {t('settings.appearance_desc')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="radio-option">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === 'light'}
              onChange={() => theme !== 'light' && toggleTheme()}
            />
            <div>
              <span className="radio-label">{t('settings.light')}</span>
              <span className="radio-desc">{t('settings.light_desc')}</span>
            </div>
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === 'dark'}
              onChange={() => theme !== 'dark' && toggleTheme()}
            />
            <div>
              <span className="radio-label">{t('settings.dark')}</span>
              <span className="radio-desc">{t('settings.dark_desc')}</span>
            </div>
          </label>
        </div>
      </div>

      <LifeShiftsCard userId={user!.id} />

      <div className="card">
        <div className="card-title">{t('settings.language')}</div>
        <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          {t('settings.language_desc')}
        </p>
        <div className="lang-grid">
          {(Object.entries(LANGUAGES) as [LangCode, string][]).map(([code, name]) => (
            <button
              key={code}
              className={`lang-option${lang === code ? ' active' : ''}`}
              onClick={() => setLang(code)}
            >
              <span className="lang-code">{code.toUpperCase()}</span>
              <span className="lang-name">{name}</span>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
