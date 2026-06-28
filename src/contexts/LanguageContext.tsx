import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { detectBrowserLang, translate, LOCALES, type LangCode } from '../lib/translations'
import { useAuth } from './useAuth'

interface LanguageCtx {
  lang: LangCode
  locale: string
  setLang: (lang: LangCode) => Promise<void>
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageCtx>({} as LanguageCtx)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [lang, setLangState] = useState<LangCode>(() => {
    const stored = localStorage.getItem('lang') as LangCode | null
    return stored ?? detectBrowserLang()
  })

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_settings')
      .select('language')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.language) {
          const dbLang = data.language as LangCode
          setLangState(dbLang)
          localStorage.setItem('lang', dbLang)
        }
      })
  }, [user?.id])

  async function setLang(newLang: LangCode) {
    setLangState(newLang)
    localStorage.setItem('lang', newLang)
    if (user) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, language: newLang }, { onConflict: 'user_id' })
    }
  }

  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)

  return (
    <LanguageContext.Provider value={{ lang, locale: LOCALES[lang], setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  return useContext(LanguageContext)
}
