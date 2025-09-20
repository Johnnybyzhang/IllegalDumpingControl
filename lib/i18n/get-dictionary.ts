import { dictionaries, type Locale } from "./dictionaries"
import { defaultLocale } from "./config"
import type { Dictionary } from "./types"

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const loader = dictionaries[locale] ?? dictionaries[defaultLocale]
  return loader()
}
