import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'

type Mode = 'login' | 'signup' | 'mfa_enroll' | 'mfa_verify'

const FEATURES = [
  {
    title: 'Monthly Spending Forecast',
    desc: 'Predicts your month-end total from historical averages, so you know where you stand before the statement arrives.',
  },
  {
    title: 'Smart Exclusion Rules',
    desc: 'Filter out recurring transfers and salary credits with contains or exact-match rules — only your real spend counts.',
  },
  {
    title: 'Historical Trend View',
    desc: '12-month bar chart overlays actual spend against the forecast so over- and under-spending patterns are immediately visible.',
  },
  {
    title: 'Budget Allocation',
    desc: 'At a glance see exactly how much budget remains after accounting for spend so far and the projected monthly total.',
  },
  {
    title: 'Secure by Default',
    desc: 'Every account requires TOTP two-factor authentication. Your data is protected by Postgres Row-Level Security.',
  },
]

export function AuthPage() {
  const { authLevel, refreshAuthLevel } = useAuth()
  const initialMode: Mode = authLevel === 'aal1_no_mfa'
    ? 'mfa_enroll'
    : authLevel === 'aal1_need_verify'
    ? 'mfa_verify'
    : 'login'

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

    // If a duplicate slipped through (race), clean up all TOTP factors and retry once
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

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-hero-logo">Spesi</div>
          <div className="auth-hero-tagline">Your budget forecasting site.</div>
          <p className="auth-hero-sub">
            Import your Banca Sella exports, see where your money goes,
            and stay ahead of next month's spending — automatically.
          </p>
          <div className="auth-features-wrap">
            {FEATURES.map((f, i) => (
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
            {FEATURES.map((_, i) => (
              <div key={i} className="auth-dot" style={{ animationDelay: `${i * 4}s` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          {mode === 'login' && (
            <>
              <h2>Welcome back</h2>
              <p className="subtitle">Sign in to your Spesi account</p>
              {error && <div className="msg msg-error">{error}</div>}
              {info && <div className="msg msg-info">{info}</div>}
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
              <div className="auth-toggle">
                No account?{' '}
                <button className="btn-ghost" onClick={() => { setError(''); setMode('signup') }}>
                  Create one
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <>
              <h2>Create account</h2>
              <p className="subtitle">You'll set up two-factor authentication after signing in.</p>
              {error && <div className="msg msg-error">{error}</div>}
              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Creating…' : 'Create account'}
                </button>
              </form>
              <div className="auth-toggle">
                Already have an account?{' '}
                <button className="btn-ghost" onClick={() => { setError(''); setMode('login') }}>
                  Sign in
                </button>
              </div>
            </>
          )}

          {mode === 'mfa_enroll' && (
            <>
              <h2>Set up 2FA</h2>
              <p className="subtitle">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code below.</p>
              {error && <div className="msg msg-error">{error}</div>}
              {qrCode ? (
                <>
                  <div className="qr-wrap">
                    <img src={qrCode} alt="TOTP QR code" />
                  </div>
                  <div className="totp-secret-wrap">
                    <p className="totp-secret-label">
                      Can't scan? Copy this key into your authenticator app manually:
                    </p>
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
                        {secretCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <form onSubmit={handleEnrollVerify}>
                    <div className="form-group">
                      <label>Authentication code</label>
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
                      {loading ? 'Verifying…' : 'Enable 2FA'}
                    </button>
                  </form>
                </>
              ) : (
                <button className="btn btn-primary" onClick={startMfaEnroll} disabled={loading}>
                  {loading ? 'Loading…' : 'Generate QR code'}
                </button>
              )}
            </>
          )}

          {mode === 'mfa_verify' && (
            <>
              <h2>Two-factor authentication</h2>
              <p className="subtitle">Enter the 6-digit code from your authenticator app.</p>
              {error && <div className="msg msg-error">{error}</div>}
              <form onSubmit={handleVerify}>
                <div className="form-group">
                  <label>Authentication code</label>
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
                  {loading ? 'Verifying…' : 'Verify'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
