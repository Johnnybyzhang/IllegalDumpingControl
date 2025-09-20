import { Suspense, type ReactNode } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"

import { AccessibilityProvider } from "@/components/accessibility-provider"
import { AccessibilityToolbar } from "@/components/accessibility-toolbar"
import { I18nProvider } from "@/components/i18n/i18n-provider"
import { defaultLocale, isLocale, locales, type Locale } from "@/lib/i18n/config"
import { getDictionary } from "@/lib/i18n/get-dictionary"

import "@/app/globals.css"

type LocaleLayoutProps = {
  children: ReactNode
  params: { locale: string }
}

const languageAlternates = Object.fromEntries(
  locales.map((locale) => [locale, locale === defaultLocale ? "/" : `/${locale}`]),
) satisfies Record<string, string>

export const dynamicParams = false

export function generateStaticParams(): Array<{ locale: Locale }> {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = params

  if (!isLocale(locale)) {
    return {
      generator: "v0.app",
    }
  }

  const dictionary = await getDictionary(locale)

  return {
    title: dictionary.metadata.title,
    description: dictionary.metadata.description,
    generator: "v0.app",
    alternates: {
      languages: languageAlternates,
    },
  }
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: localeParam } = params

  if (!isLocale(localeParam)) {
    notFound()
  }

  const dictionary = await getDictionary(localeParam)

  return (
    <html lang={localeParam} suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <I18nProvider locale={localeParam} dictionary={dictionary}>
          <AccessibilityProvider>
            <Suspense fallback={null}>{children}</Suspense>
            <AccessibilityToolbar />
            <Analytics />
          </AccessibilityProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
