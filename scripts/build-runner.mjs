import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const stub = `export const isNative = () => true
export const httpGet = () => Promise.reject(new Error('nicht im Hintergrund'))
export const httpBytes = httpGet
export const netReason = () => ''
export default {}`

await build({
  entryPoints: [join(root, 'src/runner/entry.ts')],
  outfile: join(root, 'public/runners/background.js'),
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  legalComments: 'none',
  inject: [join(root, 'src/runner/shim.js')],
  banner: { js: '/* Erzeugt von scripts/build-runner.mjs, nicht von Hand ändern. */' },
  plugins: [
    {
      name: 'stub-native',
      setup(b) {
        b.onResolve({ filter: /(^|\/)(backupFiles|http|netReason)$|^@capacitor\// }, (a) => ({ path: a.path, namespace: 'stub' }))
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: stub, loader: 'js' }))
      },
    },
  ],
})
