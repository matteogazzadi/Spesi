import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type Theme = 'light' | 'dark'

interface ThemeCtxValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeCtx = createContext<ThemeCtxValue>({ theme: 'light', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('spesi-theme') as Theme | null) ?? 'light'
  )

  // Sync from DB once user is available
  useEffect(() => {
    if (!user) return
    supabase
      .from('user_settings')
      .select('theme')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.theme === 'dark' || data?.theme === 'light') {
          setThemeState(data.theme)
        }
      })
  }, [user?.id])

  // Apply to DOM and cache locally
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('spesi-theme', theme)
  }, [theme])

  async function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setThemeState(next)
    if (!user) return
    await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, theme: next }, { onConflict: 'user_id' })
  }

  return <ThemeCtx.Provider value={{ theme, toggleTheme }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
