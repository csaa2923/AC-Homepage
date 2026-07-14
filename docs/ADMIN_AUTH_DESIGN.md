# Admin Auth Design und Umstellungsplan

Stand: 2026-07-14

Dieses Dokument ist der Entwurf fuer Auftrag 04. Es beschreibt die Umstellung von clientseitigem Admin-Passwort und anonymer Firebase-Anmeldung auf echte Firebase Authentication mit Rollen. Es nimmt keine Codeaenderung vor, legt keine Benutzer an, setzt keine Claims, aendert keine Firebase-Console-Einstellungen und deployt keine Rules.

## 1. Ausgangslage

### Aktueller Admin-Zugang

- `customer-portal/admin.html` zeigt eine Login-Maske mit Passwortfeld `#passwordInput`, Button `#loginButton` und Admin-Shell `#adminShell`.
- `customer-portal/admin.js` enthaelt aktuell `PASSWORD="ACT2026"`.
- `login()` normalisiert die Eingabe und akzeptiert sie, wenn sie `ACT2026` enthaelt.
- Nach erfolgreichem Passwort setzt der Code `sessionStorage.setItem("act_customer_portal_admin_unlocked","1")`.
- `unlock()` blendet `#loginScreen` aus, zeigt `#adminShell` und startet Rendering.
- `logoutButton` entfernt nur den SessionStorage-Key und laedt die Seite neu.

### Aktuelle Firebase Auth

- `customer-portal/firebase-service.js` initialisiert Firebase und ruft `signInAnonymously(state.auth)` auf.
- `customer-portal/firebase-auth.js` ist derzeit nur ein duenner Wrapper um `ACTFirebaseService.init()` und meldet `anonymous:true`.
- `customer-portal/admin.js` ruft `ACTFirebaseAuth.prepareAuth()` vor Firebase-Admin-Ladevorgaengen auf.
- Es gibt keine echte Benutzeridentitaet, keine Rollenpruefung im Client und keine Custom Claims.

### Aktuelle Rules-Erwartung

- `firestore.rules` und `storage.rules` erwarten `request.auth != null` und `request.auth.token.role`.
- Adminzugriff ist aktuell auf `role in ["owner", "admin"]` ausgelegt.
- Anonyme Nutzer haben keine Rollenclaims und werden durch den Rules-Entwurf blockiert.

## 2. Zielbild

Das Admin Center soll mit echten Firebase-Benutzern arbeiten. Der clientseitige Passwortschutz wird schrittweise ersetzt, aber erst in Auftrag 05 technisch umgesetzt.

Zielzustand:

- Admin-Login ueber Firebase Authentication.
- Admin-/Owner-Rollen ueber Custom Claims.
- Firestore und Storage schreiben/lesen nur fuer berechtigte Rollen.
- Anonyme Anmeldung wird fuer Admin-Funktionen nicht mehr verwendet.
- Demo-/LocalStorage-Fallback bleibt kontrolliert moeglich, solange keine echten Kundendaten betroffen sind.
- Kundenportal-Share bleibt ein separater Auftrag und wird nicht mit Admin Auth vermischt.

## 3. Architekturentscheidungen

### Entscheidung 1: Firebase Auth als Quelle der Admin-Identitaet

Firebase Authentication ist die verbindliche Identitaetsquelle fuer Admins. Der Browser darf keine Rollen selbst setzen oder ableiten.

Begruendung:

- Die vorhandenen Rules pruefen `request.auth.token.role`.
- Custom Claims sind serverseitig bzw. administrativ gesetzt und nicht durch den Client manipulierbar.
- Firestore/Storage koennen damit Zugriffe technisch erzwingen.

### Entscheidung 2: Custom Claims statt Rollen aus Firestore im ersten Schritt

Fuer Auftrag 05 werden Rollen zunaechst ueber Custom Claims modelliert:

```json
{
  "role": "admin",
  "orgId": "act",
  "orgIds": ["act"]
}
```

Begruendung:

- Rules koennen Claims direkt auswerten.
- Kein zusaetzlicher Firestore-Read fuer Rollendaten erforderlich.
- Der aktuelle Rules-Entwurf ist bereits darauf vorbereitet.

### Entscheidung 3: `owner` und `admin` sind die einzigen produktiv aktiven Rollen in Phase 1

`concierge`, `editor` und `viewer` bleiben Zielrollen, erhalten aber bis zu getrennten Workflows keine produktiven Schreib- oder Leserechte.

Begruendung:

- `FIREBASE_SECURITY_DESIGN.md` und Rules sind konservativ auf `owner`/`admin` begrenzt.
- Die aktuelle Admin-Oberflaeche trennt Funktionsbereiche noch nicht ausreichend fuer feinere Rollen.
- Zu fruehe Teilrollen wuerden Scheinsicherheit erzeugen.

### Entscheidung 4: Admin Auth zuerst, Portal Share spaeter

Admin Auth schuetzt Management-Funktionen. Kundenportal-Zugriff wird spaeter ueber Share-/Tokenmodell geloest.

Begruendung:

- `customers/{id}` enthaelt `draftData` und `publishedData` im selben Dokument.
- Eine oeffentliche Rule auf `customers/{id}` waere riskant.
- Portal-Linkschutz ist laut Roadmap Auftrag 06/13 und braucht ein separates Modell.

### Entscheidung 5: Kein produktiver Rules-Deploy vor erfolgreichem Auth-Test

Die Rules aus Auftrag 03 duerfen erst deployed werden, wenn mindestens ein Admin-User mit Claims existiert und Admin-Flows getestet wurden.

Begruendung:

- Aktuelle anonyme Anmeldung wuerde mit den Rules alle Firebase-Funktionen blockieren.
- Rollback muss vorbereitet sein.

## 4. Rollen- und Claim-Modell

### Rollen

| Rolle | Zweck | Phase-1-Rechte |
|---|---|---|
| `owner` | technische und organisatorische Gesamtverantwortung | Vollzugriff |
| `admin` | operative Administration | Vollzugriff auf aktuelle Admin-Funktionen |
| `concierge` | spaeter operative Aufgaben/Buchungen | noch keine produktiven Rechte |
| `editor` | spaeter Inhalte bearbeiten ohne Adminrechte | noch keine produktiven Rechte |
| `viewer` | spaeter lesender Backoffice-Zugriff | noch keine produktiven Rechte |

### Empfohlene Claims fuer Phase 1

Minimal:

```json
{
  "role": "admin"
}
```

Empfohlen:

```json
{
  "role": "admin",
  "orgId": "act",
  "orgIds": ["act"]
}
```

Owner:

```json
{
  "role": "owner",
  "orgId": "act",
  "orgIds": ["act"]
}
```

### Claim-Regeln

- Claims werden niemals im Client gesetzt.
- Claims werden nicht aus LocalStorage, URL-Parametern oder Formularfeldern gelesen.
- Der Client darf Claims nur lesen, um UI-Zustaende anzuzeigen.
- Rules bleiben die verbindliche Autorisierung.
- Nach Claim-Aenderung muss der User Token Refresh oder Logout/Login durchlaufen.

## 5. Berechtigungsmatrix Admin-Funktionen

| Funktion | owner | admin | concierge | editor | viewer | anonym |
|---|---|---|---|---|---|---|
| Admin betreten | ja | ja | nein | nein | nein | nein |
| Kunden laden | ja | ja | nein | nein | nein | nein |
| Kunde/Reise anlegen | ja | ja | nein | nein | nein | nein |
| Entwurf speichern | ja | ja | nein | nein | nein | nein |
| Veroeffentlichen | ja | ja | nein | nein | nein | nein |
| Restore Live-Version | ja | ja | nein | nein | nein | nein |
| Kunde/Reise loeschen | ja | ja | nein | nein | nein | nein |
| CRM lesen/schreiben | ja | ja | nein | nein | nein | nein |
| Buchungen lesen/schreiben | ja | ja | nein | nein | nein | nein |
| Templates lesen/schreiben | ja | ja | nein | nein | nein | nein |
| Upload Kundendokumente | ja | ja | nein | nein | nein | nein |
| Migration Local -> Firebase | ja | ja | nein | nein | nein | nein |
| Export/Import lokal | ja | ja | nein | nein | nein | nein |

Feinere Rollen werden erst nach Modularisierung und Repository-/Workflow-Trennung freigeschaltet.

## 6. Ziel-Flows fuer Auftrag 05

### Login

1. Admin oeffnet `customer-portal/admin.html`.
2. App initialisiert Firebase ohne automatische anonyme Admin-Anmeldung.
3. Login-UI zeigt E-Mail/Passwort oder freigegebenen Provider.
4. Admin meldet sich ueber Firebase Auth an.
5. Client ruft `getIdTokenResult(true)` ab.
6. Client prueft Claim `role`.
7. Nur `owner` oder `admin` entsperren `#adminShell`.
8. Danach werden Firestore/Storage-Zugriffe gestartet.

### Fehlende Rolle

1. Firebase Login erfolgreich.
2. Token enthaelt keine erlaubte Rolle.
3. Admin-Shell bleibt gesperrt.
4. UI zeigt neutrale Meldung: "Keine Admin-Berechtigung fuer dieses Konto."
5. Kein Firestore-Admin-Read wird gestartet.

### Offline/Firebase nicht verfuegbar

1. Firebase Auth ist nicht erreichbar.
2. Fuer echte Admin-Daten bleibt Admin-Shell gesperrt.
3. Optional: lokaler Demo-Modus darf separat sichtbar sein, aber klar als Demo ohne echte Firebase-Synchronisierung.
4. Keine stillen Firebase-Schreibversuche.

### Logout

1. Firebase `signOut()` ausfuehren.
2. Lokalen Admin-Auth-Zustand entfernen.
3. `sessionStorage`-Legacy-Key entfernen.
4. Admin-Shell ausblenden.
5. Login-Screen anzeigen.

## 7. Uebergangsreihenfolge

### Schritt 1: Design bestaetigen

Dieses Dokument pruefen und freigeben.

### Schritt 2: Firebase-Konsole vorbereiten, ohne Codeaenderung

- Auth Provider auswaehlen.
- Erste Admin-Benutzer manuell anlegen.
- Claims-Konzept bestaetigen.
- Aktuelle produktive Rules sichern.
- Kein Rules-Deploy.

### Schritt 3: Auftrag 05 lokal implementieren

Betroffene Dateien voraussichtlich:

- `customer-portal/firebase-auth.js`
- `customer-portal/firebase-service.js`
- `customer-portal/admin.js`
- `customer-portal/admin.html`
- optional `customer-portal/admin.css`

Ziel:

- echte Firebase Auth fuer Admin
- Rollenpruefung im Client vor Admin-Rendering
- keine Entfernung der Fallback-Daten ohne gesonderte Freigabe

### Schritt 4: Lokaler Smoke-Test mit Testclaims

- Admin ohne Login blockiert.
- Login ohne Rolle blockiert.
- Login mit `admin` entsperrt.
- Firebase Reads/Writes funktionieren mit Rolle.
- Logout sperrt wieder.

### Schritt 5: Emulator-/Rules-Test

- Firestore/Storage Rules mit Claims testen.
- Anonymous User muss blockiert werden.
- Admin/Owner muss erlaubt werden.

### Schritt 6: Gestaffelte Aktivierung

1. Code deployen, aber produktive Rules noch nicht verschaerfen.
2. Admin-Login in Testumgebung pruefen.
3. Admin-Benutzer und Claims finalisieren.
4. Rules deployen.
5. Sofort Smoke-Test.

## 8. Konkrete Anpassungspunkte fuer Auftrag 05

### `firebase-auth.js`

Soll zu einem echten Auth-Service werden:

- Firebase Auth State beobachten.
- Login-Funktion bereitstellen.
- Logout-Funktion bereitstellen.
- Token Claims lesen.
- Rollenhelper bereitstellen: `isAdmin`, `isOwner`, `hasAdminAccess`.
- Keine Claims setzen.

### `firebase-service.js`

Soll Auth nicht mehr automatisch anonym fuer Admin erzwingen:

- `signInAnonymously` fuer Admin-Flows entfernen oder auf expliziten Demo-/Portal-Fallback begrenzen.
- Firestore/Storage-Zugriffe nur starten, wenn Auth-Service Adminzugriff bestaetigt.
- Fehlermeldungen fuer `permission-denied` neutral und nutzerverstaendlich behandeln.

### `admin.js`

Soll Passwortmodell abloesen:

- `PASSWORD` und Passwortvergleich entfernen, aber erst in Auftrag 05.
- `sessionStorage`-Entsperrung durch Firebase Auth State ersetzen.
- `unlock()` erst nach erfolgreicher Rollenpruefung ausfuehren.
- `loadFirebaseCustomers()` und `loadFirebaseTemplates()` erst nach Admin-Auth starten.
- Logout an Firebase `signOut()` anbinden.

### `admin.html`

Soll Login-UI fuer Firebase Auth erhalten:

- Passwortfeld durch E-Mail/Passwort oder Provider-Button ersetzen.
- Sicherheits-Hinweis zu `ACT2026` entfernen.
- Statusbereich fuer "keine Rolle", "Login fehlgeschlagen", "Firebase nicht erreichbar" ergaenzen.

## 9. Provider-Empfehlung

Fuer Phase 1 wird E-Mail/Passwort als niedrigste Einstiegskomplexitaet empfohlen.

Begruendung:

- passt zu Firebase Auth ohne zusaetzlichen OAuth-Setup-Aufwand
- testbar im Emulator
- einfaches Rollback
- spaeter durch Google/Microsoft Login erweiterbar

Nicht empfohlen fuer Phase 1:

- Magic Link fuer Admin, solange E-Mail-Zustellung und Domain-Freigabe nicht sauber getestet sind
- Telefonnummer/SMS wegen Kosten und Operational-Risiko
- Social Login ohne klare Domain-/Mitarbeiterpolitik

## 10. LocalStorage- und Demo-Strategie

LocalStorage enthaelt potenziell personenbezogene Daten. Auth loest dieses Risiko nicht vollstaendig.

Empfehlung fuer Auftrag 05:

- Nach erfolgreichem Admin-Login darf bestehender LocalStorage-Fallback weiter genutzt werden.
- Ohne Admin-Login darf kein Zugriff auf echte lokal gespeicherte Kundendaten erfolgen.
- Demo-Daten duerfen separat geladen werden, muessen aber klar als Demo gekennzeichnet bleiben.
- Reset lokaler Daten darf weiterhin moeglich sein.
- Keine automatische Migration lokaler Daten nach Firebase ohne Adminrolle.

## 11. Recovery- und Rollback-Konzept

### Vor Umsetzung

- Aktuellen funktionierenden Stand committen oder anderweitig sichern.
- Produktive Firebase Rules exportieren/sichern.
- Mindestens zwei Admin-Konten mit `owner` oder `admin` vorbereiten.
- Einen dokumentierten Weg zum Claim-Setzen bereithalten.

### Falls Admin-Login lokal bricht

- Codeaenderung zuruecksetzen.
- Rules unveraendert lassen.
- Lokale Demo-/Fallback-Daten bleiben erhalten.

### Falls produktive Rules Admin aussperren

1. Sofort vorherige Firestore/Storage Rules wieder deployen.
2. Admin-Claims pruefen.
3. ID-Token Refresh/Logout/Login erzwingen.
4. Erst nach erfolgreichem Test erneut verschaerfen.

### Falls ein Admin seine Rolle verliert

- Zweites Owner-Konto verwenden.
- Claims fuer betroffenen User korrigieren.
- Kein Client-Fallback fuer Rollen einbauen.

### Notfallgrenze

Es darf keinen geheimen Client-Bypass geben. Ein clientseitiges Notfallpasswort waere nur eine Wiederholung des aktuellen Risikos.

## 12. Risiken

| Risiko | Ursache | Gegenmassnahme |
|---|---|---|
| Admin ausgesperrt | Claims fehlen oder Rules zu strikt | zweites Owner-Konto, Rules-Backup, Emulator-Test |
| Daten offen | Rules vor Auth falsch deployed | kein Rules-Deploy vor Auth-Test |
| Scheinsicherheit | Client prueft Rolle, Rules aber nicht | Rules bleiben autoritativ |
| Demo/Produktiv vermischt | LocalStorage bleibt aktiv | Demo-Modus klar trennen |
| Kundenportal bricht | Portal liest aktuell `customers/{id}` | Portal-Share erst separat entwickeln |
| Uploads brechen | Storage Rules erwarten Adminrolle | Upload-Test mit Claims vor Deploy |

## 13. Abnahmekriterien fuer Auftrag 05

Auftrag 05 gilt erst als erfuellt, wenn alle Punkte zutreffen:

1. Admin-Login nutzt Firebase Authentication.
2. Admin-Shell oeffnet nur fuer `role = owner` oder `role = admin`.
3. Benutzer ohne Rolle wird nach Login blockiert.
4. Anonymer Benutzer kann keine Admin-Firebase-Operation starten.
5. Logout fuehrt Firebase `signOut()` aus und sperrt die Admin-Shell.
6. `sessionStorage`-Legacy-Entsperrung ist nicht mehr autoritativ.
7. Firestore Reads/Writes funktionieren lokal/testweise mit Admin-Claim.
8. Firestore Reads/Writes werden ohne Claim blockiert.
9. Storage Upload funktioniert mit Admin-Claim und wird ohne Claim blockiert.
10. Bestehende lokale Demo-/Fallback-Nutzung ist bewusst behandelt und dokumentiert.
11. Keine Kundendatenmigration wird durch Auth-Umstellung ausgeloest.
12. Keine Portal-Share-Funktion wird nebenbei implementiert.
13. Syntaxchecks fuer geaenderte JavaScript-Dateien sind erfolgreich.
14. Manueller Browser-Test umfasst Login, Logout, Kundenliste, Kunde oeffnen, Entwurf speichern, Portal nur oeffnen.
15. Rollback-Anleitung ist praktisch getestet oder zumindest schrittweise dokumentiert.

## 14. Testplan fuer Auftrag 05

### Manuell

- Adminseite ohne Login oeffnen: Admin-Shell bleibt gesperrt.
- Login mit falschen Daten: klare Fehlermeldung.
- Login mit Firebase User ohne Rolle: gesperrt.
- Login mit `admin`: Admin-Shell sichtbar.
- Kundenliste laden.
- bestehenden Kunden oeffnen.
- Entwurf speichern.
- Kundenseite nur oeffnen, nicht veroeffentlichen.
- Logout: Admin-Shell gesperrt.

### Rules/Emulator

- Anonymous read `customers/{id}`: deny.
- No-role user read `customers/{id}`: deny.
- Admin read/write `customers/{id}`: allow.
- Admin read/write CRM: allow.
- Admin write Storage customer document: allow.
- Anonymous/no-role Storage read/write: deny.

### Regression

- Website ausserhalb `customer-portal/admin.html` bleibt unveraendert.
- Kundenportal ohne Admin-Share-Umstellung bleibt im bestehenden Verhalten, bis Auftrag 06/13 folgt.
- Keine neue Veroeffentlichung wird fuer Auth-Test benoetigt.

## 15. Nicht-Ziele

Nicht Bestandteil von Auftrag 05, ausser separat freigegeben:

- Portal Share Tokens implementieren.
- Kundenlogin implementieren.
- Datenmodell v2 einfuehren.
- Firestore-Daten migrieren.
- Claims im Client setzen.
- Firebase Rules produktiv deployen.
- App Check aktivieren.
- PWA oder Offline-Cache einfuehren.

## 16. Entscheidung fuer den naechsten Umsetzungsschritt

Empfohlener naechster Umsetzungsschritt nach Freigabe dieses Designs:

**Auftrag 05 - Firebase Auth implementieren**

Minimaler Umfang:

- E-Mail/Passwort-Login im Admin.
- Auth State und Claims in `firebase-auth.js`.
- Admin-Gate in `admin.js`.
- Firebase-Service so anpassen, dass Admin-Funktionen nicht mehr anonym autorisiert werden.
- Keine Rules deployen.
- Kein Portal-Share.
- Keine Datenmigration.

Danach kann in einem separaten Schritt mit Emulator-Tests und kontrolliertem Rules-Deploy gearbeitet werden.
