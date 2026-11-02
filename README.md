# Wunschlisten-App – Plan (Arbeitstitel)

Stand: 01.11.2026 · Status: V0.6.3 (Teilen und Import von Wunschlisten als Datei) · Datenformat: v2

## 1. Ziel

Eine kleine App mit zwei Bereichen:

- **Meine Wünsche:** eigene Wunschliste, die ich mit anderen teilen kann.
- **Geschenkideen für andere:** private Ideen pro Person, die nie nach außen gehen.

Alles läuft lokal auf dem Gerät. Kein Server, keine Datenbank, keine Accounts, keine Kosten.

## 2. Grundentscheidungen

| Thema | Entscheidung |
|---|---|
| Codebasis | Eine Web-App, mit Capacitor als Android-App verpackt |
| Framework | Vite + React + TypeScript, Animationen mit Motion (`motion/react`), Icons mit lucide, Schriften lokal gebündelt (offlinefähig) |
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

**Wunschlisten-Eintrag (Meine Wünsche):** Name, Link, Preis, Bild, Notiz, Status "gekauft". "Gekauft" heißt strikt: Ich habe den Artikel schon gekauft (nicht "erhalten").

**Person (Geschenkideen):** Name, Anlass mit Datum (z. B. Geburtstag, Weihnachten), Budget.

**Geschenkidee (gehört zu einer Person):** Name, Link, Preis, Bild, Notiz, Status "gekauft".

**Listen:** Eigene Wünsche und die Ideen für jede Person lassen sich in benannte Listen sortieren (z. B. "Weihnachten", "Geburtstag"). Jeder Eintrag gehört zu genau einer Liste, jeder Eigentümer hat immer mindestens die Standardliste "Allgemein". Pro Liste und insgesamt gibt es Kennzahlen (Anzahl, Gesamtwert, offen, gekauft, Durchschnittspreis). Löscht man eine Liste, landen ihre Einträge im Papierkorb.

**Art (Objekt):** Jeder Eintrag hat ein optionales Feld "Art", z. B. "Grafikkarte". Es wird beim Tippen des Namens automatisch erkannt (lokales Stichwortverzeichnis) und lässt sich von Hand ändern. Es dient dem Doppelungs-Filter (siehe 5a).

**Datenformat:**
- Von Anfang an mit Versionsnummer (`schemaVersion`).
- Die App wandelt alte Daten beim Start automatisch um.
- Backups aus älteren Versionen bleiben importierbar.
- Jeder Eintrag und jede Liste hat eine feste ID (nötig für den Import, siehe 5).

## 5. Teilen

- Geteilt wird nur die **eigene Wunschliste**, nie Geschenkideen.
- **Notizen** bleiben standardmäßig privat. Beim Teilen lassen sie sich per Schalter mitsenden.
- **Unauffälliges "Schon vorhanden":** Gekaufte Artikel gehen im Hintergrund mit (Markierung `owned`), ohne in der Liste des Empfängers aufzutauchen. Legt der Empfänger eine Geschenkidee für diese Person an, die dort schon als gekauft markiert ist, zeigt die Idee den Hinweis "Schon vorhanden". Abgeglichen wird über Link, sonst über den normalisierten Namen. Dafür muss die empfangene Liste mit einer Person verknüpft sein.
- **Listen beim Teilen:** Im Teilen-Fenster wählt man, welche eigenen Listen mitgehen. Ein erhaltenes Paket kann mehrere Listen enthalten. Geschenkideen für andere werden nie geteilt.
- **Gekauftes bei erhaltenen Listen:** In einer erhaltenen Liste bleibt Gekauftes standardmäßig verborgen. Ein unscheinbarer Knopf am Ende ("Schon Vorhandenes anzeigen") blendet es bei Bedarf ein, mit dem Kaufdatum.
- **Option "Gekaufte Artikel"** beim Teilen: *Unauffällig* (Standard) · *Nur gekauft* (es geht nur der Abgleich mit, keine sichtbaren Wünsche) · *Ohne* (gekaufte Artikel bleiben ganz bei mir).
- Export als Datei, Teilen-Button öffnet das Share-Menü des Handys (z. B. WhatsApp). Umgesetzt in V0.6, Details unter 24.
- Import über "Import" im Tab "Erhalten" und Dateiauswahl.
- **Kein Link:** Ein Link bräuchte einen Server oder eine gehostete Seite, die die Daten ausliefert. Die Liste in die Adresse zu packen geht nur für reinen Text ohne Bilder und wird für echte Listen zu lang, und eine Kurzadresse bräuchte wieder einen Server. Deshalb nur Datei. Ein Text-Link kommt frühestens mit der gehosteten PWA (V0.8).
- **Dateigrößen:** WhatsApp erlaubt Dokumente bis 100 MB, Discord ohne Abo nur 10 MB. Das Teilen-Fenster zeigt die ungefähre Größe und warnt ab 8 MB (Hinweis: Bilder ausschalten).
- Eine empfangene Liste wird als eigene, getrennte Liste gespeichert.
- Erneuter Import derselben Liste ersetzt sie, statt sie zu duplizieren.
- Geteilt wird ein Schnappschuss. Änderungen müssen neu gesendet werden.
- Der Empfänger kann "gekauft" nicht an mich zurückmelden (ohne Backend nicht möglich).
- iPhone-Empfang: Datei aus WhatsApp in "Dateien" speichern, dann in der App importieren.
- QR-Code ist gestrichen: Größenlimit pro Code, Scannen in iOS-Web-Apps unzuverlässig.

## 5a. Doppelungs-Filter

Beim Anlegen oder Bearbeiten eines Eintrags vergleicht die App ihn live mit allem, was bei demselben Eigentümer schon "im Spiel" ist:
- offene Ideen oder Wünsche,
- selbst Gekauftes (mit Kaufdatum),
- bei Personen: das, was sie laut erhaltener Liste schon besitzen (Hintergrund-Abgleich).

Als Treffer gilt ein ähnlicher Name (gemeinsames, nicht zu generisches Wort, z. B. "Kindle", "RTX", "4060") oder die gleiche Art. Die Vergleichskarte zeigt den auffälligen Eintrag mit Status und Datum. Der Speichern-Knopf heißt dann "Trotzdem hinzufügen", die Entscheidung bleibt beim Nutzer.

**Sichtbarkeit der "Art":** Die Art bleibt privat. Bei Ideen wird sie nie geteilt. Bei eigenen Wünschen geht sie nur im unauffälligen Gekauft-Teil (und mit sichtbaren Wünschen) mit, damit der Filter bei anderen auch bei abweichenden Namen greift. Sie wird dort nie als eigene Information angezeigt.

## 5b. Statistik

Eigener Tab mit Auswertungen über alles: Gesamtausgaben (für mich und für andere), Kennzahlen, Ausgaben pro Monat der letzten sechs Monate, Ausgaben pro Person im Vergleich zum Budget, Werte pro Liste, häufigste Arten sowie Kuriosa (teuerster und günstigster Eintrag, erkannte Doppelte, Anlässe der nächsten 30 Tage, Papierkorb und mehr).

## 6. Backup

- Backup enthält **alles**: Wünsche, Personen, Geschenkideen, Papierkorb, Archiv.
- **Android:** automatisch, höchstens einmal täglich beim Öffnen und nur bei Änderungen, Ziel ist der Ordner "Dokumente". Die letzten 5 bleiben, ältere löscht die App selbst (nur eigene Dateien). Nach einer Neuinstallation bleiben alte Backups liegen. Fallback: Ordnerauswahl.
- **iPhone:** Backup-Button (Teilen-Menü, dann "Dateien", am besten iCloud Drive). Dateiname enthält das Datum.
- **Beide:** Anzeige "Letztes Backup vor X Tagen". Der Hinweis erscheint ab 14 Tagen, aber nur, wenn sich seitdem etwas geändert hat, und nur direkt beim Start der App (nicht bei jedem Tab-Wechsel).
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

## 14. Entscheidungen

- [x] Framework: Vite + React + TypeScript + Motion
- [x] Lokaler Speicher: IndexedDB ohne Zusatzbibliothek (siehe 19), damit später Bilder hineinpassen
- [x] Notizen: privat, beim Teilen per Schalter mitsendbar
- [x] "Gekauft" bei eigenen Wünschen: strikt "habe ich gekauft"
- [x] Backup-Hinweis ab 14 Tagen, nur bei Änderungen
- [x] Gekaufte Artikel beim Teilen: unauffällig mitsenden, Option "nur gekauft" / "ohne" (siehe 5)
- [x] Bilder: höchstens 800 Pixel an der längsten Kante, JPEG mit etwa 82 % Qualität, Quelle Galerie und Kamera über die Auswahl des Systems; nur für Wünsche und Geschenkideen, nicht für Personen
- [x] Android: Capacitor-Hülle um die Web-App, APK als Download über GitHub (kein Store); App-ID `app.wunschliste.local` (lässt sich später nicht mehr ändern, ohne dass Android von einer neuen App ausgeht)
- [ ] Name der App (Arbeitstitel "Wunschliste", zentral in `src/lib/brand.ts`)
- [ ] Endgültige visuelle Identität (wird in V0.1 gemeinsam entschieden)

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

- **V0.1:** Visuelle Shell, um das Design vollständig zu entscheiden, bevor echte Logik folgt. Alle Tabs, Fenster und Buttons sind da, Animationen, Übergänge und Dynamik (Wischen, Konfetti, Sheets, Zähler) sind schon voll enthalten. Bedienung wirkt im Arbeitsspeicher, gespeichert wird noch nichts. Platzhalter für spätere Funktionen zeigen ein Popup mit Funktion und Ziel-Version (`src/lib/plannedFeatures.ts`).
- **V0.2 (erledigt):** Datenmodell, lokaler Speicher, Versionsnummer im Datenformat. Der erste Start ist leer, Beispieldaten gibt es nur über "Mehr" → "Demo-Daten laden".
- **V0.3 (erledigt):** Bilder für Wünsche und Geschenkideen (Galerie oder Kamera, verkleinert auf höchstens 800 Pixel, als JPEG gespeichert). Wünsche, Personen und Ideen anlegen und bearbeiten war schon in V0.1 vorhanden und läuft seit V0.2 mit echtem Speicher.
- **V0.3.1 (erledigt, ungetestet auf Gerät):** Android-Hülle mit Capacitor und automatischer APK-Build bei GitHub, damit Android-Funktionen ab jetzt auf dem Handy getestet werden können (siehe 21).
- **V0.4 (erledigt):** Papierkorb räumt sich nach 30 Tagen selbst auf (beim App-Start), Archiv und Rückgängig waren schon da. Dazu die Listen-Übersicht (siehe 22).
- **V0.5 (erledigt, Android-Teil ungetestet auf Gerät):** Backup als ZIP von Hand, Wiederherstellen mit interner Kopie davor, Auto-Backup in Dokumente (Android), echter Speicherschutz-Status (siehe 23).
- **V0.6 (erledigt, Share-Menü auf Android ungetestet auf Gerät):** Wunschlisten als Datei teilen, Import, Verknüpfung mit Personen, Übernehmen als Idee (siehe 24).
- **V0.7:** Android-Funktionen (Erinnerungen, Link-Import, Update-Hinweis; das Auto-Backup wurde in V0.5 vorgezogen)
- **V0.8:** PWA-Feinschliff für iPhone (.ics, Update-Hinweis)
- **V1.0:** Test auf echten Geräten, Release

## 17. Entwicklung

```bash
npm install
npm run dev      # lokaler Server mit Hot Reload
npm run build    # Produktions-Build nach dist/
```

Struktur: `src/screens` (Seiten), `src/components` (Bausteine), `src/state` (Daten, Navigation, UI), `src/lib` (Datenmodell, Speicher, Hilfsfunktionen, Platzhalter), `src/styles` (Design-Tokens und Stile).

Technische Leitplanken für Animationen (nach Fehlersuche in V0.1):
- Seitenwechsel (`components/Stage.tsx`) und Fenster (`components/Presence.tsx`) werden per Timer ausgehängt, nicht per `AnimatePresence`. So kann nie eine unsichtbare Seite oder ein unsichtbarer Hintergrund liegen bleiben und Klicks abfangen.
- Keine `layout`/`layoutId`-Animationen innerhalb von Seiten und Fenstern (Segmentwahl und Schalter laufen per CSS). Ausnahme ist nur die Tab-Leiste.
- Wischen vs. Antippen einer Karte: Antippen zählt nur ohne nennenswerte Bewegung.

## 18. Einstellungen und Sprache

- **Sprache:** Deutsch oder Englisch (Standard: Browser-Sprache). Der deutsche Text ist der Übersetzungsschlüssel, die Übersetzungen stehen in `src/lib/en.ts`. Neue Texte immer mit `t('…')` ausgeben.
- **Darstellung:** Auto, Dunkel oder Hell, dazu Akzentfarbe und Effekt-Stufe.
- **Offene Ideen im Budget zeigen:** Schaltet die helle Zusatzleiste im Budget (Summe der noch offenen Ideen) ein, standardmäßig aus.
- Die Kreise um die Profilbilder sind entfernt.

## 19. Speicherschicht (V0.2)

- **Ablage:** IndexedDB, Datenbank `wishlist`, Speicher `kv` (`src/lib/db.ts`). Der ganze Datenstand liegt als ein Dokument unter dem Schlüssel `data`. Ein Schreibvorgang ist dadurch immer ein vollständiger, konsistenter Stand.
- **Wann wird gespeichert:** Bei jeder Änderung an Einträgen, Listen, Personen, erhaltenen Listen oder Backup-Zeitpunkt. Schnell aufeinanderfolgende Änderungen werden zusammengefasst, geschrieben wird immer der neueste Stand (`src/lib/storage.ts`).
- **Dokument:** `schemaVersion`, `savedAt`, `items`, `lists`, `persons`, `received`, `lastBackupAt`, `changedSinceBackup`. Nicht gespeichert werden Sitzungswerte wie der Backup-Hinweis.
- **Versionen:** Ältere Daten laufen beim Start Schritt für Schritt durch `MIGRATIONS` (Version n → n+1). Das Original bleibt als `data.v{n}` erhalten. Fehlt ein Schritt oder schlägt er fehl, wird nichts überschrieben.
- **Neuere Daten:** Stammen sie aus einer neueren App-Version, zeigt die App nur einen Hinweis. Nichts wird geladen oder verändert.
- **Unlesbare Daten:** Sie werden als `data.broken` beiseitegelegt, die App startet leer und sagt es.
- **Reparatur beim Laden:** Jeder Eigentümer hat mindestens die Standardliste, verwaiste Einträge wandern in die erste Liste ihres Eigentümers.
- **Speichern nicht möglich** (z. B. gesperrter Speicher): Die App läuft im Arbeitsspeicher und zeigt dauerhaft einen Hinweis unter "Mehr". Schlägt später ein Schreibvorgang fehl, kommt einmal ein Hinweis.
- **Speicherschutz:** Beim ersten Start ohne gespeicherte Daten fragt die App `navigator.storage.persist()` an. Die Anzeige und die Prüfung unter "Mehr" bleiben bis V0.5 ein Demo-Wert.
- **Einstellungen** (Darstellung, Sprache, Akzent, Erinnerungs-Schalter) liegen weiter in `localStorage` unter `wl.ui`, weil sie vor dem ersten Bild gebraucht werden.
- **Grenze:** Zwei gleichzeitig offene Fenster derselben App überschreiben sich gegenseitig, der letzte Schreibvorgang gewinnt. Für die installierte App ist das kein Thema.

## 20. Bilder (V0.3)

- **Auswahl:** Im Formular für Wünsche und Ideen öffnet "Bild wählen" die Systemauswahl (Galerie oder Kamera, `<input type="file" accept="image/*">`). Das Bild wird sofort verkleinert, erst "Speichern" legt es ab.
- **Verarbeitung** (`src/lib/images.ts`): Drehung aus den Kameradaten wird übernommen, längste Kante höchstens 800 Pixel, weißer Hintergrund, JPEG mit 82 % Qualität. Typisch 40 bis 120 KB pro Bild.
- **Ablage:** Eigener Speicher `images` in derselben Datenbank (Datenbank-Version 2, ein Upgrade von Version 1 behält alle Daten). Der Eintrag speichert nur die ID (`imageId`). Das Bild liegt als Rohdaten (`ArrayBuffer`), weil das auf iOS am zuverlässigsten ist.
- **Ersetzen oder entfernen:** Ein neues Bild bekommt immer eine neue ID. Das alte bleibt zunächst liegen, damit "Rückgängig" und Papierkorb nichts verlieren.
- **Aufräumen:** Beim App-Start (nur wenn die Daten normal geladen wurden) werden Bilder gelöscht, auf die kein Eintrag mehr zeigt. Während der Nutzung wird nie gelöscht.
- **Papierkorb:** Gelöschte Einträge behalten ihr Bild, bis sie endgültig entfernt werden.
- **Für V0.5 (Backup):** Die Sicherung muss die Bilder enthalten, sonst fehlen sie nach der Wiederherstellung. Die Dateigröße wächst entsprechend.
- **Für V0.6 (Teilen):** Entschieden: Bilder gehen standardmäßig mit, per Schalter in den erweiterten Einstellungen abschaltbar. Gekaufte Artikel ("unauffällig") gehen ohne Bild mit.
- **Am echten Gerät testen:** Kamera und Galerie in iOS-Safari/PWA, Speicherverbrauch mit vielen Bildern.

## 21. Android-Hülle und APK (V0.3.1)

- **Aufbau:** Die Web-App läuft unverändert in einer Android-WebView (Capacitor 8). Der Ordner `android/` ist das fertige Android-Projekt, `capacitor.config.ts` die Einstellung. Ein Kopieren der Web-Dateien erledigt `npx cap sync android` beim Build.
- **Build bei GitHub:** `.github/workflows/android.yml` baut bei jedem Push auf `main` (oder per "Run workflow" im Reiter Actions) die APK und legt sie unter Releases als "Neueste APK" ab. Der Download-Link ist `Releases → Neueste APK → wunschliste.apk`. Dauert einige Minuten. Kostenlos für öffentliche Repos, bei privaten Repos reicht das monatliche Freikontingent bei Weitem.
- **Signatur:** Die Test-APK ist mit dem festen Debug-Schlüssel `android/app/debug.keystore` signiert. Dadurch lässt sich jede neue APK über die alte installieren, ohne Deinstallieren und ohne Datenverlust. Für ein echtes Release (V1.0) kommt ein eigener, geheimer Schlüssel in die GitHub-Secrets. Der Debug-Schlüssel ist öffentlich und nur für Tests gedacht.
- **Versionen:** `versionName` kommt aus `package.json`, `versionCode` ist die Build-Nummer von GitHub (steigt von selbst).
- **Installieren:** APK auf dem Handy herunterladen, öffnen, "Installation aus dieser Quelle" einmalig erlauben. Beim Update einfach die neue APK darüber installieren.
- **Daten:** IndexedDB liegt in der WebView der App und bleibt bei Updates erhalten. Deinstallieren löscht sie. Android-Auto-Backup ist in der Manifest-Datei eingeschaltet, ersetzt aber kein eigenes Backup (V0.5).
- **Icon und Startbild:** aus dem Favicon erzeugt (Funke auf dunklem Grund), adaptives Icon für Android 8+.
- **Ränder:** `viewport-fit=cover`, Capacitor setzt die Safe-Area-Werte für Statusleiste und Navigationsleiste.
- **Am echten Gerät testen:** Erster Workflow-Lauf, Installation, Update über die alte APK, Icon, Ränder oben und unten, Bild wählen (Galerie/Kamera), Speichern nach Neustart der App, Zurück-Taste.
- **Offen:** Android-Statusleiste hell/dunkel passend zur App-Darstellung; Die Zurück-Taste schließt vermutlich die App, statt ein offenes Fenster zu schließen (noch nicht geprüft).

## 22. Papierkorb-Aufräumen und Listen-Übersicht (V0.4)

- **Papierkorb:** Beim App-Start werden Einträge entfernt, die länger als 30 Tage im Papierkorb liegen (`src/lib/trash.ts`, Frist `TRASH_DAYS`). Der bereinigte Stand wird sofort gespeichert, danach räumt der Start auch die Bilder der entfernten Einträge auf. Die Prüfung läuft nur beim Start, nicht während der Nutzung, und nur wenn die Daten normal geladen wurden.
- **Archiv:** Gekaufte Wünsche liegen im Reiter "Archiv" der Liste, gekaufte Ideen im Reiter "Gekauft". Dort bleiben sie, bis du sie löschst. Es wird nichts automatisch gelöscht.
- **Wünsche-Tab:** Zeigt immer die Übersicht, auch wenn es nur die Liste "Allgemein" gibt: oben die Kennzahlen aller Listen (Gesamtwert, offen, gekauft, Ø Preis), darunter je Liste eine Kachel mit Gesamtwert, Fortschrittsbalken sowie Anzahl und Wert von offen und gekauft. Tippen öffnet die Liste (mit Zurück-Pfeil, die Android-Zurück-Taste geht auch). "Alle Einträge" zeigt alle Wünsche zusammen.
- **Ideen-Tab:** Umschalter "Personen" und "Listen" (die Wahl bleibt beim Zurückkehren erhalten). "Listen" zeigt die Kacheln aller Listen aller Personen mit dem Namen der Person und eine Kachel "Neue Liste". Beim Anlegen wählt man erst die Person ("Für wen?"). Die Personenseite mit ihren Listen bleibt unverändert.
- **Code:** `ListPage` (`src/screens/ListPage.tsx`) ist die gemeinsame Seite für eine Liste, für Wünsche und Ideen. `ListTiles` (`src/components/ListTiles.tsx`) zeichnet die Kacheln.
- **Datum einer Liste:** Optional beim Anlegen und Bearbeiten (Feld "Datum", Format JJJJ-MM-TT im Datenstand, Feld `date` an der Liste, kein Datenformat-Wechsel nötig). Die Kachel zeigt "in 12 Tagen", "heute", "morgen" bzw. "vor 3 Tagen". In der Liste steht zusätzlich das volle Datum. Das Datum gilt einmalig, ein jährliches Wiederholen gibt es nicht. Das Datum geht beim Teilen standardmäßig mit (Schalter in den erweiterten Einstellungen).
- **Zurück-Taste (Android) und Escape:** `src/state/back.ts`. Reihenfolge: oberstes offenes Fenster (Sheet oder Dialog) schließen, dann eine geöffnete Ansicht (Liste, Person, Papierkorb, …) verlassen, dann von einem anderen Reiter zu "Wünsche" wechseln. Erst auf "Wünsche" ohne offene Ansicht beendet die Zurück-Taste die App. Dafür ist das Capacitor-Plugin `@capacitor/app` eingebunden. Im Browser gilt Escape, auf dem iPhone die Wischgeste für Ansichten.
- **Am echten Gerät testen:** Zurück-Taste und Zurück-Geste in jeder Lage (Fenster offen, Liste offen, anderer Reiter), Datumsfeld auf Android, Kachel-Layout bei langen Namen.
- **Personenseite:** Zeigt wie der Wünsche-Tab die Listen als Kacheln (mit "Neue Liste"), dazu "Alle Ideen" und die Anlässe. Tippen auf eine Kachel öffnet die Liste. Die Ansichten stapeln sich (Person → Liste), Zurück geht immer eine Stufe.
- **Datumsfeld und Kalender** (`DateField.tsx`, `DatePicker.tsx`): große Fläche mit Datum und Abstand in Tagen. Die Auswahl ist ein eigener Kalender in der App (Monat und Jahr blättern, Montag zuerst, heute markiert, Tippen auf den Tag übernimmt sofort, "Heute", "Entfernen", "Abbrechen"). Der Systemdialog von Android wird bewusst nicht mehr benutzt, damit es auf allen Geräten gleich aussieht. Bei jährlichen Anlässen entfällt das Jahr, es wird nur innerhalb des Jahres geblättert. Gilt für Listen (mit Jahr, einmalig) und Anlässe (jährlich).
- **Anlässe:** Schnellauswahl mit Vorschlag für das Datum: Weihnachten 24.12., Nikolaus 6.12., Valentinstag 14.2., Ostern und Muttertag (für das nächste Vorkommen berechnet), Geburtstag, Hochzeitstag und Jahrestag ohne Datum. Das Datum ist jeweils änderbar. "Eigener Anlass" erlaubt freien Namen und Datum. Anlässe wiederholen sich jährlich am selben Tag, bei Ostern und Muttertag ist das nur eine Näherung, weil sie jedes Jahr wandern. Ohne Datum wird ein Anlass nicht gespeichert.
- **Anlass-Karten und Bearbeiten (V0.4.3):** Auf der Personenseite sind Anlässe große Karten (Symbol, Name, Datum, Tage bis dahin; der nächste ist hervorgehoben, ab 14 Tagen farblich betont). Tippen öffnet `OccasionSheet` zum Ändern von Name und Datum oder zum Entfernen (mit "Rückgängig" im Hinweis). "+ Anlass" öffnet dasselbe Fenster mit Vorlagen. Im Personenformular sind die Anlässe ebenfalls als größere Karten mit Vorlagen-Schnellauswahl. Am Gerät prüfen: Kalender auf dem Handy und Tablet, Größe der Karten.
- **Listen mit Anlässen verbinden (V0.4.4):** Eine Liste einer Person kann mit einem ihrer Anlässe verknüpft werden (Feld `occasionId` an der Liste, additiv, kein Datenformat-Wechsel). Dann folgt das Datum der Liste dem nächsten Vorkommen des Anlasses (`listDate`/`listOccasion` in `src/lib/lists.ts`) und das eigene Datum der Liste wird ausgeblendet, bleibt aber gespeichert und kommt zurück, wenn man die Verknüpfung löst. Verknüpft wird beim Anlegen oder Bearbeiten der Liste ("Anlass"-Auswahl, beim Anlegen wird der Name vorbelegt) oder im Anlass ("Verknüpfte Listen", mehrere Listen pro Anlass möglich, eine Liste hat höchstens einen Anlass). Die Anlass-Karte nennt die verknüpften Listen, die Listenseite zeigt Anlass, Datum und Abstand. Wird ein Anlass gelöscht, gilt die Liste wieder als unverknüpft (die ID bleibt stehen, damit "Rückgängig" die Verbindung wiederherstellt). Eigene Wünsche haben keine Anlässe, nur Personen. Beim Teilen geht nur das Datum der Liste mit (bei verknüpften Listen das nächste Vorkommen), der Anlass selbst nicht.
- **Einklappbare Abschnitte (V0.4.5):** `Section` (`src/components/Page.tsx`) kann mit `collapseId` einklappbar werden. Eingebaut für "Listen" (Wünsche-Tab und Personenseite) und "Anlässe". Eingeklappt zeigt die Kopfzeile eine Kurzinfo ("2 Listen"), die Knöpfe daneben verschwinden. Der Zustand wird pro Gerät im Browserspeicher gemerkt (`wl.collapsed`, nur Komfort, kein Teil der Daten und nicht im Backup).
- **Datumshinweis in der Liste (V0.4.5):** Statt des kleinen Chips zeigt die Liste eine Karte im Stil der Anlass-Karten: Symbol, Anlassname (oder Datum), Datum, "Verknüpfter Anlass" und die Tage groß rechts. Tippen öffnet die Listenbearbeitung.
- **App-Icon (V0.4.4):** Das Android-Symbol hat jetzt die Marke mit Rand innerhalb der sicheren Zone des adaptiven Icons, vorher ragte der kleine Funke über die Maske. Erzeugt mit `scratchpad/icons/gen.cjs` (liegt nicht im Projekt, die fertigen PNGs sind in `android/app/src/main/res/mipmap-*`).
- **Tablet-Abstand oben (V0.4.4):** Auf Geräten mit Touch und mindestens 900 px Breite (`@media (min-width: 900px) and (pointer: coarse)` in `tokens.css`) gilt oben mindestens 30 px Abstand (`--safe-t`), damit die Seitenleiste und die Kopfzeile nicht an der Statusleiste des Tablets kleben. Handy und Desktop-Browser sind unverändert.

## 23. Backup, Wiederherstellen, Speicherschutz (V0.5)

- **Format:** ZIP-Datei (`src/lib/backup.ts`, Bibliothek `fflate`). Inhalt: `daten.json` (Wünsche, Personen, Ideen, Listen, Papierkorb, Archiv, erhaltene Listen, dazu Zähler, Datenformat-Version und App-Version), `bilder/<id>.jpg` (nur Bilder, auf die ein Eintrag zeigt, unkomprimiert) und `pruefsummen.json` (CRC32 jeder Datei). Das ZIP-Format selbst meldet stille Bitfehler nicht, deshalb prüft die App die Summen beim Einlesen. Nicht enthalten: Einstellungen wie Sprache, Farbe, eingeklappte Abschnitte (liegen nur auf dem Gerät).
- **Dateinamen:** von Hand `wunschliste-backup-JJJJ-MM-TT-HHMM.zip`, automatisch `wunschliste-auto-JJJJ-MM-TT.zip`.
- **Von Hand sichern ("Jetzt sichern" unter Mehr oder im Hinweis):** Android-App schreibt nach `Dokumente/Wunschliste` (klappt das nicht, öffnet sich das Teilen-Menü). Handy-Browser/iPhone öffnen das Teilen-Menü (dort "In Dateien sichern", am besten iCloud Drive). Rechner laden die Datei herunter. Danach steht "Heute gesichert", und der Backup-Hinweis ist weg, bis sich wieder etwas ändert.
- **Automatisch (nur Android-App, Schalter unter Mehr, standardmäßig an):** Beim Start, 3 Sekunden verzögert, höchstens einmal in 20 Stunden und nur, wenn sich seit der letzten Sicherung etwas geändert hat. Ziel `Dokumente/Wunschliste/wunschliste-auto-…zip`, die letzten 5 automatischen bleiben, ältere eigene löscht die App (von Hand erstellte nie). Nach einer Neuinstallation bleiben die alten Dateien liegen, sie gehören dann nicht mehr der App und werden nicht aufgeräumt. Klappt das Schreiben nicht, kommt ein Hinweis und nichts wird als gesichert markiert.
- **Wiederherstellen:** immer über die Dateiauswahl. Die Datei wird zuerst geprüft (ZIP, App-Kennung, Prüfsummen, Datenformat, ältere Formate werden migriert, neuere abgelehnt), dann folgt eine Rückfrage mit Datum und Zahlen. Danach legt die App eine **interne Kopie** des jetzigen Stands an (nur wenn es Daten gibt, es bleiben die letzten 3, Speicher `backups` in IndexedDB, Datenbank-Version 3), schreibt die Bilder und ersetzt alle Daten. Nichts wird zusammengeführt. Interne Kopien erscheinen unter "Interne Kopien" mit "Zurückholen". Auch vor "Demo-Daten laden" entsteht eine. "Alle Daten löschen" entfernt auch die internen Kopien.
- **Warum interne Kopien nur vor Wiederherstellen/Demo und nicht täglich:** Sie liegen im selben Speicher wie die Daten und schützen deshalb nur vor Fehlbedienung, nicht vor Datenverlust. Täglich würden sie auf dem iPhone viel Platz kosten. Sie ersetzen kein Backup.
- **Hinweis zum Backup:** Beim Start, wenn sich etwas geändert hat und das letzte Backup 14 Tage oder mehr her ist, oder wenn es noch nie eines gab und Wünsche existieren. Nur direkt beim Start, nicht bei jedem Tab-Wechsel.
- **Speicherschutz** (`src/lib/persist.ts`): Beim ersten Start wird `persist()` angefragt, bei jedem Start nur `persisted()` abgefragt. Unter Mehr: "aktiv", "nicht aktiv" (mit Hinweis auf Backup), "nicht verfügbar" oder in der Android-App "App-Speicher" (dort liegen die Daten im geschützten App-Speicher, die Browser-Abfrage ist nicht aussagekräftig). "Status prüfen" fragt neu ab und bittet bei "nicht aktiv" einmal um den Schutz. In der Android-App ist der Knopf ebenfalls aktiv und aktualisiert "zuletzt geprüft". Geprüft wird sinnvoll nur in der installierten PWA, nicht in einem Safari-Tab.
- **Android-Technik:** `@capacitor/filesystem` (Schreiben nach Dokumente) und `@capacitor/share` (Teilen-Menü als Rückfall), Berechtigungen nur für Android bis 10 im Manifest. Ab Android 11 braucht das Schreiben neuer Dateien in Dokumente keine Berechtigung.
- **Am echten Gerät testen:** (1) Android: "Jetzt sichern" schreibt eine Datei in Dokumente/Wunschliste, sichtbar in "Eigene Dateien"; (2) Auto-Backup: Eintrag ändern, App komplett schließen, am nächsten Tag öffnen, Datei prüfen und nach 6 Tagen Zählen, dass nur 5 automatische bleiben; (3) Wiederherstellen aus Dokumente über die Dateiauswahl, auch eine Datei vom anderen Gerät; (4) iPhone: Teilen-Menü, "In Dateien sichern", dort wieder öffnen; (5) ein Backup mit Bildern: Bilder sind nach dem Wiederherstellen da.

## 24. Teilen und Import (V0.6)

- **Format:** ZIP wie beim Backup (`src/lib/share.ts`, Container `packZip`/`unpackZip` aus `backup.ts`): `daten.json` mit Kennung `wunschliste-teilen` (Format 1), `bilder/<id>.jpg` und `pruefsummen.json`. Das Backup trägt die Kennung `wunschliste-backup`. Beide Dateien werden nicht verwechselt: Eine Sicherung im Import ergibt den Hinweis auf "Mehr" → Wiederherstellen und umgekehrt. Dateiname `wunschliste-von-<name>-JJJJ-MM-TT.wunsch` (V0.6.1). **Eigene Endung, weil WhatsApp und Android eine `.zip` als Archiv behandeln:** Man kann sie dann nur entpacken, aber nicht als Datei speichern. Der Inhalt ist weiterhin eine ZIP, nur die Endung ist anders. Der Import-Dialog filtert nicht nach Endung (Android-Dateiauswahl zeigt sonst unbekannte Endungen nicht zuverlässig), geprüft wird der Inhalt. Alte `.zip`-Dateien aus V0.6.0 lassen sich weiter importieren. Backups bleiben `.zip`.
- **Android-Teilen-Menü (V0.6.2):** Das Share-Plugin leitet den Dateityp aus der Endung ab (`MimeTypeMap`). Eine unbekannte Endung wie `.wunsch` ergibt `*/*`, und WhatsApp reicht dann nur den Begleittext weiter, nicht die Datei. Deshalb heißt die Datei im Teilen-Menü der Android-App `….wunsch.json` (Typ `application/json`, Inhalt bleibt eine ZIP). Zusätzlich gibt es "Als Datei speichern": schreibt `Dokumente/Wunschliste/….wunsch`, die man in WhatsApp über Büroklammer → Dokument anhängt. Sauberer wäre ein eigenes Android-Plugin mit festem Typ `application/octet-stream`, das später auch "Öffnen mit Wunschliste" kann (V0.7). Im Browser/iPhone bleibt es bei `.wunsch`.
- **Teilen-Fenster** (`ShareSheet`, erreichbar über das Teilen-Symbol auf "Wünsche" und in jeder Liste): Name des Absenders (Pflicht, wird gemerkt, so steht er beim Empfänger), Listenauswahl, Vorschau mit Zahlen (sichtbar, unauffällig, Notizen), ungefähre Dateigröße. Darunter einklappbar "Erweiterte Einstellungen".
- **Standard:** Preise an, Bilder an, Datum der Liste an, Notizen aus, Gekauftes unauffällig. In den erweiterten Einstellungen schaltbar: Preise, Bilder, Notizen, Datum, und "Gekaufte Artikel" (Unauffällig / Nur gekauft / Ohne).
- **Was nie mitgeht:** Geschenkideen für andere und der Papierkorb. Die Art (`kind`) geht mit, wird beim Empfänger aber nicht angezeigt. Der Absender bekommt eine zufällige `shareId` (in den UI-Einstellungen). Nach einer Neuinstallation ist sie neu, dann legt ein erneuter Import ein zweites Paket an statt das alte zu ersetzen.
- **Import** (Tab "Erhalten" → "Import", Dateiauswahl, `useReceive`): Die Datei wird streng gelesen. Prüfsummen müssen stimmen, alle Felder werden bereinigt (nur http/https-Links, Zahlen in Grenzen, Bild-IDs nach festem Muster, Bilder höchstens 6 MB, höchstens 100 Listen und 5000 Artikel). Danach kommt eine Rückfrage mit Zahlen, bei einem bekannten Absender mit "Ersetzt: …" und "Neu: …".
- **Erneuter Import:** Gleicher Absender (`shareId`) bedeutet gleiches Paket. Listen mit gleicher ID werden ersetzt, andere Listen des Absenders bleiben, die Verknüpfung mit einer Person bleibt erhalten. Ein neues Paket wird automatisch mit der Person verknüpft, deren Name dem Absender entspricht (ohne Groß-/Kleinschreibung).
- **Erhaltene Listen:** "Verknüpfen mit" (Person oder keine), Listenwahl, Datum-Chips mit Abstand, Bilder, Preissumme, "Schon Vorhandenes anzeigen" für unauffällig Mitgesendetes. Über das Plus-Symbol wird ein Wunsch als Geschenkidee für die verknüpfte Person (sonst nach Auswahl) übernommen, mit "Rückgängig".
- **Am echten Gerät testen:** (1) Android: Teilen-Menü öffnet sich, WhatsApp bekommt die Datei, Größe mit vielen Bildern; (2) Empfang auf dem iPhone: Datei in WhatsApp antippen, "In Dateien sichern", in der App unter Erhalten → Import wählen; (3) Discord: Datei ab 10 MB wird abgelehnt, Bilder ausschalten hilft; (4) Datei an sich selbst schicken, importieren, ändern, erneut teilen: ersetzt statt doppelt.

### Erhalten-Bildschirm und "Öffnen mit" (V0.6.3)

- **Detailseite einer erhaltenen Liste:** Oben die Verknüpfungskarte (Person mit Avatar, "Ideen für …", Zahl der Ideen und übernommenen Wünsche; Tippen öffnet die Person, "Ändern" öffnet die Auswahl, ohne Verknüpfung steht dort "Verknüpfen"). Darunter die Listen als Kacheln (Name, Datum mit Abstand, Summe, Fortschrittsbalken "x übernommen"), Tippen auf eine Kachel filtert die Wünsche, nochmaliges Tippen hebt den Filter auf. Dann "Alle übernehmen (n)" für die gewählte Auswahl (mit Rückfrage und "Rückgängig"), darunter die Wünsche mit Plus für einzelne.
- **"Übernommen" wird abgeleitet, nicht gespeichert:** Ein Wunsch gilt als übernommen, wenn bei der verknüpften Person eine Idee mit gleichem Link oder gleichem Namen existiert (`src/lib/received.ts`, `findTaken`). Löscht man die Idee, ist der Wunsch wieder offen. Dafür ist keine Datenformat-Änderung nötig. Der Chip "Übernommen · Ideen für …" führt zur Person.
- **Übernehmen ohne Verknüpfung:** Es kommt die Personenauswahl, die Liste wird dabei mit dieser Person verknüpft ("Übernehmen und verknüpfen"). Ideen landen in der Standardliste der Person.
- **Auf der Personenseite:** Abschnitt "Erhaltene Listen" mit einer Karte pro verknüpftem Paket, die zur erhaltenen Liste führt.
- **Öffnen mit (Android):** `AndroidManifest.xml` hat einen Intent-Filter für `VIEW` mit `content:`/`file:` und den Typen `application/json`, `application/octet-stream`, `application/x-wunschliste`. `IncomingFile` (`src/components/IncomingFile.tsx`) hört auf `appUrlOpen` und auf die Start-URL, liest die Datei über `Capacitor.convertFileSrc` (Rückfall `Filesystem.readFile`) und startet den normalen Import mit Rückfrage. Nur "Öffnen mit" funktioniert, nicht "Teilen an" (das Plugin liefert die Datei dabei nicht). Nachteil: Wegen des Typs `application/json` taucht die App auch bei echten JSON-Dateien in der Auswahl auf. Ungetestet auf Gerät.
