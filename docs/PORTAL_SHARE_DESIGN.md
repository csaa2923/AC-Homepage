# Portal Share Design

Dieses Dokument beschreibt Auftrag 06. Es ist ein technisches Design fuer sichere Kundenportal-Links. Es nimmt keine Codeaenderung vor, erzeugt keine Portal-Links, aendert keine Kundendaten, fuehrt keine Migration aus, deployed keine Rules und deployed keine Cloud Function.

## 1. Ist-Zustand

### Aktuelle Link-Erzeugung

- `customer-portal/admin.js` erzeugt Portal-Links in `portalPath(id, options)`.
- Der Link hat aktuell die Form:

```text
customer-portal/index.html?customer=<customerId>
```

- Admin-Preview haengt zusaetzlich `&admin=1` an.
- `renderLinks()` schreibt diesen Link in `#portalLink` und in den vorbereiteten WhatsApp-Text.
- Kundenkarten verwenden denselben Link fuer "Kundenseite oeffnen", "Entwurf im Portal ansehen" und "Link kopieren".
- `publish-workflow.js` verwendet `meta.portalLink` nur in vorbereiteten Benachrichtigungstexten.

### Aktuelles Lesen der Customer-ID

- `customer-portal/customer-portal.js` liest beim Laden:

```js
const params = new URLSearchParams(window.location.search);
const customerId = params.get("customer") || dataRoot.defaultCustomerId;
const isAdminPreview = params.get("admin") === "1";
```

- Die Customer-ID ist damit gleichzeitig Identifier und Zugriffsschluessel.
- Falls keine Customer-ID vorhanden ist, faellt das Portal auf Demo-/Default-Daten zurueck.

### Aktuell geladene Portal-Daten

- `customer-portal/customer-portal.js` ruft bei vorhandenem Firebase-Adapter `db.loadPublishedCustomer(customerId)` auf.
- `customer-portal/firebase-service.js` liest dafuer `customers/{customerId}` und gibt nur `raw.publishedData` zurueck.
- Bei Firebase-Fehlern faellt das Portal auf `localStorage`, `publishedSnapshot`, lokalen Entwurf fuer Admin-Preview oder Demo-Daten zurueck.

### Interne Daten im selben Firestore-Dokument

`customers/{customerId}` enthaelt aktuell mindestens:

- `draftData`
- `publishedData`
- `publishStatus`
- `publishMeta`
- `publishHistory`
- `updatedAt`
- `lastUpdated`

Zusaetzlich liegen CRM- und Buchungsdaten in separaten Collections wie `customerCrm`, `customerNotes`, `customerTasks`, `customerHistory`, `customerPreferences`, `customerRatings` und `bookings`.

### Publishing-Zustand

- `admin.js` erzeugt mit `buildPublishedSnapshot(customer)` einen Live-Snapshot und entfernt dabei `publishedSnapshot`, `publishMeta`, `publishHistory` und `crm`.
- `firebase-service.js` speichert beim Veroeffentlichen `draftData` und `publishedData` weiterhin gemeinsam unter `customers/{customerId}`.
- Vorherige Live-Versionen werden in `customers/{customerId}/versions/{versionId}` gesichert.

### Aktueller Rules-Zustand

- `firestore.rules` erlaubt `customers/{customerId}` nur fuer `owner`/`admin`.
- `portalShares/{shareId}` ist vorhanden, aber komplett geschlossen:

```text
allow read, write: if false;
```

- `storage.rules` erlaubt Kundendokumente nur fuer `owner`/`admin`.
- Portal-Downloads sind laut Rules-Kommentar geschlossen, bis ein Share-Token- oder Backend-Downloadmodell existiert.

## 2. Risiken

### Customer-ID als Zugriffsschluessel

`customerId` ist nicht als Geheimnis geeignet. Sie steht in Admin-Links, Exporten, Firestore-Dokumenten, Storage-Pfaden, Kalender-UIDs und internen Workflows. Ein erratener oder weitergeleiteter Customer-ID-Link kann aktuell ausreichen, um ein Portal zu laden, solange die Datenquelle den Zugriff zulaesst.

### Keine sichere Feldfreigabe fuer `customers/{customerId}`

Eine oeffentliche Freigabe von `customers/{customerId}` waere unsicher, weil Firestore Rules Dokumente nicht feldweise sicher als "nur `publishedData`" ausliefern. Wird das Dokument lesbar, werden auch `draftData`, `publishMeta`, interne IDs und weitere Metadaten sichtbar.

### Draft, CRM und Buchungen

`publishedData` wird zwar bereinigt, aber `customers/{customerId}` enthaelt parallel Entwurf und interne Veroeffentlichungsmetadaten. CRM und Buchungen liegen in weiteren Collections. Ein direktes Public-Read-Modell erhoeht das Risiko, versehentlich interne Collections oder Felder zu oeffnen.

### Storage Download URLs

Dokumente koennen aktuell normalisierte `url`, `downloadUrl` oder `downloadURL` enthalten. Permanente Firebase Storage Download URLs lassen sich nicht sofort per Firestore-Rule widerrufen, wenn sie bereits geteilt wurden. Dokumentzugriff muss deshalb getrennt und kurzlebig abgesichert werden.

### Default-Deny blockiert bestehende Portal-Funktionen

Mit den aktuellen Default-Deny-Rules funktionieren fuer anonyme Portalnutzer nicht mehr:

- `loadPublishedCustomer(customerId)` aus `customers/{customerId}`
- Lesen von Kundendokumenten aus Storage
- spaetere direkte Portal-Reads aus `portalShares`, solange diese Collection geschlossen bleibt

Das ist sicherheitlich gewollt, erfordert aber ein neues Share-Modell vor produktivem Portalbetrieb.

## 3. Gewaehlte Zielarchitektur

### Entscheidung

Es wird ein **serververmitteltes Portal-Share-Modell mit separatem Public Snapshot** empfohlen.

Der Kunde bekommt einen nicht erratbaren Link:

```text
customer-portal/index.html?share=<shareId>&token=<rawToken>
```

Das Portal liest nicht mehr direkt `customers/{customerId}`. Stattdessen ruft es eine HTTPS Cloud Function auf:

```text
GET /portalShare?shareId=<shareId>&token=<rawToken>
```

Die Cloud Function:

1. hasht `rawToken` serverseitig,
2. liest `portalShares/{shareId}`,
3. vergleicht `tokenHash`,
4. prueft `status`, `expiresAt`, `revokedAt` und optional PIN,
5. liest den zugehoerigen Public Snapshot,
6. gibt nur freigegebene Portal-Daten zurueck,
7. aktualisiert optional `lastAccessAt` und Zugriffsmesswerte.

### Warum nicht direkter Firestore-Read?

Clientseitige Hash-Pruefung ist nicht ausreichend. Wenn Firestore das Share-Dokument oder den Snapshot oeffentlich lesen laesst, kann ein Angreifer die Daten ohne vertrauenswuerdige Serverpruefung abrufen. Firestore Rules koennen keinen sicheren SHA-256-Vergleich ueber ein URL-Secret berechnen. Deshalb muss der Token-Hash-Vergleich in einer privilegierten Serverkomponente erfolgen.

### Warum separater Public Snapshot?

Ein separater Public Snapshot ist sicherer als ein Share-Dokument, das nur auf `customers/{customerId}.publishedData` verweist:

- keine oeffentliche Abhaengigkeit vom internen Kundendokument,
- klare Trennung zwischen Entwurf, CRM, Admin-Metadaten und Portalansicht,
- einfachere Redaction-Tests,
- stabiler Snapshot pro Freigabestand,
- spaetere Versionierung und Restore einfacher nachvollziehbar,
- Firestore Rules bleiben fuer interne Daten strikt geschlossen.

Das Share-Dokument behaelt trotzdem `publishedVersionId`, damit nachvollziehbar ist, aus welchem Veroeffentlichungsstand der Snapshot erzeugt wurde.

## 4. Datenmodell

### `portalShares/{shareId}`

```json
{
  "shareId": "ps_...",
  "tokenHash": "sha256:...",
  "customerId": "customer-id",
  "tripId": "trip-id-or-current-customer-id",
  "publishedVersionId": "v1-2-...",
  "publicSnapshotId": "ps_...",
  "status": "active",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "createdBy": "admin-uid",
  "expiresAt": null,
  "revokedAt": null,
  "revokedBy": null,
  "permissions": {
    "readPortal": true,
    "readDocuments": true,
    "downloadCalendar": true,
    "submitChangeRequest": false,
    "confirmTrip": false
  },
  "pinHash": null,
  "pinRequired": false,
  "lastAccessAt": null,
  "accessCount": 0,
  "lastAccessIpHash": null,
  "userAgentHash": null
}
```

Statuswerte:

- `active`
- `revoked`
- `expired`
- `draft`
- `disabled`

### `publicPortalSnapshots/{publicSnapshotId}`

```json
{
  "publicSnapshotId": "ps_...",
  "shareId": "ps_...",
  "customerId": "customer-id",
  "tripId": "trip-id-or-current-customer-id",
  "publishedVersionId": "v1-2-...",
  "version": "1.2",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "createdBy": "admin-uid",
  "data": {
    "customerName": "...",
    "tripName": "...",
    "travelPeriod": "...",
    "program": [],
    "accommodations": [],
    "restaurants": [],
    "transfers": [],
    "bookings": [],
    "documents": [],
    "contact": {}
  },
  "redactionVersion": 1,
  "contentHash": "sha256:..."
}
```

Der Snapshot darf keine Felder enthalten wie:

- `draftData`
- `crm`
- interne Notizen
- interne Aufgaben
- interne Preise oder Margen
- Admin-Metadaten
- `publishHistory` mit internen Kommentaren
- permanente Storage Download URLs
- interne Firebase-Pfade, sofern nicht fuer die Function notwendig

### Dokument-Metadaten im Snapshot

Dokumente werden nur als sichtbare, redigierte Metadaten abgelegt:

```json
{
  "documentId": "doc_...",
  "title": "Voucher",
  "type": "PDF",
  "visible": true,
  "mimeType": "application/pdf"
}
```

Storage-Pfad und Download-URL bleiben intern.

## 5. Token-Erzeugung und Speicherung

### Token

- `rawToken`: kryptografisch zufaellig, mindestens 256 Bit Entropie.
- Darstellung: Base64url oder Hex.
- Der Token wird nur einmal beim Erstellen/Regenerieren angezeigt bzw. in den Link geschrieben.
- Der Token wird nie in Firestore gespeichert.

### Hash

- Speicherung als `tokenHash`, zum Beispiel:

```text
sha256:<base64url-digest>
```

- Optional zusaetzlich serverseitiger Pepper ueber Cloud Function Secret Manager.
- Empfehlung: `SHA-256(rawToken + serverPepper)` oder HMAC-SHA-256 mit Secret-Manager-Key.

### Share-ID

- `shareId` ist nicht der alleinige Zugriffsschluessel.
- `shareId` darf zufaellig sein, muss aber nicht geheim bleiben.
- Ohne passenden `rawToken` darf die Function keine Daten liefern.

### PIN

- Optionaler PIN-Schutz wird als zweiter Faktor auf Share-Ebene behandelt.
- PIN niemals im Klartext speichern.
- `pinHash` mit langsamem Hash fuer PINs oder serverseitigem HMAC plus Rate Limit.
- PIN-Eingabe wird erst nach erfolgreicher Token-Vorpruefung abgefragt.

## 6. Firestore-Zugriffsmodell

### Grundsatz

Firestore bleibt fuer anonyme Portalnutzer geschlossen. Das Kundenportal liest Share-Daten ausschliesslich ueber eine Cloud Function.

### Spaetere Rules-Anpassung

`firestore.rules` sollte spaeter ungefaehr so bleiben bzw. erweitert werden:

```text
match /portalShares/{shareId} {
  allow get, list: if adminRead();
  allow create, update: if adminWrite();
  allow delete: if isAdmin() && sameOrgOnExisting();
}

match /publicPortalSnapshots/{snapshotId} {
  allow get, list: if adminRead();
  allow create, update: if adminWrite();
  allow delete: if isAdmin() && sameOrgOnExisting();
}
```

Keine Regel sollte anonyme Reads auf `portalShares`, `publicPortalSnapshots` oder `customers` erlauben.

### Validierung eines Portal-Shares

Die Validierung erfolgt in einer Cloud Function:

1. Eingaben normalisieren.
2. Rate Limit und optional App Check pruefen.
3. `portalShares/{shareId}` laden.
4. `status == "active"` pruefen.
5. `expiresAt` pruefen.
6. `revokedAt == null` pruefen.
7. Token serverseitig hashen und mit `tokenHash` vergleichen.
8. Optional PIN pruefen.
9. `publicPortalSnapshots/{publicSnapshotId}` laden.
10. Nur Snapshot-Daten ausliefern.

### Revocation

Revocation ist sofort wirksam, weil jeder Portalabruf die Cloud Function durchlaufen muss. Sobald `status = "revoked"` oder `revokedAt` gesetzt ist, liefert die Function nur noch eine neutrale Fehlermeldung.

## 7. Storage- und Dokumentzugriff

### Grundsatz

Keine permanenten Firebase Storage Download URLs im Kundenportal-Snapshot.

### Empfohlenes Modell

- Dokumente bleiben in geschlossenen Storage-Pfaden.
- Snapshot enthaelt nur `documentId`, Titel, Typ und Sichtbarkeit.
- Download erfolgt ueber Cloud Function:

```text
GET /portalDocument?shareId=<shareId>&token=<rawToken>&documentId=<documentId>
```

Die Function:

1. validiert Share und Token,
2. prueft `permissions.readDocuments`,
3. prueft, ob `documentId` im Public Snapshot sichtbar ist,
4. erzeugt eine kurzlebige signierte URL oder streamt die Datei,
5. gibt keine internen Storage-Pfade im Response preis.

### Storage Rules

`storage.rules` bleiben fuer anonyme Nutzer geschlossen:

```text
match /customers/{customerId}/documents/{allPaths=**} {
  allow read: if isAdmin();
  allow write: if isAdmin() && safeFile();
  allow delete: if isAdmin();
}
```

Falls spaeter signierte URLs genutzt werden, muessen sie kurzlebig sein. Bei Widerruf des Share-Links bleiben bereits ausgegebene kurzlebige URLs nur bis zu ihrer kurzen Ablaufzeit gueltig. Empfohlen: 1 bis 5 Minuten.

## 8. Admin-Workflow

### Portal-Link erzeugen

1. Admin oeffnet einen veroeffentlichten Kunden/Trip.
2. Admin klickt "Portal-Link erzeugen".
3. System prueft, ob `publishedData` vorhanden ist.
4. System erzeugt `shareId` und `rawToken`.
5. System erzeugt redigierten Public Snapshot aus der aktuellen Live-Version.
6. System speichert `portalShares/{shareId}` und `publicPortalSnapshots/{shareId}`.
7. Admin sieht den fertigen Link einmalig und kann ihn kopieren.

### Link kopieren

- Admin kopiert nur die URL mit `share` und `token`.
- Der rohe Token wird nicht separat angezeigt.
- Keine sensiblen Rohdaten in der Konsole.

### Link neu generieren

- Bestehender Share wird auf `revoked` gesetzt.
- Neuer `shareId` und neuer `rawToken` werden erzeugt.
- Neuer Snapshot wird aus der aktuell gewaehlten Live-Version erzeugt.
- Alter Link funktioniert sofort nicht mehr.

### Link widerrufen

- `status = "revoked"`
- `revokedAt = now`
- `revokedBy = admin uid`
- Function liefert danach nur noch neutrale Fehlerseite.

### Ablaufdatum setzen

- Admin kann `expiresAt` setzen oder entfernen.
- Ablauf wird serverseitig geprueft.
- Abgelaufene Links koennen im Admin als `expired` angezeigt oder dynamisch als abgelaufen bewertet werden.

### Optional PIN setzen

- Admin setzt PIN optional beim Erzeugen oder Bearbeiten.
- PIN wird serverseitig gehasht gespeichert.
- Kunde muss PIN nach Linkaufruf eingeben.
- Mehrere falsche PIN-Versuche werden rate-limitiert.

### Veroeffentlichungsstand verknuepfen

- Share zeigt auf `publishedVersionId`.
- Snapshot enthaelt `version` und `contentHash`.
- Neue Veroeffentlichung aktualisiert bestehende Shares nicht automatisch ohne klare Admin-Entscheidung.

Empfehlung fuer Phase 1:

- Nach neuer Veroeffentlichung zeigt Admin den Share-Status "Aktualisierung verfuegbar".
- Admin kann "Share auf neue Live-Version aktualisieren" klicken.
- Dadurch wird ein neuer Public Snapshot erzeugt, der bestehende Link bleibt aber gleich.

### Restore einer aelteren Version

- Restore aendert interne Live-Version.
- Bestehender Public Snapshot bleibt unveraendert, bis Admin ihn aktiv aktualisiert.
- Admin sieht "Share basiert nicht auf aktueller Live-Version".

## 9. Kunden-Workflow

### Gueltiger Link

1. Kunde oeffnet Link mit `share` und `token`.
2. Portal ruft Cloud Function auf.
3. Function validiert Share.
4. Portal rendert Public Snapshot.

### Ungueltiger Link

- Neutrale Fehlerseite:

```text
Dieser Portal-Link ist nicht gueltig oder nicht mehr verfuegbar.
```

- Keine Angabe, ob `shareId`, Token oder Kunde existiert.

### Abgelaufener Link

- Neutrale Fehlerseite:

```text
Dieser Portal-Link ist abgelaufen. Bitte kontaktieren Sie Alpine Concierge Tirol.
```

### Widerrufener Link

- Neutrale Fehlerseite:

```text
Dieser Portal-Link ist nicht mehr aktiv.
```

### Reise noch nicht veroeffentlicht

- Es darf kein Share erzeugt werden.
- Falls ein alter Share keinen Snapshot hat:

```text
Diese Reise ist derzeit nicht verfuegbar.
```

### Fehlende veroeffentlichte Version

- Admin sieht Fehler beim Share-Erzeugen.
- Kunde sieht nur neutrale Nicht-verfuegbar-Seite.

### Optionale PIN

- Portal zeigt PIN-Eingabe.
- Fehlversuche werden neutral beantwortet.
- Keine Aussage, ob Token gueltig ist, bevor PIN korrekt ist.

### Cache-Verhalten

- Keine privaten Portalantworten dauerhaft im Browser-Cache.
- Function setzt:

```text
Cache-Control: no-store
```

- Keine sensiblen Daten in LocalStorage oder SessionStorage speichern.

## 10. Uebergangsstrategie fuer bestehende Links

### Phase 0: Ist-Zustand sichern

- Bestehende `?customer=<customerId>` Links bleiben lokal/Demo nutzbar.
- Keine produktiven echten Kundendaten ueber `?customer=` freigeben.

### Phase 1: Share-Funktion parallel einfuehren

- Admin zeigt neuen Share-Link zusaetzlich zum alten Portal-Link.
- Alter Link wird als "unsicher / nur intern / Demo" markiert.
- Neuer produktiver Versand nutzt ausschliesslich `?share=&token=`.

### Phase 2: Alte Links sperren

- `customer-portal.js` akzeptiert `?customer=` nur noch fuer Admin-Preview oder lokale Demo.
- Fuer Kunden ohne Share wird eine neutrale Fehlerseite angezeigt.

### Phase 3: Cleanup

- WhatsApp-/E-Mail-Texte verwenden nur noch Share-Links.
- Copy-Link-Buttons nutzen Share-Modell.
- Dokumentation und Admin-Hinweise aktualisieren.

## 11. Rollback und Recovery

### Rollback bei Function-Fehler

- Cloud Function vorher versionieren.
- Letzte funktionierende Function-Version wieder deployen.
- Firestore/Storage Rules unveraendert geschlossen lassen.
- Keine Rueckkehr zu oeffentlichen `customers/{id}` Reads.

### Recovery bei versehentlich widerrufenem Link

- Neuen Share erzeugen.
- Alten Share nicht reaktivieren, wenn der Token bereits verteilt wurde und Unsicherheit besteht.

### Recovery bei falschem Snapshot

- Share deaktivieren.
- Korrekte Live-Version aus `customers/{customerId}/versions/{versionId}` oder aktuellem `publishedData` neu snapshotten.
- Neuen oder aktualisierten Share bereitstellen.

### Recovery bei kompromittiertem Link

- Share sofort widerrufen.
- Neuen Share mit neuem Token erzeugen.
- Optional Ablaufdatum und PIN aktivieren.

## 12. Testfaelle

### Security-Tests

- Zugriff ohne `share` und ohne `token` liefert keine Daten.
- Zugriff mit gueltiger `shareId`, aber falschem Token liefert keine Daten.
- Zugriff mit unbekannter `shareId` liefert dieselbe neutrale Fehlermeldung.
- Widerrufener Share liefert keine Daten.
- Abgelaufener Share liefert keine Daten.
- Share ohne Public Snapshot liefert keine internen Daten.
- Direkter Firestore-Read auf `customers/{customerId}` ist anonym blockiert.
- Direkter Firestore-Read auf `portalShares/{shareId}` ist anonym blockiert.
- Direkter Storage-Read ist anonym blockiert.

### Datenschutz-Tests

- Snapshot enthaelt kein `draftData`.
- Snapshot enthaelt kein `crm`.
- Snapshot enthaelt keine internen Notizen.
- Snapshot enthaelt keine Admin-Metadaten.
- Snapshot enthaelt keine permanenten Download URLs.
- Snapshot enthaelt nur `visible !== false` Dokumente.

### Admin-Tests

- Share kann nur fuer veroeffentlichte Reise erzeugt werden.
- Share kann kopiert werden.
- Share kann widerrufen werden.
- Share kann neu generiert werden.
- Ablaufdatum wirkt.
- PIN wirkt.
- Neue Veroeffentlichung markiert Share als "Aktualisierung verfuegbar".
- Restore markiert Share als "basiert auf anderer Version".

### Kunden-Tests

- Gueltiger Link zeigt Portal.
- Ungueltiger Link zeigt neutrale Fehlerseite.
- Abgelaufener Link zeigt neutrale Fehlerseite.
- Widerrufener Link zeigt neutrale Fehlerseite.
- Optionaler PIN-Dialog funktioniert.
- Browser-Reload laedt Daten erneut ueber Function.
- Keine sensiblen Daten bleiben in LocalStorage.

## 13. Risiken und offene Entscheidungen

### Risiken

- Cloud Function wird zum zentralen Pfad fuer Portal-Lesen und muss stabil, rate-limitiert und beobachtet werden.
- Falsch redigierte Snapshots koennen interne Daten enthalten.
- Permanente Storage Download URLs in bestehenden Dokumentdaten muessen vor produktivem Share-Betrieb entfernt oder ignoriert werden.
- Alte `?customer=` Links koennen weiterhin in Umlauf sein.
- Ohne Emulator-Tests besteht Risiko falscher Rules.
- Ohne Monitoring bleiben missbrauchte oder haeufig genutzte Share-Links unbemerkt.

### Offene Entscheidungen

- Genaue Cloud Function Plattform: Firebase Functions v2 oder Cloud Run.
- Hash-Verfahren: SHA-256 plus Secret-Pepper oder HMAC-SHA-256.
- Standard-Ablaufzeit fuer Links.
- PIN standardmaessig aus oder fuer sensible Reisen an.
- Ob bestehende Links bei neuer Veroeffentlichung automatisch aktualisiert werden duerfen.
- Ob Dokumente gestreamt oder per kurzlebiger signierter URL ausgeliefert werden.
- App Check fuer Portal-Function aktivieren oder zunaechst nur Rate Limiting.

## 14. Konkrete Abnahmekriterien fuer die spaetere Implementierung

1. `?customer=<customerId>` ist kein produktiver Kundenzugriff mehr.
2. Produktive Kundenlinks enthalten `shareId` und nicht gespeicherten `rawToken`.
3. In Firestore wird nur `tokenHash` gespeichert.
4. Anonyme Nutzer koennen `customers/{customerId}` nicht direkt lesen.
5. Anonyme Nutzer koennen `portalShares/{shareId}` nicht direkt lesen.
6. Portal-Daten werden nur nach serverseitiger Tokenpruefung ausgeliefert.
7. Public Snapshot enthaelt keine Entwurfs-, CRM-, Admin- oder internen Buchungsdaten.
8. Link-Widerruf wirkt beim naechsten Request.
9. Ablaufdatum wirkt serverseitig.
10. Optionaler PIN-Schutz blockiert ohne korrekte PIN.
11. Dokumentdownloads laufen nur ueber serverseitig validierten Share.
12. Keine permanenten Download URLs werden im Portal-Snapshot ausgegeben.
13. Admin kann Link erzeugen, kopieren, widerrufen und neu generieren.
14. Neue Veroeffentlichung erzeugt keinen unkontrollierten Datenwechsel im Kundenlink.
15. Emulator-/Rules-Tests bestaetigen Default Deny fuer interne Daten.
16. Browser-Tests bestaetigen neutrale Fehlerseiten ohne Datenleck.
17. Keine Kundendatenmigration wird mit Rules-Deploy gekoppelt.

## 15. Betroffene Dateien fuer den Implementierungsauftrag

### Bestehende Dateien

- `customer-portal/customer-portal.js`
- `customer-portal/index.html`
- `customer-portal/admin.js`
- `customer-portal/admin.html`
- `customer-portal/admin.css`
- `customer-portal/publish-workflow.js`
- `customer-portal/firebase-service.js`
- `customer-portal/firebase-database.js`
- `customer-portal/firebase-storage.js`
- `firestore.rules`
- `storage.rules`
- `firebase.json`

### Neue Dateien oder Bereiche

- `functions/` oder `cloud-functions/`
- `functions/src/portalShare.*`
- `functions/src/portalDocument.*`
- `functions/src/tokenHash.*`
- `functions/src/redactPublicSnapshot.*`
- `tests/rules/portal-share.test.*`
- `tests/browser/portal-share.spec.*`

### Spaetere optionale Dokumentation

- `docs/PORTAL_SHARE_IMPLEMENTATION.md`
- `docs/PORTAL_SHARE_RUNBOOK.md`
- `docs/STORAGE_DOCUMENT_ACCESS.md`

