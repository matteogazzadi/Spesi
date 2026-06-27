import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'

type Mode = 'login' | 'signup' | 'mfa_enroll' | 'mfa_verify'

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

  // MFA enroll state
  const [qrCode, setQrCode] = useState('')
  const [factorId, setFactorId] = useState('')

  // MFA verify state — factor id may come from enroll or from existing factor
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
    setError(''); setLoading(true)

    // Clean up any leftover unverified factors from previous abandoned enrollments
    const { data: existing } = await supabase.auth.mfa.listFactors()
    const unverified = existing?.totp?.filter((f) => f.status !== 'verified') ?? []
    await Promise.all(unverified.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })))

    const { data, error: err } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Spesi',
    })
    setLoading(false)
    if (err || !data) { setError(err?.message ?? 'Enroll failed'); return }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setMode('mfa_enroll')
  }

  async function handleEnrollVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
    if (cErr || !challenge) { setError(cErr?.message ?? 'Challenge failed'); setLoading(false); return }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: totpCode,
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
      factorId: verifyFactorId,
      challengeId,
      code: totpCode,
    })
    setLoading(false)
    if (vErr) { setError(vErr.message); return }
    await refreshAuthLevel()
  }

  // If already at aal1 on mount, jump to correct mode
  if (authLevel === 'aal1_no_mfa' && mode === 'login') startMfaEnroll()
  if (authLevel === 'aal1_need_verify' && mode === 'login') startMfaVerify()

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {mode === 'login' && (
          <>
            <h2>Spesi</h2>
            <p className="subtitle">Sign in to your account</p>
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
                Sign up
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
  )
}
