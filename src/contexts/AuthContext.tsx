import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './authContext'
import type { AuthLevel } from './authContext'

async function computeAuthLevel(s: Session | null): Promise<AuthLevel> {
  if (!s) return 'none'
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel === 'aal2') return 'aal2'
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const hasTotp = (factors?.totp?.length ?? 0) > 0
  return hasTotp ? 'aal1_need_verify' : 'aal1_no_mfa'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authLevel, setAuthLevel] = useState<AuthLevel>('loading')

  async function refreshAuthLevel() {
    const { data: { session: s } } = await supabase.auth.getSession()
    setSession(s)
    setUser(s?.user ?? null)
    setAuthLevel(await computeAuthLevel(s))
  }

  useEffect(() => {
    refreshAuthLevel()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      setAuthLevel(await computeAuthLevel(s))
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, authLevel, refreshAuthLevel, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
