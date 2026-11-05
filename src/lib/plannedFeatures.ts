// Platzhalter für spätere Funktionen: Jeder Button ohne Logik öffnet ein Popup mit Funktion und Ziel-Version.

export type Platform = 'beide' | 'android' | 'iphone'

export interface PlannedFeature {
  title: string
  text: string
  version: string
  platform: Platform
  emoji: string
}

export const planned = {
  'link-import': {
    title: 'Link-Import',
    text: 'Aus einem Produktlink werden Name, Bild und wenn möglich der Preis automatisch gelesen. Alle Felder bleiben von Hand korrigierbar.',
    version: 'V0.9',
    platform: 'android',
    emoji: '🪄',
  },
  'share-link-in': {
    title: 'Link aus anderer App teilen',
    text: 'Einen Produktlink direkt aus dem Browser oder Shop über das Teilen-Menü in die App schicken.',
    version: 'V0.9',
    platform: 'android',
    emoji: '📲',
  },
  'ics-export': {
    title: 'Kalendererinnerung',
    text: 'Erzeugt eine Kalenderdatei (.ics) mit dem Anlass. Der Alarm kommt von deinem Kalender, das funktioniert auf iPhone und Android.',
    version: 'V0.8',
    platform: 'beide',
    emoji: '📅',
  },
  'update-check': {
    title: 'Auf Updates prüfen',
    text: 'Android zeigt „Update verfügbar“ mit Download-Link, die iPhone-App lädt die neue Version beim Start und bietet „Neu laden“ an. Deine Daten bleiben erhalten.',
    version: 'V0.8',
    platform: 'beide',
    emoji: '🚀',
  },
  'install-hint': {
    title: 'App installieren',
    text: 'Anleitung zum Hinzufügen zum Home-Bildschirm. Auf dem iPhone zuerst installieren, dann Einträge machen, weil die installierte App einen eigenen Speicher hat.',
    version: 'V0.8',
    platform: 'iphone',
    emoji: '📱',
  },
} satisfies Record<string, PlannedFeature>

export type PlannedId = keyof typeof planned

export interface RoadmapStep {
  version: string
  title: string
  text: string
}

export const roadmap: RoadmapStep[] = [
  { version: 'V0.1', title: 'Visuelle Shell', text: 'Alle Tabs, Fenster und Buttons, dazu Animationen und Übergänge. Keine echte Logik.' },
  { version: 'V0.2', title: 'Datenmodell', text: 'Lokaler Speicher mit Versionsnummer im Datenformat.' },
  { version: 'V0.3', title: 'Anlegen und bearbeiten', text: 'Wünsche, Personen und Geschenkideen, inklusive Bilder.' },
  { version: 'V0.4', title: 'Papierkorb, Archiv, Listen', text: 'Aufräumen nach 30 Tagen und Listen-Übersicht mit Kennzahlen.' },
  { version: 'V0.5', title: 'Backup', text: 'Sichern und Wiederherstellen als ZIP, Auto-Backup auf Android, Speicherschutz-Anzeige.' },
  { version: 'V0.6', title: 'Teilen', text: 'Liste als Datei teilen, Import fremder Listen, inklusive unauffälligem „Schon vorhanden“.' },
  { version: 'V0.7', title: 'Android-Funktionen', text: 'Erinnerungen vor Anlässen, Update-Hinweis, neue Einstellungen mit App-Sperre, Währungen und Export.' },
  { version: 'V0.8', title: 'PWA-Feinschliff', text: 'Web-App fürs iPhone mit Offline-Speicher und Installationshinweis, Kalenderdatei, „Neu laden“.' },
  { version: 'V0.9', title: 'Link-Import', text: 'Link-Test mit Schaltern, Übernahme in Wunsch und Idee, Links aus dem Browser teilen.' },
  { version: 'V0.10', title: 'Preisverlauf', text: 'Preis prüfen, Verlauf als Diagramm, Etikett „gesunken/gestiegen“ an der Karte, Vorschläge zum Bestätigen.' },
  { version: 'V0.11', title: 'Preiswächter', text: 'Tägliche Prüfung im Hintergrund (morgens gegen 8 Uhr) mit Meldung bei Preissenkung, nur Android, einstellbar.' },
  { version: 'V1.0', title: 'Release', text: 'Test auf echten Geräten.' },
]
