import type { Dictionary } from "./types"

export const dictionaries = {
  en: () => import("@/locales/en").then((module) => module.default as Dictionary),
  "zh-CN": () => import("@/locales/zh-CN").then((module) => module.default as Dictionary),
} as const

export type Dictionaries = typeof dictionaries
export type Locale = keyof Dictionaries
