import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AuthLevel = 'loading' | 'none' | 'aal1_no_mfa' | 'aal1_need_verify' | 'aal2'

export interface AuthContextValue {
  user: User | null
  session: Session | null
  authLevel: AuthLevel
  refreshAuthLevel: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
