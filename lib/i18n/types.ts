export type MetadataDictionary = {
  title: string
  description: string
}

export type NestedDictionary = {
  [key: string]: string | NestedDictionary
}

export type Dictionary = {
  metadata: MetadataDictionary
} & NestedDictionary

export type Translate = (key: string, fallback?: string) => string
