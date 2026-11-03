import { CURRENCIES } from './format'
import { detectLang } from './i18n'
import type { DateFmt, FontScale, ShareBought, ShareDefaults, SortMode, StartTab, UiSettings } from './types'

export const TRASH_CHOICES = [7, 14, 30, 60, 90]
export const KEEP_CHOICES = [3, 5, 10, 20]
export const LOCK_CHOICES = [0, 60, 300, 900]
export const SCALES: Record<FontScale, number> = { small: 0.92, normal: 1, large: 1.12, xl: 1.26 }

export const defaultShare = (): ShareDefaults => ({ notes: false, price: true, images: true, listDate: true, bought: 'hidden' })

export const defaults = (): UiSettings => ({
  theme: 'system',
  fx: 'full',
  lang: detectLang(),
  hue: 14,
  remindOn: false,
  remindDays: [14, 3, 0],
  remindTime: '09:00',
  updateCheck: true,
  updateLatest: '',
  updateUrl: '',
  updateSeen: '',
  updateAt: 0,
  showPlanned: false,
  autoBackup: true,
  shareName: '',
  shareId: '',
  currency: 'EUR',
  rates: {},
  ratesAt: 0,
  dateFmt: 'auto',
  fontScale: 'normal',
  haptics: true,
  trashDays: 30,
  autoKeep: 5,
  startTab: 'wishes',
  sort: 'new',
  shareDefaults: defaultShare(),
  lockHash: '',
  lockSalt: '',
  lockAfter: 60,
  linkImport: true,
  linkImages: true,
  linkAuto: true,
  linkPrice: true,
  linkOverwrite: true,
  linkKeepName: true,
  kindAuto: true,
})

/** Einstellungen, die ins Backup wandern. Gerätegebundenes (Kennung, Update-Stand, PIN, Erinnerungs-Schalter) bleibt draußen. */
export const SYNC_KEYS = [
  'theme', 'fx', 'lang', 'hue', 'remindDays', 'remindTime', 'updateCheck', 'showPlanned', 'autoBackup', 'shareName',
  'currency', 'rates', 'ratesAt', 'dateFmt', 'fontScale', 'haptics', 'trashDays', 'autoKeep', 'startTab', 'sort', 'shareDefaults', 'linkImport', 'linkImages', 'linkAuto', 'linkPrice', 'linkOverwrite', 'linkKeepName', 'kindAuto',
] as const satisfies readonly (keyof UiSettings)[]

export type SyncSettings = Pick<UiSettings, (typeof SYNC_KEYS)[number]>

export function syncPart(s: UiSettings): SyncSettings {
  const out: Record<string, unknown> = {}
  for (const k of SYNC_KEYS) out[k] = s[k]
  return out as unknown as SyncSettings
}

const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : undefined)
const num = (v: unknown, list: readonly number[]): number | undefined => (typeof v === 'number' && list.includes(v) ? v : undefined)
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined)
const days = (v: unknown): number[] | undefined =>
  Array.isArray(v) && v.length <= 12 && v.every((n) => Number.isInteger(n) && n >= 0 && n <= 365) ? [...new Set(v as number[])].sort((a, b) => b - a) : undefined

function cleanRates(v: unknown): Record<string, number> | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined
  const out: Record<string, number> = {}
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (k !== 'EUR' && CURRENCIES.includes(k) && typeof x === 'number' && Number.isFinite(x) && x > 0 && x < 1e7) out[k] = x
  }
  return out
}

function cleanShare(v: unknown): ShareDefaults | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const r = v as Record<string, unknown>
  const d = defaultShare()
  return {
    notes: bool(r.notes) ?? d.notes,
    price: bool(r.price) ?? d.price,
    images: bool(r.images) ?? d.images,
    listDate: bool(r.listDate) ?? d.listDate,
    bought: oneOf<ShareBought>(r.bought, ['hidden', 'only', 'exclude']) ?? d.bought,
  }
}

/** Prüft jedes Feld einzeln. Ungültiges fällt auf den Standard zurück, Unbekanntes wird verworfen. */
export function normalize(raw: unknown, base: UiSettings = defaults()): UiSettings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const str = (v: unknown, fb: string) => (typeof v === 'string' ? v : fb)
  const time = typeof r.remindTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.remindTime) ? r.remindTime : base.remindTime
  const cur = typeof r.currency === 'string' && CURRENCIES.includes(r.currency) ? r.currency : base.currency
  return {
    theme: oneOf(r.theme, ['system', 'dark', 'light'] as const) ?? base.theme,
    fx: oneOf(r.fx, ['full', 'calm', 'off'] as const) ?? base.fx,
    lang: oneOf(r.lang, ['de', 'en'] as const) ?? base.lang,
    hue: typeof r.hue === 'number' && r.hue >= 0 && r.hue <= 360 ? r.hue : base.hue,
    remindOn: bool(r.remindOn) ?? base.remindOn,
    remindDays: days(r.remindDays) ?? base.remindDays,
    remindTime: time,
    updateCheck: bool(r.updateCheck) ?? base.updateCheck,
    updateLatest: str(r.updateLatest, base.updateLatest),
    updateUrl: str(r.updateUrl, base.updateUrl),
    updateSeen: str(r.updateSeen, base.updateSeen),
    updateAt: typeof r.updateAt === 'number' ? r.updateAt : base.updateAt,
    showPlanned: bool(r.showPlanned) ?? base.showPlanned,
    autoBackup: bool(r.autoBackup) ?? base.autoBackup,
    shareName: str(r.shareName, base.shareName).slice(0, 40),
    shareId: str(r.shareId, base.shareId),
    currency: cur,
    rates: cleanRates(r.rates) ?? base.rates,
    ratesAt: typeof r.ratesAt === 'number' ? r.ratesAt : base.ratesAt,
    dateFmt: oneOf<DateFmt>(r.dateFmt, ['auto', 'dmy', 'mdy', 'iso']) ?? base.dateFmt,
    fontScale: oneOf<FontScale>(r.fontScale, ['small', 'normal', 'large', 'xl']) ?? base.fontScale,
    haptics: bool(r.haptics) ?? base.haptics,
    trashDays: num(r.trashDays, TRASH_CHOICES) ?? base.trashDays,
    autoKeep: num(r.autoKeep, KEEP_CHOICES) ?? base.autoKeep,
    startTab: oneOf<StartTab>(r.startTab, ['wishes', 'ideas', 'received', 'stats', 'last']) ?? base.startTab,
    sort: oneOf<SortMode>(r.sort, ['new', 'old', 'name', 'priceDown', 'priceUp']) ?? base.sort,
    shareDefaults: cleanShare(r.shareDefaults) ?? base.shareDefaults,
    lockHash: /^[0-9a-f]{64}$/.test(str(r.lockHash, '')) ? (r.lockHash as string) : '',
    lockSalt: /^[0-9a-f]{32}$/.test(str(r.lockSalt, '')) ? (r.lockSalt as string) : '',
    lockAfter: num(r.lockAfter, LOCK_CHOICES) ?? base.lockAfter,
    linkImport: bool(r.linkImport) ?? base.linkImport,
    linkImages: bool(r.linkImages) ?? base.linkImages,
    linkAuto: bool(r.linkAuto) ?? base.linkAuto,
    linkPrice: bool(r.linkPrice) ?? base.linkPrice,
    linkOverwrite: bool(r.linkOverwrite) ?? base.linkOverwrite,
    linkKeepName: bool(r.linkKeepName) ?? base.linkKeepName,
    kindAuto: bool(r.kindAuto) ?? base.kindAuto,
  }
}

/** Übernimmt Einstellungen aus einem Backup auf den jetzigen Stand, nur die Backup-Felder. */
export function applyBackupSettings(current: UiSettings, raw: unknown): UiSettings {
  if (typeof raw !== 'object' || raw === null) return current
  const merged = normalize({ ...syncPart(current), ...(raw as object) }, current)
  const out = { ...current }
  for (const k of SYNC_KEYS) (out as Record<string, unknown>)[k] = merged[k]
  return out
}

/** Sortiert Einträge nach der gewählten Reihenfolge. Die Eingabe bleibt unverändert. */
export function sortItems<T extends { name: string; createdAt: number; price?: number }>(list: T[], mode: SortMode, priceOf: (i: T) => number): T[] {
  const a = [...list]
  if (mode === 'old') return a.sort((x, y) => x.createdAt - y.createdAt)
  if (mode === 'name') return a.sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' }))
  if (mode === 'priceDown') return a.sort((x, y) => priceOf(y) - priceOf(x))
  if (mode === 'priceUp') return a.sort((x, y) => (x.price === undefined ? 1 : y.price === undefined ? -1 : priceOf(x) - priceOf(y)))
  return a.sort((x, y) => y.createdAt - x.createdAt)
}
