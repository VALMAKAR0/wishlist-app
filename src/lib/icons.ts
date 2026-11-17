// Eigene Symbole für Einträge: gezeichnet auf einem 48er Raster, gespeichert als "ic:<id>" im Feld emoji.

type Kind = 'f' | 'F' | 'h' | 'a' | 'd' | 'S' | 'W' | 'l'
type Shape = [d: string, kind: Kind, width?: number]

export interface Icon {
  id: string
  label: string
  /** Zeichen für reine Text-Ausgaben. */
  char: string
  shapes: Shape[]
  rot?: number
  scale?: number
}

const rr = (x: number, y: number, w: number, h: number, r = 0) => {
  const k = Math.min(r, w / 2, h / 2)
  if (k <= 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`
  return `M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`
}
const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
const star = (cx: number, cy: number, R: number, r: number, n = 5) => {
  let d = ''
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2
    const q = i % 2 ? r : R
    d += `${i ? 'L' : 'M'}${(cx + q * Math.cos(a)).toFixed(2)} ${(cy + q * Math.sin(a)).toFixed(2)}`
  }
  return d + 'Z'
}
const spark = (cx: number, cy: number, s: number) => `M${cx} ${cy - s}C${cx} ${cy - s * 0.3} ${cx + s * 0.3} ${cy} ${cx + s} ${cy}C${cx + s * 0.3} ${cy} ${cx} ${cy + s * 0.3} ${cx} ${cy + s}C${cx} ${cy + s * 0.3} ${cx - s * 0.3} ${cy} ${cx - s} ${cy}C${cx - s * 0.3} ${cy} ${cx} ${cy - s * 0.3} ${cx} ${cy - s}Z`

const keyRows = (): Shape[] => {
  const out: Shape[] = []
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) out.push([rr(8 + c * 5.6, 18 + r * 5.4, 4.2, 3.6, 1), 'a'])
  out.push([rr(14, 29.4, 20, 3.8, 1.6), 'a'])
  return out
}

export const ICONS: Icon[] = [
  { id: 'gift', label: 'Geschenk', char: '🎁', shapes: [[rr(8, 21, 32, 21, 3), 'F'], [rr(6, 15, 36, 8, 3), 'F'], [rr(21, 15, 6, 27), 'a'], ['M24 15C20 7 11 7 13 12C14.5 15.5 20 15 24 15Z', 'F'], ['M24 15C28 7 37 7 35 12C33.5 15.5 28 15 24 15Z', 'F']] },
  { id: 'gift2', label: 'Päckchen', char: '🎁', shapes: [[rr(9, 19, 30, 23, 4), 'F'], [rr(9, 27, 30, 5), 'a'], [circ(16, 36.5, 1.5), 'a'], [circ(32, 36.5, 1.5), 'a'], [circ(16, 23, 1.5), 'a'], [circ(32, 23, 1.5), 'a'], ['M24 19L14 10M24 19L34 10', 'S', 3], [circ(24, 17.5, 4.6), 'F']] },
  { id: 'gift3', label: 'Tüte', char: '🎁', shapes: [['M17 17C17 5 31 5 31 17', 'S', 2.8], [rr(9, 15, 30, 27, 4), 'F'], [star(24, 28, 7.5, 3.4), 'a']] },
  { id: 'gift4', label: 'Überraschung', char: '🎁', shapes: [[rr(11, 24, 26, 18, 3), 'F'], [rr(9, 19, 30, 6, 2), 'F'], [rr(21.5, 19, 5, 23), 'a'], [spark(12, 11, 5), 'f'], [spark(35, 8, 4), 'h'], [spark(40, 17, 3), 'f'], ['M24 19C21 13 16 14 17.5 17', 'S', 2.6], ['M24 19C27 13 32 14 30.5 17', 'S', 2.6]] },
  { id: 'watch', label: 'Uhr', char: '⌚', shapes: [[rr(17, 4, 14, 11, 3), 'F'], [rr(17, 33, 14, 11, 3), 'F'], [circ(24, 24, 13), 'F'], [circ(24, 24, 9.4), 'a'], ['M24 24V18M24 24L28.5 26.5', 'l', 2.4], [rr(36.5, 21.5, 3.5, 5, 1.2), 'h']] },
  { id: 'head', label: 'Kopfhörer', char: '🎧', shapes: [['M10 30V26C10 16 16 9.5 24 9.5S38 16 38 26V30', 'S', 4.2], [rr(6.5, 26, 10, 15, 4.5), 'F'], [rr(31.5, 26, 10, 15, 4.5), 'F'], [rr(9.5, 29.5, 3.6, 8, 1.8), 'a'], [rr(34.9, 29.5, 3.6, 8, 1.8), 'a']] },
  { id: 'cam', label: 'Kamera', char: '📷', shapes: [['M16 15L19 9.5H29L32 15Z', 'F'], [rr(5, 14, 38, 27, 5), 'F'], [circ(24, 28, 9.6), 'a'], [circ(24, 28, 6), 'f'], [circ(26.4, 25.6, 1.8), 'a'], [circ(36.5, 20, 2), 'a']] },
  { id: 'shoe', label: 'Schuh', char: '👟', shapes: [['M5 32V23C5 21 6.5 20 8.3 20.6L14 22.6C16 23.3 17.6 22 18.2 20L19.4 16.5C21 18.5 23.5 20 26.5 21C32 22.8 38.5 23.5 42 27.4C43.4 29 43.5 31 43 32Z', 'F'], [rr(4, 32, 40, 6, 3), 'h'], ['M21 22.5L24 19.5M25.5 24.5L28.5 21.5', 'l', 2.2]] },
  { id: 'book', label: 'Buch', char: '📚', shapes: [[rr(10, 5, 28, 37, 3.5), 'F'], [rr(10, 5, 7, 37, 3), 'a'], ['M22 15H33M22 20.5H30', 'l', 2.4], ['M30 5V15.5L33 13L36 15.5V5Z', 'a']] },
  { id: 'pad', label: 'Controller', char: '🎮', shapes: [['M13 14H35C40.5 14 44 19 44 26L43.4 33.6C43 37 40.4 38 38.2 36L33 30H15L9.8 36C7.6 38 5 37 4.6 33.6L4 26C4 19 7.5 14 13 14Z', 'F'], ['M13 21.2H15.4V23.6H17.8V26H15.4V28.4H13V26H10.6V23.6H13Z', 'a'], [circ(35.5, 21.5, 2), 'a'], [circ(35.5, 27.5, 2), 'a'], [circ(32.5, 24.5, 2), 'a'], [circ(38.5, 24.5, 2), 'a']] },
  { id: 'shirt', label: 'Kleidung', char: '👕', shapes: [['M17 6L5.5 12L10 20.5L15 18V42H33V18L38 20.5L42.5 12L31 6C30 9.5 27.5 11 24 11S18 9.5 17 6Z', 'F'], ['M17 6C18 9.5 20.5 11 24 11S30 9.5 31 6', 'l', 2.2]] },
  { id: 'cap', label: 'Mütze', char: '🧢', shapes: [[circ(24, 8.5, 4.2), 'F'], ['M8 31C8 19 15 11.5 24 11.5S40 19 40 31Z', 'F'], [rr(6.5, 30, 35, 9, 4.5), 'a'], ['M17 16V30M24 13.5V30M31 16V30', 'l', 1.8]] },
  { id: 'mug', label: 'Tasse', char: '☕', shapes: [['M33 19H36C39.5 19 41.5 21.5 41.5 25S39.5 31 36 31H33', 'S', 4], ['M9 15H33V31C33 36.5 29 41 23.5 41H18.5C13 41 9 36.5 9 31Z', 'F'], ['M9 15H33V20H9Z', 'a'], ['M16 10.5C14 8.5 17.5 7 16 3.5M24 10.5C22 8.5 25.5 7 24 3.5', 'W', 2.4]] },
  { id: 'plant', label: 'Pflanze', char: '🪴', shapes: [['M14.5 31H33.5L31.5 42H16.5Z', 'F'], [rr(12, 28, 24, 5, 2), 'a'], ['M24 28C24 19.5 18 14 9.5 14C9.5 22.5 15 28 24 28Z', 'F'], ['M24 28C24 15.5 30 8 40 8C40 20.5 34 28 24 28Z', 'F']] },
  { id: 'case', label: 'Koffer', char: '🧳', shapes: [['M18 14V10C18 8 19 7 21 7H27C29 7 30 8 30 10V14', 'S', 3], [rr(6, 13, 36, 28, 5), 'F'], [rr(14, 13, 3.2, 28), 'a'], [rr(30.8, 13, 3.2, 28), 'a']] },
  { id: 'cand', label: 'Kerze', char: '🕯️', shapes: [[rr(14, 22, 20, 20, 3), 'F'], [rr(14, 27, 20, 3, 1.5), 'a'], ['M24 4.5C27.2 9 30 11.5 30 15.5C30 19 27.5 21 24 21S18 19 18 15.5C18 11.8 21 9.8 24 4.5Z', 'f'], ['M24 12.5C25.6 14.5 26.6 15.5 26.6 17C26.6 18.4 25.5 19.2 24 19.2S21.4 18.4 21.4 17C21.4 15.5 22.6 14.6 24 12.5Z', 'a']] },
  { id: 'wine', label: 'Wein', char: '🍷', shapes: [['M24 27V40', 'S', 3.2], ['M14.5 5H33.5C34.5 18 31.5 27.5 24 27.5S13.5 18 14.5 5Z', 'F'], ['M15.3 14H32.7C32 21.5 29 25.5 24 25.5S16 21.5 15.3 14Z', 'a'], [rr(16, 39, 16, 3.6, 1.8), 'F']] },
  { id: 'paint', label: 'Farben', char: '🎨', shapes: [['M24 6C13 6 5 14 5 24C5 34 13 42 22 42C26 42 27.5 39 26.4 36C25.4 33 27.4 31 30.4 31H35C39.4 31 43 28 43 23C43 13 35 6 24 6Z', 'F'], [circ(14, 23, 3), 'a'], [circ(19.5, 14.5, 3), 'a'], [circ(29.5, 13.5, 3), 'a'], [circ(37, 20.5, 3), 'a']] },
  { id: 'teddy', label: 'Kuscheltier', char: '🧸', shapes: [[circ(12.5, 12, 5.8), 'F'], [circ(35.5, 12, 5.8), 'F'], [circ(12.5, 12, 2.6), 'a'], [circ(35.5, 12, 2.6), 'a'], [circ(24, 25, 16), 'F'], [circ(24, 30.5, 6.2), 'a'], [circ(18.2, 22, 2), 'd'], [circ(29.8, 22, 2), 'd'], [circ(24, 28, 2.1), 'd'], ['M24 30V32M21.2 33C22.6 34.2 25.4 34.2 26.8 33', 'l', 1.8]] },
  { id: 'lip', label: 'Kosmetik', char: '💄', shapes: [[rr(14.5, 27, 19, 15, 3), 'F'], [rr(16.5, 19, 15, 9, 0), 'a'], ['M19 19V12.5C19 9 21 6.5 24 5C27 6.5 29 9 29 12.5V19Z', 'F'], ['M21.5 15.5C21.5 13 22.4 11.6 23.5 10.8', 'W', 1.8]] },
  { id: 'guit', label: 'Gitarre', char: '🎸', rot: 42, scale: 0.92, shapes: [[rr(20.3, 6, 7.4, 24, 2.5), 'F'], [rr(19.2, 1.5, 9.6, 8, 2.4), 'F'], [circ(24, 26, 7.2), 'F'], [circ(24, 35.2, 9.4), 'F'], [circ(24, 32.6, 3.3), 'a'], [rr(20.5, 39.4, 7, 2.2, 1), 'a'], ['M24 8V32', 'l', 1.2]] },
  { id: 'sweet', label: 'Süßes', char: '🍫', shapes: [[rr(7, 8, 34, 32, 4), 'F'], ['M7 8H41V16H7Z', 'a'], ['M7 24H41M7 32H41M18.3 16V40M29.7 16V40', 'l', 1.8]] },
  { id: 'sofa', label: 'Möbel', char: '🛋️', shapes: [[rr(9, 11, 30, 18, 5.5), 'F'], [rr(3.5, 21, 41, 15, 5.5), 'F'], ['M24 22V35', 'l', 1.8], [rr(9, 36, 3.4, 5.5, 1.7), 'd'], [rr(35.6, 36, 3.4, 5.5, 1.7), 'd']] },
  { id: 'phone', label: 'Handy', char: '📱', shapes: [[rr(12.5, 3.5, 23, 41, 5.5), 'F'], [rr(15.8, 8.5, 16.4, 29.5, 2), 'a'], [rr(20.6, 40.4, 6.8, 1.8, 0.9), 'd'], [circ(24, 6.2, 0.9), 'd']] },
  { id: 'lap', label: 'Laptop', char: '💻', shapes: [[rr(8.5, 9, 31, 23, 3.5), 'F'], [rr(11.6, 12, 24.8, 17, 1.6), 'a'], ['M2.5 34H45.5L43.6 38.4C43 39.6 41.8 40.4 40.5 40.4H7.5C6.2 40.4 5 39.6 4.4 38.4Z', 'F'], [rr(19.5, 34, 9, 2.2, 1.1), 'd']] },
  { id: 'tv', label: 'Monitor', char: '🖥️', shapes: [[rr(4.5, 8, 39, 26, 4), 'F'], [rr(8, 11.5, 32, 19, 1.8), 'a'], [rr(21, 34, 6, 5), 'F'], [rr(13.5, 38.2, 21, 4.2, 2.1), 'F']] },
  { id: 'keys', label: 'Tastatur', char: '⌨️', shapes: [[rr(3.5, 12, 41, 25, 5), 'F'], ...keyRows()] },
  { id: 'tool', label: 'Werkzeug', char: '🔨', rot: 38, scale: 0.95, shapes: [[rr(21.4, 14, 5.4, 31, 2.7), 'F'], [rr(21.4, 31, 5.4, 12, 2.7), 'a'], ['M9.5 9.5C9.5 7.5 11 6.5 13 6.5H35.5C37.5 6.5 38.5 8 38.5 10V15.5C38.5 17 37.5 18 36 18H13C11 18 9.5 16.8 9.5 14.5Z', 'F'], ['M33 6.5V18', 'l', 1.8]] },
  { id: 'bike', label: 'Fahrrad', char: '🚲', shapes: [[circ(11, 31, 8), 'W', 3], [circ(37, 31, 8), 'W', 3], ['M11 31L18.5 17H30L37 31M18.5 17L25 31H11M30 17L25 31', 'S', 2.8], ['M14.5 14.5H22M29 17L27.4 11H32.5', 'S', 2.8], [circ(25, 31, 2.2), 'f']] },
  { id: 'ball', label: 'Sport', char: '⚽', shapes: [[circ(24, 24, 18.5), 'F'], ['M24 14.5L32 20.3L28.9 29.7H19.1L16 20.3Z', 'a'], ['M24 14.5V7M32 20.3L39.5 17.5M28.9 29.7L33.5 36.5M19.1 29.7L14.5 36.5M16 20.3L8.5 17.5', 'l', 2]] },
  { id: 'ring', label: 'Schmuck', char: '💍', shapes: [[circ(24, 31, 10.5), 'W', 4.2], ['M17 14L20.2 8.5H27.8L31 14L24 22Z', 'F'], ['M17 14H31M21.8 14L24 22L26.2 14', 'l', 1.6]] },
  { id: 'specs', label: 'Brille', char: '👓', shapes: [[circ(14, 28, 8.5), 'h'], [circ(34, 28, 8.5), 'h'], [circ(14, 28, 8.5), 'W', 3.4], [circ(34, 28, 8.5), 'W', 3.4], ['M22 27C23.5 24.8 24.5 24.8 26 27', 'S', 3], ['M6 25L3.5 17.5M42 25L44.5 17.5', 'S', 3]] },
  { id: 'spk', label: 'Lautsprecher', char: '🔊', shapes: [[rr(10, 4, 28, 40, 5.5), 'F'], [circ(24, 14, 4.4), 'a'], [circ(24, 31, 9), 'a'], [circ(24, 31, 3.6), 'f']] },
  { id: 'tick', label: 'Ticket', char: '🎟️', shapes: [['M5 15C5 13 6.5 12 8.5 12H39.5C41.5 12 43 13 43 15V20.2C40 20.2 38 22 38 24S40 27.8 43 27.8V33C43 35 41.5 36 39.5 36H8.5C6.5 36 5 35 5 33V27.8C8 27.8 10 26 10 24S8 20.2 5 20.2Z', 'F'], [star(20, 24, 6.5, 2.9), 'a'], [rr(31, 14.5, 2, 4), 'a'], [rr(31, 22, 2, 4), 'a'], [rr(31, 29.5, 2, 4), 'a']] },
  { id: 'chip', label: 'Technik', char: '🔌', shapes: [['M18 4V11M24 4V11M30 4V11M18 37V44M24 37V44M30 37V44M4 18H11M4 24H11M4 30H11M37 18H44M37 24H44M37 30H44', 'S', 2.8], [rr(9.5, 9.5, 29, 29, 4.5), 'F'], [rr(16, 16, 16, 16, 2.5), 'a'], [circ(20.5, 20.5, 1.4), 'f']] },
  { id: 'car', label: 'Auto', char: '🚗', shapes: [['M5 30V26.5C5 24.6 6.2 23.2 8 22.6L12 21.5L15.6 14.6C16.3 13.2 17.5 12.5 19 12.5H29.5C31 12.5 32.2 13.2 33 14.6L36.5 21.5L40 22.6C41.8 23.2 43 24.6 43 26.5V30C43 31.4 42 32.5 40.6 32.5H7.4C6 32.5 5 31.4 5 30Z', 'F'], ['M17 20.5L19.6 15.5H29L31.6 20.5Z', 'a'], [circ(14, 33, 5.6), 'F'], [circ(34, 33, 5.6), 'F'], [circ(14, 33, 2.2), 'a'], [circ(34, 33, 2.2), 'a']] },
  { id: 'tent', label: 'Outdoor', char: '⛺', shapes: [['M24 7L44.5 41H3.5Z', 'F'], ['M24 22L33 41H15Z', 'a'], ['M24 7V3.5', 'S', 2.6]] },
  { id: 'pot', label: 'Küche', char: '🍳', shapes: [[rr(2.5, 24, 6, 4.4, 2.2), 'F'], [rr(39.5, 24, 6, 4.4, 2.2), 'F'], [rr(7.5, 20.5, 33, 21, 4.5), 'F'], ['M9.5 20.5C9.5 14.5 16 11 24 11S38.5 14.5 38.5 20.5Z', 'F'], [circ(24, 8, 3), 'F'], [rr(13, 27, 22, 3, 1.5), 'a']] },
  { id: 'brick', label: 'Bausteine', char: '🧱', shapes: [[rr(6, 18, 36, 21, 3), 'F'], [rr(10, 11.5, 8.4, 7, 2), 'F'], [rr(19.8, 11.5, 8.4, 7, 2), 'F'], [rr(29.6, 11.5, 8.4, 7, 2), 'F'], [rr(6, 33.5, 36, 5.5, 2.5), 'a']] },
  { id: 'tab', label: 'Tablet', char: '📱', shapes: [[rr(7, 4.5, 34, 39, 5.5), 'F'], [rr(10.5, 8.5, 27, 29.5, 2), 'a'], [circ(24, 41, 0.9), 'd']] },
  { id: 'heart', label: 'Herz', char: '❤️', shapes: [['M24 41C24 41 5.5 30 5.5 17.8C5.5 11.8 10 7.5 15.5 7.5C19.5 7.5 22.5 9.5 24 12.6C25.5 9.5 28.5 7.5 32.5 7.5C38 7.5 42.5 11.8 42.5 17.8C42.5 30 24 41 24 41Z', 'F'], ['M11.5 17C11.5 14.2 13.4 12.4 16 12.4', 'W', 2.4]] },
  { id: 'star', label: 'Stern', char: '⭐', shapes: [[star(24, 25, 19, 8.6), 'F'], ['M24 12.5L26.4 19.5', 'W', 2]] },
  { id: 'note', label: 'Musik', char: '🎵', shapes: [['M20.5 34V10.5L38 6.5V30', 'S', 3.2], ['M20.5 10.5L38 6.5V14.5L20.5 18.5Z', 'F'], [circ(14.5, 35, 6.4), 'F'], [circ(32, 31, 6.4), 'F']] },
  { id: 'bag', label: 'Tasche', char: '👜', shapes: [['M17 19V14C17 10 20 7 24 7S31 10 31 14V19', 'S', 3], ['M8 18H40L38.4 40C38.3 41.2 37.4 42 36.2 42H11.8C10.6 42 9.7 41.2 9.6 40Z', 'F'], [circ(24, 28.5, 2.8), 'a']] },
  { id: 'scent', label: 'Pflege', char: '🧴', shapes: [[rr(18, 4.5, 12, 8, 2), 'F'], [rr(20.5, 12, 7, 5), 'a'], [rr(11, 16.5, 26, 26, 6.5), 'F'], [rr(16.5, 25, 15, 9.5, 2.2), 'a']] },
  { id: 'home', label: 'Zuhause', char: '🏠', shapes: [['M24 5.5L4.5 22.5H11V40.5C11 41.4 11.6 42 12.5 42H35.5C36.4 42 37 41.4 37 40.5V22.5H43.5Z', 'F'], [rr(19.5, 28, 9, 14), 'a']] },
]

const BY_ID = new Map(ICONS.map((i) => [i.id, i]))
const PREFIX = 'ic:'

export const GIFTS = ['gift', 'gift2', 'gift3', 'gift4']

export const isIcon = (v?: string): v is string => !!v && v.startsWith(PREFIX) && BY_ID.has(v.slice(PREFIX.length))
export const iconOf = (v?: string): Icon | undefined => (v && v.startsWith(PREFIX) ? BY_ID.get(v.slice(PREFIX.length)) : undefined)
export const iconValue = (id: string) => PREFIX + id
/** Das Symbol als normales Zeichen, damit Text-Ausgaben und alte Geräte etwas Sinnvolles zeigen. */
export const emojiChar = (v?: string): string => iconOf(v)?.char ?? (v && !v.startsWith(PREFIX) ? v : '🎁')

/** Beim Anlegen wechseln die Geschenk-Varianten, damit nicht jeder neue Eintrag gleich aussieht. */
export function pickGift(seed = Date.now()): string {
  return PREFIX + GIFTS[Math.abs(Math.floor(seed / 1000)) % GIFTS.length]
}

const RULES: Array<[string, RegExp]> = [
  ['watch', /\b(uhr|uhren|watch|smartwatch|armbanduhr|garmin|fitbit|fenix|forerunner|chronograph)\b|\bgalaxy watch|\bapple watch|\bsmart ?band/i],
  ['head', /kopfh[öo]rer|headphone|airpods?|earbuds?|ohrh[öo]rer|in-?ear|headset|\bbuds\b|wh-?1000|\bsony wh/i],
  ['spk', /lautsprecher|speaker|soundbar|bluetooth.?box|\bjbl\b|\bsonos\b|musikbox|boombox/i],
  ['cam', /kamera|camera|\bgopro|objektiv|spiegelreflex|fotoapparat|\bcanon\b|\bnikon\b|polaroid|instax|\bfuji(film)?\b/i],
  ['phone', /handy|smartphone|iphone|\bpixel \d|galaxy [sazf]\d|telefon|\bphone\b|oneplus|xiaomi \d|redmi/i],
  ['tab', /tablet|\bipad|galaxy tab|e-?reader|kindle|\btab [asp]\d/i],
  ['lap', /laptop|notebook|macbook|thinkpad|chromebook|\bultrabook/i],
  ['tv', /fernseher|\btv\b|monitor|bildschirm|display|beamer|projektor/i],
  ['keys', /tastatur|keyboard|\bmaus\b|\bmouse\b|keychron|trackball/i],
  ['chip', /grafikkarte|\bgpu\b|\bcpu\b|prozessor|mainboard|motherboard|\bssd\b|festplatte|arbeitsspeicher|\brtx\b|\bgtx\b|\bryzen\b|\bintel\b|netzteil|raspberry|arduino|\bpc[- ]?(teil|komponente)|hardware|router|\bnas\b/i],
  ['pad', /spiel|game|gaming|playstation|\bps[345]\b|xbox|nintendo|\bswitch\b|controller|konsole|zelda|mario|steam deck|\bdlc\b|\bvr[- ]?brille/i],
  ['brick', /lego|puzzle|bausatz|baustein|modellbau|duplo|playmobil/i],
  ['book', /\bbuch\b|b[üu]cher|roman|comic|manga|lexikon|ratgeber|kochbuch|bildband|hörbuch|buchreihe|trilogie|kalender/i],
  ['shoe', /schuh|sneaker|stiefel|boots?\b|sandalen|laufschuh|\bnike\b|\badidas\b|\bpuma\b|new balance|birkenstock|converse|\bvans\b/i],
  ['shirt', /pullover|hoodie|jacke|\bmantel\b|hemd|shirt|\bhose\b|jeans|kleid|\brock\b|pulli|sweat|weste|jogger|anzug|bluse|strick|trikot|\bsocken/i],
  ['cap', /m[üu]tze|\bcap\b|\bhut\b|schal\b|handschuh|beanie|stirnband/i],
  ['specs', /brille|sonnenbrille|\bsunglasses|ray-?ban/i],
  ['ring', /\bring\b|kette\b|schmuck|ohrring|armband\b|anh[äa]nger|piercing|manschettenkn/i],
  ['bag', /handtasche|\btasche\b|umh[äa]ngetasche|rucksack|\bbeutel\b|geldbeutel|portemonnaie|geldb[öo]rse|\bbag\b|backpack|schultasche/i],
  ['case', /koffer|reise|trolley|urlaub|flug|\bhotel/i],
  ['tent', /zelt|camping|schlafsack|outdoor|wander|isomatte|trekking|angel|hängematte/i],
  ['bike', /fahrrad|\bbike\b|e-?bike|radl|fahrradhelm|rennrad|mountainbike|\bmtb\b|\bscooter|roller\b/i],
  ['car', /\bauto\b|\bkfz\b|reifen|felgen|autositz|dashcam|\bpkw\b|motorrad|tuning|motoröl/i],
  ['ball', /\bball\b|fu[ßs]ball|basketball|handball|tennis|golf|sport|yoga|hantel|fitness|training|laufen|schwimm|boxen|\bgym\b|kurzhantel|\bski\b|snowboard|schl[äa]ger|klettern/i],
  ['tool', /werkzeug|akkuschrauber|bohrmaschine|\bs[äa]ge\b|hobel|hammer|\bbosch\b|makita|festool|dewalt|milwaukee|stemmeisen|schraub|zange|wasserwaage|schleifer|fr[äa]se|werkbank|zimmermann|tischler|handwerk|holz/i],
  ['guit', /gitarre|ukulele|geige|bass\b|violine|e-?gitarre|banjo|mandoline|cajon|instrument/i],
  ['note', /musik|klavier|keyboard.?piano|synthesizer|vinyl|schallplatte|plattenspieler|\bcd\b|mikrofon|konzertkarte|\bdj\b|midi/i],
  ['tick', /ticket|konzert|festival|gutschein|eintritt|karten\b|theater|kino|musical|\bgutscheinkarte|abo\b|mitgliedschaft|wellness/i],
  ['wine', /\bwein|whisk|gin\b|rum\b|bier\b|sekt|champagner|likör|schnaps|cocktail|prosecco|gläser|karaffe|dekanter|\bsake\b|spirituosen/i],
  ['mug', /tasse|kaffee|\btee\b|becher|mug\b|espresso|kaffeemaschine|thermos|trinkflasche|siebträger|french press|latte|teekanne|wasserkocher/i],
  ['pot', /pfanne|\btopf|messer|k[üu]che|mixer|airfryer|backen|\bwok\b|toaster|thermomix|kochen|grill|auflauf|schneidebrett|pfannen|reibe|nudelmaschine/i],
  ['sweet', /schokolade|praline|s[üu][ßs]|bonbon|keks|kuchen|lebkuchen|snack|gummib[äa]r|lakritz|konfekt|nuss|trüffel|geb[äa]ck|bonbonniere/i],
  ['cand', /kerze|duft|teelicht|räucher|windlicht|diffuser|laterne|wachs/i],
  ['scent', /parfum|parf[üu]m|duschgel|shampoo|creme|lotion|serum|pflege|rasier|deo\b|seife|badekugel|hautpflege|bartöl|rasierer|zahnb[üu]rste|haarbürste|föhn|glätteisen/i],
  ['lip', /lippenstift|make-?up|mascara|kosmetik|lidschatten|nagellack|puder|beauty|rouge|concealer|eyeliner|pinsel set/i],
  ['plant', /pflanze|blume|kaktus|monstera|sukkulente|blumenstrauß|strauß|samen|garten|kräuter|orchidee|bonsai|blumentopf/i],
  ['teddy', /pl[üu]sch|teddy|kuscheltier|stofftier|puppe|spielzeug|baby|kinder|figur\b|actionfigur|sammelfigur|schmusetuch/i],
  ['paint', /farbe|pinsel|malen|zeichn|aquarell|acryl|staffelei|skizzen|bastel|kreativ|filzstift|buntstift|stempel|handlettering/i],
  ['sofa', /sofa|couch|sessel|stuhl|regal|lampe|leuchte|teppich|vorh[äa]ng|bett|decke\b|kissen|matratze|m[öo]bel|tisch|kommode|schrank|spiegel|vase|deko|bilderrahmen|wandbild|poster/i],
  ['home', /\bhaus\b|wohnung|einzug|umzug|smart ?home|haushalt|staubsauger|saugroboter|waschmaschine|putz|bügel|dyson|kühlschrank|klimaanlage|heizung|luftreiniger|thermostat/i],
  ['heart', /liebe|herz\b|valentin|jahrestag|hochzeit|verlobung|romant|partner|date\b/i],
  ['star', /\bstern|traum|lieblings|special/i],
]

/** Findet zu Name und Art das passendste Symbol, die Art zählt zuerst. */
export function iconFor(name: string, kind?: string): string | undefined {
  const parts = [kind ?? '', name]
  for (const text of parts) {
    const s = text.trim()
    if (s.length < 3) continue
    for (const [id, re] of RULES) if (re.test(s)) return PREFIX + id
  }
  return undefined
}

/** Zeichnet ein Symbol auf eine Leinwand; Farben wie in der App (weiß mit dunklen Akzenten). */
export function drawIcon(ctx: CanvasRenderingContext2D, value: string | undefined, x: number, y: number, size: number): boolean {
  const ic = iconOf(value)
  if (!ic) return false
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 48, size / 48)
  if (ic.rot || ic.scale) {
    ctx.translate(24, 24)
    if (ic.rot) ctx.rotate((ic.rot * Math.PI) / 180)
    if (ic.scale) ctx.scale(ic.scale, ic.scale)
    ctx.translate(-24, -24)
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const [d, k, w] of ic.shapes) {
    const p = new Path2D(d)
    if (k === 'f' || k === 'F') {
      ctx.fillStyle = 'rgba(255,255,255,0.97)'
      ctx.fill(p)
      if (k === 'F') {
        ctx.strokeStyle = 'rgba(30,15,50,0.2)'
        ctx.lineWidth = 1.4
        ctx.stroke(p)
      }
    } else if (k === 'h') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fill(p)
    } else if (k === 'a') {
      ctx.fillStyle = 'rgba(30,15,50,0.24)'
      ctx.fill(p)
    } else if (k === 'd') {
      ctx.fillStyle = 'rgba(30,15,50,0.55)'
      ctx.fill(p)
    } else if (k === 'S') {
      ctx.strokeStyle = 'rgba(255,255,255,0.97)'
      ctx.lineWidth = w ?? 3.2
      ctx.stroke(p)
    } else if (k === 'W') {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = w ?? 2.4
      ctx.stroke(p)
    } else {
      ctx.strokeStyle = 'rgba(30,15,50,0.3)'
      ctx.lineWidth = w ?? 2.2
      ctx.stroke(p)
    }
  }
  ctx.restore()
  return true
}
