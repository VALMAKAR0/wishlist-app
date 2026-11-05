const group = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** Formatiert die Eingabe mit Tausenderpunkt. Ein neu getippter Punkt zählt als Komma, vorhandene Punkte sind Tausenderpunkte. */
export function fmtPriceInput(raw: string, prev = '', decimals = 2): string {
  const s = raw.replace(/[^0-9.,]/g, '')
  let int = ''
  let dec = ''
  let sep = false
  const prevDots = (prev.match(/\./g) ?? []).length
  const dots = (s.match(/\./g) ?? []).length
  const comma = s.indexOf(',')
  if (comma >= 0) {
    int = s.slice(0, comma).replace(/\./g, '')
    dec = s.slice(comma + 1).replace(/[.,]/g, '')
    sep = true
  } else if (dots > prevDots && !/^\d{1,3}(\.\d{3})+$/.test(s)) {
    const at = s.lastIndexOf('.')
    int = s.slice(0, at).replace(/\./g, '')
    dec = s.slice(at + 1)
    sep = true
  } else int = s.replace(/\./g, '')
  int = int.replace(/^0+(?=\d)/, '')
  if (sep) return `${group(int || '0')},${dec.slice(0, decimals)}`
  return group(int)
}

/** Zahl aus dem Eingabetext, undefined bei leer oder ungültig. */
export function parsePriceInput(text: string): number | undefined {
  const s = text.trim()
  if (!s) return undefined
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/** Eingabetext aus einer Zahl, mit Tausenderpunkt. fixed: immer zwei Nachkommastellen. */
export function priceText(n: number, fixed = false): string {
  const [i, d] = (fixed ? n.toFixed(2) : String(n)).split('.')
  return d ? `${group(i)},${d}` : group(i)
}
