# Firebase Security Design

Stand: 2026-07-14

Dieser Entwurf dokumentiert die aktuelle Firebase-Nutzung und bereitet sichere Firestore- und Storage-Regeln vor. Er ist bewusst restriktiv und wurde nicht deployed.

## 1. Aktuelle Firebase-Struktur

### Firestore

| Pfad | Zweck | Aktueller Inhalt |
|---|---|---|
| `customers/{customerId}` | Zentrale Kunden-/Reisedokumente | `draftData`, `publishedData`, `publishStatus`, `publishMeta`, `publishHistory`, Zeitstempel |
| `customers/{customerId}/versions/{versionId}` | Backup vorheriger Live-Versionen | Version, Publisher, Kommentar, Changes, `publishedData` |
| `templates/library/{type}/{templateId}` | Vorlagenbibliothek nach Typ | Template-Metadaten, Payload, Bilder, Historie, AI-Kontext |
| `customerCrm/{customerId}` | CRM-Hauptakte | Profil, Kontakt, Familie, Praeferenzen, Kommunikation, Erinnerungen |
| `customerNotes/{noteId}` | CRM-Notizen | Notizdaten mit `customerId` |
| `customerTasks/{taskId}` | CRM-Aufgaben | Aufgabe mit `customerId`, Status, Faelligkeit |
| `customerHistory/{historyId}` | Reisehistorie-Spiegel | Historieneintrag mit `customerId` |
| `customerPreferences/{customerId}` | Praeferenzen-Spiegel | Praeferenzfelder pro Kunde |
| `customerRatings/{ratingId}` | Bewertungen | Bewertungsdaten mit `customerId` |
| `bookings/{bookingId}` | Buchungsmanagement | Buchungsdaten, Zahlungs-/Buchungsstatus, Fristen, Sichtbarkeit |

### Storage

| Pfad | Zweck |
|---|---|
| `customers/{customerId}/documents/{category}/{timestamp}-{filename}` | Kundendokumente |
| `customers/{customerId}/documents/bookings/{bookingId}/{type}/{timestamp}-{filename}` | Buchungsdokumente ueber aktuellen Wrapper |
| `templates/{type}/{templateId}/images/{timestamp}-{filename}` | Vorlagenbilder |

## 2. Aktuelle Zugriffspfade

### Admin

| Funktion | Datei | Zugriff |
|---|---|---|
| Kunden laden | `firebase-service.js` | `getDocs(customers)` |
| Publish-State laden | `firebase-service.js` | `getDoc(customers/{id})` |
| Entwurf speichern | `firebase-service.js` | `getDoc` + `setDoc(customers/{id})` |
| Veroeffentlichen | `firebase-service.js` | `getDoc` + `setDoc(customers/{id})` + optional `setDoc(customers/{id}/versions/{versionId})` |
| Live-Version wiederherstellen | `firebase-service.js` | `getDoc(customers/{id})`, `getDoc(versions/{id})`, `setDoc(customers/{id})` |
| Kunde loeschen | `firebase-service.js` | `deleteDoc(customers/{id})` + CRM-Loeschung |
| lokale Kunden migrieren | `firebase-service.js` | `getDoc` + `setDoc(customers/{id})` |
| Vorlagen laden | `firebase-service.js` | `getDocs(templates/library/{type})` |
| Vorlage speichern/loeschen | `firebase-service.js` | `setDoc`/`deleteDoc(templates/library/{type}/{id})` |
| CRM speichern/laden/loeschen | `firebase-service.js` | `customerCrm`, `customerNotes`, `customerTasks`, `customerHistory`, `customerPreferences`, `customerRatings` |
| Buchungen speichern/laden/loeschen | `firebase-service.js` | `bookings` |
| Dokumentupload | `firebase-service.js` | Storage Upload + Download-URL |

### Kundenportal

| Funktion | Datei | Zugriff |
|---|---|---|
| Kundenportal laden | `customer-portal.js` | `loadPublishedCustomer(id)` liest `customers/{id}.publishedData` |
| Fallback | `customer-portal.js` | localStorage oder Demo-Daten |
| Portalaktionen | `customer-portal.js` | keine Firebase Writes; Alerts fuer spaetere Funktionen |

## 3. Sicherheitsrisiken des aktuellen Zustands

- Die App meldet sich aktuell anonym an. Restriktive Rules mit Rollen-Claims wuerden alle aktuellen Firebase Reads/Writes blockieren.
- `customers/{id}` enthaelt Entwurf und Live-Daten im selben Dokument. Eine Rule, die nur `publishedData` oeffentlich freigibt, kann nicht feldgenau sicher fuer ein einzelnes Dokument umgesetzt werden.
- CRM, Buchungen und Dokument-URLs sind hochsensibel und duerfen nicht oeffentlich lesbar sein.
- Storage-Download-URLs koennen ausserhalb von Rules weitergegeben werden. Ein Share-Konzept muss daher auch URL-Lebenszyklus und Sichtbarkeit klaeren.
- Migrationsbuttons schreiben grosse Datenmengen clientseitig. Das ist nur fuer echte Admin-Rollen akzeptabel.

## 4. Zielrollen

| Rolle | Bedeutung |
|---|---|
| `owner` | Vollzugriff, Organisations- und Sicherheitsverantwortung |
| `admin` | Vollzugriff auf Kunden, CRM, Buchungen, Templates, Uploads |
| `concierge` | Operativer Schreibzugriff auf Aufgaben, Buchungen, Templates nach Freigabe |
| `editor` | Eingeschraenkter Schreibzugriff auf operative Inhalte, keine Loesch-/Adminrechte |
| `viewer` | Leserechte im Admin-/Backoffice-Kontext, keine Schreibrechte |

Vorlaeufige technische Pruefung:

```js
request.auth != null
request.auth.token.role in ["owner", "admin"]
```

Optional vorbereitet:

```js
request.auth.token.orgId == resource.data.orgId
request.auth.token.orgIds has orgId
```

## 5. Rechte-Matrix Firestore

| Collection | owner | admin | concierge | editor | viewer | anonym | Kunde/Portal |
|---|---|---|---|---|---|---|---|
| `customers` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `customers/{id}/versions` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `templates/library/{type}` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `customerCrm` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `customerNotes` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `customerTasks` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `customerHistory` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `customerPreferences` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `customerRatings` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `bookings` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `portalShares` | geschlossen | geschlossen | geschlossen | geschlossen | geschlossen | nein | spaeter |

D = Delete.

`concierge`, `editor` und `viewer` sind Zielrollen, erhalten in diesem ersten sicheren Entwurf aber noch keine produktiven Firestore-Rechte. Die spaetere Freischaltung sollte pro Workflow und mit Emulator-Tests erfolgen.

## 6. Rechte-Matrix Storage

| Pfad | owner | admin | concierge | editor | viewer | anonym | Kunde/Portal |
|---|---|---|---|---|---|---|---|
| `customers/{customerId}/documents/**` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `customers/{customerId}/documents/bookings/**` | R/W/D | R/W/D | nein | nein | nein | nein | nein |
| `templates/{type}/{templateId}/images/**` | R/W/D | R/W/D | nein | nein | nein | nein | nein |

Portal-Downloads bleiben geschlossen, bis signierte Share-Links oder ein Backend-Proxy definiert sind.

## 7. Funktionen, die durch den Entwurf zunaechst blockiert wuerden

Da aktuelle Benutzer anonym angemeldet werden und keine Rollen-Claims besitzen, wuerden folgende Funktionen blockiert:

- Admin: Kunden aus Firestore laden
- Admin: Entwurf speichern
- Admin: Veroeffentlichen und Version-Backups schreiben
- Admin: Wiederherstellen und Loeschen
- Admin: CRM lesen/schreiben/loeschen
- Admin: Buchungen lesen/schreiben/loeschen
- Admin: Templates lesen/schreiben/loeschen/migrieren
- Admin: Kundendokumente, Buchungsdokumente und Templatebilder hochladen
- Kundenportal: `publishedData` direkt aus `customers/{id}` lesen

Lokale Fallbacks ueber localStorage/Demo-Daten bleiben technisch unberuehrt.

## 8. Anpassungen in Auftrag 04 und 05

### Auftrag 04

- Firebase Authentication im Adminbereich einfuehren.
- Rollen-Claims `owner`, `admin`, `concierge`, `editor`, `viewer` setzen.
- Anonyme Anmeldung fuer Admin-Funktionen entfernen oder auf lokale Demo-Fallbacks begrenzen.
- Admin UI an echte Auth-Zustaende anbinden.
- Emulator-Tests fuer alle Rollen schreiben.

### Auftrag 05

- Share-/Tokenmodell fuer Kundenportal definieren.
- Veroeffentlichte, redigierte Portal-Snapshots in separater Collection speichern, z. B. `portalShares/{shareId}` oder `publicPortalSnapshots/{shareId}`.
- Tokens mit Ablaufdatum, Kunden-/Tripbindung und Widerrufbarkeit versehen.
- Keine direkten Reads auf `customers/{id}` aus dem Kundenportal.
- Dokumentdownloads ueber signierte Links oder Backend/Functions absichern.

## 9. Deployment-Voraussetzungen

- Firebase-Projekt lokal mit CLI verknuepfen.
- Emulator-Suite mit Auth, Firestore und Storage starten.
- Testnutzer mit Custom Claims anlegen.
- Bestehende Daten auf fehlende `orgId` pruefen.
- Entscheidung treffen, ob `orgId` sofort verpflichtend oder vorerst optional ist.
- Kundenportal-Share-Konzept umsetzen, bevor produktive Portal-Reads aktiviert werden.
- Rules erst nach erfolgreichem Emulator-Test deployen.

## 10. Rollback-Strategie

- Vor Deploy aktuelle produktive Rules exportieren/sichern.
- Deploy getrennt fuer Firestore und Storage durchfuehren.
- Nach Deploy Smoke-Test mit Adminrolle und ohne Rolle.
- Bei blockierten Produktivablaeufen sofort vorherige Rules zurueckspielen.
- Keine Datenmigration mit Rules-Deploy koppeln.

## 11. Testfaelle fuer Firebase Emulator

| Test | Erwartung |
|---|---|
| Anonymer User liest `customers/{id}` | deny |
| Anonymer User schreibt `customers/{id}` | deny |
| Admin liest `customers/{id}` | allow |
| Admin schreibt `customers/{id}` | allow |
| Viewer schreibt `customers/{id}` | deny |
| Admin liest/schreibt `customers/{id}/versions/{versionId}` | allow |
| Anonymer User liest `publishedData` ueber `customers/{id}` | deny |
| Admin liest/schreibt CRM Collections | allow |
| Concierge schreibt `customerTasks` | deny |
| Concierge loescht `customerTasks` | deny |
| Admin liest/schreibt `bookings/{bookingId}` | allow |
| Viewer schreibt `bookings/{bookingId}` | deny |
| Admin laedt Kundendokument in Storage hoch | allow |
| Anonymer User liest Kundendokument aus Storage | deny |
| Editor laedt Templatebild hoch | deny |
| Anonymer User liest Templatebild | deny |

## 12. Offene Entscheidungen

- Soll `orgId` sofort verpflichtend werden oder erst nach Datenmodell-Anpassung?
- Welche Rolle darf Templates produktiv bearbeiten?
- Duerfen Concierge/Editor Buchungen loeschen oder nur archivieren?
- Soll das Kundenportal ueber Firestore-Rules, Cloud Functions oder signierte Storage-/Portal-URLs lesen?
- Wie lange sollen Share-Tokens gueltig sein?
- Welche Dokumenttypen und Dateigroessen sind produktiv erlaubt?
- Wie werden Download-URLs widerrufen?
- Welche Monitoring- und Audit-Events sollen ausserhalb der Browser-Konsole erfasst werden?

## 13. Abgleich mit Rules

Alle aktuell bekannten Collections sind im Entwurf explizit abgedeckt. Nicht bekannte Pfade fallen unter Default Deny.

Alle aktuell bekannten Storage-Pfade sind im Entwurf explizit abgedeckt. Nicht bekannte Storage-Pfade fallen unter Default Deny.
