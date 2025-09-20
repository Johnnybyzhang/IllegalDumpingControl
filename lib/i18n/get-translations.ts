import type { Locale } from "./config"
import { getDictionary } from "./get-dictionary"
import { createTranslator } from "./utils"
import type { Translate } from "./types"

export async function getTranslations(locale: Locale, namespace?: string): Promise<Translate> {
  const dictionary = await getDictionary(locale)
  return createTranslator(dictionary, namespace)
}
