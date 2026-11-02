const ITER = 150_000

export const lockAvailable = () => typeof crypto !== 'undefined' && !!crypto.subtle && typeof crypto.getRandomValues === 'function'
export const validPin = (p: string) => /^\d{4,8}$/.test(p)

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
const unhex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (x) => Number.parseInt(x, 16))

export const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)))

/** PBKDF2-SHA256 über die PIN. Der Hash steht nur in den Einstellungen dieses Geräts. */
export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: ITER }, key, 256)
  return hex(new Uint8Array(bits))
}

export async function checkPin(pin: string, saltHex: string, hash: string): Promise<boolean> {
  if (!saltHex || !hash) return false
  return (await hashPin(pin, saltHex)) === hash
}

/** Wartezeit in Sekunden nach der n-ten Fehleingabe in Folge: ab 5 Fehlern 30 s, dann verdoppelt, höchstens 15 Minuten. */
export const lockoutSeconds = (fails: number) => (fails < 5 ? 0 : Math.min(900, 30 * 2 ** (fails - 5)))
