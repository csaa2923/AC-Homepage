# Operations Ready 4.1A – ACT-Kundenportal Bestandsanalyse und Zielarchitektur

Stand: 2026-07-27  
Scope: reine Analyse und Planung. Keine produktiven Code-/UI-Änderungen in diesem Auftrag.

---

## A. Kurzfazit

Das ACT-Kundenportal ist eine **einzelne HTML-Seite** (`customer-portal/index.html`) ohne SPA-Router. Produktion läuft über **`?share=` + `?token=`** gegen Cloud Functions (`portalShare` / `portalDocument`). Daten kommen aus einem **bereits redigierten Public Snapshot**. UI-Rendering ist zentral in `customer-portal.js` (`renderPortal` → viele `render*`-Funktionen). Concierge, Timeline, Leaflet/OSM, Höhenprofil und Open-Meteo sind clientseitig ergänzt.

**Umbau in fünf App-Ansichten grundsätzlich möglich: ja.**

Wichtigste Risiken: harte DOM-IDs/Selektoren, Leaflet in versteckten Containern, doppelte Event-Bindungen, Share-/Token-URL bei Hash-Navigation, Redaction-Lücken bei neuen Feldern.

**Empfohlener nächster Schritt:** Operations Ready **4.1B** – App-Container und View-State-Grundlage, ohne Inhalte zu verschieben.

---

## B. Relevante Dateien

### Gastportal-Runtime (direkt geladen)

| Datei | Aufgabe | Kritikalität | Später änderbar? | Abhängigkeiten |
|---|---|---|---|---|
| `customer-portal/index.html` | Shell, Sections, Script-Pins | hoch | ja (vorsichtig) | alle Portal-JS/CSS |
| `customer-portal/customer-portal.js?v=48` | Init, Load, Render, Events | hoch | ja (Kern) | Share, Travel, Concierge, Firebase |
| `customer-portal/customer-portal.css?v=20` | Portal-Styles | mittel | ja | HTML/JS-Klassen |
| `customer-portal/portal-share-library.js?v=4` | Share-URL/Params/Host-Policy | hoch | nur mit Security-Review | firebase-config |
| `customer-portal/redact-allowlist.js?v=13` | Browser-Allowlist/Redaction | hoch | nur sync mit Functions | – |
| `customer-portal/redact-public-snapshot.js?v=2` | Re-Export Allowlist | hoch | selten | redact-allowlist |
| `customer-portal/travel-actions-library.js?v=11` | Navigation, GPX/KML, Hike Companion | hoch | ja | Leaflet |
| `customer-portal/concierge-assistant-library.js?v=2` | Concierge + Timeline-Modell | mittel | ja | Wetter/Programm |
| `customer-portal/booking-library.js?v=1` | Bookings ↔ Programm | mittel | ja | Redaction |
| `customer-portal/customer-data.js?v=3` | Demo-Daten | niedrig | ja | nur Non-Prod |
| `customer-portal/demo-examples.js?v=1` | Demo-Fallback | niedrig | ja | Non-Prod |
| `customer-portal/firebase-config.js` | Firebase + Portal-Flags | hoch | vorsichtig | – |
| `customer-portal/firebase-service.js?v=24` | Share/Document-Fetch, Firestore | hoch | vorsichtig | Cloud Functions |
| `customer-portal/firebase-database.js?v=2` | Facade | hoch | vorsichtig | firebase-service |
| `customer-portal/firebase-auth.js` | Auth (Admin-Preview) | hoch | vorsichtig | – |
| `customer-portal/firebase-storage.js` | Storage-Helfer | mittel | vorsichtig | – |
| Leaflet 1.9.4 + MarkerCluster 1.5.3 (CDN) | Karten | mittel | ja | OSM Tiles |

### Backend (Share / Snapshot / Dokumente)

| Datei | Aufgabe | Kritikalität | Später änderbar? |
|---|---|---|---|
| `functions/impl.js` | `portalShare`, `portalDocument` | hoch | nur mit Security-Review |
| `functions/lib/portalShareCore.js` | HMAC Token | hoch | nein ohne Review |
| `functions/lib/portalShareSync.js` | Snapshot bauen + redigieren | hoch | vorsichtig |
| `functions/lib/redactAllowlist.js` | Server-Allowlist (Source of Truth) | hoch | sync mit Browser |
| `functions/lib/documentAccess.js` | Dokument-Sichtbarkeit/URLs | hoch | vorsichtig |
| `functions/lib/httpPolicy.js` | CORS, Share-Validierung | hoch | vorsichtig |
| `functions/index.js` | Exports | hoch | vorsichtig |

### Admin / Publish (beeinflussen Portaldaten, nicht Guest-Shell)

| Datei | Aufgabe | Kritikalität |
|---|---|---|
| `customer-portal/admin-v2.js` / `.html` / `.css` | Admin inkl. Concierge/Programm | hoch |
| `customer-portal/publish-workflow.js` | Publish + Flatten | hoch |
| `customer-portal/admin-v2-*.js` | Bookings, Comm, PDF, QR | mittel |

### Assets

- `../favicon.ico`, `../images/logo/logo.png`, `../images/logo/logo.jpg`
- OSM: `tile.openstreetmap.org`
- WhatsApp: `wa.me/4367761410679`

### Tests (Auszug)

`tests/security/portal-documents.test.js`, `portal-share-*.test.js`, `redaction.test.js`, `travel-actions-library.test.js`, `concierge-assistant-library.test.js`, `document-access.test.js`, `share-logic.test.js`, …

### Bestehende Doku

`docs/PORTAL_SHARE_DESIGN.md`, `docs/PORTAL_SHARE_SECURITY_REVIEW.md`, …

---

## C. Datenfluss

```text
URL (?share=&token=)
→ portal-share-library.parseShareParams
→ customer-portal.js loadCustomerData
→ [Share] firebase-database.fetchPortalShareData
→ firebase-service GET portalShare (cache:no-store)
→ functions/impl.portalShare
   → sanitize share/token
   → load portalShares + publicPortalSnapshots
   → HMAC verifyToken / validateShareAccess
   → return snapshot.data (bereits redigiert)
→ normalizeCustomerData
→ renderPortal → render* (Meta, Status, Calendar, Concierge, Days, Details, Bookings, Hotel, Weather, Docs, Contact, Actions, History)
→ bindActions
→ hydrateShareDocumentUrls / portalDocument (on demand)
→ observeLazyMaps → mountHikeLeafletMap (+ invalidateSize)
→ updateOpenMeteoWeather (async, clientseitig)
```

### Antworten auf die Leitfragen

1. **share/token lesen:** `ACTPortalShareLibrary.parseShareParams(location.search)` in `customer-portal.js`.
2. **Prüfung:** Client nur Presence; Server HMAC + Status/Expiry in `portalShare`.
3. **Snapshot:** Firestore `publicPortalSnapshots/{id}` via Share-Bundle.
4. **Direkt Firestore (Gast Share):** nein für Programmdaten; nur Function-Response. Legacy/Admin-Preview: `loadPublishedCustomer`.
5. **Storage:** Dokumente über `portalDocument` Signed/URL-Pfad; GPX/KML-URLs im Snapshot falls https.
6. **Im Public Snapshot:** Allowlist-Felder (Root + Program + Docs + Weather + Concierge …).
7. **Client-Filter:** Sichtbarkeit Docs/Bookings; `publicDocumentUrl`; Koordinaten-Validierung in `normalizeCustomerData`.
8. **Concierge/Timeline:** in `renderPortal` / erneut nach Wetterupdate. **Karten:** lazy per IntersectionObserver nach Programmdetails.
9. **Dokumente:** `renderDocuments`; Share-URLs hydratisiert async.
10. **Einmal vs. erneut:** Load einmal; Re-Render bei Wetter/Done-Toggle; Maps nur wenn sichtbar und noch nicht `data-hike-ready`.

### Nicht-Share-Pfade (Evidence)

- Trusted Admin Preview (`?admin=1` + Grant/local)
- Legacy `?customer=` nur Non-Prod / Flag `allowLegacyCustomerParam` (Prod: false)

---

## D. Datenfelder (kundensichtbar / Allowlist)

| Bereich | Feld | Datenquelle | optional? | gerendert? | kundensichtbar? |
|---|---|---|---|---|---|
| Kunde | customerName, tripName/Title, version, status | Snapshot | nein/teilw. | ja (Hero) | ja |
| Kunde | region, start/end/travelPeriod | Snapshot | ja | Meta/Status | ja |
| Kunde | companions, adults, children, occasion, travelProfile | Snapshot | ja | Concierge-Profil | ja |
| Kunde | language/portalLanguage | Snapshot | ja | Concierge-Texte de/en | teilweise |
| Kunde | image/hero/cover | Snapshot | ja | bedingt | ja |
| Programm | flat program[] (nach Flatten) | Snapshot | nein | Timeline/Details | ja |
| Programm | date/time/title/description/location/address/category/status | Item | teilw. | ja | ja |
| Programm | notes (nicht internalNotes) | Item | ja | Details | ja |
| Programm | gpx/kml/routePoints/bounds/elev/markers | Item | ja | Hike Companion | ja |
| Programm | conciergeHint/Priority/Reminder* | Item | ja | Timeline/Hints | ja |
| Concierge | conciergeRecommendations[] | Snapshot | ja | Concierge-Card | ja |
| Wetter | weather.days (snapshot) + Open-Meteo live | Snapshot + API | ja | Weather/Concierge | ja |
| Docs | title/type/url/… | Snapshot + portalDocument | ja | Dokumente | ja |
| Hotel | accommodations/hotel | Snapshot | ja | hotelCard | ja |
| Contact | phone/whatsapp/email/emergency | Snapshot + Defaults | teilw. | contact | ja |
| Bookings | public booking fields | Snapshot | ja | bookings | ja |
| Intern | crm, internalNotes, tokenHash, storagePath, … | Draft/Admin | – | nein | **nein** (blocked) |

Hinweis Prompt: „Anrede“, „WLAN“, „Parkplatz“ als feste Felder – im Allowlist/Portal-Render **nicht als eigene kanonische Felder** belegt; Unterkunft nutzt Name/Adresse/Check-in/out/Telefon/Website.

Timeline-Status „vergangen/aktuell/zukünftig“ wird **berechnet** aus Uhrzeit vs. `now`, nicht als persistiertes Feld gespeichert.

---

## E. DOM- und Funktionsabhängigkeiten

### Wichtige IDs (müssen erhalten bleiben)

`portalRoot`, `portalTitle`, `tripTitle`, `portalVersion`, `heroMeta`, `whatsappHero`, `adminVersionHint`, `publicationStatus`, `updatedAt`, `progressFill`, `statusSteps`, `nextEventCard`, `calendarDaySelector`, `tripCalendar`, `dayCalendar`, `overallTimeline`, `concierge`, `conciergeRoot`, `dayTimelines`, `programDetails`, `bookingGrid`, `hotelCard`, `weatherCard`, `weatherDays`, `weatherMeta`, `documentGrid`, `contactCard`, `actionGrid`, `historyList`, `downloadTripCalendarButton`, Templates `shareErrorTemplate`, `notFoundTemplate`.

### Dynamisch

- `detail-${item.id}` Programmdetails
- `[data-hike-map]`, `[data-hike-elev-for]`, `[data-hike-live-location]`
- Travel-Action-Buttons mit `data-travel-*`

### Kernfunktionen

| Funktion | Datei | Aufgabe | Sicherheitsrelevant | wiederverwendbar |
|---|---|---|---|---|
| `initPortal` / `loadCustomerData` | customer-portal.js | Boot + Load | ja | ja |
| `loadShareCustomerData` | customer-portal.js | Share-Fetch | ja | ja |
| `normalizeCustomerData` | customer-portal.js | Defaults/Shape | mittel | ja |
| `renderPortal` | customer-portal.js | Orchestrierung | mittel | ja (aufteilen) |
| `renderConciergeAssistant` | customer-portal.js | Concierge UI | nein | ja → Heute |
| `renderDayTimelines` / `renderProgramDetails` | customer-portal.js | Reiseplan | nein | ja → Reiseplan |
| `mountHikeLeafletMap` / `observeLazyMaps` | customer-portal.js | Karten | nein | ja → Detail |
| `renderDocuments` / `openShareDocument` | customer-portal.js | Docs | ja | ja → Dokumente |
| `renderHotel` / `renderContact` / `renderActions` | customer-portal.js | Service | mittel | ja → Service |
| `bindActions` | customer-portal.js | globale Events | mittel | vorsichtig (Idempotenz) |
| `resolveConciergeForPortal` / Timeline | concierge-assistant-library.js | Modell | nein | ja |
| `resolveHikeCompanion` | travel-actions-library.js | Wander-UI-Modell | nein | ja |
| `redactPublicSnapshot` | redactAllowlist (beide) | Publish/Share | ja | unverändert lassen |
| `fetchPortalShareData` | firebase-service.js | HTTP Share | ja | unverändert lassen |

### Leaflet

Nach View-Wechsel in verstecktem Container: **`invalidateSize()`** ist bereits nach Mount vorhanden; bei späterem Show/Hide erneut nötig.

### Sprache

Kein UI-Sprachschalter. Concierge-Texte `de`/`en` über `language` / `portalLanguage`. `html lang="de"` fest.

### Router

Kein SPA-Router im Gastportal. Nur Fragment-Anker (`#overview` …). Admin V2 hat eigenes Hash-Routing – nicht übernehmen als paralleles System für denselben Guest-Root ohne Plan.

---

## F. Sicherheitsinvarianten (unveränderbar ohne Review)

1. Produktion: Zugang nur über `share` + `token`; kein Rückfall auf `?customer=`.
2. Kein Rendern von Kundendaten vor erfolgreicher Share-Prüfung (bzw. explizit erlaubtem Legacy/Preview).
3. Neutrale Fehlermeldungen bei ungültigem/fehlendem Token.
4. Public Snapshot nur Allowlist; `BLOCKED_VALUE_KEYS` (crm, internalNotes, tokenHash, rawToken, storagePath, …) bleiben ausgeschlossen.
5. Nested day `items[]` müssen beim Publish/Share **geflattet** werden, sonst Verlust von Travel-Feldern.
6. Dokument-URLs nur http(s); Share-Dokumente ohne URL über `portalDocument`, nicht über ungeschützte neue Pfade.
7. Share/Document-Fetch mit `cache: no-store`.
8. Token nur als Hash serverseitig; Raw-Token nicht speichern/loggen.
9. Admin-Preview zeitlich/grant-beschränkt.
10. Portal-Seite `noindex` / `noreferrer` beibehalten.
11. CORS/Rate-Limit auf Functions nicht schwächen.

---

## G. Zuordnung zu den fünf App-Bereichen

| Bestehender Bereich | aktuelle Position | zukünftige Ansicht | Renderfunktion | Besonderheiten |
|---|---|---|---|---|
| Hero / Meta / WhatsApp | `#overview` | Heute (+ Service) | `renderPortal`/`renderMeta` | Brand/Begrüßung |
| Status/Progress | `#status` | Heute | `renderStatus` | optional kompakt |
| Concierge + Timeline + Timed Hints | `#concierge` | Heute | `renderConciergeAssistant` | wetterabhängig |
| Wetter | `#weatherCard` | Heute | `renderWeather` | Open-Meteo live |
| Nächstes Event / Kalender | `#calendar` | Heute / Reiseplan | `renderCalendar*` | Calendar-State lokal |
| Gesamt-Timeline | `#overall-timeline` | Reiseplan | `renderOverallTimeline` | |
| Tagesprogramm | `#day-timeline` | Reiseplan | `renderDayTimelines` | Done-Checkbox localStorage |
| Programmdetails + Wanderkarte | `#program-details` | Reiseplan / Detail | `renderProgramDetails` | Lazy Leaflet |
| Bookings | `#bookings` | Reiseplan / Dokumente | `renderBookings` | |
| Restaurants/Activities (Daten) | Snapshot-Arrays | Entdecken | derzeit schwach gerendert | Ausbau Entdecken |
| Dokumente | `#documents` | Dokumente | `renderDocuments` | portalDocument |
| Hotel | `#hotelCard` | Service | `renderHotel` | |
| Kontakt / Actions / History | `#contact` `#actions` history | Service | `renderContact`/`renderActions`/`renderHistory` | |
| Sprachprofil | Datenfeld | Service | Concierge languageFallback | kein UI-Switcher |

---

## H. Empfohlene Zielarchitektur

**Ist:** Single Page, Fragment-Nav, ein Load, viele Sections gleichzeitig im DOM.

**Soll (Konzept, nicht implementieren):**

```html
<main id="customer-app" data-active-view="today">
  <section data-view="today" hidden></section>
  <section data-view="itinerary" hidden></section>
  <section data-view="discover" hidden></section>
  <section data-view="documents" hidden></section>
  <section data-view="service" hidden></section>
</main>
<nav><!-- mobile bottom / desktop top --></nav>
```

Prinzipien:

- **Einmal laden** (Share-Snapshot), Views nur umhängen/einblenden.
- **View-State** intern + optional Hash `#today` … **ohne** `share`/`token` zu verlieren (`history.replaceState` / Hash getrennt von Query).
- **Lazy init** Karten/Concierge-heavy erst bei View-Aktivierung; bei Show `invalidateSize`.
- **`bindActions` idempotent** machen (einmal binden oder Delegation behalten).
- Desktop: Top- oder Side-Nav; Mobile: Bottom-Nav + Safe-Area; bestehende `#…`-Anker schrittweise mappen.
- Kein zweites paralleles Router-Framework; kein Full-Reload.

---

## I. Risikomatrix

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmaßnahme | Test |
|---|---|---|---|---|
| DOM-IDs/Selektoren brechen | hoch | hoch | IDs stabil halten, Mapping-Tabelle | portal-documents asserts |
| Leaflet in `hidden` falsch skaliert | hoch | mittel | `invalidateSize` on view show | manuell Karte |
| Doppelte `bindActions` | mittel | mittel | einmal binden / Delegation | Event-Count Smoke |
| Share-Query bei Hash-Nav verloren | mittel | hoch | Query nie ersetzen, nur Hash | share URL manuell |
| Concierge/Timeline doppelt | mittel | niedrig | Registry/Clear vor Render | Concierge-Tests |
| Doc-Links ohne Token-Kontext | mittel | hoch | weiter `portalDocument` | portal-documents |
| Sprache aktualisiert Views nicht | mittel | mittel | zentraler re-render on lang | Concierge EN |
| Bottom-Nav überdeckt Content | hoch | mittel | Safe-area padding | Mobile QA |
| Public Snapshot fehlt Felder für neue UI | mittel | mittel | Allowlist erweitern + Sync | redaction.test |
| Empty States als kaputte Cards | mittel | niedrig | Empty-Komponenten 4.7 | manuell |
| Horizontal Overflow Desktop/Mobile | mittel | mittel | Designsystem 4.8 | Visual QA |
| Nested items Regression | niedrig | hoch | Flatten-Invariante Tests | redaction flatten |

---

## J. Empfohlene Folgeaufträge

### 4.1B – App-Container und View-State
- **Ziel:** View-State + Container, Inhalt noch an bestehender Seite.
- **Dateien:** `index.html`, `customer-portal.js/css` (minimal).
- **Nicht:** Share, Redaction, Functions, Tests ändern (außer neue Pin-Asserts).
- **Risiko:** Query/Hash-Konflikt.
- **Tests:** bestehende Portal-Security + manuell Share-URL.
- **Abnahme:** Share lädt; alle Sections noch sichtbar/nutzbar.

### 4.1C – Navigation Mobile/Desktop
- Bottom-Nav + Desktop-Nav, Safe-Area, a11y, Browser-Back.
- Risiko: Overlay; Tests: manuell + bestehende.

### 4.2 – Heute
- Hero, Concierge, Timeline, Wetter, Next Event, Quick Actions.
- Risiko: Concierge-Doppelrender.

### 4.3 – Reiseplan
- Days, Details, Bookings; Karten lazy.
- Risiko: Done-State, Detail-Anker.

### 4.3A – Wander-Detail
- Leaflet, Elev, Marker, Live, Downloads.
- Risiko: `invalidateSize`, Clustering.

### 4.4 – Entdecken
- restaurants/activities/Empfehlungen/Schlechtwetter-Alternativen.
- Risiko: fehlende Snapshot-Felder.

### 4.5 – Dokumente
- Grid + portalDocument.
- Risiko: AuthZ/URL.

### 4.6 – Service
- Hotel, Kontakt, Notfall, Sprache.
- Risiko: WhatsApp/Defaults.

### 4.7 – Loading/Error/Empty
### 4.8 – Premium Design / Responsive
### 4.9 – a11y + Browser-State Feinschliff
### 5.0 – Gesamtabnahme / Release

---

## K. Testergebnis

**Befehl:**

```text
node --test ^
  tests/security/portal-documents.test.js ^
  tests/security/portal-share-core.test.js ^
  tests/security/portal-share-http.test.js ^
  tests/security/portal-share-sync.test.js ^
  tests/security/redaction.test.js ^
  tests/security/travel-actions-library.test.js ^
  tests/security/concierge-assistant-library.test.js ^
  tests/security/document-access.test.js ^
  tests/security/share-logic.test.js
```

(ausgeführt mit Cursor-bundled Node, da System-`node` nicht im PATH)

| Metrik | Wert |
|---|---|
| Tests | 87 |
| Pass | 83 |
| Fail | 4 |
| Skip | 0 |
| Exit-Code | 1 |

**Fehlerursache (nicht umgangen):** Suite `portalShare HTTP` – 4 Subtests mit `error: 'fetch failed'`. Benötigen Netzwerkzugriff auf die deployte/erreichbare Share-HTTP-Function; in dieser Umgebung fehlgeschlagen. Unit-/Redaction-/Concierge-/Travel-/Portal-Markup-Tests bestanden.

Tests wurden **nicht verändert**.

---

## L. Git-Status (Analyse-Auftrag)

Erwartung dieses Auftrags: keine produktiven Dateien ändern.

Nach Analyse:

- Arbeitsbaum laut `git status --short`: **keine** zusätzlichen produktiven Änderungen durch diesen Analyseauftrag (außer optionaler Doku-Datei, falls angelegt).
- Branch: `main...origin/main`

**Kein Commit. Kein Push. Kein Deploy.**

---

## Abnahme-Checkliste 4.1A

- [x] Relevante Portaldateien identifiziert
- [x] Datenfluss dokumentiert (codebasiert)
- [x] Sicherheitskritische Funktionen erkannt
- [x] DOM-Abhängigkeiten dokumentiert
- [x] Fünf App-Bereiche zugeordnet
- [x] Zielarchitektur vorgeschlagen
- [x] Risikomatrix priorisiert
- [x] Folgeaufträge definiert
- [x] Bestehende Tests unverändert ausgeführt und dokumentiert
- [x] Keine produktive Implementierung in diesem Auftrag
