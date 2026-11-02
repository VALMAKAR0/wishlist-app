import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const list = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? list(join(dir, n)) : [join(dir, n)]))

/** Schreibt nach dem Bau sw.js mit allen Dateien zum Vorladen. Die Build-Kennung wechselt, sobald sich eine Datei ändert. */
function offlineWorker(): Plugin {
  let out = 'dist'
  return {
    name: 'offline-worker',
    apply: 'build',
    configResolved: (c) => {
      out = join(c.root, c.build.outDir)
    },
    writeBundle() {
      const files = list(out).filter((f) => !/sw\.js$/.test(f)).sort()
      const hash = createHash('sha1')
      for (const f of files) hash.update(relative(out, f)).update(readFileSync(f))
      const id = hash.digest('hex').slice(0, 10)
      const urls = ['./', ...files.map((f) => './' + relative(out, f).split('\\').join('/'))]
      const sw = `const CACHE = 'wl-${id}'
const FILES = ${JSON.stringify(urls)}

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))))

self.addEventListener('message', (e) => {
  if (e.data === 'skip') self.skipWaiting()
})

self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wl-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
)

self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return
  e.respondWith(
    caches.match(r, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || (r.mode === 'navigate' ? caches.match('./index.html') : undefined) || fetch(r)),
  )
})
`
      writeFileSync(join(out, 'sw.js'), sw)
    },
  }
}

// base './' damit der Build sowohl unter GitHub Pages (Unterpfad) als auch in Capacitor läuft.
export default defineConfig({
  base: './',
  plugins: [react(), offlineWorker()],
  server: { host: true, port: 5173 },
})
