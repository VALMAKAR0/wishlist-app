export const UPDATE_REPO: string = import.meta.env.VITE_REPO ?? ''
const TAG = 'apk-neueste'

export interface LatestRelease {
  version: string
  build: number
  url: string
}

const parts = (v: string) => v.split('.').map((n) => Number.parseInt(n, 10) || 0)

/** True, wenn Version a neuer ist als b. */
export function isNewer(a: string, b: string): boolean {
  const x = parts(a)
  const y = parts(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d > 0
  }
  return false
}

/** Liest die Release-Notiz "Version 0.7.0, Build 12" und die Download-Adresse der APK. */
export function readRelease(json: unknown): LatestRelease | null {
  if (typeof json !== 'object' || json === null) return null
  const r = json as { body?: unknown; html_url?: unknown; assets?: unknown }
  const body = typeof r.body === 'string' ? r.body : ''
  const m = /Version\s+(\d+(?:\.\d+)*)\s*,?\s*(?:Build\s+(\d+))?/i.exec(body)
  if (!m) return null
  const asset = Array.isArray(r.assets) ? (r.assets as { name?: unknown; browser_download_url?: unknown }[]).find((a) => typeof a.name === 'string' && a.name.endsWith('.apk')) : undefined
  const url = typeof asset?.browser_download_url === 'string' ? asset.browser_download_url : typeof r.html_url === 'string' ? r.html_url : ''
  if (!/^https:\/\/github\.com\//.test(url)) return null
  return { version: m[1], build: Number(m[2] ?? 0), url }
}

export async function fetchLatest(repo = UPDATE_REPO): Promise<LatestRelease | null> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return null
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${TAG}`, { headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) throw new Error(String(res.status))
  return readRelease(await res.json())
}
