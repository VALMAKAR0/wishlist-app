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
  /** Verknüpfter Anlass der Person (Occasion.id). Das Datum folgt dann dem Anlass. */
  occasionId?: string
  /** Budget für die Liste (nur Geschenkideen), in der Hauptwährung. */
  budget?: number
  createdAt: number
}

export type PriceState = 'user' | 'sure' | 'guess'

/** Gemerkte Stelle einer Seite, von der der Preis gelesen wird (vom Nutzer gewählt). */
export interface PriceSpot {
  src: 'ld' | 'meta' | 'dom' | 'text'
  /** Text vor dem Preis in Kurzform (Zahlen als #), dient zum Wiederfinden. */
  ctx: string
  /** Wievielter Treffer mit gleichem Text davor. */
  nth: number
  /** Anzeigetext, zum Beispiel „UVP inkl. Überführung“. */
  label: string
}

export interface PricePoint {
  t: number
  p: number
  k: PriceState
}

/** Weiterer Shop zum Preisvergleich: eigener Link mit zuletzt gelesenem Preis. */
export interface Shop {
  id: string
  link: string
  price?: number
  /** Währung des gelesenen Preises (ISO-Code), Euro wenn leer und ein Preis da ist. */
  currency?: string
  guess?: boolean
  /** Letzte Prüfung. */
  at?: number
  /** Letzte Prüfung ohne Preis oder mit Fehler. */
  err?: boolean
}

export type Prio = 1 | 2 | 3

export interface Item {
  id: string
  owner: Owner
  listId: string
  name: string
  /** Art/Objekt, z. B. "Grafikkarte". Hilft, Doppelungen auch bei unterschiedlichen Namen zu erkennen. */
  kind?: string
  link?: string
  price?: number
  /** Währung des Preises (ISO-Code). Fehlt das Feld, gilt Euro. */
  currency?: string
  note?: string
  /** Herkunft des Preises: von mir eingetragen, von der App sicher gelesen oder geraten (ab Bestätigung sicher). */
  priceState?: PriceState
  /** Ausgangspreis für das Etikett an der Karte (Preis beim Hinzufügen oder bei der letzten eigenen Änderung). */
  priceBase?: number
  priceSpot?: PriceSpot
  /** Bestätigt: Die Stelle auf der Seite, aus der ein geratener Preis kommt, stimmt. Weitere Funde von dort ersetzen den Preis automatisch. */
  priceGuessOk?: boolean
  /** Neuer Preis von der Seite, der noch bestätigt werden muss. */
  priceSuggest?: { price: number; guess: boolean; at: number }
  /** Zuletzt abgelehnter Vorschlag, wird nicht noch einmal vorgeschlagen. */
  priceNo?: number
  priceLog?: PricePoint[]
  /** Weitere Shops für den Vergleich (höchstens fünf). */
  shops?: Shop[]
  /** Wunschpreis: Ab diesem Preis (oder darunter) gibt es eine Meldung und ein Etikett. */
  priceTarget?: number
  /** Wie wichtig: 1 = nett, 2 = sehr, 3 = am liebsten. */
  prio?: Prio
  /** Aus: Der Preis dieses Eintrags wird nie geprüft. */
  priceTrack?: boolean
  priceCheckedAt?: number
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
  /** Eigener Vorlauf in Tagen. Fehlt das Feld, gilt der Standard, eine leere Liste schaltet die Erinnerung aus. */
  remind?: number[]
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
  /** Währung des Preises, fehlt = Euro. */
  cur?: string
  note?: string
  link?: string
  emoji: string
  hue: number
  /** Unauffällig mitgesendet: Der Absender besitzt den Artikel schon. Standardmäßig nie in der Liste sichtbar. */
  owned: boolean
  boughtAt?: number
  /** Bild aus dem Bilderspeicher, kommt beim Import mit. */
  imageId?: string
  prio?: Prio
}

export interface ReceivedCollection {
  id: string
  name: string
  emoji: string
  hue: number
  /** Datum der Liste beim Absender (JJJJ-MM-TT). */
  date?: string
  items: ReceivedItem[]
}

/** Ein erhaltenes Paket von einer Person, kann mehrere Listen enthalten. */
export interface ReceivedList {
  id: string
  from: string
  hue: number
  receivedAt: number
  /** Kennung des Absenders, damit ein erneuter Import dieselbe Liste ersetzt. */
  shareId?: string
  /** Verknüpfte Person aus den Geschenkideen (für den Abgleich "Schon vorhanden"). */
  personId?: string
  lists: ReceivedCollection[]
}

export type ThemeSetting = 'system' | 'dark' | 'light' | 'black'
export type FxSetting = 'full' | 'calm' | 'off'
export type Lang = 'de' | 'en'
export type DateFmt = 'auto' | 'dmy' | 'mdy' | 'iso'
export type FontScale = 'small' | 'normal' | 'large' | 'xl'
export type SortMode = 'new' | 'old' | 'name' | 'priceDown' | 'priceUp' | 'prio' | 'drop'
export type StyleName = 'tag' | 'calm' | 'bold'
export type RadiusSetting = 'sharp' | 'normal' | 'round'
export type Density = 'compact' | 'normal' | 'airy'
export type Tone = 'soft' | 'normal' | 'vivid'
export type FontFamily = 'default' | 'system'
export type HapticLevel = 'light' | 'normal' | 'strong'
export type ImgSize = 'off' | 'small' | 'normal' | 'large'
export type SwipeAct = 'bought' | 'favorite' | 'move' | 'trash' | 'none'
export type SwipeDist = 'short' | 'normal' | 'long'
export type TabId = 'wishes' | 'ideas' | 'received' | 'stats'
export type StartTab = 'wishes' | 'ideas' | 'received' | 'stats' | 'last'

export interface ShareDefaults {
  notes: boolean
  price: boolean
  images: boolean
  listDate: boolean
  bought: ShareBought
}

export interface UiSettings {
  theme: ThemeSetting
  fx: FxSetting
  lang: Lang
  hue: number
  /** Erinnerungen vor Anlässen (nur Android-App). */
  remindOn: boolean
  /** Standard-Vorlauf in Tagen vor dem Anlass, 0 = am Tag selbst. */
  remindDays: number[]
  /** Uhrzeit der Erinnerungen, "HH:MM". */
  remindTime: string
  /** Beim Start nach einer neueren App-Version suchen (nur Android-App). */
  updateCheck: boolean
  /** Neueste gefundene Version und Download-Adresse, leer wenn keine bekannt ist. */
  updateLatest: string
  updateUrl: string
  /** Version, auf die schon per Hinweis aufmerksam gemacht wurde. */
  updateSeen: string
  updateAt: number
  /** Helle Zusatzleiste im Budget: Summe der noch offenen Ideen. */
  showPlanned: boolean
  /** Automatische Sicherung in Dokumente (nur Android-App). */
  autoBackup: boolean
  /** Name, unter dem Listen beim Teilen ankommen. */
  shareName: string
  /** Zufällige Kennung dieses Geräts als Absender. */
  shareId: string
  /** Hauptwährung für Summen, Budget und Statistik. */
  currency: string
  /** Kurse: Einheiten der Währung für 1 Euro (Euro selbst = 1). */
  rates: Record<string, number>
  ratesAt: number
  /** Kurse einmal täglich selbst holen. */
  ratesAuto: boolean
  dateFmt: DateFmt
  fontScale: FontScale
  haptics: boolean
  /** Tage, die Einträge im Papierkorb bleiben. */
  trashDays: number
  /** Anzahl der automatischen Sicherungen, die bleiben. */
  autoKeep: number
  startTab: StartTab
  sort: SortMode
  /** Listen untereinander (eine pro Zeile) oder als Kacheln nebeneinander. */
  listLayout: ListLayout
  shareDefaults: ShareDefaults
  /** PIN-Sperre: gesalzener Hash, leer = aus. Bleibt auf diesem Gerät. */
  lockHash: string
  lockSalt: string
  /** Sekunden im Hintergrund, nach denen die App sich sperrt (0 = sofort). */
  lockAfter: number
  /** Link-Import: Produktdaten aus einer Webseite lesen. Aus = die App öffnet nie eine fremde Seite. */
  linkImport: boolean
  /** Beim Link-Import auch das Produktbild übernehmen. */
  linkImages: boolean
  linkAuto: boolean
  linkPrice: boolean
  linkOverwrite: boolean
  linkKeepName: boolean
  linkShortName: boolean
  priceWatch: boolean
  priceSearch: boolean
  priceBg: boolean
  kindAuto: boolean
  /** Stilvariante des Designs, Standard ist der Geschenkanhänger. */
  style: StyleName
  radius: RadiusSetting
  density: Density
  tone: Tone
  fontFamily: FontFamily
  hapticLevel: HapticLevel
  imgSize: ImgSize
  nameLines: 1 | 2
  cardPrice: boolean
  cardLink: boolean
  cardNote: boolean
  cardPrio: boolean
  cardTags: boolean
  swipeOn: boolean
  swipeDist: SwipeDist
  swipeR1: SwipeAct
  swipeR2: SwipeAct
  swipeL1: SwipeAct
  swipeL2: SwipeAct
  /** Reihenfolge der Reiter in der Leiste (ohne "Mehr", das bleibt rechts). */
  tabOrder: TabId[]
  /** Ausgeblendete Reiter. "Wünsche" bleibt immer sichtbar. */
  tabsHidden: TabId[]
  tabLabels: boolean
  /** Preisänderungen unter diesem Prozentwert werden nicht gemeldet. */
  priceMinPct: number
}

export type ListLayout = 'rows' | 'grid'

export type ShareBought = 'hidden' | 'only' | 'exclude'
