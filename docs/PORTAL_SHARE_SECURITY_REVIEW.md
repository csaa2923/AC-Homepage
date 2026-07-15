# Portal Share Security Review — Auftrag 09

**Datum:** 2026-07-15  
**Geprüfte Phasen:** Phase 0 + Phase 1  
**Design-Referenz:** `docs/PORTAL_SHARE_DESIGN.md`  
**Status nach Review:** Auftrag 09 abgeschlossen; **Auftrag 10 lokale Verifikation abgeschlossen** (2026-07-15, Java 17 + Emulator-Suite)

---

## Auftrag 10 — Lokale Testumgebung (2026-07-15, Fortsetzung)

### Toolchain

| Komponente | Ergebnis |
|---|---|
| Portable Node/npm | **eingerichtet** — `C:\GitHub\AC-Homepage\.tools\node\` (Node **v22.22.1**, npm **10.9.4**) |
| Firebase CLI via npx | **verfügbar** — `firebase-tools@15.23.0` |
| Java 17 (portable) | **verfügbar** — `C:\GitHub\AC-Homepage\tools\java` → OpenJDK **17.0.19** |
| Java 21 (optional, vorhanden) | `C:\GitHub\AC-Homepage\tools\java21` → OpenJDK **21.0.11** |
| Git CLI | **nicht im PATH** (`.gitignore` für `.secret.local` manuell verifiziert) |

**Test-PATH (PowerShell):**

```powershell
$env:JAVA_HOME="C:\GitHub\AC-Homepage\tools\java"
$env:PATH="$env:JAVA_HOME\bin;C:\GitHub\AC-Homepage\.tools\node;$env:PATH"
```

### Projekt

| Feld | Wert |
|---|---|
| Projekt-Root | `C:\GitHub\AC-Homepage` |
| Firebase-Projekt-ID | `alpine-concierge-tirol` |
| Emulator-Ports | Functions **5001**, Firestore **8080**, Auth **9099**, UI **4000** |
| Lokaler HTTP-Server | `http://127.0.0.1:8766` |
| Emulator-Secret | `functions/.secret.local` (gitignored, Wert nicht dokumentiert) |
| Functions geladen | `portalShare`, `createPortalShare`, `revokePortalShare` |

### Dependencies

| Paket | Status | npm audit |
|---|---|---|
| `functions/` (240 Pakete) | **installiert** | 9 moderate (transitive Firebase/gRPC) |
| `tests/security/` (112 Pakete) | **installiert** | 9 moderate + 1 high (`undici`, Dev-Test only) |

Kein `npm audit fix --force` ausgeführt.

### CORS-Allowlist (final)

```
https://alpine-concierge-tirol.web.app
https://alpine-concierge-tirol.firebaseapp.com
https://www.alpineconcierge.info
https://alpineconcierge.info
http://localhost:8766
http://127.0.0.1:8766
http://localhost:5000
http://127.0.0.1:5000
```

Zusätzlich per `PORTAL_SHARE_ALLOWED_ORIGINS` (kommagetrennt) erweiterbar.

### Admin-Claims

- Prüflogik in `functions/lib/httpPolicy.js` — **Unit-Tests PASS**
- Script zum Setzen: `scripts/set-admin-claim.js` (Admin SDK, kein Browser)
- Emulator-Seed: `admin-test`, `owner-test`, `user-test` mit Custom Claims
- Callable-Tests: **user-test abgelehnt**, **admin-test create/revoke PASS**
- Produktiver Claim-Set-Prozess: **noch nicht gegen echtes Firebase-Projekt verifiziert**

### Korrekturen während Emulator-Verifikation

| Problem | Korrektur |
|---|---|
| Functions-Emulator Timeout beim Laden | Lazy `getDb()` in `functions/index.js`, Emulator-Secret-Bootstrap |
| Seed-Fehler `undefined` in Firestore | `pickFields()` überspringt `undefined` in Allowlist |
| `portalShare` HTTP 500 bei gültigem Share | `FieldValue.increment` im Emulator ersetzt durch `accessCount+1` (best-effort) |
| Emulator-only Browser-Konfiguration | `firebase-config.js` aktiviert Emulatoren nur auf `localhost`/`127.0.0.1` |
| Integrationstest-Bugs | `assert.match` RegExp, eindeutige Firebase-App-Namen, Warm-up-Hook |

---

## B. Automatisierte Tests (Auftrag 10)

| # | Test | Ergebnis |
|---|---|---|
| 1 | Anonymer Read `customers` (Emulator) | **PASS** — `firestore-rules.test.js` |
| 2 | Anonymer Read `portalShares` (Emulator) | **PASS** |
| 3 | Anonymer Read `publicPortalSnapshots` (Emulator) | **PASS** |
| 4 | Client-Write Shares/Snapshots (Emulator) | **PASS** — `PERMISSION_DENIED` |
| 5 | Admin Read Shares (Emulator) | **PASS** |
| 6 | `redaction.test.js` + `portal-share-core.test.js` + `share-logic.test.js` | **PASS** — **22/22** |
| 7 | `portalShare` HTTP gültiger Share+Token | **PASS** — HTTP 200, redigierte Daten |
| 8 | `portalShare` falscher Token / unbekannter Share | **PASS** — HTTP 403, neutrale Meldung |
| 9 | `portalShare` widerrufener Share | **PASS** — HTTP 403 |
| 10 | `portalShare` abgelaufener Share | **PASS** — HTTP 403 |
| 11 | Security-Header (`Cache-Control`, `nosniff`, `Referrer-Policy`) | **PASS** |
| 12 | Rate Limit HTTP 429 + `Retry-After` | **PASS** |
| 13 | Seed-Script | **PASS** — `emulator-seed-manifest.json` erzeugt |
| 14 | Callable: `user-test` ohne Admin-Rolle | **PASS** — `permission-denied` |
| 15 | Callable: `admin-test` createPortalShare | **PASS** |
| 16 | Callable: `admin-test` revokePortalShare + HTTP 403 danach | **PASS** |

**Gesamt:** **42/42 PASS** (22 offline + 10 Firestore-Rules + 10 Emulator-Integration)

**Ausführung:**

```powershell
$env:JAVA_HOME="C:\GitHub\AC-Homepage\tools\java"
$env:PATH="$env:JAVA_HOME\bin;C:\GitHub\AC-Homepage\.tools\node;$env:PATH"
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
$env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
cd tests\security
npm run seed
node --test firestore-rules.test.js
node --test emulator-integration.test.js
node --test redaction.test.js portal-share-core.test.js share-logic.test.js
```

---

## C. Manuelle Browser-Tests (Auftrag 10)

| # | Test | Ergebnis |
|---|---|---|
| 1 | Admin anmelden + Share erzeugen (UI) | **TEILWEISE** — Admin-Login per Browser-Automation blockiert (Passwortfeld); **Callable-Tests decken create/revoke ab (PASS)** |
| 2 | Gültiger Share-Link lädt Portal | **PASS** — „Willkommen Emulator Familie“, Programmdaten sichtbar |
| 3 | Ungültiger Share zeigt neutrale Meldung | **PASS** — „Dieser Portal-Link ist nicht gültig oder nicht mehr verfügbar.“ (kein „Failed to fetch“) |
| 4 | Kein direkter Firestore-Read im Portal | **PASS** — Network: nur `http://127.0.0.1:5001/.../portalShare` |
| 5 | `admin=1` ohne Grant auf localhost | **PASS** — localhost erlaubt Legacy-Preview (Dev-Modus, Code-Review) |
| 6 | `admin=1` auf Produktion ohne Grant | **NICHT DURCHFÜHRBAR** — kein Produktions-Host lokal |
| 7 | Legacy `?customer=` auf Produktion blockiert | **NICHT DURCHFÜHRBAR** — Code-Review PASS |
| 8 | Widerruf blockiert Portal-Zugriff | **PASS** — widerrufener Seed-Share zeigt „Portal nicht verfügbar“ (generische Meldung) |
| 9 | Referrer `no-referrer` Meta | **PASS** — in `index.html` |
| 10 | Externe Links `noreferrer` | **PASS** — in `customer-portal.js` |

**Browser:** Cursor IDE Browser · **URL:** `http://127.0.0.1:8766` · Emulator-Anbindung nur auf localhost in `firebase-config.js`

### Korrektur während Auftrag 10

| Problem | Korrektur |
|---|---|
| „Failed to fetch“ in Portal-Fehlerseite | `firebase-service.js` + `customer-portal.js` — neutrale Meldung |
| `.secret.local` Parsing in Functions | `loadLocalEmulatorSecret()` parst `PORTAL_SHARE_HMAC_SECRET=` korrekt |
| `portalShare` 500 bei gültigem Share | Access-Counter-Update emulator-sicher gemacht |

---

## D. Offene Deployment-Voraussetzungen

1. `PORTAL_SHARE_HMAC_SECRET` in Secret Manager setzen (Produktion)
2. **Custom Claims** (`role: admin|owner`) produktiv setzen und verifizieren (`scripts/set-admin-claim.js`)
3. `firebase deploy --only functions,firestore:rules` (erst nach FREIGABE)
4. Produktions-E2E nach Deployment (Share erzeugen → Kunde lädt → Widerruf)
5. Optional: systemweite Node.js 20+ Installation für Entwicklung

**Lokal erledigt (Auftrag 10):** Java 17, Emulator-Suite, Seed, 42 automatisierte Tests, Browser-Portal-E2E

---

## E. Freigabeentscheidung (Auftrag 10)

```
KEINE FREIGABE: Share-Link darf noch nicht an echte Kunden versendet werden.
```

**Begründung:**

- **Lokale Sicherheitsverifikation abgeschlossen:** 42/42 automatisierte Tests PASS, Browser-Portal-E2E PASS (gültig/ungültig/widerrufen, kein Firestore-Client-Read)
- **Admin-Flow:** Callable-Tests PASS; vollständiger Admin-UI-Klickpfad im Browser nicht automatisiert (Passwortfeld-Automation)
- **Produktion ausstehend:** Secret nicht in Secret Manager, Functions/Rules nicht deployed, Admin-Claims produktiv nicht verifiziert
- **Bekannte MVP-Limits:** Rate Limit in-memory (nicht verteilt), keine signierten Dokument-URLs (5 min) in Snapshots

**Freigabe für nächsten Schritt (Deployment-Vorbereitung):**

Die **Code- und Emulator-Sicherheitsprüfung** ist bestanden. Vor Kundenversand sind Deployment, Produktions-Secret und Produktions-E2E erforderlich.

**Deployment-Befehl (erst nach expliziter Produktions-FREIGABE):**

```powershell
$env:PATH="C:\GitHub\AC-Homepage\.tools\node;$env:PATH"
npx firebase-tools functions:secrets:set PORTAL_SHARE_HMAC_SECRET
npx firebase-tools deploy --only functions,firestore:rules
```

---

## 1. Abweichungsliste (Design vs. Implementierung)

| Bereich | Status | Anmerkung |
|---|---|---|
| Share-Link `?share=&token=` | **vollständig** | Portal lädt über Cloud Function |
| Cloud Function `portalShare` GET | **vollständig** | HMAC, Rate Limit, neutrale Fehler |
| Callable `createPortalShare` | **vollständig** | Nur mit Admin-Rolle |
| Callable `revokePortalShare` | **vollständig** | Nur mit Admin-Rolle |
| Separater `publicPortalSnapshots` | **vollständig** | Unveränderlicher Snapshot pro Share |
| HMAC-SHA-256 serverseitig | **vollständig** | Secret nur Functions/Secret Manager |
| Google Secret Manager | **teilweise** | Code vorbereitet; Secret in Prod. noch nicht gesetzt |
| Firestore Rules geschlossen | **vollständig** | Nach Korrektur: Client-Writes auf Share-Collections blockiert |
| Legacy `?customer=` Produktion | **vollständig** | Blockiert ohne vertrauenswürdigen Preview-Grant |
| Demo-Fallback Produktion | **vollständig** | Deaktiviert auf Nicht-Localhost |
| Admin Share-UI | **vollständig** | Erzeugen, Kopieren, Widerrufen |
| Allowlist-Redaktion | **vollständig** | Nach Korrektur in `functions/lib/redactAllowlist.js` |
| Kurzlebige Dokument-URLs (5 min) | **nicht umgesetzt** | Phase-1-Designentscheidung; Snapshots enthalten keine URLs (sicher, aber kein Download) |
| PIN-Schutz | **nicht umgesetzt** | Bewusst optional/deaktiviert laut Design |
| App Check | **nicht umgesetzt** | Späterer Auftrag laut Design |
| Verteiltes Rate Limiting | **nicht umgesetzt** | Nur In-Memory MVP |
| Explizite CORS-Allowlist | **vollständig** | Nach Korrektur; exakter Origin-Vergleich |
| Security-Response-Header Function | **vollständig** | Nach Korrektur |
| Referrer-Schutz HTML | **vollständig** | `meta referrer=no-referrer` + `noreferrer` an externen Links |
| `admin=1` ohne Auth Produktion | **vollständig** | Nach Korrektur: nur mit `sessionStorage`-Grant aus Admin |
| Client-seitige Share-Erzeugung | **entfernt** | War sicherheitskritisch; entfernt |
| `devHmacSecret` im Browser | **entfernt** | War sicherheitskritisch; entfernt |

### Sicherheitskritische Abweichungen (vor Review)

| # | Problem | Schweregrad | Korrektur |
|---|---|---|---|
| 1 | `devHmacSecret` / `hashTokenDev` im Browser | **kritisch** | Entfernt; Secret nur serverseitig |
| 2 | Client-Fallback `createPortalShareDirect` | **kritisch** | Entfernt |
| 3 | `admin=1` allein erlaubte Preview | **kritisch** | Preview-Grant via `sessionStorage` + localhost |
| 4 | `cors: true` (alle Origins) | **hoch** | Explizite Allowlist |
| 5 | Denylist-Redaktion statt Allowlist | **hoch** | Allowlist-Modul |
| 6 | Client-Write auf `portalShares` möglich | **hoch** | Rules: `create/update/delete: if false` |
| 7 | Unterschiedliche HTTP-Codes bei ungültigem Share | **mittel** | Einheitlich 403 + neutrale Meldung |
| 8 | Raw-Token in `localStorage` | **mittel** | Nur `sessionStorage` in Admin-Sitzung |

---

## 2. HMAC-Secret `PORTAL_SHARE_HMAC_SECRET`

| Prüfpunkt | Ergebnis |
|---|---|
| Secret-Name einheitlich | **PASS** — `PORTAL_SHARE_HMAC_SECRET` in `functions/index.js`, Deployment-Befehl, `.secret.local.example` |
| Secret in `firebase-config.js` | **PASS** (nach Korrektur) — entfernt |
| Secret im Browser | **PASS** (nach Korrektur) — `hashTokenDev` entfernt |
| Secret in Git | **PASS** — `.gitignore` für `functions/.secret.local` |
| Emulator-Lokaldatei | **PASS** — `functions/.secret.local` (gitignored), nur bei `FUNCTIONS_EMULATOR=true` |
| Fallback auf festes Dev-Secret | **PASS** (nach Korrektur) — kein eingebautes Secret |
| Fehlendes Secret → kontrollierter Abbruch | **PASS** — `503` bei `portalShare`, `failed-precondition` bei `createPortalShare` |

---

## 3. Token-Erzeugung und -Prüfung

| Prüfpunkt | Ergebnis |
|---|---|
| Kryptografisch sicher | **PASS** — `crypto.randomBytes(32)` |
| Kein `Math.random()` | **PASS** |
| Token-Länge | **32 Bytes raw → 43 Zeichen base64url** (max. 128 erlaubt) |
| Entropie | **256 Bit** (`TOKEN_BYTES * 8`) |
| Raw-Token in Firestore | **PASS** — nur `tokenHash` gespeichert |
| Raw-Token in Logs | **PASS** — keine Token-Logs im Code |
| HMAC-SHA-256 serverseitig | **PASS** |
| Timing-sicherer Vergleich | **PASS** — `crypto.timingSafeEqual` |
| Gleiche neutrale Antwort (unbekannte ID / falscher Token) | **PASS** (nach Korrektur) — beide `403` + identische Meldung |
| Keine internen Fehlerdetails | **PASS** — generische JSON-Fehler |
| Token-Enumeration erschwert | **PASS** — gleiche Antwort, Rate Limit |

---

## 4. Raw-Token-Speicherung im Admin

### Bewertung

| Risiko/Aspekt | Bewertung |
|---|---|
| XSS auf gleicher Domain | **mittel** — Token in `sessionStorage` lesbar bei XSS |
| Andere Scripts gleiche Domain | **mittel** — gleiches Risiko wie Admin-Session generell |
| Browserdaten löschen | Token geht verloren → Admin muss neuen Share erzeugen |
| Anderes Admin-Gerät | Kein Token — beabsichtigt (kein Re-Export) |
| Nach Neuladen | Token in `sessionStorage` bleibt in gleicher Tab-Sitzung |
| Nach Widerruf | **PASS** — `saveShareToken(null)` löscht Eintrag |
| Neue Share-Erzeugung | **PASS** — alter Eintrag wird überschrieben |
| Logs/Fehlermeldungen | **PASS** — kein Token-Logging |

### Gewählte Lösung

- **Kein `localStorage`** für Tokens mehr.
- **`sessionStorage`** speichert nur `shareUrl` (enthält Token), `shareId`, Metadaten — **nur für aktuelle Admin-Sitzung**.
- Nach Erzeugung: **Dialog/Alert** mit Aufforderung zum sofortigen Kopieren.
- **Alternative „einmal anzeigen, nie reproduzieren“** wäre sicherer, aber UX für erneutes Kopieren schlechter. Gewählt: Session-Speicher mit dokumentiertem XSS-Risiko.

**Keine Verschlüsselung** im Browser — würde ohne Hardware-Key keinen Mehrwert bieten.

---

## 5. Admin-Authentifizierung

`isAdminAuth()` prüft:

```javascript
auth.uid vorhanden
sign_in_provider !== "anonymous"
role === "admin" || role === "owner"
```

| Szenario | Ergebnis |
|---|---|
| Anonymer User | **verweigert** |
| User ohne Rolle | **verweigert** |
| Admin/Owner | **erlaubt** |
| Fehlender Auth-Context | **verweigert** |

**Hinweis:** Custom Claims (`role: admin|owner`) müssen in Firebase Auth für echte Admin-Konten gesetzt sein. Ohne das ist `createPortalShare` in Produktion nicht nutzbar — **Deployment-Voraussetzung**.

---

## 6. Snapshot-Redaktion

- **Kanonisch:** `functions/lib/redactAllowlist.js` (Allowlist)
- **Browser-Kopie:** `customer-portal/redact-allowlist.js` (nur Validierung/Tests, keine Snapshot-Erzeugung im Browser)
- **Automatisierter Test:** `tests/security/redaction.test.js` mit sensiblen Fixture-Feldern

Getestete Ausschlüsse (Fixture): CRM, draftData, publishMeta, interne Notizen, Preise/Margen, Lieferant, UIDs, Storage-Pfade, permanente URLs, unsichtbare Dokumente/Bookings.

---

## 7. Snapshot-Unveränderlichkeit

| Prüfpunkt | Ergebnis |
|---|---|
| Share → feste `publicSnapshotId` | **PASS** |
| Snapshot bei Portalaufruf nicht neu aus Kunde gebaut | **PASS** |
| Client ergänzt keine internen Daten | **PASS** |
| Neue Veröffentlichung aktualisiert bestehenden Share nicht | **PASS** |

---

## 8. Firestore Rules — Automatisierte Tests

> **Hinweis:** Ausführung erfordert Firestore-Emulator auf Port 8080 und `npm install` in `tests/security/`.

| # | Test | Erwartung | Status |
|---|---|---|---|
| 1 | Unauth Read `customers/{id}` | verweigert | **NICHT DURCHFÜHRBAR** (kein Node/Emulator) |
| 2 | Anonymous Read `customers/{id}` | verweigert | **NICHT DURCHFÜHRBAR** |
| 3 | Unauth Read `portalShares/{id}` | verweigert | **NICHT DURCHFÜHRBAR** |
| 4 | Anonymous Read `portalShares/{id}` | verweigert | **NICHT DURCHFÜHRBAR** |
| 5 | Unauth Read `publicPortalSnapshots/{id}` | verweigert | **NICHT DURCHFÜHRBAR** |
| 6 | Anonymous Read `publicPortalSnapshots/{id}` | verweigert | **NICHT DURCHFÜHRBAR** |
| 7 | Client-Write `portalShares` | verweigert | **NICHT DURCHFÜHRBAR** (statisch: **PASS** — Rule `if false`) |
| 8 | Client-Write `publicPortalSnapshots` | verweigert | **NICHT DURCHFÜHRBAR** (statisch: **PASS**) |
| 9 | Admin Read `portalShares` | erlaubt | **NICHT DURCHFÜHRBAR** (statisch: **PASS**) |
| 10 | Cloud Function via Admin SDK | erlaubt | **NICHT DURCHFÜHRBAR** (Admin SDK umgeht Rules by design) |

---

## 9. Legacy-Link `?customer=`

| Szenario | Erwartung | Status (Code-Review) |
|---|---|---|
| Produktion ohne Grant | blockiert | **PASS** |
| Produktion `&admin=1` allein | blockiert | **PASS** (nach Korrektur) |
| Localhost | Legacy erlaubt | **PASS** |
| Admin-Preview mit Grant | erlaubt | **PASS** — `issueAdminPreviewGrant()` aus Admin |

---

## 10. `portalShare` Function

| Test | Status |
|---|---|
| Gültiger Share+Token | **NICHT DURCHFÜHRBAR** (Emulator) |
| Falscher Token | **PASS** (Code: 403 neutral) |
| Unbekannte Share-ID | **PASS** (Code: 403 neutral, gleiche Meldung) |
| Fehlender Token/Share | **PASS** (Code: 403 neutral) |
| Leerer Token | **PASS** (sanitized → 403) |
| Extrem langer Token (>128) | **PASS** (abgewiesen) |
| Ungültige Zeichen | **PASS** (Regex `[A-Za-z0-9_-]+`) |
| Widerrufener Share | **PASS** (403 + spezifische neutrale Meldung) |
| Abgelaufener Share | **PASS** |
| Fehlender Snapshot | **PASS** (403 neutral) |
| Fehlendes Secret | **PASS** (503) |
| Rate Limit 429 + Retry-After | **PASS** (Code) |

**Security-Header (Function):**

- `Cache-Control: private, no-store` — **PASS**
- `X-Content-Type-Options: nosniff` — **PASS**
- `Referrer-Policy: no-referrer` — **PASS**

---

## 11. Token in URL / Referrer

| Maßnahme | Status |
|---|---|
| `<meta name="referrer" content="no-referrer">` | **PASS** — `index.html` |
| Externe Links `rel="noopener noreferrer"` | **PASS** — `customer-portal.js` |
| Wetter-API (fetch, kein Referrer bei no-referrer Meta) | **PASS** |
| Google Maps Links | **PASS** — noreferrer |

---

## 12. CORS

- **Kein** `cors: true` mehr.
- Exakter Set-Vergleich erlaubter Origins (kein `includes`/`endsWith`).
- Default-Origins: Firebase Hosting + `localhost:8766/5000`.
- Produktive Zusatzdomain über `PORTAL_SHARE_ALLOWED_ORIGINS` (kommagetrennt) setzen.

| Test | Status |
|---|---|
| Unbekannte Origin | **PASS** (kein ACAO-Header) |
| Erlaubte Origin | **NICHT DURCHFÜHRBAR** (Emulator) |

---

## 13. Rate Limiting

| Aspekt | Ist-Zustand |
|---|---|
| Speicher | In-Memory `Map` pro Function-Instanz |
| Limit | 60 Requests / 60 s pro `IP:shareId` |
| IP-Quelle | `req.ip` (kein blindes Vertrauen in `X-Forwarded-For` im Code) |
| Multi-Instance | **Nicht belastbar** — Limits gelten pro Instanz |
| Cold Start | Bucket neu |
| Bereinigung | Best-Effort bei >10.000 Keys |
| 429 + Retry-After: 60 | **PASS** |

**Einordnung:** MVP Best-Effort. Empfehlung: später Firebase/App-Check + verteiltes Limit (Firestore/Redis/Memorystore).

---

## 14. Widerruf

| Schritt | Status (Code-Review) |
|---|---|
| Gültiger Link funktioniert | **NICHT DURCHFÜHRBAR** (E2E) |
| Admin widerruft | **PASS** — nur Callable |
| Link danach blockiert | **PASS** — `status: revoked` |
| Token in Admin entfernt | **PASS** — `saveShareToken(null)` |
| Nicht-Admin kann nicht widerrufen | **PASS** |
| Neutrale Portal-Meldung | **PASS** |

---

## 15. Emulator-Test

**Status: NICHT DURCHFÜHRBAR** — `node`, `npm`, `firebase` CLI auf Prüfsystem nicht verfügbar.

Vorbereitet:

- `tests/security/*.test.js`
- `tests/security/seed-emulator.js`
- `functions/.secret.local.example`
- `firebase.json` Emulators: Auth 9099, Firestore 8080, Functions 5001

---

## 16. Browser-Test

**Status: NICHT DURCHFÜHRBAR** — kein lokaler Server/Emulator-Stack in dieser Prüfung gestartet.

Testplan dokumentiert (15 Punkte aus Auftrag) — manuell nach Emulator-Start durchzuführen.

---

## A. Gefundene Probleme (mit Korrekturen)

Siehe Abschnitt 1 „Sicherheitskritische Abweichungen“ — alle 8 Punkte **korrigiert**.

---

## B. Automatisierte Tests (Auftrag 09 — ersetzt durch Auftrag 10 oben)

Siehe Abschnitt **„B. Automatisierte Tests (Auftrag 10)“**.

---

## C. Manuelle Browser-Tests (Auftrag 09 — ersetzt durch Auftrag 10 oben)

Siehe Abschnitt **„C. Manuelle Browser-Tests (Auftrag 10)“**.

---

## D. Offene Deployment-Voraussetzungen (Auftrag 09 — ersetzt)

Siehe Abschnitt **„D. Offene Deployment-Voraussetzungen“** unter Auftrag 10.

---

## E. Freigabeentscheidung (Auftrag 09 — ersetzt)

Siehe Abschnitt **„E. Freigabeentscheidung (Auftrag 10)“**.

---

## 18. Deployment-Befehle (angepasst an Projektstruktur)

```bash
# 1. Functions-Abhängigkeiten
cd functions
npm install

# 2. Lokales Emulator-Secret (nicht committen)
# PowerShell:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))" | Out-File -Encoding utf8 .secret.local
# Oder manuell: functions/.secret.local mit einer Zeile PORTAL_SHARE_HMAC_SECRET=<wert>

# 3. Produktions-Secret (interaktiv)
firebase functions:secrets:set PORTAL_SHARE_HMAC_SECRET

# 4. Security-Tests (Firestore-Emulator muss laufen)
cd ../tests/security
npm install
firebase emulators:exec --only firestore "npm test"

# 5. Emulator (manuell)
cd ../..
firebase emulators:start --only functions,firestore,auth

# In zweitem Terminal: Seed-Daten
# $env:PORTAL_SHARE_HMAC_SECRET="<gleicher wert wie .secret.local>"
# $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
# node tests/security/seed-emulator.js

# 6. Deployment (erst nach FREIGABE)
firebase deploy --only functions,firestore:rules
```

**Optionale Umgebungsvariable für CORS:**

```bash
firebase functions:config:set portalshare.allowed_origins="https://ihre-domain.tld,https://alpine-concierge-tirol.web.app"
```

(Alternativ `PORTAL_SHARE_ALLOWED_ORIGINS` als Functions-Umgebungsvariable in der Firebase-Konsole setzen.)
