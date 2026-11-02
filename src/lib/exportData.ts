import { curOf, convert, hasRate, mainCurrency, money } from './format'
import type { TFn } from './i18n'
import { listTitle } from './lists'
import type { Item, Person, Wishlist } from './types'

export type ExportScope = 'wishes' | 'ideas' | 'all'
export type ExportFormat = 'csv' | 'txt'

export interface ExportInput {
  items: Item[]
  lists: Wishlist[]
  persons: Person[]
}

const pad = (n: number) => String(n).padStart(2, '0')
const day = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function exportName(format: ExportFormat, scope: ExportScope, at = new Date()): string {
  const what = scope === 'wishes' ? 'wuensche' : scope === 'ideas' ? 'ideen' : 'alles'
  return `wunschliste-${what}-${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}.${format}`
}

function rowsOf(src: ExportInput, scope: ExportScope, withBought: boolean, t: TFn) {
  const out: { owner: string; list: string; item: Item }[] = []
  const name = (o: string) => (o === 'me' ? t('Ich') : (src.persons.find((p) => p.id === o)?.name ?? '?'))
  const live = src.items.filter((i) => !i.deletedAt && (withBought || !i.bought))
  const pick = (owner: string) => live.filter((i) => i.owner === owner)
  const owners = [...(scope !== 'ideas' ? ['me'] : []), ...(scope !== 'wishes' ? src.persons.map((p) => p.id) : [])]
  for (const o of owners) {
    for (const item of pick(o)) {
      const l = src.lists.find((x) => x.id === item.listId)
      out.push({ owner: name(o), list: l ? listTitle(l, t) : '', item })
    }
  }
  return out
}

/** Zellen, die Excel als Formel lesen würde, bekommen ein Hochkomma davor (Schutz vor eingeschleusten Formeln). */
const safe = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s)

export function buildCsv(src: ExportInput, scope: ExportScope, withBought: boolean, t: TFn): string {
  const sep = t.lang === 'de' ? ';' : ','
  const dec = (n: number) => (t.lang === 'de' ? String(n).replace('.', ',') : String(n))
  const q = (v: string) => (/[";,\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const main = mainCurrency()
  const head = [t('Für'), t('Liste'), t('Name'), t('Art'), t('Preis'), t('Währung'), t('Preis in {cur}', { cur: main }), t('Link'), t('Notiz'), t('Status'), t('Gekauft am'), t('Hinzugefügt am')]
  const lines = [head.map(q).join(sep)]
  for (const { owner, list, item: i } of rowsOf(src, scope, withBought, t)) {
    const cur = curOf(i)
    const conv = i.price !== undefined && (cur === main || (hasRate(cur) && hasRate(main))) ? dec(Math.round(convert(i.price, cur) * 100) / 100) : ''
    lines.push(
      [
        q(safe(owner)), q(safe(list)), q(safe(i.name)), q(safe(i.kind ?? '')), i.price !== undefined ? dec(i.price) : '', i.price !== undefined ? cur : '', conv,
        q(safe(i.link ?? '')), q(safe(i.note ?? '')), i.bought ? t('gekauft') : t('offen'), i.boughtAt ? day(i.boughtAt) : '', day(i.createdAt),
      ].join(sep),
    )
  }
  return `﻿${lines.join('\r\n')}\r\n`
}

export function buildText(src: ExportInput, scope: ExportScope, withBought: boolean, t: TFn): string {
  const rows = rowsOf(src, scope, withBought, t)
  const out: string[] = [`${t('Wunschliste')} · ${day(Date.now())}`]
  let lastOwner = ''
  let lastList = ''
  for (const { owner, list, item: i } of rows) {
    if (owner !== lastOwner) {
      out.push('', owner === t('Ich') ? `== ${t('Meine Wünsche')} ==` : `== ${t('Ideen für {name}', { name: owner })} ==`)
      lastOwner = owner
      lastList = ''
    }
    if (list !== lastList) {
      out.push('', list)
      lastList = list
    }
    const price = i.price !== undefined ? ` (${money(i.price, curOf(i))})` : ''
    out.push(`${i.bought ? '[x]' : '[ ]'} ${i.name}${price}${i.link ? ` – ${i.link}` : ''}`)
    if (i.note) out.push(`      ${i.note.replace(/\s*\n\s*/g, ' ')}`)
  }
  if (!rows.length) out.push('', t('Nichts zu exportieren.'))
  return `${out.join('\n')}\n`
}
