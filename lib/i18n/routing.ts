import { defaultLocale, isLocale, locales, type Locale } from "./config"

export function getLocaleFromPathname(pathname: string): Locale | null {
  const segment = pathname.split("/").filter(Boolean)[0]

  if (segment && isLocale(segment)) {
    return segment
  }

  return null
}

export function getLocalizedPath(path = "", locale: Locale = defaultLocale): string {
  const normalizedPath = path.startsWith("/") ? path : path ? `/${path}` : ""
  return `/${locale}${normalizedPath}`
}

export function getDefaultLocalePath(path = ""): string {
  return getLocalizedPath(path, defaultLocale)
}

export function getSupportedLocales(): ReadonlyArray<Locale> {
  return locales
}
