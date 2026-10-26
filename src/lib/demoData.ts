import { dayAgoTs } from './format'
import type { Item, Person, ReceivedList } from './types'

// Beispieldaten für die V0.1-Vorschau. Nichts davon wird gespeichert.

const now = () => Date.now()

function item(
  id: string,
  owner: string,
  name: string,
  emoji: string,
  hue: number,
  extra: Partial<Item> = {},
): Item {
  return { id, owner, name, emoji, hue, bought: false, createdAt: now(), ...extra }
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
    // Eigene Wünsche
    item('w1', 'me', 'Over-Ear-Kopfhörer', '🎧', 265, {
      price: 399,
      link: 'https://example.com/kopfhoerer',
      note: 'Schwarz, mit Noise-Cancelling. Die Ohrpolster sollten austauschbar sein.',
    }),
    item('w2', 'me', 'Sofortbildkamera', '📷', 15, { price: 89, link: 'https://example.com/kamera', note: 'Gern in Mint.' }),
    item('w3', 'me', 'Monstera Deliciosa', '🪴', 150, { price: 39 }),
    item('w4', 'me', 'Mechanische Armbanduhr', '⌚', 45, { price: 240, link: 'https://example.com/uhr' }),
    item('w5', 'me', 'Dune-Trilogie als Box', '📚', 28, { price: 36 }),
    item('w6', 'me', 'Handgepäck-Koffer', '🧳', 200, { price: 159, note: 'Hartschale, mindestens 4 Rollen.' }),
    item('w7', 'me', 'Espresso-Tassen im Set', '☕', 35, { price: 28, bought: true, boughtAt: dayAgoTs(5) }),
    item('w8', 'me', 'Sonnenbrille', '🕶️', 320, { price: 120, deletedAt: dayAgoTs(4) }),
    item('w9', 'me', 'Brettspiel für Zwei', '🎲', 90, { price: 32, deletedAt: dayAgoTs(27) }),

    // Geschenkideen
    item('i1', 'p-lena', 'Kindle Paperwhite', '📖', 220, { price: 159, link: 'https://example.com/kindle' }),
    item('i2', 'p-lena', 'Duftkerzen-Set', '🕯️', 40, { price: 34.9, bought: true, boughtAt: dayAgoTs(2) }),
    item('i3', 'p-lena', 'Kaschmir-Schal', '🧣', 350, { price: 69, note: 'Lieblingsfarbe: Senfgelb.' }),
    item('i4', 'p-jonas', 'Switch-Spiel', '🎮', 275, { price: 59.99, link: 'https://example.com/spiel' }),
    item('i5', 'p-jonas', 'Kaffeemühle', '☕', 30, { price: 45 }),
    item('i6', 'p-papa', 'Angelset', '🎣', 195, { price: 89 }),
    item('i7', 'p-papa', 'Weinkühler', '🍷', 355, { price: 45, bought: true, boughtAt: dayAgoTs(9) }),
    item('i8', 'p-oma', 'Wolle-Set', '🧶', 130, { price: 25, note: 'Dicke Nadel Stärke 6.' }),
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
      items: [
        // Unauffällig mitgesendet: Lena besitzt den Kindle schon. Wird in der Liste nicht angezeigt.
        { id: 'ri1', name: 'Kindle Paperwhite', emoji: '📖', hue: 220, price: 159, link: 'https://example.com/kindle', owned: true },
        { id: 'ri2', name: 'Aquarell-Set', emoji: '🎨', hue: 20, price: 48, owned: false, note: 'Gern mit festen Näpfchen.' },
        { id: 'ri3', name: 'Handcreme-Trio', emoji: '🧴', hue: 330, price: 22, owned: false },
        { id: 'ri4', name: 'Wintersocken', emoji: '🧦', hue: 190, price: 15, owned: false },
        { id: 'ri5', name: 'Tageslichtlampe', emoji: '💡', hue: 70, price: 54, owned: false },
      ],
    },
    {
      id: 'r-mats',
      from: 'Mats',
      hue: 205,
      receivedAt: dayAgoTs(12),
      items: [
        { id: 'rm1', name: 'Trailrunning-Schuhe', emoji: '👟', hue: 150, price: 130, owned: false },
        { id: 'rm2', name: 'Stirnlampe', emoji: '🔦', hue: 60, price: 35, owned: false },
        { id: 'rm3', name: 'Thermosflasche', emoji: '🧉', hue: 100, price: 28, owned: true },
      ],
    },
  ]
}
