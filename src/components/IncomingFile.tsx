import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Filesystem } from '@capacitor/filesystem'
import { isNative } from '../lib/backupFiles'
import { useReceive } from '../state/receive'
import { useT, useUI } from '../state/ui'

async function readUri(url: string): Promise<Uint8Array> {
  try {
    const res = await fetch(Capacitor.convertFileSrc(url))
    if (res.ok) return new Uint8Array(await res.arrayBuffer())
  } catch {
    /* zweiter Weg unten */
  }
  const { data } = await Filesystem.readFile({ path: url })
  if (typeof data !== 'string') return new Uint8Array(await data.arrayBuffer())
  const bin = atob(data)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

let launchChecked = false

/** Android: "Öffnen mit Wunschliste" aus WhatsApp, Dateien usw. führt in den Import. */
export function IncomingFile() {
  const t = useT()
  const ui = useUI()
  const { importFile } = useReceive()
  const run = useRef(importFile)
  run.current = importFile
  const toast = useRef(ui.toast)
  toast.current = ui.toast
  const tr = useRef(t)
  tr.current = t
  const last = useRef('')

  useEffect(() => {
    if (!isNative()) return
    let off = false
    const handle = async (url?: string) => {
      if (off || !url || !/^(content|file):/i.test(url) || last.current === url) return
      last.current = url
      window.setTimeout(() => {
        if (last.current === url) last.current = ''
      }, 4000)
      try {
        await run.current(await readUri(url))
      } catch {
        toast.current({ message: tr.current('Die Datei lässt sich nicht lesen.'), emoji: '⚠️' })
      }
    }
    const sub = App.addListener('appUrlOpen', (e) => void handle(e.url))
    if (!launchChecked) {
      launchChecked = true
      void App.getLaunchUrl().then((r) => handle(r?.url))
    }
    return () => {
      off = true
      void sub.then((s) => s.remove())
    }
  }, [])

  return null
}
