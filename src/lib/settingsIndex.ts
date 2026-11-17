import { normalize } from './format'
import type { TFn } from './i18n'
import type { SettingsPageId } from '../state/nav'

export interface SettingEntry {
  page: SettingsPageId
  /** Deutscher Text wie im Bildschirm, wird übersetzt angezeigt. */
  label: string
  /** Zusätzliche Suchwörter (deutsch und englisch). */
  words: string
}

export const PAGE_TITLES: Record<SettingsPageId, string> = {
  data: 'Sicherung und Daten',
  look: 'Aussehen und Anzeige',
  cards: 'Karten und Wischen',
  nav: 'Navigation und Reiter',
  money: 'Währung und Format',
  remind: 'Erinnerungen',
  privacy: 'Teilen und Datenschutz',
  app: 'App und Updates',
}

export const SETTING_INDEX: SettingEntry[] = [
  { page: 'data', label: 'Jetzt sichern', words: 'backup sicherung zip speichern' },
  { page: 'data', label: 'Wiederherstellen', words: 'backup restore zurückholen import' },
  { page: 'data', label: 'Automatisch sichern', words: 'backup auto täglich' },
  { page: 'data', label: 'Interne Kopien', words: 'backup sicherheitskopie' },
  { page: 'data', label: 'Speicherschutz', words: 'persist storage speicher' },
  { page: 'data', label: 'Papierkorb-Frist', words: 'löschen tage aufbewahren trash' },
  { page: 'data', label: 'Automatische Backups behalten', words: 'anzahl dateien aufräumen' },
  { page: 'data', label: 'Daten exportieren', words: 'csv excel text drucken export tabelle' },
  { page: 'data', label: 'Alle Daten löschen', words: 'zurücksetzen reset leeren gefahr' },
  { page: 'look', label: 'Sprache', words: 'deutsch english language' },
  { page: 'look', label: 'Darstellung', words: 'dunkel hell dark light theme modus' },
  { page: 'look', label: 'Akzentfarbe', words: 'farbe color design' },
  { page: 'look', label: 'Effekte', words: 'animation bewegung effects' },
  { page: 'look', label: 'Schriftgröße', words: 'text groß klein font zoom' },
  { page: 'look', label: 'Vibration', words: 'haptik feedback' },
  { page: 'look', label: 'Stil', words: 'design look anhänger ruhig kontrast variante theme' },
  { page: 'look', label: 'Ecken', words: 'rund eckig radius abgerundet' },
  { page: 'look', label: 'Farbton', words: 'akzent farbe regler beliebig' },
  { page: 'look', label: 'Farbintensität', words: 'sättigung kräftig blass dezent' },
  { page: 'look', label: 'Schriftart', words: 'font systemschrift' },
  { page: 'look', label: 'Vibrationsstärke', words: 'haptik stärke fest leicht' },
  { page: 'cards', label: 'Dichte', words: 'kompakt luftig abstand zeilen karten' },
  { page: 'cards', label: 'Bildgröße', words: 'bild vorschau symbol klein groß ausblenden' },
  { page: 'cards', label: 'Namen auf Karten', words: 'zeilen name lang kürzen' },
  { page: 'cards', label: 'Infos auf Karten', words: 'preis link notiz wichtigkeit hinweise badge anzeigen' },
  { page: 'cards', label: 'Wischgesten', words: 'wischen swipe gesten aktion belegen rechts links gekauft favorit löschen verschieben' },
  { page: 'cards', label: 'Wischweite', words: 'empfindlichkeit swipe kurz lang' },
  { page: 'nav', label: 'Reiter ein- und ausblenden', words: 'tabs leiste navigation ausblenden ideen erhalten statistik' },
  { page: 'nav', label: 'Reihenfolge der Reiter', words: 'tabs sortieren verschieben navigation' },
  { page: 'nav', label: 'Beschriftung der Reiter', words: 'tabs text symbole labels' },
  { page: 'nav', label: 'Offene Ideen im Budget zeigen', words: 'budget balken' },
  { page: 'nav', label: 'Start-Reiter', words: 'startseite öffnen tab' },
  { page: 'nav', label: 'Listen', words: 'layout kacheln untereinander' },
  { page: 'nav', label: 'Sortierung', words: 'reihenfolge sortieren preis name' },
  { page: 'money', label: 'Hauptwährung', words: 'euro dollar franken pfund currency' },
  { page: 'money', label: 'Wechselkurse', words: 'kurs umrechnung umrechnen rate' },
  { page: 'money', label: 'Kurse online holen', words: 'ezb aktualisieren' },
  { page: 'money', label: 'Datumsformat', words: 'datum tag monat jahr date' },
  { page: 'remind', label: 'Erinnerungen', words: 'benachrichtigung anlass push notification' },
  { page: 'remind', label: 'Standard-Vorlauf', words: 'tage davor erinnerung' },
  { page: 'remind', label: 'Uhrzeit', words: 'erinnerung zeit' },
  { page: 'remind', label: 'Kalenderdatei erzeugen', words: 'ics kalender' },
  { page: 'privacy', label: 'App-Sperre', words: 'pin code sperre schutz passwort lock' },
  { page: 'privacy', label: 'Dein Name beim Teilen', words: 'absender' },
  { page: 'privacy', label: 'Preise mitsenden', words: 'teilen preis' },
  { page: 'privacy', label: 'Bilder mitsenden', words: 'teilen bild foto' },
  { page: 'privacy', label: 'Notizen mitsenden', words: 'teilen notiz' },
  { page: 'privacy', label: 'Gekaufte Artikel', words: 'teilen gekauft unauffällig' },
  { page: 'app', label: 'Auf Updates prüfen', words: 'update version neu apk' },
  { page: 'app', label: 'Beim Start prüfen', words: 'update automatisch' },
  { page: 'app', label: 'Auf dem Home-Bildschirm installieren', words: 'pwa installieren iphone' },
  { page: 'app', label: 'Link-Import', words: 'link produkt preis shop idealo bild lesen' },
  { page: 'app', label: 'Art automatisch erkennen', words: 'kind art vorschlag erkennung formular' },
  { page: 'app', label: 'Automatisch lesen', words: 'link auto einfügen tippen daten holen' },
  { page: 'app', label: 'Preis übernehmen', words: 'link preis import' },
  { page: 'app', label: 'Prüfung im Hintergrund', words: 'preis hintergrund täglich benachrichtigung melden gesunken akku morgens' },
  { page: 'app', label: 'Preise vergleichen', words: 'preis vergleich suche idealo google shopping geizhals links' },
  { page: 'app', label: 'Kleine Preisänderungen ignorieren', words: 'preis schwelle prozent meldung gesunken gestiegen rauschen' },
  { page: 'app', label: 'Preisverlauf', words: 'preis verlauf diagramm etikett gesunken gestiegen beobachten' },
  { page: 'app', label: 'Alle Preise prüfen', words: 'preis verlauf prüfen alle link' },
  { page: 'app', label: 'Lange Namen kürzen', words: 'link import name kürzen lang titel amazon' },
  { page: 'app', label: 'Eigenen Namen behalten', words: 'link import name eingetippt behalten überschreiben' },
  { page: 'app', label: 'Ausgefüllte Felder überschreiben', words: 'link import überschreiben leer' },
  { page: 'app', label: 'Bilder übernehmen', words: 'link bild produktbild' },
  { page: 'app', label: 'Link testen', words: 'link produkt preis shop idealo test' },
  { page: 'app', label: 'Demo-Daten laden', words: 'beispiel vorschau test' },
]

export function searchSettings(query: string, t: TFn): SettingEntry[] {
  const tokens = normalize(query).split(' ').filter(Boolean)
  if (!tokens.length) return []
  return SETTING_INDEX.filter((e) => {
    const hay = normalize(`${t(e.label)} ${e.label} ${e.words} ${t(PAGE_TITLES[e.page])}`)
    return tokens.every((k) => hay.includes(k))
  })
}
