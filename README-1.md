# Wunschlisten-App – Plan (Arbeitstitel)

Stand: 25.10.2026 · Status: Planung · Datenformat: v1

## 1. Ziel

Eine kleine App mit zwei Bereichen:

- **Meine Wünsche:** eigene Wunschliste, die ich mit anderen teilen kann.
- **Geschenkideen für andere:** private Ideen pro Person, die nie nach außen gehen.

Alles läuft lokal auf dem Gerät. Kein Server, keine Datenbank, keine Accounts, keine Kosten.

## 2. Grundentscheidungen

| Thema | Entscheidung |
|---|---|
| Codebasis | Eine Web-App, mit Capacitor als Android-App verpackt |
| Android | APK als GitHub-Release, Download per Link, Installation aus unbekannten Quellen |
| iPhone | PWA über GitHub Pages, Installation per Safari "Zum Home-Bildschirm" |
| Stores | Keine |
| Backend / Accounts | Keine |
| Kosten | 0 € |
| Datenhaltung | Nur lokal auf dem jeweiligen Gerät |

Hinweis iPhone: Die installierte PWA hat einen eigenen Speicher, getrennt von Safari. Erst installieren, dann Einträge machen.

## 3. Plattformunterschiede

| Funktion | Android (APK) | iPhone (PWA) |
|---|---|---|
| Speicher | Privater App-Speicher | Browser-Speicher der installierten PWA |
| Backup | Automatisch + Button | Nur per Button |
| Backup-Rotation | Letzte 5 automatisch, ältere werden gelöscht | Nicht möglich, Nutzer löscht selbst |
| Erinnerungen | Lokale Benachrichtigungen | Kalenderdatei (.ics) zum Importieren |
| Link → Name/Bild/Preis | Automatisch (nativer Abruf) | Nicht möglich, manuell eintragen |
| Link aus anderer App teilen | Per Teilen-Menü (Plugin nötig) | Nicht möglich |
| Teilen / Import | Teilen-Button + Dateiauswahl | Teilen-Button + Dateiauswahl |
| Updates | Hinweis in der App + neue APK | Automatisch, Hinweis "Neu laden" |
| Papierkorb-Aufräumen | Automatisch beim Start | Automatisch beim Start |

## 4. Datenmodell

**Wunschlisten-Eintrag (Meine Wünsche):** Name, Link, Preis, Bild, Notiz, Status "gekauft".

**Person (Geschenkideen):** Name, Anlass mit Datum (z. B. Geburtstag, Weihnachten), Budget.

**Geschenkidee (gehört zu einer Person):** Name, Link, Preis, Bild, Notiz, Status "gekauft".

**Datenformat:**
- Von Anfang an mit Versionsnummer (`schemaVersion`).
- Die App wandelt alte Daten beim Start automatisch um.
- Backups aus älteren Versionen bleiben importierbar.
- Jeder Eintrag und jede Liste hat eine feste ID (nötig für den Import, siehe 5).

## 5. Teilen

- Geteilt wird nur die **eigene Wunschliste**, nie Geschenkideen.
- Export als Datei, Teilen-Button öffnet das Share-Menü des Handys (z. B. WhatsApp).
- Import über "Importieren" und Dateiauswahl.
- Eine empfangene Liste wird als eigene, getrennte Liste gespeichert.
- Erneuter Import derselben Liste ersetzt sie, statt sie zu duplizieren.
- Geteilt wird ein Schnappschuss. Änderungen müssen neu gesendet werden.
- Der Empfänger kann "gekauft" nicht an mich zurückmelden (ohne Backend nicht möglich).
- iPhone-Empfang: Datei aus WhatsApp in "Dateien" speichern, dann in der App importieren.
- QR-Code ist gestrichen: Größenlimit pro Code, Scannen in iOS-Web-Apps unzuverlässig.

## 6. Backup

- Backup enthält **alles**: Wünsche, Personen, Geschenkideen, Papierkorb, Archiv.
- **Android:** automatisch, höchstens einmal täglich beim Öffnen und nur bei Änderungen, Ziel ist der Ordner "Dokumente". Die letzten 5 bleiben, ältere löscht die App selbst (nur eigene Dateien). Nach einer Neuinstallation bleiben alte Backups liegen. Fallback: Ordnerauswahl.
- **iPhone:** Backup-Button (Teilen-Menü, dann "Dateien", am besten iCloud Drive). Dateiname enthält das Datum.
- **Beide:** Anzeige "Letztes Backup vor X Tagen" und Hinweis, wenn es zu lange her ist.
- Wiederherstellen immer über die Dateiauswahl.

## 7. Speicherschutz (`storage.persist()`)

- Beim ersten Start vor den ersten Daten per `persist()` anfragen.
- Bei jedem Start per `persisted()` prüfen, das ist nur eine Abfrage und fasst keine Daten an.
- Einstellungen zeigen: "Speicherschutz: aktiv / nicht aktiv", "zuletzt geprüft: Datum, Uhrzeit" und den Button "Status prüfen".
- Bei "nicht aktiv" erscheint ein Hinweis mit Backup-Aufforderung, keine Fehlermeldung.
- Geprüft wird in der installierten PWA, nicht in einem Safari-Tab.
- Der Schutz hilft nur gegen automatisches Aufräumen bei Speichermangel. Gegen App löschen, Webseitendaten löschen oder "Daten löschen" auf Android hilft er nicht. Das Backup bleibt Pflicht.

## 8. Löschen

**Automatisch durch die App:**
- Papierkorb: Einträge nach 30 Tagen endgültig löschen (Prüfung beim App-Start, beide Plattformen).
- Android: alte Auto-Backups, die letzten 5 bleiben.
- Sonst löscht die App nichts von selbst.

**Archiv:** Gekaufte Einträge werden automatisch archiviert und bleiben, bis ich sie manuell lösche.

**Manuell:**
- Eintrag löschen: landet im Papierkorb, mit "Rückgängig"-Hinweis.
- Person löschen: mit Rückfrage, ihre Geschenkideen werden mitgelöscht.
- Empfangene Liste: einzeln löschbar.
- Alle Daten löschen: in den Einstellungen mit doppelter Bestätigung.
- Backup-Dateien: selbst löschen (iPhone in "Dateien" bzw. iCloud Drive, Android im Ordner "Dokumente").

**Vom System, außerhalb der App:**
- App deinstallieren bzw. vom Home-Bildschirm löschen: alle Daten weg. Auf Android bleibt die Backup-Datei in "Dokumente".
- Webseitendaten löschen (iPhone) bzw. "Daten löschen" (Android): alle Daten weg.
- Ohne aktiven Speicherschutz kann das System bei Speichermangel Daten räumen.

## 9. Updates

- **Android:** Neue APK als GitHub-Release, Installation über die alte, Daten bleiben erhalten. Voraussetzung: gleicher Signaturschlüssel (Keystore) und höherer `versionCode`. Keystore sicher sichern, bei Verlust ist nur Neuinstallation möglich (Daten dann nur über Backup). Beim Start (mit Internet) fragt die App das neueste Release ab und zeigt "Update verfügbar" mit Download-Link.
- **iPhone:** Die PWA lädt die neue Version beim Start mit Internet und zeigt "Neue Version, neu laden". Daten bleiben erhalten.
- Datenformat-Migration siehe Abschnitt 4.

## 10. Erinnerungen

- **Android:** lokale Benachrichtigungen (Capacitor Local Notifications), z. B. "Geburtstag in 7 Tagen". Ab Android 13 einmalige Erlaubnis nötig.
- **iPhone:** keine zeitgesteuerten Benachrichtigungen ohne Push-Server. Ersatz: Die App erzeugt eine Kalenderdatei (.ics) mit dem Anlass, der Alarm kommt vom Kalender. Funktioniert auch auf Android.

## 11. Link-Import

- Die App liest Meta-Daten der Seite (Open Graph, schema.org).
- Name und Bild klappen oft, der Preis ist unzuverlässig.
- Alle Felder bleiben manuell korrigierbar.
- Nur Android-APK. Auf dem iPhone blockiert der Browser den Abruf fremder Seiten, dort wird manuell eingetragen.

## 12. Kosten

- Alles 0 €.
- GitHub Pages ist kostenlos nur bei einem öffentlichen Repo. Der Code ist dann öffentlich, Nutzerdaten liegen nie im Repo.
- Eine echte iOS-App oder TestFlight bräuchte das Apple Developer Program (ca. 99 € im Jahr). Aktuell nicht geplant.

## 13. Nicht Teil von V1

- Accounts, Sync, Server
- Store-Veröffentlichung
- QR-Code-Teilen
- "Gekauft"-Rückmeldung an den Listenbesitzer
- Link-Import und zeitgesteuerte Push-Benachrichtigungen auf dem iPhone
- Automatisches Löschen von Backup-Dateien auf dem iPhone

## 14. Offene Entscheidungen

- [ ] Name und visuelle Identität der App
- [ ] Framework für die Web-App
- [ ] Welche Felder werden beim Teilen exportiert (z. B. bleibt die Notiz privat?)
- [ ] Bedeutung von "gekauft" bei eigenen Wünschen (z. B. "erhalten")
- [ ] Ab wie vielen Tagen erscheint der Backup-Hinweis (Vorschlag: 14)

## 15. Am echten Gerät testen

- Verhalten von `persist()` und `persisted()` auf der verwendeten iOS-Version
- Teilen-Button mit Datei in iOS-Safari/PWA und Auswahl der Datei beim Import
- Schreiben ins Verzeichnis "Dokumente" auf neueren Android-Versionen (sonst Ordnerauswahl)
- Aktuelle iOS-Regeln für PWAs (ändern sich öfter, nicht neu geprüft)

**Testgerät iPhone:** iPhone 12 mit iOS 26.0.1. Ein Update auf iOS 27.0.1 ist wegen Speichermangel aktuell nicht möglich, die iOS-Annahmen in diesem Plan beziehen sich auf iOS 26.

**Knapper Speicher auf dem Testgerät:**
- Prüfen, ob `persist()` gewährt wird und ob das Backup in iCloud Drive gespeichert werden kann.
- Speicherbedarf von Bildern prüfen, gegebenenfalls verkleinert speichern.
- Vor einem größeren iOS-Update und vor dem Freiräumen von Safari-Webseitendaten ein Backup machen.

## 16. Roadmap (Vorschlag)

- **V0.1:** Visuelle Shell. Alle Tabs, Fenster und Buttons vorhanden, keine Logik. Platzhalter für spätere Funktionen zeigen ein Popup mit Funktion und Ziel-Version.
- **V0.2:** Datenmodell, lokaler Speicher, Versionsnummer im Datenformat
- **V0.3:** Wünsche, Personen, Geschenkideen anlegen und bearbeiten
- **V0.4:** Papierkorb, Archiv, Löschlogik
- **V0.5:** Backup, Export, Import, Speicherschutz-Anzeige
- **V0.6:** Teilen-Button und Import fremder Listen
- **V0.7:** Android-Funktionen (Auto-Backup, Erinnerungen, Link-Import, Update-Hinweis)
- **V0.8:** PWA-Feinschliff für iPhone (.ics, Update-Hinweis)
- **V1.0:** Test auf echten Geräten, Release
