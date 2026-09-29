# Haushaltsbuch

Eine mobile App (Expo / React Native) für den Haushalt: Einnahmen und Ausgaben erfassen, das frei verfügbare Einkommen im Blick behalten, Kosten mit dem Partner teilen und das Nettogehalt genau berechnen.

## Funktionen

### Benutzerkonten
- Beim Öffnen der App meldet sich jede Person mit **Benutzername und Passwort** an. Ohne Anmeldung ist nichts sichtbar.
- Beim ersten Start legst du dein eigenes Konto an. Weitere Personen fügst du unter **Haushalt → Personen** hinzu, danach richten sie auf dem Anmeldebildschirm über „Konto einrichten“ ihr eigenes Passwort ein.
- „Angemeldet bleiben“, Abmelden, Passwort ändern. Hat jemand sein Passwort vergessen, kann eine andere Person des Haushalts das Konto zurücksetzen.
- Passwörter werden nie im Klartext gespeichert, sondern nur als Hash (PBKDF2-SHA256 mit 10.000 Runden und zufälligem Salt).

### Übersicht
- **Frei verfügbares Einkommen:** Einkommen − Fixkosten − Sparziel. Dazu, was davon noch übrig ist, und ein Tagesbudget für den Rest des Monats.
- **Schnell erfassen:** Betrag eintippen und auf einen Laden tippen (Lidl, Aldi, Rewe, dm …). Die Buchung wird mit passender Kategorie gespeichert und lässt sich rückgängig machen.
- **Empfehlungen:** Hochrechnung bis Monatsende, Warnung bei hohen Fixkosten (> 60 %) oder vielen „Wünschen“ (50/30/20-Regel), Kategorien, die stark über dem Vormonat liegen, häufige Einkäufe im selben Laden, Sparquote.
- Ausgaben und Einnahmen nach Kategorie.

### Buchungen
- Alle Buchungen und Fixposten des Monats, nach Tag gruppiert, mit Suche.
- Tippen zum Bearbeiten, lange drücken zum Löschen.
- Im Formular: Laden-Buttons, Kategorie, Datum, Notiz, **„Jeden Monat wiederholen“** (Fixposten), **Bezahlt von** und **Aufteilen** (gleichmäßig oder eigene Beträge).

### Vergleich
- Balkendiagramm Einnahmen/Ausgaben über 6 oder 12 Monate.
- Zwei beliebige Monate nebeneinander: Einnahmen, Fixkosten, variable Ausgaben, Rest und jede Kategorie mit Differenz.

### Brutto-Netto-Rechner (Stand 2026)
- Nach dem amtlichen Programmablaufplan 2026: Lohnsteuer (Steuerklassen I–VI), Solidaritätszuschlag, Kirchensteuer.
- Berücksichtigt Bundesland (Kirchensteuer 8 %/9 %, Pflegeversicherung Sachsen), Geburtsjahr (Kinderlosenzuschlag ab 23, Altersentlastungsbetrag ab 64), Kinder und Kinderfreibeträge, gesetzliche oder private Krankenversicherung, Zusatzbeitrag, Renten- und Arbeitslosenversicherungspflicht, Freibetrag, Minijob und Midijob.
- Ergebnis pro Monat oder Jahr, inklusive Arbeitgeberkosten. Mit einem Tipp wird das Netto als monatliches Einkommen übernommen.

### Haushalt
- Mehrere Personen. Die Ansicht lässt sich zwischen „Haushalt“ und einzelnen Personen umschalten.
- **Ausgleich:** wer wem aus geteilten Ausgaben wie viel schuldet, mit „Als bezahlt markieren“.
- **Zusammenführen:** Zwei Handys tauschen einen Code aus, dann werden die Daten beider zusammengelegt.
- Fixkosten und Einkommen verwalten, Sparziel, Laden-Buttons anpassen (hinzufügen, sortieren, entfernen), CSV-Export für Excel.

Alle Daten bleiben lokal auf dem Gerät (AsyncStorage). Ein Konto oder Server ist nicht nötig.

## So öffnest du die App

Du brauchst einmalig einen Computer (Windows oder Mac) und dein Handy im **selben WLAN**.

**1. Programme auf dem Computer installieren (einmalig)**
- **Node.js** (LTS-Version) von https://nodejs.org herunterladen und installieren.
- **Git** von https://git-scm.com installieren (auf dem Mac ist es meist schon da).

**2. App aufs Handy (einmalig)**
- Im App Store bzw. Google Play Store die kostenlose App **„Expo Go“** installieren.

**3. Projekt herunterladen (einmalig)**

Öffne auf dem Computer die *Eingabeaufforderung* (Windows: Start → „cmd“) bzw. das *Terminal* (Mac) und tippe:

```bash
git clone https://github.com/4yrgc5dm9j-design/Fabian-Rosenbohm.git
cd Fabian-Rosenbohm
git checkout claude/app-development-fg5m8v
npm install
```

**4. App starten (jedes Mal)**

```bash
cd Fabian-Rosenbohm
npx expo start
```

Im Fenster erscheint ein **QR-Code**.
- **iPhone:** Mit der normalen Kamera-App den QR-Code scannen und auf „In Expo Go öffnen“ tippen.
- **Android:** Expo Go öffnen, auf „Scan QR code“ tippen und den Code scannen.

Beim ersten Öffnen erscheint „Willkommen!“. Dort legst du dein Benutzerkonto an.

**Probleme?**
- *Handy findet den Computer nicht:* `npx expo start --tunnel` verwenden (funktioniert auch ohne gleiches WLAN).
- *Im Browser öffnen:* Nach `npx expo start` die Taste `w` drücken.
- *Neueste Version holen:* `git pull` und dann `npm install` ausführen.

Das Terminalfenster muss geöffnet bleiben, solange du die App über Expo Go benutzt. Für eine eigenständige App ohne Computer (App-Store-Version) wird sie mit EAS Build gebaut (`npx eas-cli build`, kostenloses Expo-Konto nötig).

## Kostenlos als Web-App aufs iPhone

Die App läuft auch im Browser und lässt sich auf dem iPhone wie eine normale App auf den Home-Bildschirm legen: mit eigenem Icon, im Vollbild und ohne Kosten. GitHub baut und veröffentlicht sie bei jeder Änderung automatisch (`.github/workflows/pages.yml`).

**Einmalig einrichten (auf github.com, am Computer oder im Handy-Browser):**
1. Im Repository **Settings → General** ganz unten bei „Danger Zone“ auf **Change visibility → Make public** klicken. GitHub Pages ist nur für öffentliche Repositories kostenlos. Sichtbar wird dadurch nur der Programmcode, deine Buchungen liegen ausschließlich auf deinem Gerät.
2. **Settings → Pages**: Bei „Source“ **GitHub Actions** auswählen.
3. **Actions → „Web-App veröffentlichen“ → Run workflow** klicken (oder einfach auf die nächste Änderung warten). Nach ca. 3 Minuten ist die App online unter:
   **https://4yrgc5dm9j-design.github.io/Fabian-Rosenbohm/**

**Auf dem iPhone installieren:**
1. Den Link oben in **Safari** öffnen (nicht in Chrome oder einer anderen App).
2. Unten auf das **Teilen-Symbol** (Quadrat mit Pfeil nach oben) tippen.
3. **„Zum Home-Bildschirm“** wählen und auf **Hinzufügen** tippen.
4. Die App über das neue Icon „Haushalt“ öffnen und das Benutzerkonto anlegen.

Jede Person installiert die App auf ihrem eigenen iPhone. Die Daten bleiben auf dem jeweiligen Gerät. Zum Abgleichen dient „Haushalt → Haushalt zusammenführen“.

**Wichtig:** Die Daten liegen im Speicher von Safari. Wenn du in den iPhone-Einstellungen unter Safari „Verlauf und Websitedaten löschen“ wählst, sind sie weg. Sichere deshalb ab und zu über „Haushalt → Meinen Code teilen“, zum Beispiel per Nachricht an dich selbst oder in die Notizen-App.

Lokal bauen: `npm run build:web` (Ergebnis in `dist/`).

## Als echte iOS-App installieren (kostenpflichtig)

Die App wird mit **EAS Build** in der Cloud gebaut. Ein Mac ist nicht nötig.

**Voraussetzungen**
- Ein kostenloses **Expo-Konto**: https://expo.dev/signup
- Eine Mitgliedschaft im **Apple Developer Program** (99 € pro Jahr): https://developer.apple.com/programs/enroll/. Die Freischaltung kann 1–2 Tage dauern.

**Bauen und auf TestFlight hochladen** (im Projektordner, auf dem Computer oder in GitHub Codespaces):

```bash
npx eas-cli@latest login              # mit dem Expo-Konto anmelden
npx eas-cli@latest build -p ios       # baut die App (ca. 15–30 Min.), fragt einmalig nach dem Apple-Login
npx eas-cli@latest submit -p ios      # lädt die fertige App zu App Store Connect / TestFlight hoch
```

Beim ersten `build` fragt EAS nach deinem Apple-Konto und legt Zertifikate und Profile automatisch an. Einfach die vorgeschlagenen Antworten mit Enter bestätigen.

**Aufs iPhone holen**
1. Auf dem iPhone die App **TestFlight** aus dem App Store installieren.
2. In https://appstoreconnect.apple.com unter *Meine Apps → Haushaltsbuch → TestFlight* dich selbst (und z. B. deine Partnerin oder deinen Partner) als Tester eintragen.
3. Die Einladung per E-Mail in TestFlight öffnen und auf **Installieren** tippen. Die App erscheint wie jede andere auf dem Home-Bildschirm.

Soll die App öffentlich im App Store erscheinen, reichst du sie in App Store Connect zur Prüfung ein (Screenshots, Beschreibung und Datenschutzangaben nötig).

**Updates:** Nach Änderungen am Code einfach wieder `build` und `submit` ausführen. Die Build-Nummer zählt automatisch hoch.

Die App-Kennung ist `de.rosenbohm.haushaltsbuch` (in `app.json`). Sie muss weltweit eindeutig sein und lässt sich nach der ersten Veröffentlichung nicht mehr ändern.

## Entwicklung

```bash
npm test           # Unit-Tests (Rechenlogik, Netto-Rechner, Konten, Zusammenführen, Empfehlungen)
npm run typecheck  # TypeScript prüfen
```

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `app/(tabs)/index.tsx` | Übersicht mit frei verfügbarem Einkommen, Schnell-Erfassung, Empfehlungen |
| `app/(tabs)/buchungen.tsx` | Buchungsliste mit Suche |
| `app/(tabs)/vergleich.tsx` | Monatsvergleich |
| `app/(tabs)/netto.tsx` | Brutto-Netto-Rechner |
| `app/(tabs)/haushalt.tsx` | Personen, Ausgleich, Budget, Läden, Zusammenführen |
| `app/buchung.tsx` | Formular für Buchungen und Fixposten |
| `app/fixposten.tsx` | Fixkosten & Einkommen |
| `lib/budget.ts` | Rechenlogik: Fixposten, Aufteilung, Salden, Auswertungen |
| `lib/netto.ts` | Lohnsteuer- und Sozialversicherungsberechnung 2026 |
| `lib/insights.ts` | Empfehlungen |
| `lib/household.ts` | Datenmodell, Migration, Zusammenführen, CSV |
| `lib/store.tsx` | Zustand, Speicherung und Anmeldung |
| `lib/auth.ts` | Passwort-Hashing und Kontoprüfung |
| `app/anmelden.tsx` | Anmelde- und Registrierungsbildschirm |

Die Werte für 2026 (Tarif, Beitragsbemessungsgrenzen, Beitragssätze) stehen gesammelt in `PARAMS_2026` bzw. `incomeTax2026` in `lib/netto.ts`.
