# Security-Log-Inventar

Stand: 2026-07-14

## 1. Zusammenfassung

- Gefundene und inventarisierte Ausgabe-/Hinweisstellen gesamt: **59**
- Davon konkrete `console.*`- und `alert(...)`-Stellen im Code: **51**
- Zusaetzliche UI-/Status-/Uebergangshinweise: **8**
- Im Auftrag 02 geaendert: **1**
- Keine Datenmigration, keine Kundendaten-Aenderung und keine erneute Veroeffentlichung durchgefuehrt.

## 2. Kategorien

| Kategorie | Bedeutung | Anzahl |
|---|---:|---:|
| A | Muss sofort entfernt werden | 0 |
| B | Muss neutralisiert werden | 1 |
| C | Nur im Entwicklungsmodus zulaessig | 10 |
| D | Im Produktivbetrieb zulaessig | 24 |
| E | Kein Logging, sondern Benutzerhinweis/UI-Status | 24 |

Hinweis: Die Kategorie B-Stelle wurde in diesem Auftrag neutralisiert. Verbleibende Kategorie-B-Logs wurden nicht gefunden.

## 3. Inventartabelle

| Datei | Stelle/Funktion | Typ | Inhalt/Zweck | Kategorie | Risiko | Empfehlung | Geaendert |
|---|---|---|---|---|---|---|---|
| `customer-portal/admin.js` | ca. 145 `prepareDemoCustomers` | `console.warn` | Demo-Snapshot konnte nicht erzeugt werden, nur Fehlermeldung | D | niedrig | Behalten oder spaeter zentral loggern | nein |
| `customer-portal/admin.js` | ca. 156 `bootstrapCustomers` | `console.warn` | Lokale Daten defekt, Fallback auf Demo | D | niedrig | Behalten, da Recovery-relevant | nein |
| `customer-portal/admin.js` | ca. 173 `seedDemoExamples` | `alert` | Beispieldaten nicht geladen | E | niedrig | Spaeter durch UI-Toast ersetzen | nein |
| `customer-portal/admin.js` | ca. 310 `normalizeCustomerData` | `console.warn` | Veroeffentlichungsvergleich fehlgeschlagen | D | niedrig | Monitoring-relevant, zentral loggern | nein |
| `customer-portal/admin.js` | ca. 316 `normalizeCustomerData` | `console.warn` | CRM-Normalisierung fehlgeschlagen | D | niedrig | Behalten; aktueller const-Fehler ist behoben | nein |
| `customer-portal/admin.js` | ca. 323 `normalizeCustomerData` | `console.warn` | Buchungsnormalisierung fehlgeschlagen | D | niedrig | Behalten, keine Rohdaten | nein |
| `customer-portal/admin.js` | ca. 355 `normalizeCustomersMap` | `console.warn` | Kunde uebersprungen, nur Fehlermeldung | D | niedrig | Behalten oder in Import-Status spiegeln | nein |
| `customer-portal/admin.js` | ca. 405 `loadFirebaseCustomers` | `console.warn` | CRM aus Firebase konnte nicht geladen werden | D | niedrig | Behalten, keine Rohdaten | nein |
| `customer-portal/admin.js` | ca. 421 `loadFirebaseCustomers` | `console.warn` | Buchungen aus Firebase konnten nicht geladen werden | D | niedrig | Behalten, keine Rohdaten | nein |
| `customer-portal/admin.js` | ca. 441 `saveDraftToFirebase` | `console.warn` | CRM-Speicherung in Firestore fehlgeschlagen | D | niedrig | Monitoring-relevant | nein |
| `customer-portal/admin.js` | ca. 1493 `saveBookingFromModal` | `console.warn` | Buchungs-Speicherung in Firebase fehlgeschlagen | D | niedrig | Monitoring-relevant | nein |
| `customer-portal/admin.js` | ca. 1888 `handleDocumentUpload` | `console.error` | Upload fehlgeschlagen | B -> D | mittel vor Aenderung: Objektargument in Konsole | Objektargument durch neutralen Text mit Fehlercode ersetzen | ja |
| `customer-portal/admin.js` | ca. 1909 `copyText` | `alert` | WhatsApp-Text fehlt | E | niedrig | Spaeter UI-Toast | nein |
| `customer-portal/admin.js` | ca. 2103 `safeRender` | `console.error` | Render-Funktion fehlgeschlagen | D | niedrig | Fuer Monitoring behalten | nein |
| `customer-portal/admin.js` | ca. 2411 `restoreLastPublished` | `alert` | Keine Live-Version vorhanden | E | niedrig | Benutzerhinweis ok | nein |
| `customer-portal/admin.js` | ca. 2429 `restoreLastPublished` | `alert` | Wiederherstellung fehlgeschlagen | E | mittel: technischer Fehlertext im UI | Spaeter neutralen Fehlertext + Details nur im Dev-Modus | nein |
| `customer-portal/admin.js` | ca. 2739 `confirmSaveTemplate` | `alert` | Vorlagentitel fehlt | E | niedrig | Benutzerhinweis ok | nein |
| `customer-portal/admin.js` | ca. 2803 `confirmNewTripFromTemplate` | `alert` | Kundenname/Reise fehlt | E | niedrig | Benutzerhinweis ok | nein |
| `customer-portal/admin.js` | ca. 2854 `confirmInsertTemplate` | `alert` | Vorlage fehlt | E | niedrig | Benutzerhinweis ok | nein |
| `customer-portal/admin.js` | ca. 2916 `importTemplatesJson` | `alert` | JSON fehlt | E | niedrig | Benutzerhinweis ok | nein |
| `customer-portal/admin.js` | ca. 2927 `importTemplatesJson` | `alert` | Import fehlgeschlagen | E | niedrig bis mittel | Spaeter neutralen Fehlertext | nein |
| `customer-portal/admin.js` | ca. 3182 `importButton` | `alert` | JSON konnte nicht geladen werden | E | niedrig | Benutzerhinweis ok | nein |
| `customer-portal/admin.js` | ca. 3212 Init | `console.error` | Admin-Initialisierung fehlgeschlagen | D | niedrig | Monitoring-relevant | nein |
| `customer-portal/admin.js` | ca. 3217 Recovery | `console.error` | Wiederherstellung fehlgeschlagen | D | niedrig | Monitoring-relevant | nein |
| `customer-portal/customer-portal.js` | ca. 33 `readLocalCustomer` | `console.warn` | Gespeicherte Portaldaten nicht ladbar | D | niedrig | Behalten, keine Rohdaten | nein |
| `customer-portal/customer-portal.js` | ca. 52 `fetchCustomer` | `console.warn` | Firebase nicht erreichbar, lokale Sicherung | D | niedrig | Behalten, keine Rohdaten | nein |
| `customer-portal/customer-portal.js` | ca. 882 Wetter | `console.warn` | Open-Meteo nicht verfuegbar | D | niedrig | Behalten, da externe Abhaengigkeit | nein |
| `customer-portal/customer-portal.js` | ca. 1078 Kalender | `alert` | Kalenderdatei konnte nicht erstellt werden | E | niedrig | Benutzerhinweis ok | nein |
| `customer-portal/customer-portal.js` | ca. 1087 Kalender | `alert` | Kalenderdatei konnte nicht erstellt werden | E | niedrig | Benutzerhinweis ok | nein |
| `customer-portal/customer-portal.js` | ca. 1110 Dokument-Platzhalter | `alert` | Dokument-Platzhalter fuer Schritt 1 | E | niedrig | Spaeter echte Dokumentaktion oder UI-Toast | nein |
| `customer-portal/customer-portal.js` | ca. 1124 Aktion `confirm` | `alert` | Bestaetigung spaeter angebunden | E | niedrig | Platzhalter vor Produktion ersetzen | nein |
| `customer-portal/customer-portal.js` | ca. 1126 Aktion `payment` | `alert` | Zahlungsfunktion spaeter angebunden | E | niedrig | Platzhalter vor Produktion ersetzen | nein |
| `customer-portal/customer-portal.js` | ca. 1127 Aktion `pdf` | `alert` | PDF-Erstellung spaeter angebunden | E | niedrig | Platzhalter vor Produktion ersetzen | nein |
| `customer-portal/firebase-service.js` | ca. 62 `initInternal` | `console.log` | Firebase-Konfiguration geladen | C | niedrig | In Produktion deaktivieren | nein |
| `customer-portal/firebase-service.js` | ca. 84 `initInternal` | `console.log` | Firebase initialisiert | C | niedrig | In Produktion deaktivieren | nein |
| `customer-portal/firebase-service.js` | ca. 87 `initInternal` | `console.log` | Benutzer angemeldet | C | niedrig bis mittel: Zugriffsvorgang | In Produktion deaktivieren oder Audit ohne Konsole | nein |
| `customer-portal/firebase-service.js` | ca. 93 `initInternal` | `console.error` | Firebase-Initialisierung fehlgeschlagen, Code + Meldung | D | niedrig | Monitoring-relevant | nein |
| `customer-portal/firebase-service.js` | ca. 94 `initInternal` | `console.warn` | Firebase nicht erreichbar | D | niedrig | Behalten oder zentral loggern | nein |
| `customer-portal/firebase-service.js` | ca. 240 `loadPublishedCustomer` | `console.log` | Veroeffentlichte Daten geladen/nicht gefunden | C | niedrig | In Produktion deaktivieren | nein |
| `customer-portal/firebase-service.js` | ca. 250 `saveDraftCustomer` | `console.log` | Entwurf wird gespeichert | C | niedrig | In Produktion deaktivieren | nein |
| `customer-portal/firebase-service.js` | ca. 260 `saveDraftCustomer` | `console.warn` | CRM-Speicherung fehlgeschlagen | D | niedrig | Monitoring-relevant | nein |
| `customer-portal/firebase-service.js` | ca. 261 `saveDraftCustomer` | `console.warn` | Buchungs-Speicherung fehlgeschlagen | D | niedrig | Monitoring-relevant | nein |
| `customer-portal/firebase-service.js` | ca. 305 `publishCustomer` | `console.log` | Veroeffentlichung wird gespeichert | C | niedrig | In Produktion deaktivieren | nein |
| `customer-portal/firebase-service.js` | ca. 354 `deleteCustomer` | `console.warn` | CRM-Loeschung fehlgeschlagen | D | niedrig | Monitoring-relevant | nein |
| `customer-portal/firebase-service.js` | ca. 419 `uploadCustomerDocument` | `console.log` | Upload vorbereitet | C | niedrig | In Produktion deaktivieren | nein |
| `customer-portal/firebase-service.js` | ca. 430 `uploadCustomerDocument` | `console.log` | Upload gestartet | C | niedrig | In Produktion deaktivieren | nein |
| `customer-portal/firebase-service.js` | ca. 433 `uploadCustomerDocument` | `console.log` | Upload-Fortschritt in Prozent | C | niedrig | UI-Status statt Konsole | nein |
| `customer-portal/firebase-service.js` | ca. 436 `uploadCustomerDocument` | `console.error` | Upload fehlgeschlagen, Code + Meldung | D | niedrig | Monitoring-relevant | nein |
| `customer-portal/firebase-service.js` | ca. 439 `uploadCustomerDocument` | `console.log` | Upload abgeschlossen | C | niedrig | In Produktion deaktivieren | nein |
| `customer-portal/firebase-service.js` | ca. 789 `saveCustomerBookings` | `console.warn` | Einzelne Buchung konnte nicht gespeichert werden | D | niedrig | Monitoring-relevant | nein |
| `customer-portal/template-library.js` | ca. 432 `loadLocalTemplates` | `console.warn` | Lokale Vorlagen konnten nicht geladen werden | D | niedrig | Behalten, keine Rohdaten | nein |
| `customer-portal/admin.html` | Login-Text | UI-Hinweis | Uebergangsloesung, spaeter Firebase Auth | E | niedrig | Vor Produktion ueberarbeiten | nein |
| `customer-portal/admin.html` | Login-Text | UI-Hinweis | Beispiele laden fuer CRM/Buchungen/Vorlagen | E | niedrig | In Admin ok, in Produktion optional verstecken | nein |
| `customer-portal/admin.html` | CRM/Buchungen/Templates | UI-Status | `CRM bereit`, `Buchungen bereit`, `Vorlagen werden geladen` | E | niedrig | Behalten als UI-Status | nein |
| `customer-portal/admin.html` | `firebaseStatus` | UI-Status | Daten werden geladen | E | niedrig | Behalten | nein |
| `customer-portal/admin.html` | Sprache | UI-Hinweis | Mehrsprachige Portale vorbereitet | E | niedrig | Behalten oder in Help-Text verschieben | nein |
| `customer-portal/admin.html` | Erinnerungen | UI-Hinweis | Noch ohne Push-Benachrichtigungen | E | niedrig | Vor Produktion ersetzen | nein |
| `customer-portal/admin.html` | Export/Import | UI-Hinweis | localStorage/Passwort als Uebergangsloesung | E | mittel: nennt Passwort im UI | Nur intern zulassen, vor Produktion entfernen | nein |
| `customer-portal/customer-portal.js` | `renderAdminHint`/Status | UI-Hinweis | Datenquelle `Firestore publishedData`, localStorage oder Demo | E | mittel: technische Datenquelle sichtbar in Admin-Vorschau | Nur Admin-Modus, vor Produktion pruefen | nein |

## 4. Im Auftrag vorgenommene Aenderungen

1. `customer-portal/admin.js`: `console.error("[ACT Admin] Upload fehlgeschlagen:", { code, message })` wurde durch eine neutrale Textmeldung ersetzt:
   - vorher: Objektargument in der Konsole
   - nachher: `[ACT Admin] Upload fehlgeschlagen: <Fehlercode> - <Kurzmeldung>`

Keine weiteren Codeaenderungen wurden vorgenommen.

## 5. Verbleibende Logs

Verbleibend sind 34 `console.*`-Stellen:

- Admin-Warnungen und -Fehler mit neutralen Kurzmeldungen.
- Portal-Warnungen fuer lokale Sicherung, Firebase-Fallback und Wetterdienst.
- Firebase-Statuslogs fuer Initialisierung, Ladevorgaenge, Speichern und Upload-Fortschritt.
- Template-Warnung fuer defekte lokale Vorlagen.

Verbleibend sind 16 `alert(...)`-Benutzerhinweise:

- Pflichtfeldhinweise
- Import-/JSON-Hinweise
- Platzhalter fuer noch nicht angebundene Portalaktionen
- Kalender-/Wiederherstellungsfehler

## 6. Verbleibende problematische Stellen

- **Kategorie C:** Firebase-Statuslogs (`Konfiguration geladen`, `Firebase initialisiert`, `Benutzer angemeldet`, Upload-Schritte) sollten in Produktion deaktiviert werden.
- **Kategorie E mit mittlerem Risiko:** Admin-UI nennt im Sicherheitshinweis weiterhin das Uebergangspasswort `ACT2026`. Das ist kein Logging, sollte aber vor Produktivbetrieb entfernt oder nur in geschuetztem Dev-/Admin-Kontext angezeigt werden.
- **Kategorie E mit mittlerem Risiko:** Admin-Vorschau zeigt technische Datenquellen wie `Firestore publishedData` oder localStorage. Das ist nur fuer Admin-Modus akzeptabel.
- **Kategorie E:** Portal-Alerts fuer Bestaetigung, Zahlung und PDF sind Platzhalter und sollten vor Produktivbetrieb durch echte Funktionen oder saubere deaktivierte Zustandsanzeigen ersetzt werden.

## 7. Zentrales Logger-Modul

Empfehlung fuer ein spaeteres Modul `logger.js`:

- `logger.debug(scope, message)` nur bei `ACT_DEBUG === true`
- `logger.info(scope, message)` nur in Entwicklung
- `logger.warn(scope, code, message)` fuer neutrale Warnungen
- `logger.error(scope, code, message)` fuer Monitoring-faehige Fehler
- Keine Objektargumente an `console.*`
- Keine Rohdatenfelder wie `customer`, `crm`, `booking`, `documents`, `draftData`, `publishedData`, `downloadUrl`, `token`, `uid`
- Automatische Maskierung fuer IDs, URLs, Telefonnummern, E-Mail-Adressen und Pfade
- Optionaler Anschluss an Monitoring statt Browser-Konsole

## 8. Produktion: vollstaendig deaktivieren

In Produktion sollten deaktiviert werden:

- alle `console.log`-Statusmeldungen in `firebase-service.js`
- Firebase-Initialisierungsstatus
- Lade-/Speicherstatus fuer Entwurf und Veroeffentlichung
- Upload-Fortschrittslogs
- Admin-Debug-/Diagnosehinweise, sofern sie nicht ins Monitoring gehen

## 9. Fuer Monitoring behalten

Als neutrale Monitoring-Ereignisse sollten erhalten bleiben:

- Firebase-Initialisierung fehlgeschlagen
- Firebase nicht erreichbar
- Entwurf konnte nicht gespeichert werden
- CRM-/Buchungs-Speicherung fehlgeschlagen
- Upload fehlgeschlagen
- Admin-Renderfehler
- Admin-Initialisierung/Wiederherstellung fehlgeschlagen
- Portal-Fallback auf lokale Sicherung
- Wetterdienst nicht verfuegbar

Diese Ereignisse sollten mit Fehlercode, Funktionsbereich und neutraler Kurzbeschreibung erfasst werden, nicht mit Rohdaten.

## 10. Pruefungen

- `node --check customer-portal/admin.js`: erfolgreich
- `node --check customer-portal/customer-portal.js`: erfolgreich
- `node --check customer-portal/firebase-service.js`: erfolgreich
- `node --check customer-portal/template-library.js`: erfolgreich
- Suche nach sensiblen Rohdatenlogs: keine Kategorie-A-Funde
- Suche nach Objektargumenten in `console.*`: die in Auftrag 02 gefundene Admin-Upload-Stelle wurde neutralisiert
- Suche nach Passwort-/Token-/CRM-/Booking-/Document-/`draftData`-/`publishedData`-Logs: keine Rohdatenlogs gefunden; einige neutrale Bereichsnamen bleiben dokumentiert
- Git-Diff geprueft

## 11. Bestaetigung

- Keine neue Authentifizierung eingefuehrt.
- Keine Firebase Rules erstellt.
- Keine Datenmigration durchgefuehrt.
- Keine Architektur- oder Datenmodell-Aenderung durchgefuehrt.
- Keine Funktionen entfernt.
- Keine Kundendaten geaendert.
- Keine veroeffentlichte Version geaendert.
- Keine erneute Veroeffentlichung ausgeloest.
