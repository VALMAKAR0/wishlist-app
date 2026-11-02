import { CapacitorHttp } from '@capacitor/core'
import { isNative } from './backupFiles'

export interface HttpReply {
  status: number
  ok: boolean
  header: (name: string) => string | null
  json: () => Promise<unknown>
}

/** GET-Anfrage. In der Android-App über das native Netz (ohne WebView-Einschränkungen), sonst über fetch. */
export async function httpGet(url: string, headers: Record<string, string> = {}): Promise<HttpReply> {
  if (isNative()) {
    const r = await CapacitorHttp.get({ url, headers, responseType: 'text', connectTimeout: 15000, readTimeout: 15000 })
    const low = new Map(Object.entries(r.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]))
    return {
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      header: (n) => low.get(n.toLowerCase()) ?? null,
      json: async () => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data),
    }
  }
  const res = await fetch(url, { headers })
  return { status: res.status, ok: res.ok, header: (n) => res.headers.get(n), json: () => res.json() }
}
