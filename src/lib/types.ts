// Datenmodell laut Plan (Abschnitt 4). In V0.1 nur im Arbeitsspeicher, Persistenz kommt in V0.2.

export const SCHEMA_VERSION = 1

/** Eigentümer eines Eintrags: 'me' = eigene Wunschliste, sonst die ID einer Person. */
export type Owner = 'me' | string

export interface Item {
  id: string
  owner: Owner
  name: string
  link?: string
  price?: number
  note?: string
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
  price?: number
  note?: string
  link?: string
  emoji: string
  hue: number
  /** Unauffällig mitgesendet: Der Absender besitzt den Artikel schon. Wird nie direkt angezeigt. */
  owned: boolean
}

export interface ReceivedList {
  id: string
  from: string
  hue: number
  receivedAt: number
  /** Verknüpfte Person aus den Geschenkideen (für den Abgleich "Schon vorhanden"). */
  personId?: string
  items: ReceivedItem[]
}

export type ThemeSetting = 'system' | 'dark' | 'light'
export type FxSetting = 'full' | 'calm' | 'off'

export interface UiSettings {
  theme: ThemeSetting
  fx: FxSetting
  hue: number
  remind: boolean
  remindDays: number
}

export type ShareBought = 'hidden' | 'only' | 'exclude'
