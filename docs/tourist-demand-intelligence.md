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

Google Trends, Search, Social, Foren, Wetter-API, Event-API, Tirol Werbung, TVB, Statistik Tirol, automatische AI-Auswertung.

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

`value` enthält den 8.1a-Snapshot plus `observations` (nach Filter). Produktion lädt `getProductionObservations()` – in 8.1b eine leere Liste.

Testdaten nur über `loadDemandSnapshotForTests(observations, filters)`. Jede Observation muss `synthetic: true` und `fixtureKind: TEST|FIXTURE|SYNTHETIC` tragen.

Der produktive Pfad (`loadDemandSnapshot` / `loadProductionSnapshot`) lässt nur `isProductionDemandRecord` durch. Records mit `synthetic: true` oder `fixtureKind: TEST|FIXTURE|SYNTHETIC` erscheinen nie im Admin-V2-Dashboard, unabhängig davon, woher sie technisch kommen.

Keine Firebase-Persistenz, keine HTTP-Requests.

## 17. Data provenance in UI

Jedes Signal zeigt Evidence (A–D mit Textlabel), Confidence (hoch/mittel/niedrig), Freshness (aktuell/kürzlich/veraltet/historisch) und Quelle (`sourceName`, Publisher, Typ, Daten, Referenz-URL). Observation / Ableitung / Empfehlung sind getrennte Labels. Recommendations erscheinen nicht als externe Quelle.

Trend `steigend|stabil|sinkend|unklar` nur, wenn Metrics/Aggregation eine Richtung tragen. Keine erfundenen Marktanteile oder Prozentwerte.

## 18. Production vs synthetic data

| Kontext | Daten |
| --- | --- |
| Produktion / Admin V2 | nur Provider-Produktion, aktuell leer |
| Tests / Harness | explizit markierte Fixtures, nicht von Admin V2 geladen |

## 19. Scope 8.1b

Kontrollierte Anzeige. Keine Live-Websuche, kein Scraping, keine Trends-/TVB-/Statistik-/Wetter-/Event-API, keine AI, kein Customer × Demand Matching, keine automatische Erfassung.

## 20. Übergang 8.1c

8.1c darf echte, evidenzenpflichtige Imports einführen. Der Provider bleibt die einzige Stelle, die Observations an das Dashboard liefert. Dashboard-Copy und Evidence-Regeln bleiben verbindlich.
