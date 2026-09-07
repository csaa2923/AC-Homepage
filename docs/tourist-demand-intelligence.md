# Tourist Demand Intelligence (Ops Ready 8.1a)

Technische Spezifikation. Keine Live-Quellen, keine Fake-Marktdaten, keine Customer-Felder.

## 1. Zweck

Die Library `ACTTouristDemandLibrary` (`customer-portal/tourist-demand-library.js`) beschreibt, wie Alpine Concierge Tirol später Markt-Nachfrage strukturiert erfassen kann:

Was wird im Tirol-Tourismus aktuell oder saisonal nachgefragt, gesucht oder beobachtet – in welcher Region, für welches Marktsegment, mit welcher Such-/Buchungsabsicht?

8.1a bindet keine APIs an und persistiert nichts in Firestore.

## 2. Trennung Customer vs Market

| Domäne | Frage | Ort |
| --- | --- | --- |
| Customer | Was möchte dieser Gast? | `customer.*`, 8.0b `ACTCustomerWishesLibrary` |
| Market | Was zeigt der Tirol-Markt? | eigene Demand-Objekte, niemals `customer.*` / `travel.*` / `profile.*` / `preferences.*` |

Später (nicht 8.1a): Customer × Market × Region × Saison × Wetter × Mobilität → Concierge-Empfehlung.

## 3. Taxonomien

Wiederverwendet aus ACT:

- Saison-IDs `winter|spring|summer|autumn` wie `SEASONS` / `seasonFromDate` (März–Mai Frühling, Juni–August Sommer, September–November Herbst, sonst Winter). Demand nutzt kein `all`.
- Topic-IDs identisch zu 8.0b-Interessen: `nature`, `culinary`, `hike`, `bike`, `winter`, `wellness`, `culture`, `family`, `shopping`, `private`.
- Audience-IDs, soweit sie TRAVEL_PROFILES entsprechen: `couple`, `family`, `senior`, `luxury`, `sport`.

Demand-spezifisch:

- Regionen mit stabilen IDs: `tirol`, `innsbruck`, `seefeld`, `stubaital`, `oetztal`, `zillertal`, `achensee`, `kitzbuehel`, `wilder-kaiser`. Labels getrennt; Aliase vermeiden Dubletten.
- `seasonPhase`: `early|peak|late|shoulder` (optional, keine fünfte Jahreszeit).
- Weitere Audiences: `general`, `solo`, `group`, `business`.
- Intents: `discovery`, `planning`, `local`, `weather`, `last_minute`, `family`, `couple`, `premium`, `transport`, `booking`, `problem`.
- Subtopics: bekannte Aliase je Topic; weitere Slugs unter einem gültigen Topic sind erlaubt.

Customer-`region` bleibt Freitext. Demand-Regionen sind ein eigenes, geschlossenes ID-Set.

Saison ist keine Interessen-Kategorie. `season: winter` bedeutet Wintersaison, nicht Wintersport.

## 3a. General Tourism vs Topic Demand (8.1c.1)

Zwei Observation-Arten:

| demandScope | Bedeutung | Topic |
| --- | --- | --- |
| `general` | Gesamttourismus / Marktvolumen | keines (`""`) |
| `topic` | themenspezifische Nachfrage | Pflicht, 8.0b-Interest-ID |

Beispiele:

- GENERAL: „Tirol verzeichnete in der Wintersaison 26,4 Mio. Nächtigungen.“ → `season: winter`, `demandScope: general`, kein Topic.
- TOPIC: „Skifahren bleibt das Kernprodukt des Tiroler Wintertourismus.“ → `season: winter`, `demandScope: topic`, `topic: winter` (8.0b-ID, Label Wintersport).

Ohne `demandScope` bleibt ein vorhandenes Topic gültig und wird als `topic` gelesen (8.1a/8.1b-Kompatibilität). Ohne Topic und ohne `demandScope: general` ist die Observation ungültig. Es gibt kein Interest-Topic `tourism`.

General-Observations erscheinen in der Signal-Liste als „Gesamttourismus“, nicht in „Stärkste Signale in diesem Snapshot“. Snapshot/Trend zählen sie nicht in `topTopics`.

## 4. Observation / Inference / Recommendation

`statementType`:

- `observation` – was in einer Quelle gemessen oder berichtet wurde
- `inference` – was ACT daraus ableitet (z. B. ein Trend)
- `recommendation` – was operativ zu tun wäre

Ein Trend (`buildDemandTrend`) ist immer `inference`. Die Ebenen dürfen nicht untypisiert gemischt werden.

## 5. Evidence A–D

| ID | Bedeutung |
| --- | --- |
| A | quantitative Primärdaten (offizielle Statistik oder belastbarer Search-Trend) |
| B | mindestens zwei unabhängige aktuelle Signale |
| C | einzelnes aktuelles Signal |
| D | redaktionelle / saisonale Annahme, niemals wie gemessene Nachfrage |

Evidence A nur bei `sourceType` `official_statistics` oder `search_trend` und `signalType` `quantitative`.

## 6. Confidence

`high|medium|low`. Validierung:

- A/B: high, medium oder low
- C/D: höchstens medium (nicht high)

Einzelne schwache Signale (C/D) dürfen nicht `high` sein.

## 7. Source Model

Pflicht: `sourceId`, `sourceName`, `sourceType`, `observedAt` oder `retrievedAt`.

Optional: `publisher`, `publisherId`, `sourceFamily`, `derivedFromSourceId`, `url`, `publishedAt`, `geographicScope`.

`sourceType`: `official_statistics`, `tourism_board`, `search_trend`, `event_calendar`, `weather`, `official_destination`, `market_report`, `forum`, `editorial`.

Test-/Fixture-Quellen: `synthetic: true` und `fixtureKind: TEST|FIXTURE|SYNTHETIC`.

## 8. Freshness

`getDemandFreshness(observation, referenceDate)` → `current|recent|stale|historical`.

Schwellen hängen vom `sourceType` ab (Wetter kürzer als offizielle Statistik). Primär `observedAt`.

## 9. Aggregationsprinzip

`buildDemandTrend` / `buildDemandSnapshot`:

- zählen unabhängige Quellen
- stärkstes Evidence-Level
- gemeinsame Topic/Region/Saison
- optionale `changeDirection` nur wenn in den Metrics vorhanden
- Snapshot-`topTopics` nur mit `observationCount` und `independentSourceCount`

Kein Prozent, kein „3 Quellen = 75 %“, kein erfundenes Nachfragevolumen.

Zwei C-Signale unabhängiger Publisher können auf Trend-Ebene Evidence B ergeben. Ein einzelnes C bleibt C.

## 10. Regeln gegen Fake-Zahlen

- Quantitative Observation: `metricName` und `metricValue` Pflicht, kein Default für den Wert.
- Qualitative Observation: keine Metric.
- Library enthält keine produktiven Demand-Datensätze.
- Fixtures müssen als TEST/FIXTURE/SYNTHETIC markiert sein.

## 11. Geplante Quellen (noch nicht anbinden)

Noch nicht anbinden:

Google Trends, Search, Social, Foren, Wetter-API, Event-API, regionale TVB-Massenintegration, automatische AI-Auswertung.

Erste offizielle Quellen (kontrollierter manueller Import) siehe Abschnitt 21.

## 12. Spätere Customer × Demand Integration

Matching über gemeinsame IDs: Topic (8.0b interests), Region (Demand-ID vs. späteres Region-Mapping), Saison, Audience vs. `inferTravelProfile`, plus Wetter/Mobilität. Customer-Dokument bleibt frei von Demand-Feldern.

## 13. Dashboard Architecture (8.1b)

Admin V2 erhält eine eigene Hauptansicht `demand` (`#demand`), nicht als Kunden-Tab.

Schichten:

1. Model – `tourist-demand-library.js` (8.1a)
2. Provider – `tourist-demand-data-provider.js`
3. View – `tourist-demand-dashboard.js` plus Admin-V2-Route `Nachfrage Tirol`

Die Ansicht sitzt neben Dokumente/Einstellungen. Keine Kundendomain, keine Journey-/Wishes-Änderung.

## 14. Filter

Stabile 8.1a-IDs, kein Freitext-Matching:

- Saison: `winter|spring|summer|autumn` oder leer (alle)
- Region: `tirol|innsbruck|seefeld|stubaital|oetztal|zillertal|achensee|kitzbuehel|wilder-kaiser` oder leer
- Zielgruppe: Demand-Audiences oder leer

Optional: Topic, Intent.

`Alle Zielgruppen` ist ein UI-Zustand (`audience=""`). Es wird nicht als Audience `general` gespeichert. `general` bleibt eine echte Demand-Audience („allgemein“).

## 15. Empty State und Ladefehler

Ohne bestätigte Observations (null, leere Liste, nur synthetische oder nur ungültige Records):

„Für diese Auswahl liegen noch keine bestätigten Nachfragesignale vor.“

Keine Formulierung als „0 % Nachfrage“, „keine Nachfrage“ oder „uninteressant“. Fehlende Daten ≠ fehlende Nachfrage.

Technischer Provider-/Ladefehler ist ein eigener Zustand:

„Die Nachfragesignale konnten nicht geladen werden.“

Keine Stacktraces in der Admin-UI.

## 16. Provider Contract

```
loadDemandSnapshot(filters) → { ok, empty, errors, value }
```

`value` enthält den 8.1a-Snapshot plus `observations` (nach Filter). Produktion lädt `getProductionObservations()` – nur `reviewStatus: accepted` und `isProductionDemandRecord`.

Testdaten nur über `loadDemandSnapshotForTests(observations, filters)`. Jede Observation muss `synthetic: true` und `fixtureKind: TEST|FIXTURE|SYNTHETIC` tragen.

Der produktive Pfad (`loadDemandSnapshot` / `loadProductionSnapshot`) lässt nur `isProductionDemandRecord` durch. Records mit `synthetic: true` oder `fixtureKind: TEST|FIXTURE|SYNTHETIC` erscheinen nie im Admin-V2-Dashboard, unabhängig davon, woher sie technisch kommen.

Keine Firebase-Persistenz, keine HTTP-Requests.

## 17. Data provenance in UI

Jedes Signal zeigt Evidence (A–D mit Textlabel), Confidence (hoch/mittel/niedrig), Freshness (aktuell/kürzlich/veraltet/historisch) und Quelle (`sourceName`, Publisher, Typ, Daten, Referenz-URL). Observation / Ableitung / Empfehlung sind getrennte Labels. Recommendations erscheinen nicht als externe Quelle.

Trend `steigend|stabil|sinkend|unklar` nur, wenn Metrics/Aggregation eine Richtung tragen. Keine erfundenen Marktanteile oder Prozentwerte.

## 18. Production vs synthetic data

| Kontext | Daten |
| --- | --- |
| Produktion / Admin V2 | nur accepted Production-Observations aus dem 8.1c-Katalog |
| Tests / Harness | explizit markierte Fixtures, nicht von Admin V2 geladen |

## 19. Scope 8.1b

Kontrollierte Anzeige. Keine Live-Websuche, kein Scraping, keine Trends-/TVB-/Statistik-/Wetter-/Event-API, keine AI, kein Customer × Demand Matching, keine automatische Erfassung.

## 20. Übergang 8.1c

8.1c führt eine kontrollierte Ingestion-Schicht und maximal zwei offizielle reale Quellen ein. Der Provider bleibt die einzige Stelle, die Observations an das Dashboard liefert. Dashboard-Copy und Evidence-Regeln bleiben verbindlich.

## 21. Ingestion Architecture (8.1c)

Pipeline:

```
RAW SOURCE
→ SOURCE ADAPTER
→ NORMALIZED SOURCE RECORD
→ VALIDATED DEMAND OBSERVATION
→ PROVIDER
→ SNAPSHOT / TREND
→ DASHBOARD
```

Kein direkter Pfad Website/API → Dashboard-Markup. Keine source-spezifische Businesslogik in `tourist-demand-dashboard.js`.

Module:

1. Model – `tourist-demand-library.js` (8.1a Validatoren)
2. Ingestion – `tourist-demand-ingestion.js`
3. Catalog – `tourist-demand-catalog.js` plus versionierte Dateien unter `data/tourist-demand/imports/`
4. Provider – `tourist-demand-data-provider.js`
5. View – `tourist-demand-dashboard.js`

`RawSourceRecord` ist keine bestätigte Observation. Erst Adapter + 8.1a-Validierung erzeugen eine `DemandObservation`.

## 22. RawSourceRecord

Pflicht für einen importierbaren Rohdatensatz:

- `sourceRecordId`
- `rawTitle` oder `rawSummary`
- `reference` / `sourceUrl`
- `observedAt` (fachlicher Beobachtungszeitpunkt)

Optional: `rawMetric`, `rawRegion`, `rawTopic`, `rawSeason`, `publishedAt`, `originMarket`, explizites `mapping`.

Kein Rohdatensatz darf stillschweigend Region, Topic, Saison oder Evidence raten.

## 23. Source Adapter Contract

```
createSourceAdapter({
  sourceId, sourceName, sourceType, publisher, publisherId, sourceFamily,
  accessMethod, normalizeRecord
})
```

Der Adapter liefert Metadaten und eine Klassifikation. Er kann Validatoren nicht umgehen: fehlende oder unbekannte Taxonomie, fehlende Provenance und ungültige Evidence werden von der Ingestion abgelehnt oder als `review_required` markiert.

Access in 8.1c: `controlled_manual_import`. Kein Runtime-Fetch.

## 24. Accepted / Review / Rejected

| Status | Bedeutung | Dashboard |
| --- | --- | --- |
| `accepted` | vollständige, validierte Production-Observation | ja |
| `review_required` | Quelle brauchbar, Klassifikation unsicher | nein |
| `rejected` | strukturell oder taxonomisch ungültig | nein |
| `duplicate` | gleiche Import-ID bereits vorhanden | nein |

Unsichere Klassifikation (fehlende Saison/Topic/Region, kein explizites Mapping) wird nicht als bestätigtes Signal angezeigt.

## 25. Idempotency

Stabile Import-ID: `sourceId::sourceRecordId`.

Derselbe Source-Record zweimal importiert erzeugt keine zweite Observation. Re-Import mit `existingKeys` bleibt idempotent. Kein kryptografischer Hash nötig.

## 26. Provenance

Jede accepted Observation aus realer Quelle trägt mindestens:

`sourceId`, `sourceName`, `sourceType`, `publisher` / `publisherId`, `url` / `reference`, `observedAt`, `retrievedAt`, `region`, `demandScope`, `statementType`, `evidenceLevel`, `confidence`. Bei `demandScope: topic` zusätzlich ein gültiges 8.0b-Topic.

`publishedAt` nur wenn die Quelle ihn liefert.

`retrievedAt` = Importzeitpunkt. `observedAt` = fachlicher Beobachtungszeitpunkt. Diese beiden werden nicht vertauscht.

## 27. Evidence Handling

`official_statistics` allein ist nicht Evidence A. A nur bei quantitativem Signal **und** vorhandener Metric, gemäß 8.1a.

`tourism_board` allein ist nicht Evidence B. Ein einzelner offizieller Artikel bleibt C.

Evidence B entsteht weiterhin nur aus mindestens zwei unabhängigen Publishern / `sourceFamily`. `derivedFromSourceId` zählt nicht als zweite Quelle.

## 28. First Real Sources

### Quelle 1 – Landesstatistik Tirol (quantitativ)

| Feld | Wert |
| --- | --- |
| sourceName | Landesstatistik Tirol – Tourismusjahr 2024/25 |
| publisher | Landesstatistik Tirol |
| sourceType | `official_statistics` |
| access method | Controlled Manual Import der öffentlichen F.acT-Veröffentlichung |
| update cadence | saisonal / nach Tourismusjahr; kein automatischer Abruf |
| mapping | Wintersaison-Nächtigungen und -Ankünfte → `region: tirol`, `season: winter`, `demandScope: general`, kein Topic. Saison ist nicht Wintersport. |
| evidence / confidence | Evidence A nur für Records mit Metric; Confidence `high` |
| known limitations | Tourismusjahr-Total und Herkunftsmärkte sind `review_required` (Saison nicht eindeutig). Sommer-Nächtigungen 23,2 vs. 23,3 Mio. nicht importiert. Prozentänderung ohne exakte Vorjahres-Absolutzahl nicht als `comparisonValue` erfunden. |

Referenz: https://www.fact.tirol/statistik/statistik-tirol/tourismusjahr-2024/25/

### Quelle 2 – Tirol Werbung (qualitativ)

| Feld | Wert |
| --- | --- |
| sourceName | Tirol Werbung – Wintersaison 2024/25 Abschluss |
| publisher | Tirol Werbung |
| sourceType | `tourism_board` |
| access method | Controlled Manual Import der öffentlichen Presse.Tirol-Meldung |
| update cadence | anlassbezogen; kein automatischer Abruf |
| mapping | Qualitativer Satz „Skifahren bleibt das Kernprodukt“ → `demandScope: topic`, `topic: winter` (8.0b Wintersport), `season: winter`. Nicht aus der Jahreszeit abgeleitet. |
| evidence / confidence | qualitativ, Evidence C, Confidence `medium`; keine Metric |
| known limitations | Enthält auch Zahlen der Landesstatistik; diese werden hier nicht erneut als quantitative Observation übernommen. Marketingaussagen werden nicht in gemessene Nachfrage umformuliert. |

Referenz: https://presse.tirol.at/tirols-tourismus-beschliesst-wintersaison-mit-positivem-ergebnis/262512/

`originMarket` (z. B. DE) ist eine optionale Dimension und niemals eine Demand-Audience (`family` / `couple` / …).

## 29. Manual Import vs Automated Import

8.1c holt keine Quelle zur Laufzeit. Öffentliche HTML-/Presse-Seiten wurden manuell gelesen und in versionierte JSON-Dateien unter `data/tourist-demand/imports/` transkribiert.

Kein Scraping, kein Google Trends, kein Social-/Forum-Crawler, keine Secrets.

Wenn später eine klar erlaubte API/CSV existiert, kann ein Adapter denselben Contract nutzen. Ohne erlaubten automatisierten Zugriff bleibt der manuelle Import der Weg.

## 30. Production / Test Separation

Reale Importe: `synthetic: false`, `fixtureKind` leer / none.

Testdaten nur über `loadDemandSnapshotForTests` und markierte Fixtures (`synthetic: true`, `fixtureKind: TEST|FIXTURE|SYNTHETIC`).

Der 8.1b-Guard bleibt: synthetische oder Fixture-Records erscheinen nie im produktiven Provider-Pfad.

## 31. Produktive Datenhaltung

Versionierte lokale JSON-Importe + Catalog + bestehender Provider. Kein Firestore, kein Backend, kein Runtime-HTTP.

## 32. Geplante nächste Sources

Nicht in 8.1c:

- Statistik Austria Open Data (CSV/JSON, nur nach klarer Lizenz- und Mapping-Prüfung)
- datahub.tirol Monatswerte
- weitere Tirol-Werbung-Marktberichte
- regionale TVBs
- Google Trends / Search / Social / Foren / Wetter-API

Nächste 8.1c-Stufe: unsichere Tourismusjahr-/Herkunfts-Records nach explizitem Mapping reviewen oder verwerfen; Sommer-Nächtigungen erst nach Klärung 23,2 vs. 23,3.

## 33. Scope 8.1c

Keine Customer-Integration, keine Customer-Felder, keine Journey-/Wishes-Änderung, keine AI, kein Google Trends, kein Social-/Forum-Scraping, keine Secrets, keine IAM-Änderung, keine Portal/Auth/OTP-Änderung, keine automatische Veröffentlichung, kein Firebase Deploy.
