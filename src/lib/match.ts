import { normalize } from './format'
import type { Item, ReceivedList } from './types'

// "Art" eines Artikels (z. B. Grafikkarte) und Ähnlichkeitssuche für die Doppelungs-Warnung.
// Alles läuft lokal. Die Art wird automatisch vorgeschlagen und lässt sich von Hand ändern.

/** Schlüsselwörter (ohne Umlaute, klein) -> Art. Erster Treffer gewinnt. */
const KINDS: [string[], string][] = [
  [['grafikkarte', 'rtx', 'gtx', 'radeon', 'geforce'], 'Grafikkarte'],
  [['kopfhor', 'headphone', 'airpods', 'earbuds', 'headset', 'in ear', 'over ear'], 'Kopfhörer'],
  [['kindle', 'e reader', 'ereader', 'tolino'], 'E-Reader'],
  [['kamera', 'camera', 'gopro', 'instax', 'sofortbild'], 'Kamera'],
  [['laptop', 'notebook', 'macbook'], 'Laptop'],
  [['smartphone', 'handy', 'iphone', 'pixel', 'galaxy'], 'Smartphone'],
  [['tablet', 'ipad'], 'Tablet'],
  [['monitor', 'bildschirm'], 'Monitor'],
  [['tastatur', 'keyboard'], 'Tastatur'],
  [['maus', 'mouse'], 'Maus'],
  [['drohne', 'drone'], 'Drohne'],
  [['armbanduhr', 'smartwatch', 'uhr', 'watch'], 'Uhr'],
  [['buch', 'roman', 'trilogie', 'bande'], 'Buch'],
  [['switch', 'playstation', 'xbox', 'spiel', 'game'], 'Spiel'],
  [['sneaker', 'schuh', 'stiefel', 'laufschuh'], 'Schuhe'],
  [['jacke', 'mantel', 'pullover', 'hoodie', 'shirt', 'hose', 'schal', 'socken', 'mutze', 'handschuh'], 'Kleidung'],
  [['koffer', 'trolley', 'rucksack', 'tasche'], 'Tasche'],
  [['kerze', 'duftkerze'], 'Kerzen'],
  [['pflanze', 'monstera', 'orchidee', 'kaktus'], 'Pflanze'],
  [['parfum', 'handcreme', 'creme', 'kosmetik', 'duft'], 'Pflege'],
  [['tasse', 'becher', 'pfanne', 'topf', 'messer', 'mixer', 'kaffeemuhle', 'espresso', 'kaffee', 'teekanne'], 'Küche'],
  [['wolle', 'stricknadel', 'nadel'], 'Handarbeit'],
  [['angel', 'angelset'], 'Angeln'],
  [['wein', 'whisky', 'gin', 'bier', 'weinkuhler'], 'Getränke'],
  [['lampe', 'leuchte', 'tageslicht'], 'Lampe'],
  [['aquarell', 'pinsel', 'zeichn', 'malen'], 'Malen'],
  [['fahrrad', 'bike', 'velo'], 'Fahrrad'],
  [['lego', 'puzzle', 'brettspiel'], 'Brettspiel'],
  [['thermos', 'trinkflasche', 'flasche'], 'Flasche'],
]

export function suggestKind(name: string): string | undefined {
  const n = normalize(name)
  if (!n) return undefined
  for (const [words, kind] of KINDS) {
    if (words.some((w) => n.includes(w))) return kind
  }
  return undefined
}

const STOP = new Set(['set', 'pro', 'max', 'mini', 'plus', 'fur', 'und', 'mit', 'the', 'xl', 'als', 'box', 'neu', 'von', 'der', 'die', 'das', 'ein', 'eine'])

function tokens(name: string): string[] {
  return normalize(name)
    .split(' ')
    .filter((w) => w.length >= 2 && !STOP.has(w))
}

export type Source = 'idea' | 'bought' | 'owned' | 'wish'
export type Reason = 'name' | 'kind' | 'both'

export interface Candidate {
  id: string
  name: string
  kind?: string
  emoji: string
  hue: number
  price?: number
  source: Source
  boughtAt?: number
  /** Name der Liste oder des Absenders, für die Anzeige. */
  where?: string
  /** Name der Person, der der Artikel gehört bzw. bei der er vorhanden ist. */
  person?: string
}

export interface Match {
  candidate: Candidate
  reason: Reason
}

/** Zwei Namen gelten als ähnlich, wenn sie ein (nicht allzu generisches) Wort teilen oder einer im anderen steckt. */
export function similarNames(a: string, b: string): boolean {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.length >= 4 && nb.includes(na)) return true
  if (nb.length >= 4 && na.includes(nb)) return true
  const ta = tokens(a)
  const tb = new Set(tokens(b))
  if (!ta.length || !tb.size) return false
  const shared = ta.filter((w) => tb.has(w))
  if (!shared.length) return false
  // Ein gemeinsames Wort reicht, sobald es nicht winzig ist (z. B. "kindle", "rtx", "4060").
  return shared.some((w) => w.length >= 3) && shared.length / Math.min(ta.length, tb.size) >= 0.5
}

export function findSimilar(name: string, kind: string | undefined, candidates: Candidate[]): Match[] {
  const k = kind ? normalize(kind) : ''
  const out: Match[] = []
  for (const c of candidates) {
    const byName = name.trim().length >= 3 && similarNames(name, c.name)
    const byKind = !!k && !!c.kind && normalize(c.kind) === k
    if (byName || byKind) out.push({ candidate: c, reason: byName && byKind ? 'both' : byName ? 'name' : 'kind' })
  }
  const rank = { both: 0, name: 1, kind: 2 } as const
  return out.sort((a, b) => rank[a.reason] - rank[b.reason])
}

/** Alle Dinge, die bei einem Eigentümer schon "im Spiel" sind: Ideen, selbst Gekauftes und das, was die Person schon besitzt. */
export function candidatesFor(owner: string, items: Item[], received: ReceivedList[], listName: (id: string) => string, ignoreId?: string): Candidate[] {
  const out: Candidate[] = items
    .filter((i) => i.owner === owner && !i.deletedAt && i.id !== ignoreId)
    .map((i) => ({
      id: i.id,
      name: i.name,
      kind: i.kind,
      emoji: i.emoji,
      hue: i.hue,
      price: i.price,
      source: owner === 'me' ? (i.bought ? ('bought' as const) : ('wish' as const)) : i.bought ? ('bought' as const) : ('idea' as const),
      boughtAt: i.boughtAt,
      where: listName(i.listId),
    }))
  if (owner !== 'me') {
    for (const r of received) {
      if (r.personId !== owner) continue
      for (const l of r.lists) {
        for (const it of l.items) {
          if (!it.owned) continue
          out.push({ id: `${r.id}:${it.id}`, name: it.name, kind: it.kind, emoji: it.emoji, hue: it.hue, price: it.price, source: 'owned', boughtAt: it.boughtAt, where: l.name, person: r.from })
        }
      }
    }
  }
  return out
}
