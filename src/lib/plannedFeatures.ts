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
  'save-persist': {
    title: 'Dauerhaft speichern',
    text: 'Deine Einträge bleiben nach dem Schließen der App erhalten. Bis dahin sind alle Daten hier nur eine Vorschau und verschwinden beim Neuladen.',
    version: 'V0.2',
    platform: 'beide',
    emoji: '💾',
  },
  'image-pick': {
    title: 'Bild hinzufügen',
    text: 'Foto aus der Galerie wählen oder per Link übernehmen. Große Bilder werden verkleinert gespeichert, damit der Speicher nicht überläuft.',
    version: 'V0.3',
    platform: 'beide',
    emoji: '🖼️',
  },
  'link-import': {
    title: 'Link-Import',
    text: 'Aus einem Produktlink werden Name, Bild und wenn möglich der Preis automatisch gelesen. Alle Felder bleiben von Hand korrigierbar.',
    version: 'V0.7',
    platform: 'android',
    emoji: '🪄',
  },
  'share-link-in': {
    title: 'Link aus anderer App teilen',
    text: 'Einen Produktlink direkt aus dem Browser oder Shop über das Teilen-Menü in die App schicken.',
    version: 'V0.7',
    platform: 'android',
    emoji: '📲',
  },
  'backup-now': {
    title: 'Backup erstellen',
    text: 'Speichert alles (Wünsche, Personen, Ideen, Papierkorb, Archiv) als Datei. Auf dem iPhone über das Teilen-Menü in „Dateien“ oder iCloud Drive.',
    version: 'V0.5',
    platform: 'beide',
    emoji: '🗄️',
  },
  'backup-restore': {
    title: 'Backup wiederherstellen',
    text: 'Eine Backup-Datei auswählen und alle Daten daraus laden. Auch Backups aus älteren Versionen bleiben importierbar.',
    version: 'V0.5',
    platform: 'beide',
    emoji: '♻️',
  },
  'backup-auto': {
    title: 'Automatisches Backup',
    text: 'Höchstens einmal täglich beim Öffnen und nur bei Änderungen, im Ordner „Dokumente“. Die letzten 5 bleiben, ältere räumt die App selbst auf.',
    version: 'V0.7',
    platform: 'android',
    emoji: '🤖',
  },
  'persist-check': {
    title: 'Speicherschutz prüfen',
    text: 'Fragt beim System echten Speicherschutz an und zeigt, ob er aktiv ist. Das ersetzt kein Backup, hilft aber gegen automatisches Aufräumen bei Speichermangel.',
    version: 'V0.5',
    platform: 'beide',
    emoji: '🛡️',
  },
  'share-export': {
    title: 'Wunschliste teilen',
    text: 'Erzeugt eine Datei mit deiner Liste und öffnet das Teilen-Menü deines Handys, zum Beispiel für WhatsApp. Geteilt wird ein Schnappschuss, Änderungen musst du neu senden.',
    version: 'V0.6',
    platform: 'beide',
    emoji: '🎁',
  },
  'import-list': {
    title: 'Liste importieren',
    text: 'Eine erhaltene Datei auswählen. Sie wird als eigene Liste gespeichert, ein erneuter Import derselben Liste ersetzt sie statt sie zu duplizieren.',
    version: 'V0.6',
    platform: 'beide',
    emoji: '📥',
  },
  'received-to-idea': {
    title: 'Als Geschenkidee übernehmen',
    text: 'Einen Artikel aus einer erhaltenen Liste als Idee zu der passenden Person kopieren.',
    version: 'V0.6',
    platform: 'beide',
    emoji: '💡',
  },
  'ics-export': {
    title: 'Kalendererinnerung',
    text: 'Erzeugt eine Kalenderdatei (.ics) mit dem Anlass. Der Alarm kommt von deinem Kalender, das funktioniert auf iPhone und Android.',
    version: 'V0.8',
    platform: 'beide',
    emoji: '📅',
  },
  notifications: {
    title: 'Lokale Erinnerungen',
    text: 'Benachrichtigungen wie „Geburtstag in 7 Tagen“, direkt vom Gerät ohne Server. Ab Android 13 fragt die App einmal nach der Erlaubnis.',
    version: 'V0.7',
    platform: 'android',
    emoji: '🔔',
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
  { version: 'V0.4', title: 'Papierkorb und Archiv', text: 'Löschlogik, Rückgängig, Aufräumen nach 30 Tagen.' },
  { version: 'V0.5', title: 'Backup', text: 'Export, Import, Speicherschutz-Anzeige.' },
  { version: 'V0.6', title: 'Teilen', text: 'Teilen-Button und Import fremder Listen, inklusive unauffälligem „Schon vorhanden“.' },
  { version: 'V0.7', title: 'Android-Funktionen', text: 'Auto-Backup, Erinnerungen, Link-Import, Update-Hinweis.' },
  { version: 'V0.8', title: 'PWA-Feinschliff', text: 'iPhone-Installation, Kalenderdatei, Update-Hinweis.' },
  { version: 'V1.0', title: 'Release', text: 'Test auf echten Geräten.' },
]
