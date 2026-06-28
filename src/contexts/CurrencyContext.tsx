import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

interface CurrencyCtx {
  currency: string
  setCurrency: (code: string) => Promise<void>
}

const CurrencyContext = createContext<CurrencyCtx>({} as CurrencyCtx)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('spesi-currency') ?? 'EUR'
  })

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_settings')
      .select('currency')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const c = (data as { currency?: string | null } | null)?.currency
        if (c) {
          setCurrencyState(c)
          localStorage.setItem('spesi-currency', c)
        }
      })
  }, [user?.id])

  async function setCurrency(code: string) {
    setCurrencyState(code)
    localStorage.setItem('spesi-currency', code)
    if (user) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, currency: code }, { onConflict: 'user_id' })
    }
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
