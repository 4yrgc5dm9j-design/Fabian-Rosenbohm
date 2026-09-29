# Haushaltsbuch

Eine mobile App (Expo / React Native) für den Haushalt: Einnahmen und Ausgaben erfassen, das frei verfügbare Einkommen im Blick behalten, Kosten mit dem Partner teilen und das Nettogehalt genau berechnen.

## Funktionen

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

## Starten

```bash
npm install
npx expo start
```

Dann den QR-Code mit der App **Expo Go** (iOS/Android) scannen. Mit `w` öffnest du die App im Browser.

## Entwicklung

```bash
npm test           # Unit-Tests (Rechenlogik, Netto-Rechner, Zusammenführen, Empfehlungen)
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
| `lib/store.tsx` | Zustand und Speicherung |

Die Werte für 2026 (Tarif, Beitragsbemessungsgrenzen, Beitragssätze) stehen gesammelt in `PARAMS_2026` bzw. `incomeTax2026` in `lib/netto.ts`.
