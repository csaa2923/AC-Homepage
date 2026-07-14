# ARCHITECTURE_REVIEW.md

Stand: 14.07.2026  
Projekt: `C:\GitHub\AC-Homepage`  
Audit-Typ: Architektur-Review ohne Codeänderungen  
Kontext: `PROJECT_STATUS.md` wurde berücksichtigt und anhand der Codebasis gegenprüft.

## 1. Gesamtarchitektur

### Projektstruktur

- **[im Code nachgewiesen]** Das Projekt ist eine statische Webplattform ohne Build-System, ohne Paketmanager-Konfiguration und ohne Server-Code.
- **[im Code nachgewiesen]** Die oberste Ebene enthält Marketing-/Rechtsseiten (`index.html`, `impressum.html`, `datenschutz.html`, `agb.html`, `cookies.html`), Assets (`images`, `video`), globale Website-Logik (`js`) und ein separates Kunden-/Adminportal (`customer-portal`).
- **[im Code nachgewiesen]** `customer-portal` enthält die Management-Anwendung, das Kundenportal, Firebase-Adapter, Fachbibliotheken und Dokumentation.
- **[aus der Architektur abgeleitet]** Die Architektur ist aktuell eine clientseitige Monolith-Struktur mit mehreren globalen `window.ACT...`-Modulen statt einer paketierten App mit explizitem Modulgraph.

### Ordnerstruktur

- **[im Code nachgewiesen]** `css/` enthält globale Website-Styles (`style.css`, `faq.css`).
- **[im Code nachgewiesen]** `js/` enthält Website-Interaktion, Mehrsprachigkeit, Anfrageformular und FAQ.
- **[im Code nachgewiesen]** `customer-portal/` enthält Admin, Kundenportal, Firebase, CRM, Buchungen, Publishing, Vorlagen und Demo-Daten.
- **[im Code nachgewiesen]** `images/` und `video/` enthalten große Medienassets, darunter `video/hero.mp4` mit ca. 32 MB.
- **[im Code nachgewiesen]** Es gibt keine `src/`, `components/`, `services/`, `models/`, `tests/`, `dist/` oder `app/`-Struktur.

### Modulstruktur und Verantwortlichkeiten

- **[im Code nachgewiesen]** `customer-portal/admin.js` übernimmt sehr viele Verantwortlichkeiten: Login, Datenladen, Normalisierung, Rendering, Formularauswertung, CRUD, Firebase-Sync, Uploads, CRM-UI, Buchungs-UI, Vorlagen-UI, Publishing-Dialoge und Navigation.
- **[im Code nachgewiesen]** `customer-portal/customer-portal.js` übernimmt Kundendatenladen, Normalisierung, Wetter, Kalender, Timeline, Dokumentanzeige, Buchungsanzeige, Aktionen und Rendering.
- **[im Code nachgewiesen]** `customer-portal/firebase-service.js` kapselt Firebase-Initialisierung, anonyme Auth, Firestore, Storage, Kunden, Versionen, CRM, Buchungen und Vorlagen.
- **[im Code nachgewiesen]** `booking-library.js`, `crm-library.js`, `publish-workflow.js` und `template-library.js` sind fachliche Hilfsbibliotheken mit klareren Grenzen als der Admin-Controller.
- **[im Code nachgewiesen]** `firebase-auth.js`, `firebase-database.js` und `firebase-storage.js` sind dünne Wrapper um `ACTFirebaseService`.
- **[aus der Architektur abgeleitet]** Die Fachmodule sind wiederverwendbarer als die UI-Controller, weil sie Daten normalisieren und transformieren, aber nicht oder kaum DOM-Zugriff enthalten.

### Datenfluss

- **[im Code nachgewiesen]** Öffentliche Website: HTML + JS erzeugen WhatsApp-Deep-Link; keine Backend-Persistenz.
- **[im Code nachgewiesen]** Admin: lädt zuerst `localStorage`, versucht nach Login Firebase zu laden und überschreibt lokale Kunden mit Firestore-Daten, falls vorhanden.
- **[im Code nachgewiesen]** Admin speichert Entwürfe lokal unter `act_customer_portal_customers` und optional in Firestore `customers/{id}.draftData`.
- **[im Code nachgewiesen]** Veröffentlichung kopiert normalisierte Entwurfsdaten in `publishedData`, schreibt `publishMeta` und `publishHistory` und sichert vorherige Versionen unter `customers/{id}/versions/{versionId}`.
- **[im Code nachgewiesen]** Kundenportal lädt bevorzugt `publishedData`, danach lokale veröffentlichte Snapshots, danach Demo-Daten.
- **[im Code nachgewiesen]** Buchungen liegen redundant in `customer.bookings[]`, `customers/{id}.draftData.bookings[]` und Firestore Collection `bookings`.
- **[im Code nachgewiesen]** CRM liegt redundant im Kundenentwurf und zusätzlich in mehreren CRM-Collections.

### Abhängigkeiten

- **[im Code nachgewiesen]** Firebase SDK wird zur Laufzeit per dynamischem Import von `www.gstatic.com` geladen.
- **[im Code nachgewiesen]** Externe Dienste sind WhatsApp, `mailto:`, Open-Meteo, Google Maps Links und Google Analytics Snippets.
- **[im Code nachgewiesen]** Es gibt keine npm-Abhängigkeiten, keine gebündelten Frameworks, keine Router- oder State-Management-Bibliothek.
- **[aus der Architektur abgeleitet]** Die geringe Tooling-Abhängigkeit vereinfacht Deployment, erschwert aber Testing, Typisierung, Modularisierung und Skalierung.

### Wiederverwendbarkeit und Erweiterbarkeit

- **[im Code nachgewiesen]** Fachlogik für Booking, CRM, Publishing und Templates ist über `window.ACT...` wiederverwendbar.
- **[im Code nachgewiesen]** Gemeinsame Hilfsfunktionen wie `clone`, `freshId`, `parseDate`, `daysUntil`, `normalizeDocument` existieren mehrfach in verschiedenen Dateien.
- **[aus der Architektur abgeleitet]** Erweiterbarkeit ist kurzfristig gut, solange neue Features in bestehende Dateien ergänzt werden; langfristig sinkt sie wegen wachsender Kopplung und fehlender Modulgrenzen.
- **[Empfehlung]** Die Zielarchitektur sollte Fachlogik, Datenzugriff, UI-Komponenten, Auth und Routing explizit trennen.

### Bewertung

| Kriterium | Bewertung | Begründung |
|---|---:|---|
| Übersichtlichkeit | 5/10 | **[aus der Architektur abgeleitet]** Fachbereiche sind erkennbar, aber zentrale Dateien sind groß und mischen Verantwortlichkeiten. |
| Wartbarkeit | 4/10 | **[aus der Architektur abgeleitet]** Änderungen im Admin können viele Bereiche berühren. |
| Skalierbarkeit | 3/10 | **[aus der Architektur abgeleitet]** Client lädt große Collections und enthält Adminlogik im Browser. |
| Modularität | 4/10 | **[im Code nachgewiesen]** Fachbibliotheken existieren, aber UI und Datenzugriff sind nicht sauber geschichtet. |

## 2. Codequalität

### Positive Befunde

- **[im Code nachgewiesen]** Alle JavaScript-Dateien bestehen die Syntaxprüfung mit Node `--check`.
- **[im Code nachgewiesen]** Die Fachbibliotheken verwenden sprechende Funktionsnamen wie `normalizeBooking`, `publishedBookings`, `validateForPublish`, `buildDashboard`.
- **[im Code nachgewiesen]** Es gibt defensive Normalisierung für viele optionale Datenfelder.
- **[im Code nachgewiesen]** Kundensichtbare Daten werden an mehreren Stellen explizit von internen Daten getrennt, z. B. `stripBookingForPortal` und `stripCrmForPortal`.

### Kritische Befunde

- **[im Code nachgewiesen]** `customer-portal/admin.js` hat 3304 Zeilen, 155 KB und ca. 429 erkannte Funktions-/Arrow-Vorkommen.
- **[im Code nachgewiesen]** `customer-portal/customer-portal.js` hat 1236 Zeilen und mischt Datenladen, Rendering, Wetterlogik, Kalenderexport und Aktionen.
- **[im Code nachgewiesen]** `customer-portal/firebase-service.js` hat 904 Zeilen und bündelt Firebase-Initialisierung, Kunden, Vorlagen, CRM, Buchungen und Storage.
- **[im Code nachgewiesen]** Es gibt viele `innerHTML`-Renderings: 59 in `admin.js`, 22 in `customer-portal.js`, 7 in `js/script.js`.
- **[im Code nachgewiesen]** In mehreren Dateien existieren gleiche Hilfsfunktionen oder Varianten davon: `clone`, `freshId`, `parseDate`, `daysUntil`, `normalizeDocument`, `escapeHtml`.
- **[im Code nachgewiesen]** Debug-Logs sind in sicherheitsrelevanten Bereichen vorhanden, darunter Passwort-Logging in `admin.js`.
- **[aus der Architektur abgeleitet]** SOLID-Prinzipien werden in den Fachbibliotheken teilweise eingehalten, im Admin-Controller aber deutlich verletzt, insbesondere Single Responsibility und Dependency Inversion.

### Große und schwer wartbare Bereiche

| Datei | Befund | Bewertung |
|---|---|---|
| `customer-portal/admin.js` | **[im Code nachgewiesen]** Zentrale Admin-Datei mit Login, UI, Datenmodell, Firebase-Sync und allen Fachbereichen. | Höchstes Refactoring-Ziel. |
| `customer-portal/customer-portal.js` | **[im Code nachgewiesen]** Portaldatei enthält Wetter, Kalender, Renderfunktionen, Datenfallback und Actions. | Sollte in Services und View-Komponenten zerlegt werden. |
| `customer-portal/firebase-service.js` | **[im Code nachgewiesen]** Ein Service kapselt alle Firebase-Domänen. | Sollte in Repository-Module getrennt werden. |
| `js/script.js` | **[im Code nachgewiesen]** Enthält große Übersetzungsdaten, Formularlogik und UI-Logik. | Übersetzungen auslagern. |

### Doppelter Code

- **[im Code nachgewiesen]** `clone` ist in `admin.js`, `booking-library.js`, `crm-library.js`, `template-library.js` und `firebase-service.js` vorhanden.
- **[im Code nachgewiesen]** Datumslogik wie `parseDate` und `daysUntil` existiert mehrfach in CRM, Booking und Portal.
- **[im Code nachgewiesen]** Dokumentnormalisierung existiert in Admin, Portal, Booking und Firebase.
- **[im Code nachgewiesen]** ID-Erzeugung über Zeitstempel und `Math.random()` existiert mehrfach.
- **[Empfehlung]** Gemeinsame Utility-Module sollten eingeführt werden: `core/date.js`, `core/id.js`, `core/document.js`, `core/sanitize.js`.

### Tote oder vorbereitete Bereiche

- **[im Code nachgewiesen]** PDF-Aktion im Kundenportal zeigt nur einen Platzhalter-Alert.
- **[im Code nachgewiesen]** Zahlungsfunktion im Kundenportal zeigt nur einen Platzhalter-Alert.
- **[im Code nachgewiesen]** Programmbestätigung im Kundenportal zeigt nur einen Platzhalter-Alert.
- **[im Code nachgewiesen]** Push-Erinnerungen sind in CRM vorbereitet, aber nicht implementiert.
- **[im Code nachgewiesen]** QR-Code ist nur als CSS-Placeholder sichtbar, nicht als Funktion.
- **[aus der Architektur abgeleitet]** `prepareStorageReference` wirkt historisch/vorbereitend, da echte Uploads inzwischen über `uploadCustomerDocument` erfolgen.

### Verbesserungsvorschläge

- **[Empfehlung]** `admin.js` in Module zerlegen: `admin/state`, `admin/customer`, `admin/crm`, `admin/bookings`, `admin/templates`, `admin/publishing`, `admin/ui`, `admin/auth`.
- **[Empfehlung]** `firebase-service.js` in Repositories zerlegen: `CustomerRepository`, `BookingRepository`, `CrmRepository`, `TemplateRepository`, `StorageService`, `AuthService`.
- **[Empfehlung]** Gemeinsame Domänenmodelle und Validatoren einführen.
- **[Empfehlung]** Rendering aus Template-Strings in Komponenten oder zumindest kleine Renderfunktionen pro Bereich auslagern.
- **[Empfehlung]** Debug-Logs entfernen oder hinter einen konfigurierbaren Logger legen.
- **[Empfehlung]** Automatisierte Smoke-Tests und Firebase-Emulator-Tests einführen.

## 3. Datenmodell

### Customer

- **[im Code nachgewiesen]** Customer enthält Stammdaten wie `customerId`, `customerName`, `tripName`, Zeitraum, Region, Sprache, Kontakt, Concierge, Status, Programm, Unterkunft, Dokumente, CRM, Buchungen, Veröffentlichungsfelder und Historie.
- **[im Code nachgewiesen]** Es gibt Legacy-/Alias-Felder wie `tripName` und `tripTitle`, `program` und `programItems`, `concierge` und `conciergeName`, `whatsapp` und `whatsappLink`.
- **[aus der Architektur abgeleitet]** Das Customer-Modell ist aktuell ein Aggregat aus Kunde, Reise, Portal-Snapshot, CRM und Buchungen.
- **[Empfehlung]** Customer und Trip sollten getrennt werden, weil ein Kunde mehrere Reisen haben kann.

### Booking

- **[im Code nachgewiesen]** Booking enthält `bookingId`, `customerId`, `tripId`, `programItemId`, Typ, Anbieter, Kontakt, Datum, Preise, Zahlungsstatus, Buchungsstatus, Fristen, Notizen, Dokumente, Sichtbarkeit und Archivstatus.
- **[im Code nachgewiesen]** Interne Felder werden vor Portalanzeige entfernt.
- **[aus der Architektur abgeleitet]** Booking ist fachlich relativ gut modelliert, aber an Customer-ID statt an ein echtes Trip-Modell gekoppelt.
- **[Empfehlung]** Buchungen sollten primär an `tripId` und optional `programItemId` hängen; `customerId` sollte nur als Denormalisierung/Indexfeld existieren.

### CRM

- **[im Code nachgewiesen]** CRM enthält Profil, Kontakt, Familie, Präferenzen, Favoriten, Reisehistorie, Kommunikation, Notizen, Aufgaben, Erinnerungen, Bewertungen und KI-Kontext.
- **[im Code nachgewiesen]** CRM-Daten werden im Entwurf gespeichert und zusätzlich in separaten Collections gespiegelt.
- **[aus der Architektur abgeleitet]** CRM ist gemischt normalisiert: Hauptakte und Detail-Collections existieren parallel.
- **[Empfehlung]** CRM sollte ein eigenes Customer-Profil sein; Notizen, Aufgaben, Kommunikation und Bewertungen sollten als Subcollections oder klar getrennte Collections mit Indizes modelliert werden.

### Documents

- **[im Code nachgewiesen]** Dokumente erscheinen in Customer-Dokumenten, Booking-Dokumenten und Template-Payloads.
- **[im Code nachgewiesen]** Dokumentfelder variieren: `url`, `downloadUrl`, `downloadURL`, `visible`, `visibleForCustomer`, `customerVisible`, `fileName`, `storagePath`, `uploadedAt`.
- **[aus der Architektur abgeleitet]** Dokumente brauchen ein zentrales Modell, da Sichtbarkeit und Sicherheit kritisch sind.
- **[Empfehlung]** Dokumente sollten als eigene Collection/Subcollection mit Owner, Trip, Booking, Sichtbarkeit, Storage-Pfad, MIME-Type, Größe, Status und Zugriffspolitik geführt werden.

### Publish

- **[im Code nachgewiesen]** Publishing arbeitet mit `draftData`, `publishedData`, `publishStatus`, `publishMeta`, `publishHistory` und Version-Backups.
- **[im Code nachgewiesen]** Veröffentlichung speichert vollständige Snapshots.
- **[aus der Architektur abgeleitet]** Vollständige Snapshots sind einfach und nachvollziehbar, werden bei großen Reisen aber speicher- und write-intensiv.
- **[Empfehlung]** Kurzfristig Snapshots behalten; mittelfristig Versionen pro Trip und Delta-/Audit-Events ergänzen.

### Templates

- **[im Code nachgewiesen]** Templates haben Typ, Titel, Beschreibung, Kategorie, Region, Saison, Dauer, Zielgruppe, Tags, Favorit, Version, Payload, Bilder, Historie, KI-Kontext und Permissions.
- **[im Code nachgewiesen]** Templates liegen nach Typ unter `templates/library/{type}/{templateId}`.
- **[aus der Architektur abgeleitet]** Das Modell ist brauchbar, aber Typen als Pfadsegmente erschweren globale Suche über alle Templates.
- **[Empfehlung]** Eine flache `templates` Collection mit `templateType` plus Indizes wäre für Suche/Pagination einfacher.

### Firebase Collections

- **[im Code nachgewiesen]** Aktuelle Collections/Pfade: `customers`, `customers/{id}/versions`, `templates/library/{type}`, `customerCrm`, `customerNotes`, `customerTasks`, `customerHistory`, `customerPreferences`, `customerRatings`, `bookings`.
- **[aus der Architektur abgeleitet]** Collections sind fachlich erkennbar, aber inkonsistent: teils Subcollection, teils Top-Level, teils gespiegelt im Customer-Dokument.

### Ideales zukünftiges Datenmodell

- **[Empfehlung]** `organizations/{orgId}` als Mandant für Alpine Concierge Tirol und spätere Standorte.
- **[Empfehlung]** `organizations/{orgId}/customers/{customerId}` für Kundenprofil ohne konkrete Reise.
- **[Empfehlung]** `organizations/{orgId}/trips/{tripId}` mit `customerId`, Status, Zeitraum, Region, Sprache, Concierge, publish state.
- **[Empfehlung]** `organizations/{orgId}/trips/{tripId}/programItems/{itemId}` für Programmpunkte.
- **[Empfehlung]** `organizations/{orgId}/bookings/{bookingId}` mit `tripId`, `customerId`, `programItemId`, Status, Fristen und Provider.
- **[Empfehlung]** `organizations/{orgId}/documents/{documentId}` mit `ownerType`, `ownerId`, `tripId`, `visibility`, `storagePath`, `downloadPolicy`.
- **[Empfehlung]** `organizations/{orgId}/crmProfiles/{customerId}` plus Subcollections oder Top-Level Collections für `tasks`, `notes`, `communications`, `ratings`.
- **[Empfehlung]** `organizations/{orgId}/templates/{templateId}` mit `templateType` als Feld.
- **[Empfehlung]** `organizations/{orgId}/publishEvents/{eventId}` und `trips/{tripId}/versions/{versionId}` für Audit und Snapshots.
- **[Empfehlung]** Public Portal Reads über `portalShares/{shareId}` oder `tripPublicSnapshots/{token}` statt über erratbare `customerId`.

## 4. Firebase

### Firestore-Struktur

- **[im Code nachgewiesen]** `loadCustomersForAdmin` lädt die komplette `customers` Collection.
- **[im Code nachgewiesen]** `loadAllBookingsForAdmin` lädt die komplette `bookings` Collection.
- **[im Code nachgewiesen]** `loadTemplatesForAdmin` liest nacheinander bis zu neun Template-Typ-Collections.
- **[im Code nachgewiesen]** `loadAllCrmForAdmin(customerIds)` ruft für jede Customer-ID `loadCrmRecord` auf; `loadCrmRecord` macht zusätzliche Queries auf Notes, Tasks und Ratings.
- **[aus der Architektur abgeleitet]** Bei wachsender Datenmenge entstehen N+1-Reads und hohe Initialisierungskosten im Admin.

### Storage

- **[im Code nachgewiesen]** Storage-Pfade liegen unter `customers/{customerId}/documents/...` und `templates/{type}/{templateId}/images/...`.
- **[im Code nachgewiesen]** Uploads verwenden `uploadBytesResumable` und erzeugen Download-URLs.
- **[aus der Architektur abgeleitet]** Download-URLs sind praktisch, aber schwer zentral zu widerrufen, wenn Zugriffsschutz später feingranular werden soll.
- **[Empfehlung]** Storage Rules an `orgId`, `tripId`, `documentId`, Rolle und Sichtbarkeit koppeln.

### Authentication und Security Rules

- **[im Code nachgewiesen]** Firebase Auth nutzt `signInAnonymously`.
- **[im Code nachgewiesen]** Admin-Autorisierung im Code ist nur ein Client-Passwort.
- **[im Code nachgewiesen]** Im Repository sind keine Firebase Rules-Dateien vorhanden.
- **[aus der Architektur abgeleitet]** Sicherheit hängt aktuell vollständig an extern konfigurierten Firebase Rules und ist aus dem Repo nicht überprüfbar.
- **[Empfehlung]** Auth muss vor weiterer Skalierung priorisiert werden: echte Nutzer, Rollen, Custom Claims, Mandantenbindung.

### Collections, die geändert werden sollten

- **[Empfehlung]** `customers` sollte in `customers` und `trips` getrennt werden.
- **[Empfehlung]** `templates/library/{type}` sollte zu flachem `templates` mit `templateType` migriert werden.
- **[Empfehlung]** `customerNotes`, `customerTasks`, `customerHistory`, `customerRatings` sollten entweder unter `customers/{id}/...` oder als mandantenfähige Top-Level Collections mit `orgId`, `customerId`, `tripId` vereinheitlicht werden.
- **[Empfehlung]** `bookings` sollte `orgId`, `tripId`, `date`, `status`, `providerId` und `visibility` als Queryfelder erhalten.
- **[Empfehlung]** Dokumente sollten eigene Metadaten-Dokumente bekommen, statt nur in Arrays an Customer/Booking zu leben.

### Fehlende Indizes

- **[aus der Architektur abgeleitet]** Für `bookings` werden Indizes auf `customerId`, `tripId`, `date`, `bookingStatus`, `paymentStatus`, `type`, `provider`, `archived` benötigt.
- **[aus der Architektur abgeleitet]** Für CRM-Tasks werden Indizes auf `customerId`, `status`, `dueDate` benötigt.
- **[aus der Architektur abgeleitet]** Für Notes/History/Ratings werden Indizes auf `customerId` plus `date`/`updatedAt` benötigt.
- **[aus der Architektur abgeleitet]** Für Templates werden Indizes auf `templateType`, `favorite`, `category`, `region`, `updatedAt` benötigt.
- **[aus der Architektur abgeleitet]** Für Trips werden Indizes auf `customerId`, `startDate`, `status`, `publicationState`, `conciergeId`, `locationId` benötigt.

### Unnötige Reads

- **[im Code nachgewiesen]** Admin lädt alle Kunden ohne Pagination.
- **[im Code nachgewiesen]** Admin lädt alle Buchungen ohne Pagination.
- **[im Code nachgewiesen]** CRM wird pro Kunde mit mehreren Queries geladen.
- **[im Code nachgewiesen]** Templates werden über mehrere Collections einzeln geladen.
- **[Empfehlung]** Dashboard-spezifische Aggregatdokumente und paginierte Listen einführen.

### Unnötige Writes

- **[im Code nachgewiesen]** `saveDraftCustomer` speichert Draft und versucht zusätzlich CRM und alle Buchungen zu speichern.
- **[im Code nachgewiesen]** `saveCustomerBookings` schreibt jede Buchung eines Kunden erneut.
- **[im Code nachgewiesen]** `saveCrmRecord` schreibt Hauptakte sowie Notes, Tasks, History, Preferences und Ratings.
- **[aus der Architektur abgeleitet]** Kleine Formularänderungen können viele Firestore-Writes auslösen.
- **[Empfehlung]** Dirty-Tracking, einzelne Repository-Updates und debounced Saves einführen.

## 5. Performance

### Befunde

- **[im Code nachgewiesen]** `admin.js` ist mit 155 KB groß und wird als einzelnes Script geladen.
- **[im Code nachgewiesen]** `customer-portal.js` ist 49 KB und rendert viele Bereiche über `innerHTML`.
- **[im Code nachgewiesen]** `video/hero.mp4` ist ca. 32 MB; mehrere Bilder liegen zwischen ca. 300 KB und 2,7 MB.
- **[im Code nachgewiesen]** Admin-Renderlogik ruft bei Eingaben in Editorbereichen `readEditors`, `renderLinks`, `renderPublishDashboard`, `renderPublishChanges`, `renderPublishHistory` und `renderAdminPreview` auf.
- **[im Code nachgewiesen]** Dashboard- und Listenfilter arbeiten clientseitig über vollständige Maps/Arrays.
- **[im Code nachgewiesen]** Open-Meteo wird im Portal live geladen und kann die Initialwahrnehmung beeinflussen.

### Priorisierte Optimierungen

1. **[Empfehlung]** P0: Admin-Daten mit Pagination/Filter laden statt kompletter Collections.
2. **[Empfehlung]** P1: `admin.js` in lazy geladene Funktionsbereiche aufteilen.
3. **[Empfehlung]** P1: Editor-Renderings debouncen und nur betroffene Panels aktualisieren.
4. **[Empfehlung]** P1: Medien komprimieren, responsive Bildgrößen und lazy loading prüfen.
5. **[Empfehlung]** P2: Templates und CRM nur bei Bedarf laden.
6. **[Empfehlung]** P2: Wetter nach dem Hauptportal rendern und cachen.
7. **[Empfehlung]** P2: Wiederholte Normalisierung bei jedem Render reduzieren.

## 6. Sicherheit

### Authentifizierung und Autorisierung

- **[im Code nachgewiesen]** Admin-Passwort `ACT2026` steht in `admin.js`.
- **[im Code nachgewiesen]** `login` akzeptiert Eingaben, wenn die normalisierte Eingabe `ACT2026` enthält, nicht zwingend exakt entspricht.
- **[im Code nachgewiesen]** `login` schreibt das Rohpasswort in die Konsole.
- **[im Code nachgewiesen]** Admin-Session wird per `sessionStorage` gesetzt.
- **[im Code nachgewiesen]** Firebase verwendet anonyme Anmeldung.
- **[Schätzung]** Sicherheitsniveau: 2/10 für produktive Kundendaten.

### Tokens und Portalzugriff

- **[im Code nachgewiesen]** Portalzugriff erfolgt über `?customer=...`.
- **[im Code nachgewiesen]** Es gibt keinen Zugriffstoken, keine Ablaufzeit, keine Revocation und keine Kundenauthentifizierung.
- **[Empfehlung]** Public-Shares mit nicht erratbaren Tokens und optional PIN/Magic Link einführen.

### LocalStorage und SessionStorage

- **[im Code nachgewiesen]** LocalStorage speichert potenziell sensible Kundendaten, CRM-Daten, Buchungen und Vorlagen.
- **[im Code nachgewiesen]** SessionStorage speichert nur Entsperrstatus, aber keine echte Identität.
- **[Empfehlung]** LocalStorage nur noch für unsensible UI-Präferenzen und Offline-Cache mit Verschlüsselungs-/Logout-Konzept nutzen.

### API Keys

- **[im Code nachgewiesen]** Firebase Web-Konfiguration inklusive API Key ist in `firebase-config.js` enthalten.
- **[aus der Architektur abgeleitet]** Firebase Web Keys sind nicht geheim, aber ohne Rules missbrauchsgefährlich.
- **[Empfehlung]** App Check, restriktive Rules und Domainbeschränkungen ergänzen.

### XSS

- **[im Code nachgewiesen]** Es gibt eine `escapeHtml`-Funktion und viele Renderstellen nutzen sie.
- **[im Code nachgewiesen]** Es gibt dennoch viele `innerHTML`-Zuweisungen mit Template-Strings.
- **[aus der Architektur abgeleitet]** XSS-Risiko ist moderat bis hoch, weil Daten aus Admin, Firestore und Import-JSON in HTML gerendert werden.
- **[Empfehlung]** DOM-Builder, Sanitizer oder komponentenbasierte Rendering-Bibliothek nutzen; alle HTML-Senken auditieren.

### CSRF

- **[aus der Architektur abgeleitet]** Klassisches CSRF ist bei direktem Firebase SDK weniger relevant als bei Cookie-basierten Server-Sessions.
- **[aus der Architektur abgeleitet]** Missbrauchsrisiko entsteht eher über schwache Auth, offene Rules und gestohlene Tokens/Sessions.

### Dateiuploads

- **[im Code nachgewiesen]** Admin prüft Kundendokument-Dateitypen clientseitig über MIME-Type-RegEx.
- **[im Code nachgewiesen]** Booking-Upload akzeptiert `.pdf,image/*,.jpg,.jpeg,.png,.webp`.
- **[aus der Architektur abgeleitet]** Clientseitige Dateitypprüfung reicht nicht; Storage Rules und ggf. Cloud Function Scanning fehlen im Repo.
- **[Empfehlung]** Maximalgrößen, erlaubte MIME-Typen, Virenscan/Quarantäne, Metadatenprüfung und Downloadberechtigungen serverseitig absichern.

## 7. PWA-Architektur

- **[im Code nachgewiesen]** Es gibt kein `manifest.json`.
- **[im Code nachgewiesen]** Es gibt keinen Service Worker.
- **[im Code nachgewiesen]** Es gibt keine Offline-Strategie, Push-Registrierung oder Installationslogik.
- **[aus der Architektur abgeleitet]** Das Projekt eignet sich grundsätzlich als PWA, weil es statisch ausgeliefert wird und zentrale App-Screens vorhanden sind.
- **[aus der Architektur abgeleitet]** Vor einer PWA müssen Auth, Datenzugriff, Cache-Grenzen und Offline-Konflikte sauber modelliert werden.

### Sinnvolle Änderungen vor PWA

- **[Empfehlung]** Auth und Portal-Share-Konzept finalisieren.
- **[Empfehlung]** Datenmodell versionieren und Offline-Konflikte definieren.
- **[Empfehlung]** Public Assets und private Kundendaten getrennt cachen.
- **[Empfehlung]** Service Worker nur nach Security-Rules-Review einführen.
- **[Empfehlung]** Push zuerst als CRM-/Reminder-Konzept fachlich definieren.

## 8. Native App

- **[im Code nachgewiesen]** Keine Capacitor-, Android- oder iOS-Projektstruktur vorhanden.
- **[aus der Architektur abgeleitet]** Der Code könnte technisch in Capacitor geladen werden, weil er browserbasiert ist.
- **[aus der Architektur abgeleitet]** Für professionelle native Apps fehlen Auth, sichere Storage-Strategie, API-Schicht, Offline-Sync, Deep Links, Push und App-spezifische Navigation.
- **[Empfehlung]** Native App erst nach PWA-Grundlage und Datenmodell-Refactoring starten.
- **[Empfehlung]** Vor Capacitor eine App-Shell mit klarer Routing-, Auth- und Repository-Schicht einführen.

## 9. Wartbarkeit

- **[aus der Architektur abgeleitet]** Neue kleine Features lassen sich aktuell schnell ergänzen, weil alles direkt im Browser und in wenigen Dateien liegt.
- **[aus der Architektur abgeleitet]** Neue große Features werden zunehmend riskant, weil Admin, Datenmodell und Firebase stark gekoppelt sind.
- **[Empfehlung]** `admin.js` sollte zuerst aufgeteilt werden.
- **[Empfehlung]** `customer-portal.js` sollte in `portal-data`, `portal-render`, `portal-weather`, `portal-calendar`, `portal-actions` zerlegt werden.
- **[Empfehlung]** `firebase-service.js` sollte in mehrere Repositories aufgeteilt werden.
- **[Empfehlung]** Sinnvolle Bibliotheken wären TypeScript, Zod oder Valibot für Schemas, Firebase Emulator Tests, Playwright für Smoke-Tests, eine kleine Routing-/Component-Struktur oder ein Framework wie React/Vite, wenn die App weiter wächst.

## 10. Zukunftssicherheit bei Wachstum

### Bei 10.000 Kunden

- **[aus der Architektur abgeleitet]** Komplettladen aller Kunden im Admin wird unbrauchbar.
- **[aus der Architektur abgeleitet]** LocalStorage-Fallback für komplette Kundendaten skaliert nicht.
- **[Empfehlung]** Server-/Firestore-seitige Pagination, Suche und Segmentierung einführen.

### Bei mehreren Mitarbeitern

- **[aus der Architektur abgeleitet]** Client-Passwort und anonyme Auth sind ungeeignet.
- **[Empfehlung]** Rollen, Rechte, Audit Log, Bearbeitungskonflikte und Mitarbeiterprofile einführen.

### Bei mehreren Standorten

- **[aus der Architektur abgeleitet]** Es fehlt Mandanten-/Standortdimension.
- **[Empfehlung]** `orgId` und `locationId` in alle zentralen Dokumente aufnehmen.

### Bei mehreren Sprachen

- **[im Code nachgewiesen]** Öffentliche Website hat Übersetzungen in JS, Kundenportal-Datenmodell enthält Sprache, aber Portaltexte sind überwiegend fest deutsch.
- **[Empfehlung]** i18n-System für Portal/Admin einführen und Inhalte von UI-Texten trennen.

### Bei tausenden Dokumenten und Buchungen

- **[aus der Architektur abgeleitet]** Arrays in Customer-Dokumenten und vollständige Snapshots werden zu groß.
- **[Empfehlung]** Dokumente und Buchungen als eigene Collections/Subcollections mit Indizes führen.

### Jetzt vs. später

- **[Empfehlung]** Jetzt: Auth, Rules, Datenmodell-Trennung, Repository-Schicht, Tests.
- **[Empfehlung]** Später: Vollständige UI-Migration auf Framework, Native App, komplexe BI-/Reporting-Funktionen, KI-Assistenz.

## 11. Refactoring Roadmap

| Prio | Arbeitspaket | Ziel | Nutzen | Aufwand | Risiko | Abhängigkeiten | Betroffene Dateien |
|---:|---|---|---|---|---|---|---|
| 1 | Auth & Security Baseline | **[Empfehlung]** Client-Passwort ersetzen, Logs entfernen, Firebase Auth/Rollen einführen. | Höchster Sicherheitsgewinn. | M | Mittel | Firebase Rules, Nutzerverwaltung | `admin.js`, `firebase-auth.js`, `firebase-service.js`, `firebase-config.js` |
| 2 | Firebase Rules & App Check | **[Empfehlung]** Zugriff technisch erzwingen. | Schutz echter Kundendaten. | M | Hoch | Auth Baseline | neue Rules-Dateien, Firebase Console |
| 3 | Datenmodell v2 | **[Empfehlung]** Customer, Trip, Booking, Document, CRM trennen. | Skalierbarkeit und Klarheit. | L | Hoch | Migrationsplan | `admin.js`, `customer-portal.js`, `firebase-service.js`, Fachbibliotheken |
| 4 | Repository-Schicht | **[Empfehlung]** Firebase-Zugriffe nach Domäne trennen. | Weniger Kopplung, bessere Tests. | M | Mittel | Datenmodell-Zielbild | `firebase-service.js`, `firebase-database.js`, `firebase-storage.js` |
| 5 | Admin-Modularisierung | **[Empfehlung]** `admin.js` in Fachmodule zerlegen. | Wartbarkeit, geringere Regressionen. | L | Mittel | Repository-Schicht hilfreich | `admin.js`, `admin.html` |
| 6 | Gemeinsame Core-Utilities | **[Empfehlung]** Date, ID, Document, Escape, Validation zentralisieren. | Weniger Duplikation. | S | Niedrig | keine | `admin.js`, `customer-portal.js`, `booking-library.js`, `crm-library.js`, `template-library.js` |
| 7 | Schema-Validierung | **[Empfehlung]** Zentrale Validatoren für Customer, Trip, Booking, Document, Template. | Bessere Datenqualität. | M | Mittel | Core-Utilities | Fachbibliotheken, Firebase-Repositories |
| 8 | Performance-Pagination | **[Empfehlung]** Admin-Listen paginieren und filtern. | Skalierung auf viele Kunden. | M | Mittel | Indizes | `admin.js`, Firebase-Repositories |
| 9 | Portal-Aktionsbackend | **[Empfehlung]** Bestätigung, Änderungswunsch, Zahlung/PDF technisch anbinden. | Kundenportal wird transaktional. | M | Mittel | Auth/Share-Konzept | `customer-portal.js`, Firebase-Repositories |
| 10 | PWA-Grundlage | **[Empfehlung]** Manifest, Service Worker, Cache-Policy, Offline-Fallback. | Installierbarkeit und mobile Qualität. | M | Mittel | Auth, Cache-Konzept | neue PWA-Dateien, `index.html`, Portal |
| 11 | Testbasis | **[Empfehlung]** Playwright Smoke-Tests und Firebase Emulator Tests. | Release-Sicherheit. | M | Niedrig | optional Build-Setup | neue Test-/Config-Dateien |
| 12 | UI-Komponenten/Framework prüfen | **[Empfehlung]** Vite/React oder leichte Component-Struktur evaluieren. | Langfristige Produktivität. | L | Mittel | Modularisierung | gesamter Frontend-Code |

## 12. Gesamtbewertung

| Bereich | Score | Begründung |
|---|---:|---|
| Architektur | 4/10 | **[aus der Architektur abgeleitet]** Gute fachliche Ansätze, aber clientseitiger Monolith und schwache Schichten. |
| Codequalität | 5/10 | **[im Code nachgewiesen]** Syntax sauber und Namen brauchbar, aber große Dateien und Duplikation. |
| Skalierbarkeit | 3/10 | **[aus der Architektur abgeleitet]** Komplettreads, LocalStorage und fehlende Pagination limitieren Wachstum. |
| Sicherheit | 2/10 | **[im Code nachgewiesen]** Hart codiertes Passwort, Passwort-Logs, anonyme Auth, keine Rules im Repo. |
| Wartbarkeit | 4/10 | **[aus der Architektur abgeleitet]** Fachmodule helfen, aber Admin/Firebase sind zu groß. |
| Firebase | 4/10 | **[im Code nachgewiesen]** Funktional angebunden, aber Struktur, Auth, Indizes und Rules fehlen als belastbare Architektur. |
| Datenmodell | 4/10 | **[aus der Architektur abgeleitet]** Viele Daten vorhanden, aber Customer/Trip/CRM/Booking sind vermischt und redundant. |
| Erweiterbarkeit | 5/10 | **[aus der Architektur abgeleitet]** Kurzfristig hoch, langfristig riskant ohne Refactoring. |
| PWA-Bereitschaft | 2/10 | **[im Code nachgewiesen]** Keine PWA-Dateien; statische Basis ist aber nutzbar. |
| Native-App-Bereitschaft | 1/10 | **[im Code nachgewiesen]** Keine native Struktur; wichtige App-Grundlagen fehlen. |

## 13. Executive Summary

1. **Was ist die größte Stärke des Projekts?**  
   **[im Code nachgewiesen]** Die größte Stärke ist die bereits vorhandene fachliche Breite: Website, Admin, Kundenportal, Firebase, Publishing, CRM, Buchungen und Vorlagen sind als echte browserseitige Funktionen vorhanden.

2. **Was ist die größte Schwäche?**  
   **[im Code nachgewiesen]** Die größte Schwäche ist die Sicherheits- und Architekturkopplung: Admin-Passwort im Client, Passwort-Logging, anonyme Firebase Auth und sehr große Dateien mit gemischten Verantwortlichkeiten.

3. **Welche drei Maßnahmen bringen den größten Qualitätsgewinn?**  
   **[Empfehlung]** Erstens echte Auth/Rollen plus Firebase Rules.  
   **[Empfehlung]** Zweitens Datenmodell-Trennung in Customer, Trip, Booking, Document und CRM.  
   **[Empfehlung]** Drittens Aufteilung von `admin.js` und `firebase-service.js` in Fachmodule und Repositories.

4. **Würdest du auf dieser Architektur weiterentwickeln oder Teile neu strukturieren?**  
   **[Empfehlung]** Ich würde nicht komplett neu bauen, weil viel Fachwissen im Code steckt. Ich würde aber vor großen neuen Features die sicherheitskritischen und strukturellen Teile neu schneiden: Auth, Datenmodell, Firebase-Repositories und Admin-Modularisierung.

5. **Ist die aktuelle Architektur geeignet, Alpine Concierge Tirol langfristig als professionelle Concierge-Plattform mit Website, Kundenportal, Management Center, PWA und nativen Apps zu betreiben?**  
   **[Schätzung]** In der aktuellen Form ist sie als Prototyp bzw. internes Frühstadium geeignet, aber nicht als langfristige professionelle Plattform.  
   **[aus der Architektur abgeleitet]** Mit gezieltem Refactoring kann die bestehende Codebasis als fachliche Grundlage dienen.  
   **[Empfehlung]** Für langfristigen Betrieb sollten Sicherheit, Datenmodell, Modularisierung, Tests, PWA-Strategie und später native App-Shell vor weiterem Feature-Ausbau priorisiert werden.

## 14. Prüfnotizen

- **[im Code nachgewiesen]** JavaScript-Syntaxprüfung mit Node `--check` wurde für alle JS-Dateien erneut erfolgreich ausgeführt.
- **[im Code nachgewiesen]** Es wurden keine `package.json`, `manifest.json`, Service-Worker-Dateien, Firebase Rules, `firebase.json`, `firestore.indexes.json` oder Capacitor-Konfigurationen gefunden.
- **[im Code nachgewiesen]** `PROJECT_STATUS.md` ist im Arbeitsbaum uncommitted und wurde als Kontextdatei berücksichtigt.
