import type { ReactNode } from 'react'
import { LanguageContext, type AppLanguage } from './i18n'

export function LanguageProvider({ language, children }: { language: AppLanguage; children: ReactNode }) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>
}
