import { CapacitorHttp } from '@capacitor/core'
import { isNative } from './backupFiles'

export interface HttpReply {
  status: number
  ok: boolean
  url: string
  header: (name: string) => string | null
  json: () => Promise<unknown>
  text: () => Promise<string>
}

/** GET-Anfrage. In der Android-App über das native Netz (ohne WebView-Einschränkungen), sonst über fetch. */
export async function httpGet(url: string, headers: Record<string, string> = {}): Promise<HttpReply> {
  if (isNative()) {
    const r = await CapacitorHttp.get({ url, headers, responseType: 'text', connectTimeout: 15000, readTimeout: 20000 })
    const low = new Map(Object.entries(r.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]))
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data ?? '')
    return {
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      url: r.url || url,
      header: (n) => low.get(n.toLowerCase()) ?? null,
      json: async () => JSON.parse(body),
      text: async () => body,
    }
  }
  const res = await fetch(url, { headers })
  return { status: res.status, ok: res.ok, url: res.url || url, header: (n) => res.headers.get(n), json: () => res.json(), text: () => res.text() }
}

export interface BytesReply {
  status: number
  ok: boolean
  type: string
  data: ArrayBuffer
}

const fromBase64 = (b64: string): ArrayBuffer => {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

/** Binärer GET (Bilder). Nativ über CapacitorHttp als Base64, sonst über fetch. */
export async function httpBytes(url: string, headers: Record<string, string> = {}): Promise<BytesReply> {
  if (isNative()) {
    const r = await CapacitorHttp.get({ url, headers, responseType: 'blob', connectTimeout: 15000, readTimeout: 25000 })
    const low = new Map(Object.entries(r.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]))
    const ok = r.status >= 200 && r.status < 300
    return { status: r.status, ok, type: low.get('content-type') ?? '', data: ok && typeof r.data === 'string' ? fromBase64(r.data) : new ArrayBuffer(0) }
  }
  const res = await fetch(url, { headers })
  return { status: res.status, ok: res.ok, type: res.headers.get('content-type') ?? '', data: res.ok ? await res.arrayBuffer() : new ArrayBuffer(0) }
}
