# Schritt 7 – Buchungsmanagement

Alpine Concierge Management System (ACMS) – zentrale Verwaltung von Hotel-, Restaurant-, Aktivitäts- und Transferbuchungen.

## Geänderte / neue Dateien

| Datei | Änderung |
|-------|----------|
| `booking-library.js` | **Neu** – Buchungslogik, Validierung, Export, Portal-Strip, Programm-Sync |
| `admin.html` | Bereich Buchungen, Modal, Navigation |
| `admin.css` | Buchungs-Dashboard, Status, Fristen |
| `admin.js` | Buchungs-UI, Speichern, Filter, Export, Programm-Verknüpfung |
| `firebase-service.js` | Collection `bookings`, Upload, Sync |
| `firebase-database.js` | Buchungs-API |
| `firebase-storage.js` | `uploadBookingDocument` |
| `index.html` | Portal-Bereich Buchungen |
| `customer-portal.js` | Anzeige, Timeline/Kalender-Status |
| `customer-portal.css` | Buchungskarten |
| `BOOKINGS.md` | Diese Dokumentation |

**Unverändert:** Veröffentlichungsworkflow-Grundlogik, CRM, Vorlagen, Wetter.

## Firestore-Collection

```
bookings/{bookingId}
```

Felder entsprechen der Spezifikation (`bookingId`, `customerId`, `programItemId`, `type`, `title`, `provider`, Preise, Status, Dokumente, …).

Zusätzlich im **Entwurf** (`customers/{id}.draftData.bookings[]`) für localStorage-Fallback.

**Live-Version:** nur `visibleForCustomer`-Buchungen ohne interne Felder.

## Funktionsweise

1. Buchungen liegen in `customer.bookings[]`.
2. Admin → **Buchungen**: Dashboard, Filter, Liste, Modal.
3. Speichern → localStorage + Firestore (`saveDraftCustomer` + `saveBookingRecord`).
4. Veröffentlichen → `buildPublishedSnapshot` synchronisiert Programmpunkte und filtert Kundendaten.
5. Kundenportal lädt nur veröffentlichte, freigegebene Buchungen.

## Programmpunkt-Verknüpfung

- **Buchung erstellen** am Programmpunkt (Button) übernimmt Titel, Datum, Uhrzeit, Treffpunkt, Kategorie.
- Dropdown **Zugehöriger Programmpunkt** in der Buchung.
- Bei Speichern: `syncProgramItemFromBooking()` aktualisiert Status, Navigation, Dokumente, `statusDisplay`.
- Im Portal: Kalender, Timeline und Detailkarte zeigen z. B. „Restaurant Bestätigt“.

## Interne Felder (niemals im Portal)

- `internalPrice`, `margin`, `internalNote`
- `providerRef` (Anbieter-Stammdaten-Vorbereitung)
- Nicht freigegebene Buchungen (`visibleForCustomer: false`)
- Archivierte Buchungen

## Kundensichtbare Felder

- `title`, `type`, `date`, `startTime`, `endTime`
- `provider`, `address`, `meetingPoint`, `navigationUrl`
- `customerNote`, `bookingStatus`
- `documents[]` (nur sichtbare mit URL)

## Kundenportal-Anzeige

1. **Bereich Buchungen** – Karten mit Navigation und Dokument-Buttons
2. **Kalender / Timeline / Details** – Buchungsstatus am verknüpften Programmpunkt
3. Nur Daten aus `publishedData` nach Veröffentlichung

## Anbieter-Stammdaten (vorbereitet)

`providerRef: { type, name, reusable: true }` – später als eigenes Modul wiederverwendbar.

## Admin-Funktionen

- Typ-Tabs: Alle, Hotel, Restaurant, Aktivität, Transfer, Sonstiges
- Dashboard: offene Anfragen, Warteliste, Fristen, Zahlungen, Warnungen
- Export: JSON / CSV
- Fristen farblich: grün / orange / rot
- Archivieren statt Löschen

## Test

1. Admin öffnen → **Buchungen**
2. Buchung anlegen, Status setzen, **Sichtbar im Kundenportal: Ja**
3. Mit Programmpunkt verknüpfen oder aus Programmpunkt erstellen
4. Veröffentlichen
5. Kundenportal: Bereich Buchungen + Status in Timeline prüfen
6. Interne Preise/Notizen dürfen nicht sichtbar sein

Hard Refresh: **Strg+F5**
