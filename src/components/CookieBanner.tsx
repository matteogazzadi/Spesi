import { useState } from 'react'
import { useTranslation } from '../contexts/LanguageContext'

const CONSENT_KEY = 'spesi-consent'
const CONSENT_VERSION = 'v1'

export function CookieBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(
    () => localStorage.getItem(CONSENT_KEY) !== CONSENT_VERSION,
  )
  const [showDetails, setShowDetails] = useState(false)

  if (!visible) return null

  function accept() {
    localStorage.setItem(CONSENT_KEY, CONSENT_VERSION)
    setVisible(false)
  }

  const cookies = [
    {
      name: 'sb-access-token',
      purpose: t('cookie.c1.purpose'),
      duration: '1 h',
      type: t('cookie.necessary'),
    },
    {
      name: 'sb-refresh-token',
      purpose: t('cookie.c2.purpose'),
      duration: '1 year',
      type: t('cookie.necessary'),
    },
    {
      name: 'lang',
      purpose: t('cookie.c3.purpose'),
      duration: t('cookie.persistent'),
      type: t('cookie.functional'),
    },
    {
      name: 'spesi-theme',
      purpose: t('cookie.c4.purpose'),
      duration: t('cookie.persistent'),
      type: t('cookie.functional'),
    },
  ]

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie notice">
      <div className="cookie-banner-inner">
        <p className="cookie-banner-text">
          {t('cookie.banner')}
        </p>
        <div className="cookie-banner-actions">
          <button
            className="btn-ghost cookie-details-btn"
            onClick={() => setShowDetails(p => !p)}
          >
            {t('cookie.details')} {showDetails ? '▲' : '▼'}
          </button>
          <button className="btn btn-primary cookie-accept-btn" onClick={accept}>
            {t('cookie.accept')}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="cookie-details">
          <div className="cookie-table-wrap">
            <table className="cookie-table">
              <thead>
                <tr>
                  <th>{t('cookie.table.name')}</th>
                  <th>{t('cookie.table.purpose')}</th>
                  <th>{t('cookie.table.duration')}</th>
                  <th>{t('cookie.table.type')}</th>
                </tr>
              </thead>
              <tbody>
                {cookies.map(c => (
                  <tr key={c.name}>
                    <td><code>{c.name}</code></td>
                    <td>{c.purpose}</td>
                    <td>{c.duration}</td>
                    <td>
                      <span className={`cookie-type-badge ${c.type === t('cookie.necessary') ? 'necessary' : 'functional'}`}>
                        {c.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cookie-legal-note">
            Strictly necessary cookies cannot be disabled as the service requires authentication to function.
            Functional storage is used only to persist your personal display preferences.
          </p>
        </div>
      )}
    </div>
  )
}
