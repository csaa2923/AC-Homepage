# ACMS: Angebot, Annahme und Drittbuchungsfreigabe — Bestandsanalyse

Stand: 2026-10-24. Entwicklungsbranch: `feature/acms-offer-thirdparty-approval`. **Keine Produktivfreigabe.**

## Vorhandene Architektur (im Repository geprüft)

| Funktion | Bestehende Implementierung | Integrationsentscheidung |
| --- | --- | --- |
| Kunden-/Interessentenverwaltung | `customer-portal/admin-v2.js`, `customer-portal/crm-library.js` | Bestehende Kunden-IDs verwenden; keine zweite Kundendatenbank |
| Kommunikation, Angebot, gesetzliche Erklärungen | `customer-portal/admin-v2-legal-comms.js` | Bestehende Statusschritte und Kundendokumente erweitern; vorhandene Angebotsannahme ist nach Dateikommentar keine automatische Kundenzustimmung |
| Angebotslink für Interessenten | `customer-portal/customer-proposal-admin-library.js`, `customer-portal/customer-proposal-grant-library.js` | Vorhandene kurzlebige Grants wiederverwenden; Status/Token allein ist keine Vertragsannahme |
| Drittbuchungen | `customer-portal/booking-library.js`, `customer-portal/admin-v2-bookings.js` | Buchungsdatensätze und Anbieterreferenzen wiederverwenden |
| Zahlungen und Organisationsfreigabe | `customer-portal/admin-v2-payment.js` | Bestehende Status- und Freigabelogik erhalten; keine automatische Zahlungsbestätigung |
| Entwurf/Veröffentlichung | `customer-portal/publish-workflow.js`, `customer-portal/PUBLISHING.md` | Nur freigegebene Kundenansicht; interne Preise/Margen nie veröffentlichen |
| Kundenzugang | `customer-portal/portal-customer-auth.js`, `customer-portal/login.html` | Serverseitige Identitäts- und Kundenzuordnung nötig |
| Mehrsprachigkeit | `customer-portal/i18n/{de,en,it,fr}.js` | Vorhandene Übersetzungsstruktur erweitern |
| Dokumentgeneratoren | `angebot-erstellen.html`, `drittbuchungsfreigabe.html` | Bestehende UI als Referenz verwenden, aber keine zweite Datenhaltung |
| Sicherheitsprüfungen | `tests/security/` | Vorhandene Tests erhalten und neue Negativtests ergänzen |

## Fachlich-technische Lücken, vor produktiver Implementierung zu klären

1. **Angebotsannahme**: Ein eigenständiger, serverseitig autorisierter Annahme-Endpunkt mit unveränderlicher Angebotsversion, bestätigten Erklärungstexten, Sprache, Serverzeit und idempotenter Verarbeitung muss gegenüber den bestehenden Proposal-Funktionen abgegrenzt werden.
2. **Drittbuchungsfreigabe**: Eigener versionierter Freigabegegenstand mit referenzierten bestehenden `bookingId`-Werten; kundenindividuelle Zustimmung je Position; nach Preis-/Bedingungsänderung neue Freigabeversion.
3. **Zahlungsfreigabe**: Keine automatische Organisation allein durch Kundenannahme oder Zahlungsbeleg; bestätigter Zahlungseingang und erforderliche rechtliche Erklärungen müssen getrennt vorliegen.
4. **Berechtigungen**: Firestore-Regeln, Cloud Functions, Portalzugang und Admin-Rollen vor Änderungen vollständig gegen die geplanten Lese-/Schreibwege prüfen.
5. **Recht**: Österreichisches PRG/FAGG, zulässige Stornopauschalen, Verbraucherinformationen und Weiterleitung von Drittgeldern durch österreichische Rechtsberatung prüfen lassen.

## Umsetzungsschritte im bestehenden ACMS

1. Datenfluss der bestehenden Kundenangebote bis zum Kundenportal und der zugehörigen Serverfunktionen nachvollziehen.
2. Versioniertes Angebot als kundengebundenen Datensatz integrieren; Admin-Entwurf, PDF, Versandstatus.
3. Serverseitig autorisierte Angebotsannahme inklusive gesonderter Erklärung zum vorzeitigen Leistungsbeginn; manipulationssichere Protokollierung.
4. Drittbuchungsfreigaben aus bestehenden Buchungsdatensätzen generieren und einzeln im Portal bestätigen lassen; ohne automatischen Buchungsauftrag.
5. Zahlungs-/Organisationsstatus mit rechtlichen Voraussetzungen verknüpfen; Statusübergänge validieren.
6. Übersetzungen DE/EN/IT/FR und Sicherheitstests; Review und erst nach ausdrücklicher Freigabe produktives Deployment.

## Akzeptanzkriterien

- Kunde A kann Angebote/Freigaben von Kunde B weder lesen noch bestätigen.
- Ein bereits angenommenes Angebot kann nicht stillschweigend verändert werden.
- Doppelte Bestätigung führt nicht zu doppelten Aufträgen.
- Abgelaufene/widerrufene Links und alte Angebotsversionen werden abgelehnt.
- Eine Preis- oder Anbieterbedingungenänderung erzwingt erneute Zustimmung.
- Ohne bestätigten Zahlungseingang keine Freigabe zum kostenpflichtigen Organisationsstart.
- Buchungen werden nicht durch bloße Freigabe automatisch beim Anbieter ausgelöst.
- Nur explizit freigegebene Kundendaten sind im Portal sichtbar.
- Bestehende Tests bleiben erhalten.

**Stand dieses Dokuments:** Codebasierte Vorprüfung; noch keine vollständige Sicherheits- und Rechtsprüfung und keine fertig implementierte Annahmefunktion. Keine Änderungen an produktiven Kundendaten.
