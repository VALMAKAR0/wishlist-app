import { registerPlugin } from '@capacitor/core'

interface ApkDownloadPlugin {
  start(opts: { url: string; name: string }): Promise<{ id: number; name: string }>
}

const Plugin = registerPlugin<ApkDownloadPlugin>('ApkDownload')

/** Startet den Download über den Android-Downloader (Benachrichtigung mit Fortschritt), unabhängig vom Browser. */
export async function downloadApk(url: string, version: string): Promise<boolean> {
  if (!/\.apk(\?|$)/i.test(url)) return false
  try {
    await Plugin.start({ url, name: `wunschliste-${version || 'neu'}.apk` })
    return true
  } catch {
    return false
  }
}
