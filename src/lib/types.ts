// Datenmodell laut Plan (Abschnitt 4).

export const SCHEMA_VERSION = 2

/** Eigentümer eines Eintrags oder einer Liste: 'me' = eigene Wünsche, sonst die ID einer Person. */
export type Owner = 'me' | string

/** Eine benannte Liste (z. B. "Weihnachten") einer Person oder von mir selbst. */
export interface Wishlist {
  id: string
  owner: Owner
  /** Leer bei der Standardliste, der Name wird dann übersetzt angezeigt. */
  name: string
  isDefault?: boolean
  emoji: string
  hue: number
  /** Optionales Datum der Liste (z. B. Geburtstag), Format JJJJ-MM-TT. */
  date?: string
  createdAt: number
}

export interface Item {
  id: string
  owner: Owner
  listId: string
  name: string
  /** Art/Objekt, z. B. "Grafikkarte". Hilft, Doppelungen auch bei unterschiedlichen Namen zu erkennen. */
  kind?: string
  link?: string
  price?: number
  note?: string
  /** Verweis auf ein verkleinertes Bild im Bilderspeicher (lib/images.ts). Ohne Bild gilt Emoji und Farbe. */
  imageId?: string
  emoji: string
  hue: number
  bought: boolean
  boughtAt?: number
  deletedAt?: number
  createdAt: number
}

export interface Occasion {
  id: string
  label: string
  month: number // 1-12
  day: number // 1-31
}

export interface Person {
  id: string
  name: string
  hue: number
  budget: number
  occasions: Occasion[]
}

export interface ReceivedItem {
  id: string
  name: string
  kind?: string
  price?: number
  note?: string
  link?: string
  emoji: string
  hue: number
  /** Unauffällig mitgesendet: Der Absender besitzt den Artikel schon. Standardmäßig nie in der Liste sichtbar. */
  owned: boolean
  boughtAt?: number
}

export interface ReceivedCollection {
  id: string
  name: string
  emoji: string
  hue: number
  items: ReceivedItem[]
}

/** Ein erhaltenes Paket von einer Person, kann mehrere Listen enthalten. */
export interface ReceivedList {
  id: string
  from: string
  hue: number
  receivedAt: number
  /** Verknüpfte Person aus den Geschenkideen (für den Abgleich "Schon vorhanden"). */
  personId?: string
  lists: ReceivedCollection[]
}

export type ThemeSetting = 'system' | 'dark' | 'light'
export type FxSetting = 'full' | 'calm' | 'off'
export type Lang = 'de' | 'en'

export interface UiSettings {
  theme: ThemeSetting
  fx: FxSetting
  lang: Lang
  hue: number
  remind: boolean
  remindDays: number
  /** Helle Zusatzleiste im Budget: Summe der noch offenen Ideen. */
  showPlanned: boolean
}

export type ShareBought = 'hidden' | 'only' | 'exclude'
