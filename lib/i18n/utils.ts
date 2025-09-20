import type { Dictionary, Translate } from "./types"

export function resolveTranslation(dictionary: Dictionary, keyPath: string): string | undefined {
  return keyPath.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment]
    }

    return undefined
  }, dictionary) as string | undefined
}

export function createTranslator(dictionary: Dictionary, namespace?: string): Translate {
  return (key, fallback) => {
    const fullKey = namespace ? `${namespace}.${key}` : key
    const value = resolveTranslation(dictionary, fullKey)

    if (typeof value === "string") {
      return value
    }

    return fallback ?? fullKey
  }
}
