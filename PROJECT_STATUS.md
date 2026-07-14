# PROJECT_STATUS.md

Stand: 14.07.2026  
Projekt: `C:\GitHub\AC-Homepage`  
Analyseumfang: alle sichtbaren Projektdateien und Unterordner ohne Codeänderungen; lokale Git-Änderungen geprüft.

## 1. Analysebasis

- [im Code nachgewiesen] Der Git-Arbeitsbaum ist sauber: `git status --short` lieferte keine lokalen Änderungen.
- [im Code nachgewiesen] Es gibt keine Paket-/Build-Konfiguration wie `package.json`; das Projekt ist eine statische Website mit eigenständigem Kundenportal.
- [im Code nachgewiesen] JavaScript-Syntaxprüfung mit Node `--check` war erfolgreich für:
  - `js/script.js`
  - `js/faq.js`
  - `customer-portal/admin.js`
  - `customer-portal/customer-portal.js`
  - `customer-portal/firebase-service.js`
  - `customer-portal/booking-library.js`
  - `customer-portal/crm-library.js`
  - `customer-portal/publish-workflow.js`
  - `customer-portal/template-library.js`
- [im Code nachgewiesen] `.agents` und `.codex` enthalten im aktuellen Arbeitsbaum keine relevanten Projektdateien.

## 2. Tatsächlich vorhandene Funktionen

### Öffentliche Website

- [im Code nachgewiesen] Mehrsprachige Landingpage mit Deutsch, Englisch, Italienisch und Französisch ist in `index.html`, `js/script.js`, `js/faq.js`, `css/style.css` und `css/faq.css` umgesetzt.
- [im Code nachgewiesen] Sprachwahl wird über `localStorage` mit Key `act_lang` gespeichert (`js/script.js`, `js/faq.js`).
- [im Code nachgewiesen] Cookie-Hinweis wird über `localStorage` mit Key `act_cookie_notice` gespeichert (`js/script.js`).
- [im Code nachgewiesen] Anfrageformular erzeugt eine WhatsApp-Nachricht und öffnet WhatsApp (`js/script.js`, Funktion `sendWhatsApp`).
- [im Code nachgewiesen] FAQ-Suche und FAQ-Rendering sind vorhanden (`js/faq.js`).
- [im Code nachgewiesen] Rechtliche Seiten sind vorhanden: `impressum.html`, `datenschutz.html`, `agb.html`, `cookies.html`.
- [im Code nachgewiesen] SEO-Grundlagen sind vorhanden: `robots.txt`, `sitemap.xml`, Canonical-URL und Metadaten in `index.html`.

Status: vollständig für statische Website-Grundfunktion, teilweise für echte Anfrageverarbeitung, weil kein Backend/CRM-Autoimport aus dem Formular vorhanden ist.

### Kundenportal

- [im Code nachgewiesen] Kundenportal-Oberfläche ist vorhanden in `customer-portal/index.html`, `customer-portal/customer-portal.js`, `customer-portal/customer-portal.css`.
- [im Code nachgewiesen] Portal lädt Daten in dieser Reihenfolge: Firestore `publishedData`, dann `localStorage` veröffentlichter Snapshot, dann Demo-Daten (`customer-portal/customer-portal.js`, `loadCustomerData`).
- [im Code nachgewiesen] Portal zeigt Reise-Metadaten, Statusfortschritt, Kalender, Gesamt-Timeline, Tagesprogramm, Programmdetails, Buchungen, Unterkunft, Wetter, Dokumente, Kontakt, Aktionen und Historie.
- [im Code nachgewiesen] Wetter wird live über Open-Meteo geladen, falls Wetter-Ort oder Koordinaten vorhanden sind (`customer-portal/customer-portal.js`).
- [im Code nachgewiesen] Kalenderexport als `.ics` ist vorhanden (`customer-portal/customer-portal.js`, `buildIcsContent`, `downloadTripCalendar`).
- [im Code nachgewiesen] Druckfunktion nutzt `window.print()`.
- [im Code nachgewiesen] Dokumente werden nur angezeigt, wenn sie sichtbar sind und eine URL besitzen (`customer-portal/customer-portal.js`, `isPortalDocument`, `renderDocuments`).

Status: teilweise produktionsnah, aber ohne echte Kundenanmeldung, ohne PDF-Erzeugung, ohne Bestätigungsworkflow und ohne PWA/offline.

### Admin / Kundenverwaltung

- [im Code nachgewiesen] Admin-Oberfläche ist vorhanden in `customer-portal/admin.html`, `customer-portal/admin.js`, `customer-portal/admin.css`.
- [im Code nachgewiesen] Admin verwendet ein hart codiertes Passwort `ACT2026` und merkt Entsperrung in `sessionStorage` mit Key `act_customer_portal_admin_unlocked` (`customer-portal/admin.js`).
- [im Code nachgewiesen] Kunden/Reisen können angelegt, bearbeitet, dupliziert, gelöscht, lokal gespeichert, als JSON exportiert/importiert und nach Firebase migriert werden.
- [im Code nachgewiesen] Admin verwaltet Stammdaten, Programmpunkte, Unterkunft, Dokumente, Veröffentlichung, Historie, CRM, Buchungen und Vorlagen.
- [im Code nachgewiesen] Dokumentenupload ist an Firebase Storage angebunden (`customer-portal/admin.js`, `uploadDocument`; `customer-portal/firebase-service.js`, `uploadCustomerDocument`).

Status: funktional als internes Werkzeug, aber sicherheitstechnisch nicht produktionsreif.

### Firebase / Speicher

- [im Code nachgewiesen] Firebase ist aktiviert (`customer-portal/firebase-config.js`, `enabled:true`) und verwendet Projekt `alpine-concierge-tirol`.
- [im Code nachgewiesen] Firebase SDK wird dynamisch von `https://www.gstatic.com/firebasejs/10.12.5/...` importiert (`customer-portal/firebase-service.js`).
- [im Code nachgewiesen] Authentifizierung erfolgt anonym (`signInAnonymously`) ohne Rollenprüfung im Client.
- [im Code nachgewiesen] Firestore-Struktur für Kunden trennt `draftData` und `publishedData`.
- [im Code nachgewiesen] Firebase Storage lädt Kundendokumente, Buchungsdokumente und Vorlagenbilder hoch.
- [im Code nachgewiesen] LocalStorage-Fallback existiert für Kunden (`act_customer_portal_customers`) und Vorlagen (`act_template_library`).

Status: technisch vorhanden, aber abhängig von korrekten Firebase Security Rules und nicht ausreichend abgesichert durch App-Code.

### Publishing

- [im Code nachgewiesen] Veröffentlichungsworkflow trennt Entwurf und Live-Version (`customer-portal/publish-workflow.js`, `customer-portal/firebase-service.js`).
- [im Code nachgewiesen] Validierung vor Veröffentlichung prüft Kundenname, Reisebezeichnung, Telefon/WhatsApp, Zeitraum, Programmtitel, Programmdatum, Dokument-URLs, Unterkunft und Concierge.
- [im Code nachgewiesen] Versionierung, Änderungserkennung, Historie, Backup und Restore sind implementiert.
- [im Code nachgewiesen] Benachrichtigung erzeugt WhatsApp-/E-Mail-Text, versendet aber nicht automatisch.

Status: weitgehend vollständig für manuelle Veröffentlichung, teilweise für Kommunikation.

### CRM

- [im Code nachgewiesen] CRM-Kernlogik ist vorhanden (`customer-portal/crm-library.js`).
- [im Code nachgewiesen] Admin-CRM enthält Profil, Kontakt, Familie, Präferenzen, Reisehistorie, Kommunikation, Notizen, Aufgaben, Erinnerungen und Bewertungen.
- [im Code nachgewiesen] CRM wird aus veröffentlichtem Kundensnapshot entfernt (`stripCrmForPortal` / Publishing-Snapshot).
- [im Code nachgewiesen] CRM-Firestore-Collections sind vorbereitet und genutzt: `customerCrm`, `customerNotes`, `customerTasks`, `customerHistory`, `customerPreferences`, `customerRatings`.
- [im Code nachgewiesen] Erinnerungen sind nur vorbereitet; in `admin.html` steht „noch ohne Push-Benachrichtigungen“.

Status: teilweise vollständig als internes CRM, vorbereitet für Erinnerungen/KI, nicht vollständig für Automatisierung.

### Buchungsmanagement

- [im Code nachgewiesen] Buchungslogik ist vorhanden (`customer-portal/booking-library.js`).
- [im Code nachgewiesen] Admin bietet Buchungsdashboard, Filter, Status, Fristen, JSON-/CSV-Export, Archivierung, Dokumentupload und Verknüpfung mit Programmpunkten.
- [im Code nachgewiesen] Buchungen werden in `customer.bookings[]` und Firestore Collection `bookings` gespeichert.
- [im Code nachgewiesen] Kundensicht entfernt interne Felder wie `internalPrice`, `margin`, `internalNote`, `providerRef`.
- [im Code nachgewiesen] Sichtbarkeit im Kundenportal wird über `visibleForCustomer` gesteuert.

Status: funktional, aber ohne Anbieter-Stammdatenmodul, ohne Zahlungsintegration und ohne automatische Bestätigungs-/Kommunikationsprozesse.

### Vorlagenbibliothek

- [im Code nachgewiesen] Vorlagenbibliothek ist vorhanden (`customer-portal/template-library.js`).
- [im Code nachgewiesen] Komplettreisen und Bausteine können gespeichert, gesucht, favorisiert, dupliziert, exportiert, importiert, in Firebase migriert und auf neue Reisen angewendet werden.
- [im Code nachgewiesen] Vorlagen filtern personenbezogene Daten heraus.
- [im Code nachgewiesen] KI-Kontext ist nur als Datenstruktur vorbereitet.

Status: weitgehend vollständig für manuelle Vorlagenarbeit, vorbereitet für Rollen/KI.

## 3. Vollständig, teilweise, vorbereitet oder nicht vorhanden

| Bereich | Status | Aussage |
|---|---:|---|
| Öffentliche Website | vollständig | [im Code nachgewiesen] Inhalte, Navigation, Sprachen, FAQ, WhatsApp-CTA und rechtliche Seiten sind vorhanden. |
| Anfrageformular | teilweise | [im Code nachgewiesen] Erstellt WhatsApp-Text; [aus der Struktur abgeleitet] keine Serververarbeitung, keine CRM-Übernahme. |
| Kundenportal | teilweise | [im Code nachgewiesen] Anzeige, Kalender, Wetter, Dokumente und Buchungen vorhanden; PDF, Login und Bestätigung fehlen. |
| Admin-Kundenverwaltung | teilweise | [im Code nachgewiesen] CRUD und Veröffentlichung vorhanden; [im Code nachgewiesen] Schutz nur per Client-Passwort. |
| Firebase | teilweise | [im Code nachgewiesen] Firestore/Storage/Auth angebunden; [geschätzt] produktionssicher nur mit strengen externen Rules. |
| Publishing | weitgehend vollständig | [im Code nachgewiesen] Entwurf/Live, Vergleich, Historie, Backup und Restore vorhanden. |
| CRM | teilweise | [im Code nachgewiesen] Kundenakte und Firestore-Spiegel vorhanden; Push/Automationen fehlen. |
| Buchungen | teilweise | [im Code nachgewiesen] Verwaltung und Portalfilter vorhanden; Anbieter-/Zahlungs-/Kommunikationsprozesse fehlen. |
| Kommunikation | vorbereitet/teilweise | [im Code nachgewiesen] WhatsApp-/Mailto-Texte; [im Code nachgewiesen] kein automatischer Versand. |
| PDF | vorbereitet/nicht vorhanden | [im Code nachgewiesen] Button existiert; Aktion zeigt nur Hinweis. |
| QR-Codes | nicht vorhanden | [im Code nachgewiesen] nur CSS-Klasse `.qr-placeholder`, keine QR-Generierung. |
| PWA | nicht vorhanden | [im Code nachgewiesen] kein Manifest, kein Service Worker, keine Offline-Strategie. |
| Native App | nicht vorhanden | [aus der Struktur abgeleitet] kein Capacitor/Cordova/React Native/Android/iOS-Projekt. |
| Tests | nicht vorhanden | [aus der Struktur abgeleitet] keine Testdateien, keine Test-/Build-Konfiguration. |

## 4. Nicht technisch angeschlossene Oberflächen, Buttons und Menüpunkte

- [im Code nachgewiesen] `customer-portal/customer-portal.js`, Aktion `PDF herunterladen`: Button wird in `renderActions` erzeugt, aber `bindActions` zeigt nur `window.alert("PDF-Erstellung wird in einem späteren Schritt angebunden.")`.
- [im Code nachgewiesen] `customer-portal/customer-portal.js`, Aktion `Programm bestätigen`: Button zeigt nur `window.alert("Danke. Die echte Bestätigung wird in einem späteren Schritt angebunden.")`.
- [im Code nachgewiesen] `customer-portal/admin.html`, CRM-Erinnerungen: UI ist vorhanden, Text sagt „Vorbereitet – noch ohne Push-Benachrichtigungen.“
- [im Code nachgewiesen] `customer-portal/admin.js`, Benachrichtigungsdialog: WhatsApp wird geöffnet und E-Mail per `mailto:` vorbereitet; kein API-Versand, keine Zustellverfolgung.
- [im Code nachgewiesen] `customer-portal/customer-portal.css`, `.qr-placeholder`: Styling existiert, aber keine QR-Code-Erzeugung in JS.
- [aus der Struktur abgeleitet] Admin-Navigationsanker wie `#data-flow`, `#live-preview`, `#publish-history` sind Scroll-/Abschnittsanker und keine eigenständigen Prozesse.

## 5. Verarbeitete Daten und Speichermechanismen

### LocalStorage

- [im Code nachgewiesen] `act_lang`: Sprache der öffentlichen Website.
- [im Code nachgewiesen] `act_cookie_notice`: akzeptierter Cookie-Hinweis.
- [im Code nachgewiesen] `act_customer_portal_customers`: lokale Admin-Kunden/Reisen inklusive Entwurf, veröffentlichter Snapshot, CRM, Buchungen und Historie.
- [im Code nachgewiesen] `act_template_library`: lokale Vorlagenbibliothek.

### SessionStorage

- [im Code nachgewiesen] `act_customer_portal_admin_unlocked`: Admin-Entsperrung für aktuelle Browser-Session.

### Firestore

- [im Code nachgewiesen] `customers/{customerId}` mit `draftData`, `publishedData`, `publishStatus`, `publishMeta`, `publishHistory`, `updatedAt`, `lastUpdated`.
- [im Code nachgewiesen] `customers/{customerId}/versions/{versionId}` für Veröffentlichungsbackups.
- [im Code nachgewiesen] `templates/library/{type}/{templateId}` für Vorlagen.
- [im Code nachgewiesen] `customerCrm`, `customerNotes`, `customerTasks`, `customerHistory`, `customerPreferences`, `customerRatings`.
- [im Code nachgewiesen] `bookings/{bookingId}` für Buchungen.

### Firebase Storage

- [im Code nachgewiesen] Kundendokumente unter `customers/{customerId}/documents/{documentType}/{timestamp}-{filename}`.
- [im Code nachgewiesen] Vorlagenbilder unter `templates/{type}/{templateId}/images/{timestamp}-{filename}`.
- [im Code nachgewiesen] Buchungsdokumente über `uploadBookingDocument`, intern unter Kundendokumentpfad mit Typ `bookings/{bookingId}/{type}`.

### Externe Dienste / Browserfunktionen

- [im Code nachgewiesen] WhatsApp über `wa.me` und `api.whatsapp.com`.
- [im Code nachgewiesen] E-Mail über `mailto:`.
- [im Code nachgewiesen] Wetter über Open-Meteo Geocoding und Forecast API.
- [im Code nachgewiesen] Google Analytics `gtag` Snippets sind in HTML-Seiten vorhanden.
- [im Code nachgewiesen] Google Maps Links werden als Navigationslinks erzeugt bzw. verwendet.

## 6. Fehlerquellen bei neuen Kunden, Uploads, Veröffentlichungen und fehlenden Informationen

| Priorität | Datei | Funktion | Problem | Wahrscheinliche Ursache | Empfohlene Lösung |
|---|---|---|---|---|---|
| P0 | `customer-portal/admin.js` | `login` | Admin-Passwort ist hart codiert und wird inklusive Eingabe per `console.log("Passwort:", rawValue)` ausgegeben. | Debug-Code und clientseitiger Passwortschutz. | Sofort entfernen; echte Firebase Auth mit Rollen/Claims und server-/rulebasierter Zugriffskontrolle einführen. |
| P0 | `customer-portal/firebase-service.js` | `init`, Firestore/Storage-Operationen | Anonyme Anmeldung steuert Admin- und Kundenoperationen nicht nach Rollen. | Client vertraut auf externe Firebase Rules; im Code keine Admin-Autorisierung. | Security Rules strikt trennen: Admin writes nur für Admin-Claims, Public reads nur für veröffentlichte Daten. |
| P1 | `customer-portal/customer-portal.js` | `bindActions` | „Programm bestätigen“ speichert keine Bestätigung. | Button ist Platzhalter. | Bestätigungsobjekt mit Zeit, Kunde, Version, Kommentar in Firestore speichern und Admin anzeigen. |
| P1 | `customer-portal/customer-portal.js` | `bindActions` | „PDF herunterladen“ erzeugt kein PDF. | PDF-Generator fehlt. | Browserdruck sauber stylen oder PDF-Erzeugung mit serverseitigem Render/PDF-Service implementieren. |
| P1 | `customer-portal/publish-workflow.js` | `validateForPublish` | Veröffentlichung kann trotz fehlender E-Mail, Navigation, Buchungsbestätigung oder Wetterdaten möglich sein. | Validierung prüft nur Kernfelder. | Validierungsstufen einführen: Blocker, Warnungen, Qualitätscheck pro Reiseart. |
| P1 | `customer-portal/admin.js` | `newCustomer`, `saveDraftToFirebase` | Neue Kunden werden lokal sofort nutzbar, aber Firestore-Speicherung kann still auf lokalen Fallback zurückfallen. | Firebase-Fehler werden im Status angezeigt, blockieren aber lokalen Workflow nicht. | Expliziten Sync-Status pro Kunde speichern und vor Veröffentlichung hervorheben. |
| P1 | `customer-portal/admin.js` | `uploadDocument`, `uploadBookingDocument` | Upload hängt von Firebase Auth/Storage Rules ab; bei Fehlern bleibt nur Link-Feld/manueller Fallback. | Storage-Upload ist direkt clientseitig. | Upload-Regeln testen, Dateigröße validieren, Retry/Fehlercode-Hilfe und serverseitige Prüfoption ergänzen. |
| P1 | `customer-portal/firebase-service.js` | `loadCustomersForAdmin` | Admin lädt alle Kunden aus `customers`; bei vielen Kunden ohne Paging. | `getDocs(collection(...))` ohne Limit/Pagination. | Pagination, Suche/Indexierung und serverseitige Filter ergänzen. |
| P2 | `customer-portal/booking-library.js` | `validateBooking`, `bookingWarnings` | Fehlende Bestätigungsnummer und Dokumente sind nur Warnungen, keine Blocker. | Buchungen dürfen auch unfertig gespeichert werden. | Beim Veröffentlichen kundensichtbarer Buchungen strengere Regeln anwenden. |
| P2 | `customer-portal/customer-portal.js` | `loadOpenMeteoWeather` | Wetter kann für entfernte Reisedaten oder fehlende Koordinaten ausfallen. | Open-Meteo liefert nur begrenzte Vorhersagezeiträume; Stammdaten optional. | Wetterstatus bereits im Admin prüfen und Kundenportal mit geplantem Hinweistext befüllen. |
| P2 | `customer-portal/template-library.js` | Vorlagenimport | Import erfolgt aus Textfeld ohne Schema-/Versionsmigration über Grundnormalisierung hinaus. | JSON-Import ist bewusst einfach gehalten. | Import-Preview, Schema-Versionen und Konfliktprüfung ergänzen. |
| P2 | `js/script.js` | `sendWhatsApp` | Öffentliche Anfragen landen nicht strukturiert im CRM. | Nur WhatsApp-Deep-Link, kein Backend. | Optionales Anfrage-Backend oder Firestore-Lead-Collection mit Consent einführen. |

## 7. Was für zentrale Zielbereiche noch fehlt

### Kundenportal

- [im Code nachgewiesen] Es fehlt echte Kunden-Authentifizierung; Portal wird über `customer` URL-Parameter geladen.
- [im Code nachgewiesen] Es fehlt echte Programmbestätigung.
- [im Code nachgewiesen] Es fehlt PDF-Download.
- [aus der Struktur abgeleitet] Es fehlt ein revisionssicherer Kundenaktivitätsverlauf.
- [geschätzt] Es fehlt ein sauberer Public-Link-Schutz, z. B. Token statt erratbarer Kunden-ID.

### Buchungsmanagement

- [im Code nachgewiesen] Anbieter-Stammdaten sind nur vorbereitet (`providerRef`).
- [im Code nachgewiesen] Zahlungsstatus wird gepflegt, aber keine Zahlungsintegration ist vorhanden.
- [im Code nachgewiesen] Buchungsbestätigungen werden nicht automatisch von E-Mail/Anbieter importiert.
- [aus der Struktur abgeleitet] Es fehlt ein Kalender-/Reminder-System für Fristen außerhalb des Admin-Dashboards.

### Kommunikation

- [im Code nachgewiesen] WhatsApp und E-Mail werden nur vorbereitet/geöffnet.
- [im Code nachgewiesen] CRM-Kommunikation ist manuell.
- [im Code nachgewiesen] Push-Benachrichtigungen fehlen.
- [aus der Struktur abgeleitet] Es fehlt Versandprotokoll, Zustellstatus, Opt-in/Opt-out und Vorlagenmanagement für Nachrichten.

### PDF

- [im Code nachgewiesen] PDF-Aktion ist Platzhalter.
- [aus der Struktur abgeleitet] Es gibt keine PDF-Bibliothek, keine Druckvorlage, keine serverseitige PDF-Erzeugung.

### QR-Codes

- [im Code nachgewiesen] Keine QR-Code-Bibliothek und keine QR-Code-Generierung vorhanden.
- [im Code nachgewiesen] Nur `.qr-placeholder` in CSS vorhanden.

### PWA

- [im Code nachgewiesen] Kein `manifest.json`, kein Service Worker, keine Cache-Strategie, keine Install-Prompts.
- [aus der Struktur abgeleitet] Offline-Verfügbarkeit, Push und App-Icons sind nicht umgesetzt.

### Native App

- [aus der Struktur abgeleitet] Kein nativer App-Wrapper, keine Android/iOS-Projektstruktur, keine App-Store-Konfiguration.
- [geschätzt] App-Bereitschaft hängt zuerst von PWA, Auth, Offline und Datenschutz ab.

## 8. Dateien nach Funktionsbereich

| Funktion | Dateien |
|---|---|
| Öffentliche Website | `index.html`, `css/style.css`, `css/faq.css`, `js/script.js`, `js/faq.js`, `images/**`, `video/**` |
| Rechtliches/SEO | `impressum.html`, `datenschutz.html`, `agb.html`, `cookies.html`, `robots.txt`, `sitemap.xml`, `favicon.ico` |
| Kundenportal UI | `customer-portal/index.html`, `customer-portal/customer-portal.js`, `customer-portal/customer-portal.css` |
| Admin UI | `customer-portal/admin.html`, `customer-portal/admin.js`, `customer-portal/admin.css` |
| Demo-/Fallback-Daten | `customer-portal/customer-data.js`, `customer-portal/demo-examples.js` |
| Firebase | `customer-portal/firebase-config.js`, `customer-portal/firebase-service.js`, `customer-portal/firebase-auth.js`, `customer-portal/firebase-database.js`, `customer-portal/firebase-storage.js`, `customer-portal/FIREBASE-SETUP.md` |
| Publishing | `customer-portal/publish-workflow.js`, `customer-portal/PUBLISHING.md`, Teile von `admin.js`, `customer-portal.js`, `firebase-service.js` |
| CRM | `customer-portal/crm-library.js`, `customer-portal/CRM.md`, Teile von `admin.js`, `admin.html`, `firebase-service.js`, `firebase-database.js` |
| Buchungen | `customer-portal/booking-library.js`, `customer-portal/BOOKINGS.md`, Teile von `admin.js`, `admin.html`, `customer-portal.js`, `firebase-service.js` |
| Vorlagen | `customer-portal/template-library.js`, `customer-portal/TEMPLATES.md`, Teile von `admin.js`, `admin.html`, `firebase-service.js` |
| Medien | `images/**`, `video/hero.mp4`, `video/hero-poster.jpg`, `video/hero-poster.png` |

## 9. Technische, sicherheitsrelevante und strukturelle Risiken

- [im Code nachgewiesen] P0: Clientseitiges Admin-Passwort `ACT2026` ist im Code sichtbar.
- [im Code nachgewiesen] P0: Login-Funktion loggt die rohe Passworteingabe in die Browser-Konsole.
- [im Code nachgewiesen] P0: Firebase nutzt anonyme Anmeldung; ohne restriktive Rules könnten Kundendaten, CRM-Daten, Buchungen und Uploads gefährdet sein.
- [im Code nachgewiesen] P1: Firestore Web-Konfiguration ist öffentlich im Repo. Das ist bei Firebase Web grundsätzlich üblich, erhöht aber die Bedeutung korrekter Rules.
- [im Code nachgewiesen] P1: Admin- und Kundenportal laufen vollständig clientseitig; jede Admin-Logik ist im Browser sichtbar.
- [im Code nachgewiesen] P1: Kundenportal-Links basieren auf Kunden-ID im URL-Parameter; kein Zugriffstoken/Session-Konzept.
- [im Code nachgewiesen] P1: LocalStorage enthält potenziell personenbezogene Kunden-, CRM- und Buchungsdaten.
- [im Code nachgewiesen] P1: Es gibt keine automatisierten Tests, keine CI-Konfiguration und keine Build-Pipeline.
- [aus der Struktur abgeleitet] P1: Große Einzeldatei `customer-portal/admin.js` mit 3304 Zeilen erschwert Wartung und Fehlerisolation.
- [im Code nachgewiesen] P2: Debug-Logs geben viele interne Datenzustände aus, z. B. Dokumente, Veröffentlichungen, Firebase-Rohdaten.
- [aus der Struktur abgeleitet] P2: Kein zentrales Datenmodell/Schema; Normalisierung ist verteilt über Admin, Portal, Firebase, CRM, Booking, Templates.
- [im Code nachgewiesen] P2: Firestore-Reads für Admin laden ganze Collections ohne Paging.
- [geschätzt] P2: Mediengrößen sind hoch; Performance auf mobilen Verbindungen kann leiden.

## 10. Empfohlene nächste zehn Arbeitspakete

1. [geschätzt] P0-Sicherheitsfix: Passwort-Logs entfernen, hart codiertes Admin-Passwort ersetzen, echte Firebase Auth mit Admin-Rollen/Claims einführen.
2. [geschätzt] Firebase Security Rules finalisieren und testen: Public nur `publishedData`, Admin nur mit Rollen, Storage nur kontrollierte Uploadpfade.
3. [geschätzt] Kundenportal-Linkschutz einführen: nicht erratbare Access Tokens, Ablauf/Revocation, optional PIN oder Magic Link.
4. [geschätzt] Datenmodell konsolidieren: gemeinsames Schema für Customer, CRM, Booking, Document, Template, PublishMeta; Migration für vorhandene Daten.
5. [geschätzt] Veröffentlichungs-Qualitätscheck erweitern: Buchungen, Dokumente, Navigation, E-Mail, Wetter, sichtbare Pflichtfelder, Warnungen vs. Blocker.
6. [geschätzt] PDF-Funktion umsetzen: druckoptimierte Reiseunterlagen oder serverseitig erzeugtes PDF mit Version, Kunde, QR/Link und Dokumentliste.
7. [geschätzt] Kundenbestätigung technisch anbinden: Bestätigung, Änderungsfreigabe, Kommentar, Timestamp und Admin-Dashboard.
8. [geschätzt] Buchungsmanagement erweitern: Anbieter-Stammdaten, Fristen-Erinnerungen, Zahlungs-/Bestätigungsstatus und saubere Veröffentlichungssperren.
9. [geschätzt] PWA-Grundlage bauen: Manifest, Service Worker, Icons, Offline-Fallback, Cache-Strategie, Installierbarkeit.
10. [geschätzt] Test- und Release-Basis schaffen: Smoke-Tests für Admin/Portal, Firebase-Emulator-Tests, statische Checks, Deploy-Checkliste und Monitoring.

## 11. Fortschrittseinschätzung

- Gesamtfortschritt: 55% [geschätzt]  
  Begründung: Viele Kernmodule sind tatsächlich vorhanden, aber Auth, Sicherheit, Tests, PWA, PDF und echte Kommunikation fehlen.

- Produktionsreife: 35% [geschätzt]  
  Begründung: Fachliche Abläufe sind weit fortgeschritten, aber Admin-Schutz, Firebase-Rules-Abhängigkeit, fehlende Tests und fehlende Rollen machen echten Kundendatenbetrieb riskant.

- PWA-Bereitschaft: 10% [geschätzt]  
  Begründung: Responsive Weboberflächen und Icons existieren teilweise, aber Manifest, Service Worker, Offline, Installierbarkeit und Push fehlen.

- Native-App-Bereitschaft: 5% [geschätzt]  
  Begründung: Keine native Projektstruktur vorhanden; vor nativer App müssen Auth, PWA/Offline, Datenschutz und API-Grenzen geklärt werden.

## 12. Kurzfazit

[im Code nachgewiesen] Das Projekt ist deutlich mehr als eine statische Homepage: Es enthält ein umfangreiches clientseitiges Adminsystem mit Kundenportal, Publishing, Firebase, CRM, Buchungen und Vorlagen.  
[im Code nachgewiesen] Die größten funktionalen Lücken sind PDF, echte Bestätigung, Push/Kommunikation, QR, PWA und native App.  
[im Code nachgewiesen] Das größte Risiko ist Sicherheit: hart codiertes Admin-Passwort, Passwort-Logging, anonyme Firebase Auth und vollständig clientseitige Adminlogik.  
[geschätzt] Der sinnvollste nächste Schritt ist nicht Feature-Ausbau, sondern Absicherung und Datenmodell-Stabilisierung, damit vorhandene Funktionen zuverlässig mit echten Kundendaten betrieben werden können.
