import { dayAgoTs } from './format'
import type { Item, Person, ReceivedList, Wishlist } from './types'

// Beispieldaten für die V0.1-Vorschau. Nichts davon wird gespeichert.

const now = () => Date.now()

function list(id: string, owner: string, name: string, emoji: string, hue: number, isDefault = false): Wishlist {
  return { id, owner, name: isDefault ? '' : name, isDefault: isDefault || undefined, emoji, hue, createdAt: now() }
}

function item(id: string, owner: string, listId: string, name: string, emoji: string, hue: number, extra: Partial<Item> = {}): Item {
  return { id, owner, listId, name, emoji, hue, bought: false, createdAt: now(), ...extra }
}

export const defaultList = (owner: string, id: string): Wishlist => list(id, owner, '', '📌', owner === 'me' ? 14 : 200, true)

export function demoLists(): Wishlist[] {
  return [
    list('l-me-1', 'me', '', '📌', 14, true),
    list('l-me-2', 'me', 'Weihnachten', '🎄', 150),
    list('l-me-3', 'me', 'Geburtstag', '🎂', 45),
    list('l-lena-1', 'p-lena', 'Geburtstag', '🎂', 345),
    list('l-lena-2', 'p-lena', 'Weihnachten', '🎄', 150),
    list('l-jonas-1', 'p-jonas', '', '📌', 55, true),
    list('l-papa-1', 'p-papa', '', '📌', 225, true),
    list('l-oma-1', 'p-oma', '', '📌', 160, true),
  ]
}

export function demoPersons(): Person[] {
  return [
    {
      id: 'p-lena',
      name: 'Lena',
      hue: 345,
      budget: 150,
      occasions: [
        { id: 'o1', label: 'Geburtstag', month: 11, day: 8 },
        { id: 'o2', label: 'Weihnachten', month: 12, day: 24 },
      ],
    },
    {
      id: 'p-jonas',
      name: 'Jonas',
      hue: 55,
      budget: 80,
      occasions: [{ id: 'o3', label: 'Geburtstag', month: 10, day: 31 }],
    },
    {
      id: 'p-papa',
      name: 'Papa',
      hue: 225,
      budget: 120,
      occasions: [
        { id: 'o4', label: 'Weihnachten', month: 12, day: 24 },
        { id: 'o5', label: 'Geburtstag', month: 3, day: 14 },
      ],
    },
    {
      id: 'p-oma',
      name: 'Oma',
      hue: 160,
      budget: 60,
      occasions: [{ id: 'o6', label: 'Weihnachten', month: 12, day: 24 }],
    },
  ]
}

export function demoItems(): Item[] {
  return [
    // Eigene Wünsche, Standardliste
    item('w1', 'me', 'l-me-1', 'Over-Ear-Kopfhörer', '🎧', 265, { kind: 'Kopfhörer', price: 399, link: 'https://example.com/kopfhoerer', note: 'Schwarz, mit Noise-Cancelling. Die Ohrpolster sollten austauschbar sein.' }),
    item('w2', 'me', 'l-me-1', 'Sofortbildkamera', '📷', 15, { kind: 'Kamera', price: 89, link: 'https://example.com/kamera', note: 'Gern in Mint.' }),
    item('w3', 'me', 'l-me-1', 'Monstera Deliciosa', '🪴', 150, { kind: 'Pflanze', price: 39 }),
    item('w7', 'me', 'l-me-1', 'Espresso-Tassen im Set', '☕', 35, { kind: 'Küche', price: 28, bought: true, boughtAt: dayAgoTs(5) }),
    item('w10', 'me', 'l-me-1', 'Fahrradlicht', '🔦', 60, { kind: 'Fahrrad', price: 25, bought: true, boughtAt: dayAgoTs(38) }),
    item('w11', 'me', 'l-me-1', 'Powerbank', '🔋', 120, { price: 34, bought: true, boughtAt: dayAgoTs(70) }),
    // Weihnachten
    item('w4', 'me', 'l-me-2', 'Mechanische Armbanduhr', '⌚', 45, { kind: 'Uhr', price: 240, link: 'https://example.com/uhr' }),
    item('w5', 'me', 'l-me-2', 'Dune-Trilogie als Box', '📚', 28, { kind: 'Buch', price: 36 }),
    // Geburtstag
    item('w6', 'me', 'l-me-3', 'Handgepäck-Koffer', '🧳', 200, { kind: 'Tasche', price: 159, note: 'Hartschale, mindestens 4 Rollen.' }),
    item('w12', 'me', 'l-me-3', 'Gewürzset', '🧂', 20, { price: 24, bought: true, boughtAt: dayAgoTs(112) }),
    // Papierkorb
    item('w8', 'me', 'l-me-1', 'Sonnenbrille', '🕶️', 320, { price: 120, deletedAt: dayAgoTs(4) }),
    item('w9', 'me', 'l-me-1', 'Brettspiel für Zwei', '🎲', 90, { kind: 'Brettspiel', price: 32, deletedAt: dayAgoTs(27) }),

    // Geschenkideen
    item('i1', 'p-lena', 'l-lena-1', 'Kindle Paperwhite', '📖', 220, { kind: 'E-Reader', price: 159, link: 'https://example.com/kindle' }),
    item('i2', 'p-lena', 'l-lena-1', 'Duftkerzen-Set', '🕯️', 40, { kind: 'Kerzen', price: 34.9, bought: true, boughtAt: dayAgoTs(2) }),
    item('i3', 'p-lena', 'l-lena-2', 'Kaschmir-Schal', '🧣', 350, { kind: 'Kleidung', price: 69, note: 'Lieblingsfarbe: Senfgelb.' }),
    item('i4', 'p-jonas', 'l-jonas-1', 'Switch-Spiel', '🎮', 275, { kind: 'Spiel', price: 59.99, link: 'https://example.com/spiel' }),
    item('i5', 'p-jonas', 'l-jonas-1', 'Kaffeemühle', '☕', 30, { kind: 'Küche', price: 45 }),
    item('i6', 'p-papa', 'l-papa-1', 'Angelset', '🎣', 195, { kind: 'Angeln', price: 89 }),
    item('i7', 'p-papa', 'l-papa-1', 'Weinkühler', '🍷', 355, { kind: 'Getränke', price: 45, bought: true, boughtAt: dayAgoTs(9) }),
    item('i8', 'p-oma', 'l-oma-1', 'Wolle-Set', '🧶', 130, { kind: 'Handarbeit', price: 25, note: 'Dicke Nadel Stärke 6.' }),
    item('i9', 'p-papa', 'l-papa-1', 'Wollsocken', '🧦', 190, { kind: 'Kleidung', price: 18, bought: true, boughtAt: dayAgoTs(63) }),
    item('i10', 'p-oma', 'l-oma-1', 'Pralinen', '🍫', 30, { price: 22, bought: true, boughtAt: dayAgoTs(95) }),
  ]
}

export function demoReceived(): ReceivedList[] {
  return [
    {
      id: 'r-lena',
      from: 'Lena',
      hue: 345,
      receivedAt: dayAgoTs(3),
      personId: 'p-lena',
      lists: [
        {
          id: 'rl1',
          name: 'Geburtstag',
          emoji: '🎂',
          hue: 345,
          items: [
            // Unauffällig mitgesendet: Lena besitzt den Kindle schon. Standardmäßig nicht sichtbar.
            { id: 'ri1', name: 'Kindle Paperwhite', kind: 'E-Reader', emoji: '📖', hue: 220, price: 159, link: 'https://example.com/kindle', owned: true, boughtAt: dayAgoTs(140) },
            { id: 'ri2', name: 'Aquarell-Set', kind: 'Malen', emoji: '🎨', hue: 20, price: 48, owned: false, note: 'Gern mit festen Näpfchen.' },
            { id: 'ri3', name: 'Handcreme-Trio', kind: 'Pflege', emoji: '🧴', hue: 330, price: 22, owned: false },
            { id: 'ri6', name: 'Gesichtscreme', kind: 'Pflege', emoji: '🧴', hue: 310, price: 29, owned: true, boughtAt: dayAgoTs(30) },
          ],
        },
        {
          id: 'rl2',
          name: 'Weihnachten',
          emoji: '🎄',
          hue: 150,
          items: [
            { id: 'ri4', name: 'Wintersocken', kind: 'Kleidung', emoji: '🧦', hue: 190, price: 15, owned: false },
            { id: 'ri5', name: 'Tageslichtlampe', kind: 'Lampe', emoji: '💡', hue: 70, price: 54, owned: false },
          ],
        },
      ],
    },
    {
      id: 'r-mats',
      from: 'Mats',
      hue: 205,
      receivedAt: dayAgoTs(12),
      lists: [
        {
          id: 'rl3',
          name: 'Allgemein',
          emoji: '📌',
          hue: 205,
          items: [
            { id: 'rm1', name: 'Trailrunning-Schuhe', kind: 'Schuhe', emoji: '👟', hue: 150, price: 130, owned: false },
            { id: 'rm2', name: 'Stirnlampe', kind: 'Lampe', emoji: '🔦', hue: 60, price: 35, owned: false },
            { id: 'rm3', name: 'Thermosflasche', kind: 'Flasche', emoji: '🧉', hue: 100, price: 28, owned: true, boughtAt: dayAgoTs(80) },
          ],
        },
      ],
    },
  ]
}
