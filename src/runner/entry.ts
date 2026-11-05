import { collect, runCheck, status, syncCfg, type Io } from './core'

declare const CapacitorKV: { get(key: string): { value?: string | null } | null; set(key: string, value: string): void }
declare const CapacitorNotifications: { schedule(list: unknown[]): void }

const UA = 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'

const io: Io = {
  get: (k) => {
    const r = CapacitorKV.get(k)
    return r && typeof r.value === 'string' && r.value ? r.value : null
  },
  set: (k, v) => CapacitorKV.set(k, v),
  fetchText: async (url) => {
    const r = await fetch(url, { method: 'GET', headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.6' } })
    const text = await r.text()
    return { ok: r.ok, status: r.status, text, url: r.url || url }
  },
  notify: (n) => CapacitorNotifications.schedule([{ id: n.id, title: n.title, body: n.body, largeBody: n.largeBody, smallIcon: 'ic_stat_wunsch', autoCancel: true }]),
  now: () => new Date(),
  wait: (ms) => new Promise((res) => setTimeout(res, ms)),
}

type Handler = (resolve: (v?: unknown) => void, reject: (e: unknown) => void, args?: Record<string, unknown>) => void
const on = (name: string, fn: (args: Record<string, unknown>) => unknown | Promise<unknown>): void => {
  const add = (globalThis as unknown as { addEventListener: (n: string, h: Handler) => void }).addEventListener
  add(name, (resolve, reject, args) => {
    Promise.resolve()
      .then(() => fn(args ?? {}))
      .then((v) => (v === undefined ? resolve() : resolve(v)), (e) => reject(e instanceof Error ? e : new Error(String(e))))
  })
}

on('sync', (a) => {
  syncCfg(io, a as never)
})
on('check', (a) => runCheck(io, a.force === true))
on('collect', () => collect(io))
on('status', () => status(io))
