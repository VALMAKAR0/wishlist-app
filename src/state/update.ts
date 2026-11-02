import { useCallback, useState } from 'react'
import { isNative } from '../lib/backupFiles'
import { fetchLatest, isNewer, UPDATE_REPO, UpdateError } from '../lib/update'
import { APP_VERSION } from '../lib/brand'
import { useT, useUI } from './ui'

const failText = (e: unknown): string => {
  const kind = e instanceof UpdateError ? e.kind : 'network'
  if (kind === 'network' && e instanceof UpdateError && /resolve host|UnknownHost|no address/i.test(e.detail)) return 'Das Gerät findet api.github.com nicht (DNS). Prüfe Privates DNS, Werbeblocker, VPN oder probier anderes WLAN oder mobile Daten.'
  if (kind === 'notfound') return 'Release nicht gefunden (404). Ist das Repo privat oder die APK noch nicht gebaut?'
  if (kind === 'limit') return 'GitHub bremst gerade (zu viele Anfragen). Versuch es in einer Stunde nochmal.'
  if (kind === 'format') return 'Das Release hat keine lesbare Version. Steht in der Notiz „Version X, Build N“?'
  if (kind === 'repo') return 'Der Repo-Name ist ungültig.'
  if (kind === 'http') return 'GitHub antwortet mit einem Fehler. Später nochmal versuchen.'
  return 'Keine Verbindung zu GitHub. Bist du online?'
}

export type UpdateResult = { kind: 'ok' | 'new' | 'fail'; text: string } | null

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Update-Hinweis über das GitHub-Release "apk-neueste". Nur in der Android-App. */
export function useUpdate() {
  const t = useT()
  const ui = useUI()
  const { settings, setSettings } = ui
  const available = isNative() && !!settings.updateLatest && isNewer(settings.updateLatest, APP_VERSION)
  const enabled = isNative() && !!UPDATE_REPO
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<UpdateResult>(null)

  const check = useCallback(
    async (manual: boolean): Promise<boolean> => {
      if (!isNative() || !UPDATE_REPO) return false
      if (manual) {
        setChecking(true)
        setResult(null)
      }
      const started = Date.now()
      try {
        const latest = await fetchLatest()
        const newer = isNewer(latest.version, APP_VERSION)
        setSettings({ updateAt: Date.now(), updateLatest: newer ? latest.version : '', updateUrl: newer ? latest.url : '', updateSeen: newer ? latest.version : settings.updateSeen })
        if (manual) {
          await pause(900 - (Date.now() - started))
          setResult(newer ? { kind: 'new', text: t('Neue Version {v} verfügbar.', { v: latest.version }) } : { kind: 'ok', text: t('Du hast die neueste Version.') })
          ui.haptic(newer ? 40 : 15)
        } else if (newer && settings.updateSeen !== latest.version) {
          ui.toast({ message: t('Neue Version {v} verfügbar. Du findest sie unter „Mehr“.', { v: latest.version }), emoji: '🚀' })
        }
        return newer
      } catch (e) {
        if (manual) {
          await pause(900 - (Date.now() - started))
          setResult({ kind: 'fail', text: t(failText(e)) + (e instanceof UpdateError && e.detail ? ` (${e.detail})` : '') })
          ui.haptic(60)
        }
        return false
      } finally {
        if (manual) setChecking(false)
      }
    },
    [settings.updateSeen, setSettings, ui, t],
  )

  return { available, enabled, check, checking, result, latest: settings.updateLatest, url: settings.updateUrl }
}
