# Haushaltsbuch

Eine mobile App (Expo / React Native) zum Erfassen von Einnahmen und Ausgaben.

## Funktionen

- **Übersicht:** Saldo, Einnahmen und Ausgaben des gewählten Monats sowie eine Aufschlüsselung nach Kategorie mit Balkendiagramm.
- **Buchungen:** Alle Buchungen des Monats, nach Tag gruppiert. Tippen zum Bearbeiten, lange drücken zum Löschen.
- **Neue Buchung:** Über das ＋ oben rechts. Betrag, Kategorie, Datum und optionale Notiz eingeben.
- Monatswechsel mit den Pfeilen ‹ ›.
- Alle Daten werden lokal auf dem Gerät gespeichert (AsyncStorage). Ein Konto oder Server ist nicht nötig.
- Helles und dunkles Design, je nach Systemeinstellung.

## Starten

```bash
npm install
npx expo start
```

Dann den QR-Code mit der App **Expo Go** (iOS/Android) scannen. Mit `w` öffnest du die App im Browser.

## Entwicklung

```bash
npm test           # Unit-Tests der Rechenlogik (lib/budget.test.ts)
npm run typecheck  # TypeScript prüfen
```

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `app/(tabs)/index.tsx` | Übersicht |
| `app/(tabs)/buchungen.tsx` | Buchungsliste |
| `app/buchung.tsx` | Formular zum Anlegen/Bearbeiten |
| `lib/budget.ts` | Rechenlogik, Kategorien, Formatierung |
| `lib/store.tsx` | Zustand und Speicherung |
| `lib/theme.ts` | Farben für hell/dunkel |

Die Kategorien lassen sich in `lib/budget.ts` anpassen.
