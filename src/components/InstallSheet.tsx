import { platform, type Platform } from '../lib/install'
import { useT } from '../state/ui'
import { Sheet } from './Sheet'

const steps = (p: Platform): string[] =>
  p === 'ios'
    ? ['Öffne die Seite in Safari.', 'Tippe unten auf das Teilen-Symbol (Quadrat mit Pfeil).', 'Wähle „Zum Home-Bildschirm“, dann „Hinzufügen“.', 'Öffne die App ab jetzt über das Symbol auf dem Home-Bildschirm.']
    : p === 'android'
      ? ['Öffne das Browser-Menü (drei Punkte).', 'Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.', 'Bestätige und öffne die App über das neue Symbol.']
      : ['Klicke in der Adressleiste auf das Installieren-Symbol.', 'Oder öffne das Browser-Menü und wähle „Wunschliste installieren“.']

export function InstallSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const p = platform()
  return (
    <Sheet title={t('App installieren')} subtitle={p === 'ios' ? t('iPhone und iPad') : p === 'android' ? t('Android im Browser') : t('Am Rechner')} onClose={onClose}>
      <ol className="steps">
        {steps(p).map((s) => (
          <li key={s}>{t(s)}</li>
        ))}
      </ol>
      <p className="hint hint--warn hint--pad">
        {p === 'ios'
          ? t('Wichtig: Die installierte App hat einen eigenen Speicher, getrennt von Safari. Installiere zuerst und lege erst dann Einträge an. Hast du schon im Browser Einträge: dort „Sichern“, in der installierten App „Wiederherstellen“.')
          : t('Die installierte App hat einen eigenen Speicher, getrennt vom Browser. Installiere zuerst und lege erst dann Einträge an.')}
      </p>
      {p === 'android' && <p className="hint hint--pad">{t('Auf Android gibt es außerdem die APK mit Erinnerungen und Auto-Backup. Sie ist die bessere Wahl.')}</p>}
    </Sheet>
  )
}
