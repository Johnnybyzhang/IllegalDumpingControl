import rawConfig from "@/i18n.config.json"
import { dictionaries, type Locale } from "./dictionaries"

const dictionaryLocales = Object.keys(dictionaries) as Locale[]
const configLocales = rawConfig.locales as string[]

const missingFromConfig = dictionaryLocales.filter((locale) => !configLocales.includes(locale))
const missingDictionaries = configLocales.filter((locale) => !dictionaryLocales.includes(locale as Locale))

if (missingFromConfig.length > 0 || missingDictionaries.length > 0) {
  const details = [
    missingFromConfig.length > 0
      ? `missing from configuration: ${missingFromConfig.join(", ")}`
      : null,
    missingDictionaries.length > 0
      ? `missing dictionaries: ${missingDictionaries.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("; ")

  throw new Error(`[i18n] Locale configuration mismatch (${details}).`)
}

const resolvedLocales = configLocales.map((locale) => locale as Locale)
const defaultLocale = (rawConfig.defaultLocale ?? resolvedLocales[0]) as Locale

if (!resolvedLocales.includes(defaultLocale)) {
  throw new Error(`[i18n] Default locale "${rawConfig.defaultLocale}" is not part of the configured locales.`)
}

export const locales: ReadonlyArray<Locale> = Object.freeze(resolvedLocales)
export const i18n = {
  defaultLocale,
  locales,
} as const

export { defaultLocale }

export function isLocale(value: string): value is Locale {
  return resolvedLocales.includes(value as Locale)
}
