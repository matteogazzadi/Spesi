import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { useTranslation } from '../contexts/LanguageContext'
import { LANGUAGES, type LangCode } from '../lib/translations'

type Mode = 'login' | 'signup' | 'mfa_enroll' | 'mfa_verify'

// Illustrative chart data — shows a sample spending history + forecast
const CHART_N = 10
const CHART_ACTUALS:  (number | null)[] = [1650, 1820, 1540, 1900, 1730, 2280, 1590, 1720, 1760, null]
const CHART_FORECASTS: number[]         = [1700, 1750, 1780, 1810, 1750, 1720, 1780, 1800, 1760, 1740]

function AuthChart({ locale }: { locale: string }) {
  const W = 400, H = 110
  const PAD_L = 4, PAD_R = 4, PAD_T = 8, PAD_BOT = 22
  const chartH = H - PAD_T - PAD_BOT
  const chartW = W - PAD_L - PAD_R
  const slotW = chartW / CHART_N
  const barW = Math.floor(slotW * 0.55)
  const barOffset = (slotW - barW) / 2

  const monthLetters = Array.from({ length: CHART_N }, (_, i) =>
    new Date(2024, i, 1).toLocaleString(locale, { month: 'narrow' })
  )

  const allVals = [...CHART_ACTUALS.filter(Boolean) as number[], ...CHART_FORECASTS]
  const maxVal = Math.max(...allVals) * 1.06

  const xCenter = (i: number) => PAD_L + i * slotW + slotW / 2
  const xBar    = (i: number) => PAD_L + i * slotW + barOffset
  const yVal    = (v: number) => PAD_T + chartH - (v / maxVal) * chartH
  const hVal    = (v: number) => (v / maxVal) * chartH

  // Confidence band polygon
  const p90 = CHART_FORECASTS.map(v => v * 1.19)
  const p10 = CHART_FORECASTS.map(v => v * 0.84)
  const topPts = CHART_FORECASTS.map((_, i) => `${xCenter(i).toFixed(1)},${yVal(p90[i]).toFixed(1)}`).join(' ')
  const botPts = [...CHART_FORECASTS.keys()].reverse().map(i => `${xCenter(i).toFixed(1)},${yVal(p10[i]).toFixed(1)}`).join(' ')
  const bandPath = `M${topPts} L${botPts} Z`

  // Forecast polyline
  const fLine = CHART_FORECASTS
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xCenter(i).toFixed(1)},${yVal(v).toFixed(1)}`)
    .join(' ')

  return (
    <div className="auth-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="auth-chart-svg" preserveAspectRatio="xMidYMid meet">
        {/* Confidence band */}
        <path d={bandPath} fill="rgba(255,255,255,0.06)" />

        {/* Bars */}
        {CHART_ACTUALS.map((a, i) => {
          const fc = CHART_FORECASTS[i]
          if (a === null) {
            return (
              <rect
                key={i}
                x={xBar(i).toFixed(1)}
                y={yVal(fc).toFixed(1)}
                width={barW}
                height={hVal(fc).toFixed(1)}
                fill="rgba(255,255,255,0.1)"
                rx="1.5"
              />
            )
          }
          const isOver = a > fc
          return (
            <rect
              key={i}
              x={xBar(i).toFixed(1)}
              y={yVal(a).toFixed(1)}
              width={barW}
              height={hVal(a).toFixed(1)}
              fill={isOver ? 'rgba(251,146,60,0.72)' : 'rgba(99,102,241,0.72)'}
              rx="1.5"
            />
          )
        })}

        {/* Forecast dashed line */}
        <path
          d={fLine}
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Forecast dots */}
        {CHART_FORECASTS.map((v, i) => (
          <circle key={i} cx={xCenter(i).toFixed(1)} cy={yVal(v).toFixed(1)} r="2.2" fill="rgba(255,255,255,0.65)" />
        ))}

        {/* "→" above current month bar */}
        <text
          x={xCenter(CHART_N - 1).toFixed(1)}
          y={(PAD_T - 1).toFixed(1)}
          textAnchor="middle"
          fontSize="8"
          fill="rgba(255,255,255,0.45)"
        >→</text>

        {/* Month labels */}
        {monthLetters.map((m, i) => (
          <text
            key={i}
            x={xCenter(i).toFixed(1)}
            y={H - 5}
            textAnchor="middle"
            fontSize="8.5"
            fill="rgba(255,255,255,0.35)"
          >{m}</text>
        ))}
      </svg>

      <div className="auth-chart-legend">
        <span className="auth-chart-dot" style={{ background: 'rgba(99,102,241,.72)' }} />
        <span className="auth-chart-legend-label">under</span>
        <span className="auth-chart-dot" style={{ background: 'rgba(251,146,60,.72)' }} />
        <span className="auth-chart-legend-label">over</span>
        <span className="auth-chart-dash" />
        <span className="auth-chart-legend-label">forecast</span>
      </div>
    </div>
  )
}

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export function AuthPage() {
  const { authLevel, refreshAuthLevel } = useAuth()
  const { t, lang, locale, setLang } = useTranslation()

  const initialMode: Mode = authLevel === 'aal1_no_mfa' ? 'mfa_enroll' : 'login'

  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const [qrCode, setQrCode] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [secretCopied, setSecretCopied] = useState(false)
  const enrollingRef = useRef(false)
  const [verifyFactorId, setVerifyFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [showLangMenu, setShowLangMenu] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    await refreshAuthLevel()
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setInfo('Check your email to confirm your account, then log in.')
    setMode('login')
  }

  async function startMfaEnroll() {
    if (enrollingRef.current) return
    enrollingRef.current = true
    setError(''); setLoading(true)

    const cleanupUnverified = async () => {
      const { data: existing } = await supabase.auth.mfa.listFactors()
      const unverified = existing?.totp?.filter((f) => f.status !== 'verified') ?? []
      await Promise.all(unverified.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })))
    }

    await cleanupUnverified()

    let { data, error: err } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Spesi',
    })

    if (err?.message?.includes('already exists')) {
      await cleanupUnverified()
      ;({ data, error: err } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Spesi',
      }))
    }

    enrollingRef.current = false
    setLoading(false)
    if (err || !data) { setError(err?.message ?? 'Enroll failed'); return }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setTotpSecret(data.totp.secret)
    setMode('mfa_enroll')
  }

  async function handleEnrollVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
    if (cErr || !challenge) { setError(cErr?.message ?? 'Challenge failed'); setLoading(false); return }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId, challengeId: challenge.id, code: totpCode,
    })
    setLoading(false)
    if (vErr) { setError(vErr.message); return }
    await refreshAuthLevel()
  }

  async function startMfaVerify() {
    setError(''); setLoading(true)
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totp = factors?.totp?.[0]
    if (!totp) { setError('No MFA factor found'); setLoading(false); return }
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
    setLoading(false)
    if (cErr || !challenge) { setError(cErr?.message ?? 'Challenge failed'); return }
    setVerifyFactorId(totp.id)
    setChallengeId(challenge.id)
    setMode('mfa_verify')
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: verifyFactorId, challengeId, code: totpCode,
    })
    setLoading(false)
    if (vErr) { setError(vErr.message); return }
    await refreshAuthLevel()
  }

  useEffect(() => {
    if (authLevel === 'aal1_no_mfa' && mode === 'login') startMfaEnroll()
    else if (authLevel === 'aal1_need_verify' && mode === 'login') startMfaVerify()
  }, [authLevel]) // eslint-disable-line react-hooks/exhaustive-deps

  const features = [
    { title: t('auth.f1.title'), desc: t('auth.f1.desc') },
    { title: t('auth.f2.title'), desc: t('auth.f2.desc') },
    { title: t('auth.f3.title'), desc: t('auth.f3.desc') },
    { title: t('auth.f4.title'), desc: t('auth.f4.desc') },
    { title: t('auth.f5.title'), desc: t('auth.f5.desc') },
  ]

  return (
    <div className="auth-wrap" onClick={() => setShowLangMenu(false)}>
      {/* ── Left hero ── */}
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-hero-logo">Spesi</div>
          <div className="auth-hero-tagline">{t('auth.tagline')}</div>
          <p className="auth-hero-sub">{t('auth.sub')}</p>

          <AuthChart locale={locale} />

          <div className="auth-features-wrap">
            {features.map((f, i) => (
              <div
                key={i}
                className="auth-feature"
                style={{ animationDelay: `${i * 4}s` }}
              >
                <div className="auth-feature-num">{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <div className="auth-feature-title">{f.title}</div>
                  <div className="auth-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="auth-hero-dots">
            {features.map((_, i) => (
              <div key={i} className="auth-dot" style={{ animationDelay: `${i * 4}s` }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-panel">
        {/* Globe language picker */}
        <div className="auth-lang-wrap" onClick={e => e.stopPropagation()}>
          <button
            className="auth-lang-btn"
            onClick={() => setShowLangMenu(p => !p)}
            aria-label="Change language"
          >
            <GlobeIcon />
            <span>{lang.toUpperCase()}</span>
          </button>
          {showLangMenu && (
            <div className="auth-lang-menu">
              {(Object.entries(LANGUAGES) as [LangCode, string][]).map(([code, name]) => (
                <button
                  key={code}
                  className={`auth-lang-option${lang === code ? ' active' : ''}`}
                  onClick={() => { setLang(code); setShowLangMenu(false) }}
                >
                  <span className="auth-lang-code">{code.toUpperCase()}</span>
                  <span className="auth-lang-name">{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="auth-card">
          {mode === 'login' && (
            <>
              <h2>{t('auth.login.title')}</h2>
              <p className="subtitle">{t('auth.login.sub')}</p>
              {error && <div className="msg msg-error">{error}</div>}
              {info && <div className="msg msg-info">{info}</div>}
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>{t('auth.login.email')}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                <div className="form-group">
                  <label>{t('auth.login.password')}</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? t('auth.login.submitting') : t('auth.login.submit')}
                </button>
              </form>
              <div className="auth-toggle">
                {t('auth.login.no_account')}{' '}
                <button className="btn-ghost" onClick={() => { setError(''); setMode('signup') }}>
                  {t('auth.login.create')}
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <>
              <h2>{t('auth.signup.title')}</h2>
              <p className="subtitle">{t('auth.signup.sub')}</p>
              {error && <div className="msg msg-error">{error}</div>}
              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label>{t('auth.login.email')}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                <div className="form-group">
                  <label>{t('auth.login.password')}</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? t('auth.signup.submitting') : t('auth.signup.submit')}
                </button>
              </form>
              <div className="auth-toggle">
                {t('auth.signup.have_account')}{' '}
                <button className="btn-ghost" onClick={() => { setError(''); setMode('login') }}>
                  {t('auth.signup.signin')}
                </button>
              </div>
            </>
          )}

          {mode === 'mfa_enroll' && (
            <>
              <h2>{t('auth.mfa_enroll.title')}</h2>
              <p className="subtitle">{t('auth.mfa_enroll.sub')}</p>
              {error && <div className="msg msg-error">{error}</div>}
              {qrCode ? (
                <>
                  <div className="qr-wrap">
                    <img src={qrCode} alt="TOTP QR code" />
                  </div>
                  <div className="totp-secret-wrap">
                    <p className="totp-secret-label">{t('auth.mfa_enroll.cant_scan')}</p>
                    <div className="totp-secret-row">
                      <code className="totp-secret">{totpSecret}</code>
                      <button
                        type="button"
                        className="btn-copy"
                        onClick={() => {
                          navigator.clipboard.writeText(totpSecret)
                          setSecretCopied(true)
                          setTimeout(() => setSecretCopied(false), 2000)
                        }}
                      >
                        {secretCopied ? t('auth.mfa_enroll.copied') : t('auth.mfa_enroll.copy')}
                      </button>
                    </div>
                  </div>
                  <form onSubmit={handleEnrollVerify}>
                    <div className="form-group">
                      <label>{t('auth.mfa_enroll.code')}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="000000"
                        value={totpCode}
                        onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        required
                        autoFocus
                      />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={loading || totpCode.length !== 6}>
                      {loading ? t('common.loading') : t('auth.mfa_enroll.enable')}
                    </button>
                  </form>
                </>
              ) : (
                <button className="btn btn-primary" onClick={startMfaEnroll} disabled={loading}>
                  {loading ? t('common.loading') : t('auth.mfa_enroll.gen_qr')}
                </button>
              )}
            </>
          )}

          {mode === 'mfa_verify' && (
            <>
              <h2>{t('auth.mfa_verify.title')}</h2>
              <p className="subtitle">{t('auth.mfa_verify.sub')}</p>
              {error && <div className="msg msg-error">{error}</div>}
              <form onSubmit={handleVerify}>
                <div className="form-group">
                  <label>{t('auth.mfa_enroll.code')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading || totpCode.length !== 6}>
                  {loading ? t('common.loading') : t('auth.mfa_verify.submit')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
