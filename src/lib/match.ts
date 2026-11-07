import { normalize } from './format'
import type { Item, ReceivedList } from './types'

// "Art" eines Artikels (z. B. Grafikkarte) und Ähnlichkeitssuche für die Doppelungs-Warnung.
// Alles läuft lokal. Die Art wird automatisch vorgeschlagen und lässt sich von Hand ändern.

/** Schlüsselwörter (ohne Umlaute, klein) -> Art. Mehrwort-Begriffe stehen vor Einzelwörtern, der erste Treffer gewinnt. */
const KINDS: [string[], string][] = [
  [['gutschein', 'geschenkkarte', 'gift card', 'giftcard', 'guthaben'], 'Gutschein'],
  [['galaxy watch', 'apple watch', 'pixel watch', 'smartwatch', 'fitnessarmband', 'fitness tracker', 'fitbit', 'garmin'], 'Smartwatch'],
  [['galaxy tab', 'ipad', 'tablet'], 'Tablet'],
  [['galaxy buds', 'pixel buds', 'airpods', 'earbuds', 'kopfhor', 'headphone', 'headset', 'in ear', 'over ear', 'ohrhorer'], 'Kopfhörer'],
  [['powerbank', 'power bank'], 'Powerbank'],
  [['hulle', 'case', 'cover', 'schutzfolie', 'panzerglas', 'kabel', 'adapter', 'ladegerat', 'netzteil', 'halterung', 'android auto', 'carplay', 'dashcam', 'charger', 'cable', 'stander', 'dock', 'hub', 'stylus'], 'Zubehör'],
  [['echo dot', 'echo show', 'echo pop', 'echo spot', 'echo studio', 'homepod', 'nest mini', 'nest audio', 'alexa', 'smart speaker'], 'Smart Speaker'],
  [['grafikkarte', 'rtx', 'gtx', 'radeon', 'geforce'], 'Grafikkarte'],
  [['prozessor', 'cpu', 'ryzen', 'mainboard', 'arbeitsspeicher', 'ram', 'cpu kuhler', 'pc gehause', 'netzteil pc'], 'PC-Hardware'],
  [['festplatte', 'ssd', 'nvme', 'speicherkarte', 'sd karte', 'microsd', 'usb stick'], 'Speicher'],
  [['router', 'repeater', 'mesh'], 'Netzwerk'],
  [['drucker'], 'Drucker'],
  [['kindle', 'e reader', 'ereader', 'tolino'], 'E-Reader'],
  [['kamera', 'camera', 'gopro', 'instax', 'sofortbild', 'objektiv'], 'Kamera'],
  [['laptop', 'notebook', 'macbook'], 'Laptop'],
  [['smartphone', 'handy', 'iphone'], 'Smartphone'],
  [['monitor', 'bildschirm', 'fernseher', 'beamer'], 'Bildschirm'],
  [['soundbar', 'lautsprecher', 'speaker', 'boombox', 'mikrofon', 'plattenspieler', 'hifi', 'verstarker', 'subwoofer', 'radio'], 'Audio'],
  [['tastatur', 'keyboard'], 'Tastatur'],
  [['maus', 'mouse'], 'Maus'],
  [['controller', 'gamepad', 'lenkrad'], 'Controller'],
  [['drohne', 'drone'], 'Drohne'],
  [['armbanduhr', 'uhr'], 'Uhr'],
  [['motorrad', 'roller', 'cbr', 'motorradhelm'], 'Motorrad'],
  [['steckdose', 'smart home', 'zigbee', 'thermostat', 'hue', 'bewegungsmelder', 'rauchmelder', 'klingel', 'airtag'], 'Smart Home'],
  [['fire tv', 'chromecast', 'apple tv', 'streaming stick', 'roku'], 'Streaming'],
  [['staubsauger', 'trimmer', 'barttrimmer', 'saugroboter', 'rasierer', 'haartrockner', 'fohn', 'zahnburste', 'epilierer', 'toaster', 'wasserkocher', 'airfryer', 'heissluftfritteuse'], 'Haushalt'],
  [['hobel', 'sage', 'bohrer', 'schrauber', 'hammer', 'zange', 'feile', 'stemmeisen', 'werkzeug', 'schraubzwinge', 'meissel', 'winkel', 'zollstock', 'schraubenzieher', 'schraubendreher', 'bohrmaschine', 'schleifer', 'frase', 'werkbank', 'messschieber', 'wasserwaage', 'multitool'], 'Werkzeug'],
  [['schallplatte', 'vinyl', 'blu ray', 'dvd', 'film', 'horbuch', 'cd'], 'Medien'],
  [['gitarre', 'klavier', 'piano', 'ukulele', 'schlagzeug', 'geige', 'flote', 'mundharmonika'], 'Instrument'],
  [['buch', 'roman', 'trilogie', 'bande', 'comic', 'manga'], 'Buch'],
  [['playstation', 'xbox', 'nintendo', 'spiel', 'game'], 'Spiel'],
  [['sneaker', 'schuh', 'schuhe', 'stiefel', 'laufschuh'], 'Schuhe'],
  [['jacke', 'mantel', 'pullover', 'hoodie', 'shirt', 'hose', 'schal', 'socken', 'mutze', 'handschuh', 'kleid', 'rock', 'gurtel', 'krawatte', 'badehose', 'unterwasche', 'weste', 'kappe', 'strumpf', 'pyjama', 'schlafanzug', 'bluse', 'jeans', 'leggings', 'sweatshirt', 'tshirt'], 'Kleidung'],
  [['zelt', 'schlafsack', 'isomatte', 'camping', 'wander', 'hangematte', 'fernglas', 'kompass', 'taschenmesser'], 'Outdoor'],
  [['fussball', 'basketball', 'handball', 'volleyball', 'tennis', 'badminton', 'skateboard', 'inliner', 'schlittschuh', 'ski', 'snowboard', 'kletter', 'boxhandschuh'], 'Sport'],
  [['koffer', 'trolley', 'rucksack', 'tasche', 'geldborse', 'portemonnaie'], 'Tasche'],
  [['ring', 'kette', 'armband', 'ohrring', 'schmuck'], 'Schmuck'],
  [['brille', 'sonnenbrille'], 'Brille'],
  [['kerze', 'duftkerze'], 'Kerzen'],
  [['pflanze', 'monstera', 'orchidee', 'kaktus'], 'Pflanze'],
  [['katzen', 'hunde', 'kratzbaum', 'napf', 'leckerli', 'katzenfutter', 'hundefutter'], 'Haustier'],
  [['autositz', 'reifen', 'felgen', 'scheibenwischer', 'kfz', 'autopflege', 'fussmatte'], 'Auto'],
  [['bilderrahmen', 'poster', 'vase', 'kissen', 'deko', 'wandbild', 'spiegel', 'teppich'], 'Deko'],
  [['schokolade', 'praline', 'gummibar', 'snack', 'bonbon', 'keks', 'gewurz', 'honig', 'geschenkkorb'], 'Essen'],
  [['parfum', 'deodorant', 'rasierschaum', 'sonnencreme', 'lippenpflege', 'handcreme', 'creme', 'kosmetik', 'duft', 'shampoo', 'seife'], 'Pflege'],
  [['tasse', 'becher', 'pfanne', 'topf', 'messer', 'mixer', 'kaffeemuhle', 'espresso', 'kaffee', 'teekanne'], 'Küche'],
  [['wolle', 'stricknadel', 'nadel'], 'Handarbeit'],
  [['angel', 'angelset'], 'Angeln'],
  [['wein', 'whisky', 'gin', 'bier', 'weinkuhler'], 'Getränke'],
  [['lampe', 'leuchte', 'tageslicht'], 'Lampe'],
  [['stuhl', 'tisch', 'regal', 'sofa', 'schrank', 'sessel', 'bett'], 'Möbel'],
  [['hantel', 'yoga', 'fitness', 'trainingsband', 'gymnastik'], 'Fitness'],
  [['aquarell', 'pinsel', 'zeichn', 'malen'], 'Malen'],
  [['fahrrad', 'bike', 'velo', 'fahrradhelm'], 'Fahrrad'],
  [['lego', 'puzzle', 'brettspiel', 'spielzeug', 'puppe', 'plusch'], 'Spielzeug'],
  [['thermos', 'trinkflasche', 'flasche'], 'Flasche'],
]

/** Markennamen, die keine Art verraten ("Galaxy" kann Handy, Uhr oder Tablet sein). Zählen nur, wenn sonst nichts passt. */
const WEAK: [string[], string][] = [
  [['galaxy', 'pixel', 'xiaomi', 'redmi'], 'Smartphone'],
  [['switch'], 'Spiel'],
]

const hit = (n: string, toks: string[], w: string): boolean =>
  w.includes(' ') ? n.includes(w) : toks.some((t) => t === w || (w.length >= 4 && t.endsWith(w)) || (w.length >= 5 && t.startsWith(w)))

/** Bekannte Einträge, aus denen die App lernt: gleiche Wörter im Namen, dieselbe Art. */
export interface KnownKind {
  name: string
  kind?: string
}

const GENERIC = new Set(['galaxy', 'pixel', 'wireless', 'black', 'white', 'schwarz', 'weiss', 'grau', 'blau', 'rot', 'gross', 'klein'])

function learnedKind(n: string, known: KnownKind[]): string | undefined {
  const mine = new Set(n.split(' ').filter((w) => w.length >= 4 && !STOP.has(w) && !GENERIC.has(w) && !/^\d+$/.test(w)))
  if (!mine.size) return undefined
  const score = new Map<string, number>()
  for (const k of known) {
    if (!k.kind?.trim()) continue
    const shared = normalize(k.name).split(' ').filter((w) => mine.has(w)).length
    if (shared) score.set(k.kind.trim(), (score.get(k.kind.trim()) ?? 0) + shared)
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

const tokensOf = (n: string): string[] => n.split(' ').flatMap((t) => [t, ...t.split(/(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])/)])

function byWords(n: string): string | undefined {
  if (!n) return undefined
  const toks = tokensOf(n)
  for (const [words, kind] of KINDS) if (words.some((w) => hit(n, toks, w))) return kind
  return undefined
}

/** Wörter aus dem Pfad eines Links ("echo-dot-5-generation" -> "echo dot 5 generation"), ohne Nummern und Kennungen. */
export function linkWords(link: string | undefined): string {
  if (!link) return ''
  let path = link
  try {
    path = new URL(/^[a-z][a-z0-9+.-]*:/i.test(link) ? link : `https://${link}`).pathname
  } catch {
    return ''
  }
  let raw = path
  try {
    raw = decodeURIComponent(path)
  } catch {
    /* bleibt */
  }
  return normalize(raw.replace(/[-_/.+]+/g, ' '))
    .split(' ')
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !(/\d/.test(w) && /[a-z]/.test(w) && w.length >= 8))
    .join(' ')
}

/** Art aus dem Namen: erst feste Begriffe, dann die Wörter im Link, dann was die App aus deinen Einträgen gelernt hat, dann Markennamen, zuletzt die Kategorie der Seite. */
export function suggestKind(name: string, known: KnownKind[] = [], category?: string, link?: string): string | undefined {
  const n = normalize(name)
  if (!n) return undefined
  const direct = byWords(n)
  if (direct) return direct
  const fromLink = byWords(linkWords(link))
  if (fromLink) return fromLink
  const learned = learnedKind(n, known)
  if (learned) return learned
  const toks = tokensOf(n)
  for (const [words, kind] of WEAK) if (words.some((w) => hit(n, toks, w))) return kind
  const cat = category?.trim()
  if (cat && cat.length <= 40) return cat.charAt(0).toUpperCase() + cat.slice(1)
  return undefined
}

/** Alle Arten zum Auswählen: eigene (nach Häufigkeit) vor den festen. */
export function kindOptions(known: KnownKind[], typed: string): string[] {
  const count = new Map<string, number>()
  for (const k of known) if (k.kind?.trim()) count.set(k.kind.trim(), (count.get(k.kind.trim()) ?? 0) + 1)
  const own = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  const all = [...new Set([...own, ...KINDS.map(([, k]) => k)])]
  const q = normalize(typed)
  const list = q ? all.filter((k) => normalize(k).includes(q) && normalize(k) !== q) : own
  return list.slice(0, 8)
}

const STOP = new Set(['set', 'pro', 'max', 'mini', 'plus', 'fur', 'und', 'mit', 'the', 'xl', 'als', 'box', 'neu', 'von', 'der', 'die', 'das', 'ein', 'eine'])

/** Herstellernamen, die allein nichts über das Produkt sagen. */
const BRANDS = new Set(['apple', 'samsung', 'sony', 'xiaomi', 'logitech', 'bosch', 'makita', 'amazon', 'google', 'nintendo', 'microsoft', 'philips', 'anker', 'jbl', 'bose', 'lenovo', 'asus', 'acer', 'dell', 'huawei', 'honor', 'garmin', 'canon', 'nikon', 'dyson', 'braun', 'festool', 'dewalt', 'adidas', 'nike', 'puma', 'galaxy', 'pixel'])

function tokens(name: string): string[] {
  return normalize(name)
    .split(' ')
    .filter((w) => w.length >= 2 && !STOP.has(w))
}

export type Source = 'idea' | 'bought' | 'owned' | 'wish'
export type Reason = 'name' | 'both'

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
  const shared = ta.filter((w) => tb.has(w) && !BRANDS.has(w))
  if (!shared.length) return false
  // Ein gemeinsames Wort reicht, sobald es nicht winzig ist (z. B. "kindle", "rtx", "4060"). Marken allein zählen nicht.
  return shared.some((w) => w.length >= 3) && shared.length / Math.min(ta.length, tb.size) >= 0.5
}

/**
 * Warnung nur bei gleichem oder ähnlichem Namen. Die Art entscheidet dann nur noch mit:
 * gleiche Art bestätigt den Treffer, fehlt sie auf einer Seite, warnt der Name trotzdem,
 * stehen zwei verschiedene Arten da, ist es nur ein Zufallstreffer im Namen (außer bei exakt gleichem Namen).
 */
export function findSimilar(name: string, kind: string | undefined, candidates: Candidate[]): Match[] {
  const k = kind ? normalize(kind) : ''
  const same = normalize(name)
  const out: Match[] = []
  if (name.trim().length < 3) return out
  for (const c of candidates) {
    if (!similarNames(name, c.name)) continue
    const ck = c.kind ? normalize(c.kind) : ''
    const sameKind = !!k && !!ck && k === ck
    const differs = !!k && !!ck && k !== ck
    if (differs && normalize(c.name) !== same) continue
    out.push({ candidate: c, reason: sameKind ? 'both' : 'name' })
  }
  const rank = { both: 0, name: 1 } as const
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
