# MASTER_PROJECT_ROADMAP.md

Stand: 14.07.2026  
Projekt: Alpine Concierge Tirol / `AC-Homepage`  
Rolle: Lead Software Architect und technischer Projektleiter  
Grundlage: aktueller Codebestand, `PROJECT_STATUS.md`, `ARCHITECTURE_REVIEW.md`

## 1. Projektziel Version 1.0

### Muss fuer Version 1.0

- **[im Code nachgewiesen]** Oeffentliche Website mit Startseite, Leistungen, Anfrageformular, FAQ, Rechtstexten, SEO-Basis und Mehrsprachigkeit ist vorhanden und muss stabil bleiben.
- **[Empfehlung]** Sichere Admin-Anmeldung mit echten Benutzerkonten, Rollen und Firebase Security Rules ist zwingend.
- **[Empfehlung]** Kundenverwaltung muss Kunden und Reisen getrennt verwalten koennen.
- **[Empfehlung]** Kundenportal muss nur autorisierte/veroeffentlichte Inhalte anzeigen, inklusive sicherem Portal-Link.
- **[im Code nachgewiesen]** Reiseplanung, Programmpunkte, Unterkunft, Dokumente, Buchungen, CRM, Vorlagen und Publishing sind funktional vorbereitet und muessen fuer v1.0 stabilisiert werden.
- **[Empfehlung]** Dokumentupload muss mit Storage Rules, Dateityp-/Groessenpruefung und sicherer Sichtbarkeit produktionsfaehig sein.
- **[Empfehlung]** PDF-Reiseunterlagen, QR-Code zum Portal, Kundenbestaetigung und Aenderungswunsch muessen technisch angebunden sein.
- **[Empfehlung]** WhatsApp und E-Mail duerfen fuer v1.0 weiterhin vorbereitete Deep-Links sein, muessen aber protokolliert werden koennen.
- **[Empfehlung]** Wetter darf ueber Open-Meteo bleiben, muss aber fehlertolerant sein.
- **[Empfehlung]** PWA-Basis mit Manifest, Service Worker, Installierbarkeit und sicherem Caching ist fuer v1.0 erforderlich.
- **[Empfehlung]** iOS-/Android-Vorbereitung bedeutet fuer v1.0: saubere App-Shell, Auth, PWA, Deep-Link- und Push-Konzept; keine native App-Verteilung.

### Soll nach Version 1.0

- **[Empfehlung]** Automatischer E-Mail-Versand ueber Anbieter wie Resend oder Firebase Extension.
- **[Empfehlung]** Anbieter-Stammdaten, Zahlungsintegration, automatisierte Fristen-Erinnerungen.
- **[Empfehlung]** Erweiterte Rollen fuer mehrere Mitarbeiter und Standorte.
- **[Empfehlung]** Vollstaendige Portal-/Admin-Mehrsprachigkeit.
- **[Empfehlung]** Reporting, Kostenkontrolle und Kundenaktivitaetsverlauf.

### Kann spaeter ergaenzt werden

- **[Empfehlung]** KI-Assistenz fuer Vorlagen, CRM-Zusammenfassungen und Reisevorschlaege.
- **[Empfehlung]** Native iOS-/Android-Apps mit Capacitor.
- **[Empfehlung]** Automatischer Import von Anbieterbestaetigungen aus E-Mail.
- **[Empfehlung]** Zahlungsabwicklung im Kundenportal.

### Nicht empfohlen oder derzeit nicht notwendig

- **[Empfehlung]** Vollstaendige Neuentwicklung vor Sicherheitsbereinigung ist nicht empfohlen.
- **[Empfehlung]** Native App vor Auth, Datenmodell v2, PWA und Tests ist nicht empfohlen.
- **[Empfehlung]** Weitere grosse Features vor P0/P1-Sicherheit sind nicht empfohlen.

## 2. Verbindliche Entwicklungsphasen

| Phase | Ziel | Begruendung | Aufwand | Release |
|---|---|---|---|---|
| 0 - Sofortige Sicherheitsmassnahmen | **[Empfehlung]** Offensichtliche Risiken ohne Architekturumbau entfernen. | **[im Code nachgewiesen]** Passwort-Logging und hart codiertes Passwort bestehen. | S | `v0.6.0-security-hotfix` |
| 1 - Authentifizierung und Firebase Security | **[Empfehlung]** Echte Admin-Auth, Rollen, Rules, App Check. | **[aus der Architektur abgeleitet]** Ohne Rules keine echten Kundendaten. | L | `v0.6-security` |
| 2 - Datenmodell Version 2 | **[Empfehlung]** Customer, Trip, Booking, Document, CRM trennen. | **[im Code nachgewiesen]** Aktuell sind Daten redundant und vermischt. | XL | `v0.7-data-model` |
| 3 - Technische Modularisierung | **[Empfehlung]** Admin/Firebase/Portal in Module schneiden. | **[im Code nachgewiesen]** `admin.js` hat 3304 Zeilen. | L | `v0.7-modular-core` |
| 4 - Datenmigration und Stabilisierung | **[Empfehlung]** Bestehende Daten verlustfrei migrieren und pruefen. | **[aus der Architektur abgeleitet]** Migration ist hohes Risiko. | L | `v0.7-migration` |
| 5 - Kundenportal vervollstaendigen | **[Empfehlung]** Portal-Link, Bestaetigung, Aenderungswunsch, stabile Anzeige. | **[im Code nachgewiesen]** Aktionen sind teils Platzhalter. | M | `v0.8-stable-portal` |
| 6 - Buchungsmanagement vervollstaendigen | **[Empfehlung]** Anbieter, Fristen, Zahlungsstatus, Veroeffentlichungsregeln. | **[im Code nachgewiesen]** Buchungen existieren, Anbieter sind vorbereitet. | M | `v0.8-bookings` |
| 7 - Kommunikation, PDF und QR | **[Empfehlung]** PDF, QR, Kommunikationsprotokoll. | **[im Code nachgewiesen]** PDF/QR fehlen technisch. | M | `v0.8-documents` |
| 8 - Tests, Qualitaet und Monitoring | **[Empfehlung]** Smoke-, Browser-, Emulator-, Rules- und Uploadtests. | **[im Code nachgewiesen]** Keine Tests/Build-Konfiguration vorhanden. | L | `v0.9-quality` |
| 9 - PWA | **[Empfehlung]** Manifest, Service Worker, Offline-Fallback, Installierbarkeit. | **[im Code nachgewiesen]** Keine PWA-Dateien vorhanden. | M | `v0.9-pwa` |
| 10 - Native-App-Vorbereitung | **[Empfehlung]** Capacitor-Eignung, Deep Links, Push-Konzept. | **[aus der Architektur abgeleitet]** Native App braucht stabile Web-App. | M | `v0.9-native-ready` |
| 11 - Veroeffentlichung Version 1.0 | **[Empfehlung]** Produktionsfreigabe mit Rollback. | **[aus der Architektur abgeleitet]** Erst nach Security, Tests, PWA. | M | `v1.0-production` |

### Phasendetails

#### Phase 0 - Sofortige Sicherheitsmassnahmen

- Ziel: **[Empfehlung]** Passwort-Logging, sensible Debug-Ausgaben und offensichtliche Client-Risiken reduzieren.
- Arbeitspakete: Passwort-Logs entfernen; Debug-Log-Inventar; Admin-Hinweise aktualisieren; keine Datenmigration.
- Betroffene Dateien: `customer-portal/admin.js`, optional Dokumentation.
- Neu anzulegen: keine Pflichtdatei, optional `SECURITY_NOTES.md`.
- Abhaengigkeiten: keine.
- Risiken: **[Schaetzung]** gering, wenn nur Logs und offensichtliche Debug-Ausgaben entfernt werden.
- Voraussetzungen: aktueller Stand ist gesichert.
- Abnahmekriterien: kein Rohpasswort-Log; Syntaxcheck erfolgreich; Login weiter nutzbar.
- Tests: Admin-Login, Sperren/Entsperren, Node `--check`, Git-Diff pruefen.
- Ergebnis: risikoarmer Security-Hotfix.
- Release: `v0.6.0-security-hotfix`.

#### Phase 1 - Authentifizierung und Firebase Security

- Ziel: **[Empfehlung]** echte Admin-Auth und rollenbasierte Rechte.
- Arbeitspakete: Firebase Auth Provider; Admin-Rollen; Firestore Rules; Storage Rules; App Check; Portal-Token-Konzept.
- Betroffene Dateien: `firebase-config.js`, `firebase-auth.js`, `firebase-service.js`, `admin.js`, neue Rules.
- Neu anzulegen: `firestore.rules`, `storage.rules`, `firebase.json`, `firestore.indexes.json`, `docs/security.md`.
- Abhaengigkeiten: Firebase-Projektzugriff und Admin-Claims.
- Risiken: falsche Rules koennen Zugriff sperren oder Daten oeffnen.
- Aufwand: L.
- Voraussetzungen: Phase 0 abgeschlossen.
- Abnahmekriterien: Admin-Write nur mit Admin-Rolle; Public Read nur fuer freigegebene Portal-Snapshots.
- Tests: Emulator Rules Tests, manuelle Login-Tests, Upload-Tests, Zugriff ohne Rolle blockiert.
- Ergebnis: echte Kundendaten duerfen erst danach pilotiert werden.
- Release: `v0.6-security`.

#### Phase 2 - Datenmodell Version 2

- Ziel: **[Empfehlung]** skalierbares Zielmodell fuer Organisation, Kunden, Reisen, Buchungen, Dokumente, CRM.
- Arbeitspakete: Schemas, IDs, Statuswerte, Beziehungen, Migrationsmapping, Audit-Felder.
- Betroffene Dateien: `admin.js`, `customer-portal.js`, `firebase-service.js`, Fachbibliotheken.
- Neu anzulegen: `schemas/*`, `models/*`, `repositories/*`, `docs/data-model-v2.md`.
- Abhaengigkeiten: Security-Baseline.
- Risiken: Datenverlust, fehlerhafte Zuordnung von Customer zu Trip.
- Aufwand: XL.
- Voraussetzungen: Backup bestehender Firestore- und LocalStorage-Daten.
- Abnahmekriterien: Migration laeuft dry-run ohne Verlust; v1 und v2 koennen verglichen werden.
- Tests: Migrationstests, neue/bestehende Kunden, veroeffentlichte Snapshots.
- Ergebnis: tragfaehiges Datenmodell.
- Release: `v0.7-data-model`.

#### Phase 3 - Technische Modularisierung

- Ziel: **[Empfehlung]** grosse Dateien in wartbare Module zerlegen.
- Arbeitspakete: Core Utilities; Repositories; Admin-Module; Portal-Module; Logger.
- Betroffene Dateien: `admin.js`, `customer-portal.js`, `firebase-service.js`, Libraries.
- Neu anzulegen: `core/`, `repositories/`, `services/`, `admin/`, `portal/`.
- Abhaengigkeiten: Zielstruktur aus Phase 2.
- Risiken: Regressionen in Admin-UI.
- Aufwand: L.
- Voraussetzungen: Smoke-Testliste vorhanden.
- Abnahmekriterien: gleiche Funktionen, kleinere Module, Syntaxcheck, Smoke-Tests erfolgreich.
- Tests: Admin CRUD, Publishing, Portal, Upload, Buchung, CRM.
- Ergebnis: wartbarer Kern.
- Release: `v0.7-modular-core`.

#### Phase 4 - Datenmigration und Stabilisierung

- Ziel: **[Empfehlung]** bestehende Daten in Modell v2 ueberfuehren.
- Arbeitspakete: Export, Backup, Dry-run, Migration, Validierung, Rollbackplan.
- Betroffene Dateien: Migrationsskripte, Repositories, Firebase.
- Neu anzulegen: `tools/migrations/`, `docs/migration-runbook.md`.
- Abhaengigkeiten: Phase 2 und 3.
- Risiken: Datenverlust, doppelte Buchungen, falsche Sichtbarkeit.
- Aufwand: L.
- Voraussetzungen: getestete Rules und Backups.
- Abnahmekriterien: Datenanzahl stimmt; Portal-Snapshots stimmen; Audit-Bericht erzeugt.
- Tests: Migrationstests mit Demo- und Echtdatenkopie.
- Ergebnis: v2-Daten produktionsbereit.
- Release: `v0.7-migration`.

#### Phase 5 - Kundenportal vervollstaendigen

- Ziel: **[Empfehlung]** Portal wird transaktional und sicher.
- Arbeitspakete: Portal-Token; Bestaetigung; Aenderungswunsch; Kundensicht-Validierung; Fehlerseiten.
- Betroffene Dateien: `customer-portal/index.html`, `customer-portal.js`, Portal-Repositories.
- Neu anzulegen: `portal/confirmations.js`, `portal/share-access.js`.
- Abhaengigkeiten: Auth/Rules, Datenmodell.
- Risiken: unberechtigter Zugriff.
- Aufwand: M.
- Abnahmekriterien: Portal nur mit gueltigem Token; Bestaetigung wird gespeichert; Aenderungswunsch sichtbar im Admin.
- Tests: gueltiger/ungueltiger Link, neue/bestehende Kunden, mobile Darstellung.
- Ergebnis: Kundenportal v1.
- Release: `v0.8-stable-portal`.

#### Phase 6 - Buchungsmanagement vervollstaendigen

- Ziel: **[Empfehlung]** Buchungen werden professionell steuerbar.
- Arbeitspakete: Anbieter-Stammdaten; Fristen; Zahlungsstatus; Veroeffentlichungssperren; Buchungsdokumente.
- Betroffene Dateien: `booking-library.js`, Admin-Booking-Modul, Repositories.
- Neu anzulegen: `providers/`, `bookings/booking-validation.js`.
- Abhaengigkeiten: Datenmodell v2.
- Risiken: falsche Kundensichtbarkeit.
- Aufwand: M.
- Abnahmekriterien: sichtbare Buchung ohne Pflichtdaten kann nicht veroeffentlicht werden.
- Tests: Buchung aus Programmpunkt, Upload, Fristen, Archiv.
- Ergebnis: Buchungsmanagement v1.
- Release: `v0.8-bookings`.

#### Phase 7 - Kommunikation, PDF und QR

- Ziel: **[Empfehlung]** Reiseunterlagen und Portalzugang professionell ausgeben.
- Arbeitspakete: PDF-Erzeugung; QR-Code fuer Portal-Link; Kommunikationsprotokoll; WhatsApp/E-Mail-Templates.
- Betroffene Dateien: Portal, Admin, Publishing, Documents.
- Neu anzulegen: `documents/pdf-service.js`, `documents/qr-service.js`, `communication/`.
- Abhaengigkeiten: sicherer Portal-Link.
- Risiken: PDF zeigt falsche Version oder private Daten.
- Aufwand: M.
- Abnahmekriterien: PDF enthaelt nur published Data; QR fuehrt zu gueltigem Portal-Link.
- Tests: PDF-Snapshot, QR-Scan, E-Mail/WhatsApp-Text, Datenschutzcheck.
- Ergebnis: Dokumenten- und Kommunikationspaket.
- Release: `v0.8-documents`.

#### Phase 8 - Tests, Qualitaet und Monitoring

- Ziel: **[Empfehlung]** belastbare Release-Sicherheit.
- Arbeitspakete: Playwright Smoke-Tests; Firebase Emulator; Rules Tests; Uploadtests; Monitoring-Checkliste.
- Betroffene Dateien: neue Teststruktur, Konfiguration.
- Neu anzulegen: `tests/`, `playwright.config.*`, `firebase.json`, `docs/release-checklist.md`.
- Abhaengigkeiten: stabile Modulstruktur.
- Risiken: Testsetup-Aufwand.
- Aufwand: L.
- Abnahmekriterien: Kernfluesse laufen automatisiert; Rules werden getestet.
- Tests: Teil dieser Phase.
- Ergebnis: qualitaetsgesicherter Stand.
- Release: `v0.9-quality`.

#### Phase 9 - PWA

- Ziel: **[Empfehlung]** installierbare, sichere PWA.
- Arbeitspakete: Manifest; Service Worker; Cache-Policy; Offline-Fallback; Update-Hinweis.
- Betroffene Dateien: HTML, Portal, PWA-Module.
- Neu anzulegen: `manifest.webmanifest`, `service-worker.js`, `pwa/`.
- Abhaengigkeiten: Auth, sichere Cache-Grenzen, Tests.
- Risiken: private Daten im Cache.
- Aufwand: M.
- Abnahmekriterien: Lighthouse PWA-Kriterien; Offline-Fallback; keine privaten Daten ohne Konzept im Cache.
- Tests: iPhone, Android, Desktop, Offline, Update.
- Ergebnis: PWA-ready.
- Release: `v0.9-pwa`.

#### Phase 10 - Native-App-Vorbereitung

- Ziel: **[Empfehlung]** technische Voraussetzungen fuer iOS/Android klaeren.
- Arbeitspakete: Capacitor-Evaluierung; Deep Links; Push-Konzept; sichere lokale Speicherung; App Store Risiken.
- Betroffene Dateien: PWA/Auth/Portal.
- Neu anzulegen: `docs/native-app-readiness.md`, optional `capacitor.config` erst nach Freigabe.
- Abhaengigkeiten: PWA abgeschlossen.
- Risiken: App-Store-Review, Datenschutz, Push.
- Aufwand: M.
- Abnahmekriterien: Entscheidungsvorlage und Minimal-Prototyp ohne Produktivdaten.
- Tests: iOS/Android WebView Smoke-Test.
- Ergebnis: native Roadmap.
- Release: `v0.9-native-ready`.

#### Phase 11 - Veroeffentlichung Version 1.0

- Ziel: **[Empfehlung]** produktionsfaehige Freigabe.
- Arbeitspakete: Release Candidate; Testdeployment; Datenbackup; Rollback; Produktionsdeployment.
- Betroffene Dateien: gesamtes Projekt.
- Neu anzulegen: `CHANGELOG.md`, `RELEASE_NOTES.md`, `docs/rollback.md`.
- Abhaengigkeiten: alle vorherigen Phasen.
- Risiken: Produktionsdaten, externe Dienste.
- Aufwand: M.
- Abnahmekriterien: Release-Checkliste vollstaendig gruen; Tag `v1.0-production`.
- Tests: vollstaendige Smoke-, Rules-, Upload-, Portal-, PWA-Tests.
- Ergebnis: Version 1.0.
- Release: `v1.0-production`.

## 3. Sofortmassnahmen vor echten Kundendaten

| Prio | Massnahme | Begruendung | Status |
|---|---|---|---|
| P0 | Passwort-Logging entfernen | **[im Code nachgewiesen]** `admin.js` loggt Rohpasswort. | sofort |
| P0 | Sensible Debug-Logs inventarisieren und reduzieren | **[im Code nachgewiesen]** Firebase/Portal/Admin loggen Rohdaten. | sofort |
| P0 | Hart codiertes Passwort nicht weiter als Sicherheitsmodell verwenden | **[im Code nachgewiesen]** `PASSWORD="ACT2026"`. | sofort |
| P1 | Sichere Admin-Anmeldung | **[Empfehlung]** Firebase Auth mit Admin-Rollen. | vor weiteren Funktionen |
| P1 | Firebase Security Rules | **[im Code nachgewiesen]** keine Rules im Repo. | vor echten Daten |
| P1 | Storage Rules | **[Empfehlung]** Uploads nur fuer berechtigte Rollen. | vor echten Uploads |
| P1 | Kundenportal-Linkschutz | **[im Code nachgewiesen]** Zugriff per `?customer=`. | vor echten Kundendaten |
| P1 | LocalStorage-Strategie | **[im Code nachgewiesen]** Kundendaten liegen lokal. | vor echten Kundendaten |
| P1 | Sichere Dateiuploads | **[Empfehlung]** MIME/Groesse/Rules/Scan. | vor echten Uploads |
| P1 | App Check | **[Empfehlung]** Missbrauch der Firebase Web App reduzieren. | vor Pilotbetrieb |
| P1 | XSS-Audit aller `innerHTML`-Stellen | **[im Code nachgewiesen]** viele HTML-Senken. | vor echten Daten |
| P2 | Offline-Cache-Schutz | **[Empfehlung]** private Daten nicht unkontrolliert cachen. | vor PWA |
| P3 | Vollautomatische Kommunikationsanbieter | **[Empfehlung]** nicht sicherheitskritisch fuer Start. | spaeter |

## 4. Datenmodell Version 2

### Firestore-Zielstruktur

```text
organizations/{orgId}
  settings/{settingsId}
  employees/{employeeId}
  roles/{roleId}
  customers/{customerId}
  crmProfiles/{customerId}
    notes/{noteId}
    tasks/{taskId}
    reminders/{reminderId}
    communications/{communicationId}
    ratings/{ratingId}
  trips/{tripId}
    programItems/{programItemId}
    versions/{versionId}
    confirmations/{confirmationId}
  bookings/{bookingId}
  providers/{providerId}
  documents/{documentId}
  templates/{templateId}
  portalShares/{shareId}
  publishEvents/{eventId}
  auditLogs/{auditId}
```

### Entitaeten und Pflichtfelder

- Organization: **[Empfehlung]** `orgId`, `name`, `status`, `createdAt`, `updatedAt`.
- Employee: **[Empfehlung]** `employeeId`, `orgId`, `email`, `displayName`, `roleIds`, `active`.
- Role: **[Empfehlung]** `roleId`, `permissions`, `scope`.
- Customer: **[Empfehlung]** `customerId`, `orgId`, `displayName`, `contact`, `language`, `status`, `archived`.
- Trip: **[Empfehlung]** `tripId`, `orgId`, `customerId`, `title`, `startDate`, `endDate`, `region`, `status`, `publishStatus`, `assignedEmployeeIds`.
- ProgramItem: **[Empfehlung]** `programItemId`, `tripId`, `title`, `date`, `startTime`, `endTime`, `category`, `visibility`, `status`.
- Booking: **[Empfehlung]** `bookingId`, `orgId`, `tripId`, `customerId`, `programItemId`, `providerId`, `status`, `paymentStatus`, `visibility`.
- Provider: **[Empfehlung]** `providerId`, `orgId`, `type`, `name`, `contact`, `active`.
- Document: **[Empfehlung]** `documentId`, `orgId`, `ownerType`, `ownerId`, `tripId`, `storagePath`, `mimeType`, `visibility`, `status`.
- CRM Profile: **[Empfehlung]** `customerId`, `orgId`, `preferences`, `family`, `favorites`, `summary`.
- Template: **[Empfehlung]** `templateId`, `orgId`, `templateType`, `title`, `payload`, `tags`, `version`, `active`.
- PortalShare: **[Empfehlung]** `shareId`, `tripId`, `tokenHash`, `expiresAt`, `revokedAt`, `permissions`.
- Confirmation: **[Empfehlung]** `confirmationId`, `tripId`, `shareId`, `versionId`, `status`, `confirmedAt`, `comment`.

### Status, Sichtbarkeit, Audit und Loeschung

- **[Empfehlung]** Statusfelder: `draft`, `ready`, `published`, `archived`, `cancelled`, `completed`.
- **[Empfehlung]** Sichtbarkeit: `internal`, `customerVisible`, `publicSnapshot`.
- **[Empfehlung]** Rollen: `owner`, `admin`, `concierge`, `editor`, `viewer`.
- **[Empfehlung]** Audit-Felder ueberall: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy`.
- **[Empfehlung]** Veroeffentlichung: `publishedVersionId`, `lastPublishedAt`, `publishedBy`, `contentHash`.
- **[Empfehlung]** Keine harten Deletes im Normalbetrieb; `archived=true` und spaetere DSGVO-Loeschroutine.

### Migration ohne Datenverlust

1. **[Empfehlung]** Vollbackup von Firestore, Storage-Metadaten und LocalStorage-Export.
2. **[Empfehlung]** Dry-run liest `customers/{id}` und erzeugt v2-Objekte ohne zu schreiben.
3. **[Empfehlung]** `customerId` bleibt erhalten; bestehende Reise wird zu erstem `tripId`.
4. **[Empfehlung]** `draftData` wird Trip-Entwurf, `publishedData` wird Trip-Version/Public Snapshot.
5. **[Empfehlung]** `bookings[]` werden nach `bookings/{bookingId}` migriert und mit `tripId` verbunden.
6. **[Empfehlung]** `documents[]` werden Dokument-Metadaten; Storage-Pfade bleiben erhalten.
7. **[Empfehlung]** CRM wird aus Customer in `crmProfiles/{customerId}` plus Subcollections ueberfuehrt.
8. **[Empfehlung]** Validierungsbericht vergleicht Anzahl Kunden, Reisen, Buchungen, Dokumente, Versionen.
9. **[Empfehlung]** Erst nach erfolgreichem Parallelbetrieb v1-Lesezugriffe entfernen.

## 5. Zielarchitektur

### Empfohlene Ordnerstruktur

```text
core/
  date.js
  ids.js
  logger.js
  sanitize.js
models/
schemas/
repositories/
services/
auth/
admin/
portal/
bookings/
crm/
publishing/
documents/
templates/
pwa/
tests/
docs/
tools/migrations/
```

### Tooling-Entscheidung

- **[Empfehlung]** Entscheidung: bestehende Struktur schrittweise modularisieren, danach Teilmigration auf Vite + TypeScript pruefen.
- **[Empfehlung]** Keine vollstaendige Frontend-Migration vor v1.0.
- **[Begruendung]** **[im Code nachgewiesen]** Es steckt viel Fachlogik in vorhandenen Dateien; ein Big-Bang-Rewrite wuerde Risiko und Migrationsaufwand stark erhoehen.
- **[Empfehlung]** TypeScript/Schemas zuerst fuer Datenmodelle und Repositories einfuehren, nicht sofort fuer jedes UI-Detail.

## 6. Funktions-Roadmap

| Funktion | Aktueller Status | Zielstatus | Phase | Abhaengigkeiten | Prioritaet | Abnahmekriterium |
|---|---|---|---|---|---|---|
| Admin-Anmeldung | **[im Code nachgewiesen]** Client-Passwort | Firebase Auth/Rollen | 1 | Phase 0 | P0 | Nur Admin-Rolle kann schreiben |
| Mitarbeiterrollen | vorbereitet | Rollenmodell | 1 | Auth | P1 | Rollenrechte getestet |
| Kundenanlage | vorhanden | Customer + Trip getrennt | 2 | Datenmodell | P1 | Kunde mit mehreren Reisen moeglich |
| Reiseanlage | vorhanden im Customer | eigenes Trip-Modell | 2 | Datenmodell | P1 | Trip CRUD funktioniert |
| Programmpunkte | vorhanden | Trip-Subcollection | 2/5 | Datenmodell | P1 | Portal zeigt korrekt |
| Aktivitaeten | vorhanden als Kategorie | typisierte Items | 2 | Schemas | P2 | Kategorie validiert |
| Entwurf | vorhanden | Trip Draft | 2 | Repositories | P1 | Draft getrennt von Published |
| Veroeffentlichung | vorhanden | Versionierte Publikation | 4/5 | Datenmodell | P1 | Version wiederherstellbar |
| Portal-Link | per Customer-ID | Token/Share | 1/5 | Auth/Rules | P0 | Ungueltiger Token blockiert |
| Kundenbestaetigung | Platzhalter | gespeichertes Confirmation-Objekt | 5 | Portal-Link | P1 | Admin sieht Bestaetigung |
| Aenderungswunsch | WhatsApp | gespeicherter Request + WhatsApp | 5 | Portal-Link | P2 | Request im Admin sichtbar |
| CRM | vorhanden | CRM v2 | 2/4 | Datenmodell | P1 | Notizen/Aufgaben migriert |
| Buchungen | vorhanden | Booking v2 | 6 | Datenmodell | P1 | Pflichtfelder vor Publish |
| Anbieter | vorbereitet | Provider-Modul | 6 | Booking v2 | P2 | Anbieter wiederverwendbar |
| Fristen | Dashboard | Aufgaben/Reminder | 6 | Booking/CRM | P2 | Frist erscheint im Dashboard |
| Zahlungen | Statusfeld/Platzhalter | Status + spaetere Integration | 6 | Booking | P2 | Zahlungssicht validiert |
| Dokumentupload | vorhanden | sichere Uploads | 1/7 | Rules | P0 | Upload nur berechtigt |
| PDF | Platzhalter | Reise-PDF | 7 | Published Snapshot | P1 | PDF aus Published Data |
| QR-Code | CSS-Placeholder | QR zum Portal | 7 | Portal-Link | P1 | QR scannt korrekt |
| WhatsApp | Deep Links | Templates + Protokoll | 7 | Kommunikation | P2 | Versandvorbereitung gespeichert |
| E-Mail | mailto | Templates + Protokoll | 7 | Kommunikation | P2 | Mailtext gespeichert |
| Erinnerungen | vorbereitet | Reminder-Modul | 6/7 | CRM/Booking | P2 | Reminder faellig sichtbar |
| Push | fehlt | PWA Push nach Opt-in | 9 | PWA/Auth | P3 | Push-Test erfolgreich |
| Wetter | vorhanden | fehlertolerant | 5 | Portal | P2 | Fehleranzeige sauber |
| Offline-Nutzung | fehlt | sicherer Offline-Fallback | 9 | PWA | P2 | Kein privater Cache-Leak |
| Mehrsprachigkeit | Website vorhanden | Portal/Admin erweitert | 5/9 | i18n | P2 | Sprache pro Trip |
| PWA-Installation | fehlt | installierbar | 9 | Security | P2 | Manifest + SW gruen |
| iOS/Android | fehlt | vorbereitet | 10 | PWA | P3 | Capacitor-Readiness-Dokument |

## 7. Teststrategie

- **[Empfehlung]** Manuelle Smoke-Tests fuer Website, Admin-Login, Kundenanlage, Reiseanlage, Programmpunkt, Upload, Publish, Portal, Booking, CRM, Template.
- **[Empfehlung]** Automatisierte Browser-Tests mit Playwright fuer Kernfluesse.
- **[Empfehlung]** Firebase Emulator Tests fuer Firestore und Storage Rules.
- **[Empfehlung]** Upload-Tests fuer erlaubte/verbotene Dateitypen und Dateigroessen.
- **[Empfehlung]** Migrationstests mit Demo-Daten und anonymisierter Echtdatenkopie.
- **[Empfehlung]** Veroeffentlichungstests fuer Draft vs Published, Version, Restore.
- **[Empfehlung]** Tests fuer neue und bestehende Kunden.
- **[Empfehlung]** Sprachtests fuer DE/EN/IT/FR und spaeter Portaltexte.
- **[Empfehlung]** Geraetetests auf iPhone, Android, Tablet, Desktop.
- **[Empfehlung]** PWA-Tests fuer Offline, Update, Installation und Cache-Loeschung.

### Verbindliche Release-Checkliste

- **[Empfehlung]** Git-Arbeitsbaum bewusst geprueft.
- **[Empfehlung]** Syntaxcheck/Build erfolgreich.
- **[Empfehlung]** Smoke-Tests erfolgreich.
- **[Empfehlung]** Security Rules Tests erfolgreich.
- **[Empfehlung]** Upload-Test erfolgreich.
- **[Empfehlung]** Migration dry-run erfolgreich, falls betroffen.
- **[Empfehlung]** Portal-Link-Test gueltig/ungueltig erfolgreich.
- **[Empfehlung]** Rollback-Pfad dokumentiert.
- **[Empfehlung]** Testdeployment geprueft.
- **[Empfehlung]** Produktionsdeployment nur nach Freigabe.

## 8. Versions- und Releaseplan

| Version | Phasen | Git-Commit | Git-Tag | Testdeployment | Produktionsdeployment |
|---|---|---|---|---|---|
| `v0.6.0-security-hotfix` | 0 | nach P0-Hotfix | ja | ja | nur wenn bestehende Prod betroffen |
| `v0.6-security` | 1 | nach Auth/Rules | ja | ja | Pilot mit Testdaten |
| `v0.7-data-model` | 2 | nach Modell/Schemas | ja | ja | nein |
| `v0.7-modular-core` | 3 | nach Modularisierung | ja | ja | nein |
| `v0.7-migration` | 4 | nach Migration dry-run und Testmigration | ja | ja | nach Freigabe |
| `v0.8-stable-portal` | 5 | nach Portalabschluss | ja | ja | Pilot moeglich |
| `v0.8-bookings` | 6 | nach Bookingabschluss | ja | ja | nach Smoke-Test |
| `v0.8-documents` | 7 | nach PDF/QR/Kommunikation | ja | ja | nach Datenschutzcheck |
| `v0.9-quality` | 8 | nach Testbasis | ja | ja | Release Candidate |
| `v0.9-pwa` | 9 | nach PWA | ja | ja | nach Offline-Review |
| `v0.9-native-ready` | 10 | nach Native-Readiness | ja | optional | nein |
| `v1.0-production` | 11 | Release Commit | ja | ja | ja |

- **[Empfehlung]** Git-Commit nach jedem abgeschlossenen Auftrag.
- **[Empfehlung]** Git-Tag nur nach bestandener Release-Checkliste.
- **[Empfehlung]** Vercel-Testdeployment ab `v0.6-security` fuer jede Phase.
- **[Empfehlung]** Produktionsdeployment erst wenn P0/P1 Security, Rules, Portal-Linkschutz, Tests und Rollback erfuellt sind.
- **[Empfehlung]** Rollback ueber letzten Git-Tag plus Firestore/Storage-Backup.

## 9. Risiken und Entscheidungsstopps

| Risiko | Stop-Kriterium |
|---|---|
| Datenverlust | **[Empfehlung]** Keine Migration ohne Backup und Dry-run-Bericht. |
| Fehlerhafte Migration | **[Empfehlung]** Naechste Phase stoppt bei abweichenden Objektzahlen. |
| Sicherheitsluecken | **[Empfehlung]** Keine echten Kundendaten ohne Auth/Rules. |
| Offene Firebase Rules | **[Empfehlung]** Kein Upload-/Portalbetrieb ohne Rules Tests. |
| Unberechtigter Portalzugriff | **[Empfehlung]** Keine v1.0 ohne Token/Share-Konzept. |
| Beschaedigte Uploads | **[Empfehlung]** Kein Produktivupload ohne Storage-Test. |
| Hohe Firebase-Kosten | **[Empfehlung]** Kein 10k-Kundenbetrieb ohne Pagination und Indizes. |
| Performanceprobleme | **[Empfehlung]** Keine PWA, wenn Initialload zu gross bleibt. |
| Feature-Ausweitung | **[Empfehlung]** Neue Features stoppen, wenn Phase 0/1 offen ist. |
| Fehlende Tests | **[Empfehlung]** Kein v1.0 ohne automatisierte Kernfluesse. |
| App-Store-Probleme | **[Empfehlung]** Keine native Umsetzung ohne PWA- und Datenschutzfreigabe. |

## 10. Naechste 20 Codex-Auftraege

| Nr. | Titel | Phase | Ziel | Betroffene Dateien | Ergebnis | Abnahmekriterien | Abhaengigkeiten | Risiko | Aufwand |
|---:|---|---|---|---|---|---|---|---|---|
| 01 | P0-Sicherheitsbereinigung | 0 | Passwort-Logging und sensible Debug-Logs entfernen | `admin.js` | Hotfix | kein Passwortlog, Syntaxcheck | keine | niedrig | S |
| 02 | Security-Log-Inventar | 0 | alle Logs klassifizieren | `*.js`, Doku | Liste/kleine Bereinigung | keine sensiblen Rohdatenlogs | 01 | niedrig | S |
| 03 | Firebase Rules Entwurf | 1 | Firestore/Storage Rules planen | neue Rules | Rules-Entwurf | Emulator vorbereitet | 01 | mittel | M |
| 04 | Admin Auth Design | 1 | Auth/Rollen-Konzept | Auth/Firebase | Design + Aufgaben | Rollenmatrix | 03 | mittel | M |
| 05 | Firebase Auth implementieren | 1 | echte Admin-Anmeldung | `firebase-auth.js`, `admin.js` | Login v1 | Admin-Rolle erforderlich | 04 | hoch | M |
| 06 | Portal Share Design | 1 | sicherer Kundenlink | Doku/Schemas | Tokenmodell | kein `customerId` als Schutz | 04 | mittel | M |
| 07 | Datenmodell v2 Spezifikation | 2 | Schemas finalisieren | neue `schemas/` | v2-Schemas | Pflichtfelder definiert | 05 | mittel | M |
| 08 | Repository-Struktur anlegen | 3 | Firebase-Zugriffe trennen | neue `repositories/` | Repositories | alte Funktionen laufen | 07 | mittel | M |
| 09 | Core Utilities extrahieren | 3 | Duplikate reduzieren | `core/`, Libraries | shared utils | Syntax/Smoke | 08 | niedrig | S |
| 10 | Customer/Trip Migration Dry-run | 4 | v1 zu v2 mappen | `tools/migrations/` | Dry-run | Bericht ohne Schreibzugriff | 07 | hoch | M |
| 11 | Admin Kunden/Reisen modularisieren | 3 | Admin entkoppeln | `admin.js`, `admin/` | kleinere Module | CRUD funktioniert | 08 | mittel | L |
| 12 | Portal Datenzugriff modularisieren | 3/5 | Portal-Repository nutzen | `customer-portal.js`, `portal/` | Portal v2 access | Portal laedt Published | 08 | mittel | M |
| 13 | Portal-Linkschutz implementieren | 5 | Tokenzugriff | Portal/Firebase | geschuetzter Link | ungueltig blockiert | 06 | hoch | M |
| 14 | Kundenbestaetigung speichern | 5 | Confirmation-Modul | Portal/Admin | Bestaetigung sichtbar | Firestore-Eintrag | 13 | mittel | M |
| 15 | Booking Publish Validation | 6 | Buchungsqualitaet | Booking/Publishing | Blocker/Warnungen | unfertige sichtbare Buchung blockiert | 07 | mittel | M |
| 16 | Provider-Modul | 6 | Anbieter wiederverwenden | `providers/` | Provider CRUD | Buchung referenziert Anbieter | 15 | mittel | M |
| 17 | Dokumentmodell und Upload-Haertung | 7 | sichere Dokumente | Documents/Storage | Document Repository | Upload rules tested | 03 | hoch | M |
| 18 | PDF-Reiseunterlagen | 7 | PDF aus Published Data | `documents/` | PDF Download | keine Draftdaten im PDF | 17 | mittel | M |
| 19 | QR-Code zum Portal | 7 | QR fuer Share-Link | `documents/`/Portal | QR sichtbar | Scan erfolgreich | 13 | niedrig | S |
| 20 | Testbasis Playwright + Emulator | 8 | automatisierte Kernchecks | `tests/` | Testsetup | Kernfluss gruen | 05/08 | mittel | L |

## 11. Erster konkret auszufuehrender Auftrag

### Auftrag 01 - P0-Sicherheitsbereinigung

**Ziel:**  
**[Empfehlung]** Entferne risikoarme, unmittelbar gefaehrliche Debug-Ausgaben, ohne Architektur, Datenmodell oder Kundendaten zu veraendern.

**Umfang:**  
- **[Empfehlung]** Passwort-Logging in `customer-portal/admin.js` entfernen.
- **[Empfehlung]** Weitere sensible Debug-Logs identifizieren, insbesondere Logs mit Rohdaten aus Kunden, Dokumenten, Firebase oder PublishedData.
- **[Empfehlung]** Nur eindeutig sensible Logs entfernen oder entschärfen.
- **[Empfehlung]** Keine neue Authentifizierung einfuehren.
- **[Empfehlung]** Keine Datenmigration starten.
- **[Empfehlung]** Keine bestehenden Kundendaten, Demo-Daten oder Firebase-Konfigurationen veraendern.
- **[Empfehlung]** Keine grossen Refactorings.

**Betroffene Dateien:**  
- `customer-portal/admin.js`
- optional nur wenn noetig: `customer-portal/firebase-service.js`, `customer-portal/customer-portal.js`

**Pruefungen nach der Aenderung:**  
- Node `--check` fuer alle geaenderten JS-Dateien.
- Adminseite oeffnen und Login mit bestehendem Passwort testen.
- Kundenliste sichtbar.
- Entwurf speichern funktioniert weiterhin lokal.
- Kein Rohpasswort in der Browser-Konsole.
- Git-Diff pruefen und zusammenfassen.

**Konkrete Testschritte:**  
1. Admin laden.
2. Passwort eingeben.
3. Browser-Konsole pruefen: kein Passwort, keine Roh-PublishedData, keine kompletten Kundendokumente.
4. Kundenuebersicht oeffnen.
5. Bestehenden Kunden anzeigen.
6. Syntaxcheck ausfuehren.
7. Git-Diff zusammenfassen.

**Dokumentation:**  
- **[Empfehlung]** Kurz notieren, welche Logs entfernt/entschaerft wurden.
- **[Empfehlung]** Keine neue Architekturentscheidung in diesem Auftrag dokumentieren.

**Git-Diff-Zusammenfassung:**  
- **[Empfehlung]** Nur geaenderte Sicherheitszeilen nennen.
- **[Empfehlung]** Bestaetigen, dass keine Datenmigration und keine Kundendaten-Aenderung erfolgt ist.

## 12. Executive Summary

1. **Wo steht das Projekt heute?**  
   **[im Code nachgewiesen]** Das Projekt ist ein fortgeschrittener clientseitiger Prototyp mit Website, Admin, Kundenportal, Firebase, Publishing, CRM, Buchungen und Vorlagen.

2. **Was ist der wichtigste naechste Schritt?**  
   **[Empfehlung]** P0-Sicherheitsbereinigung sofort, danach echte Authentifizierung und Firebase Rules.

3. **Welche Arbeiten muessen vor echten Kundendaten zwingend abgeschlossen sein?**  
   **[Empfehlung]** Passwort-Logs entfernen, hart codiertes Passwort abloesen, Auth/Rollen, Firestore Rules, Storage Rules, Portal-Linkschutz, LocalStorage-Strategie, Upload-Haertung, XSS-Audit.

4. **Wann darf mit der PWA begonnen werden?**  
   **[Empfehlung]** Erst nach Auth, Rules, Datenmodell-Stabilisierung, Portal-Linkschutz und Cache-Konzept.

5. **Wann ist das Projekt bereit fuer eine native App?**  
   **[Empfehlung]** Nach stabiler PWA, getesteter Auth, sicherem Offline-/Storage-Konzept, Push-Konzept und klarer App-Shell.

6. **Welche Teile der aktuellen Codebasis bleiben erhalten?**  
   **[Empfehlung]** Fachlogik aus Booking, CRM, Publishing, Templates, Portal-Rendering-Ideen, Website-Inhalte und bestehende Firebase-Anbindung als Grundlage.

7. **Welche Teile muessen strukturell ueberarbeitet werden?**  
   **[Empfehlung]** `admin.js`, `customer-portal.js`, `firebase-service.js`, Datenmodell, Auth, Rules, Dokumentmodell und Tests.

8. **Was ist der realistische Weg zur Version 1.0?**  
   **[Empfehlung]** Schrittweise Stabilisierung statt Neuentwicklung: Security zuerst, dann Datenmodell, Modularisierung, Migration, Portal/Buchungen/PDF/QR, Tests, PWA, Release Candidate, Produktion.
