"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"

import type { Locale } from "@/lib/i18n/config"
import type { Dictionary, Translate } from "@/lib/i18n/types"
import { createTranslator } from "@/lib/i18n/utils"

interface I18nContextValue {
  locale: Locale
  dictionary: Dictionary
  t: Translate
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  children: ReactNode
  locale: Locale
  dictionary: Dictionary
}

export function I18nProvider({ children, locale, dictionary }: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(() => ({
    locale,
    dictionary,
    t: createTranslator(dictionary),
  }), [dictionary, locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }

  return context
}

export function useLocale(): Locale {
  return useI18n().locale
}

export function useTranslations(namespace?: string): Translate {
  const { dictionary } = useI18n()

  return useMemo(() => createTranslator(dictionary, namespace), [dictionary, namespace])
}
