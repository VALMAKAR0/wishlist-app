// Zurück-Reihenfolge: Fenster (zuletzt geöffnet zuerst), dann Ansicht bzw. Reiter. Android-Zurück-Taste und Escape nutzen dasselbe.

type Layer = { fn: () => void }

const layers: Layer[] = []
let root: (() => boolean) | null = null

/** Meldet ein offenes Fenster an. Die Rückgabe meldet es wieder ab. */
export function pushBack(fn: () => void): () => void {
  const layer = { fn }
  layers.push(layer)
  return () => {
    const i = layers.indexOf(layer)
    if (i >= 0) layers.splice(i, 1)
  }
}

/** Die Navigation: geht eine Ansicht zurück bzw. zum ersten Reiter. Gibt false zurück, wenn es nichts mehr zurückzugehen gibt. */
export function setRootBack(fn: (() => boolean) | null) {
  root = fn
}

/** true = die App hat selbst etwas zurückgenommen, false = Start erreicht. */
export function handleBack(): boolean {
  const top = layers[layers.length - 1]
  if (top) {
    top.fn()
    return true
  }
  return root ? root() : false
}
