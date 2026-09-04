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

## 11. Geplante Quellen für 8.1b / 8.1c

Noch nicht anbinden:

Google Trends, Search, Social, Foren, Wetter-API, Event-API, Tirol Werbung, TVB, Statistik Tirol, automatische AI-Auswertung.

8.1b: Demand-Dashboard (lesen/anzeigen). 8.1c: erste echte Imports mit Source- und Evidence-Pflicht.

## 12. Spätere Customer × Demand Integration

Matching über gemeinsame IDs: Topic (8.0b interests), Region (Demand-ID vs. späteres Region-Mapping), Saison, Audience vs. `inferTravelProfile`, plus Wetter/Mobilität. Customer-Dokument bleibt frei von Demand-Feldern.
