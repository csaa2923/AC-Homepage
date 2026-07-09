# Schritt 6 – CRM (Customer Relationship Management)

Alpine Concierge Management System (ACMS) – Kundenakte, Dashboard und Firestore-Erweiterung.

## Geänderte / neue Dateien

| Datei | Änderung |
|-------|----------|
| `crm-library.js` | **Neu** – CRM-Kernlogik (Normalisierung, Suche, Dashboard, Reisehistorie, Datenschutz) |
| `admin.html` | CRM-Dashboard, Kundenakte-UI, Navigation, Script-Einbindung |
| `admin.css` | CRM-Layout (Dashboard, Präferenzen, Listen, Mobile) |
| `admin.js` | CRM-Rendering, Speichern, Suche, Publish-Hook für Reisehistorie |
| `firebase-service.js` | CRM-Collections, Speichern/Laden/Löschen, `crm` aus Live-Snapshot entfernt |
| `firebase-database.js` | CRM-API für Admin |
| `CRM.md` | Diese Dokumentation |

**Unverändert:** Kundenportal (`customer-portal.js`, `index.html`), Veröffentlichungsworkflow, Vorlagenbibliothek.

## Firestore-Collections

```
customerCrm/{customerId}          – Stammdaten, Kontakt, Familie, Präferenzen, Favoriten, Historie, Kommunikation, Erinnerungen, aiContext
customerNotes/{noteId}            – Interne Notizen (customerId verknüpft)
customerTasks/{taskId}            – Aufgaben pro Kunde
customerHistory/{historyId}       – Reisehistorie-Einträge (Spiegel)
customerPreferences/{customerId}  – Präferenzen (Spiegel)
customerRatings/{ratingId}        – Bewertungen nach Reisen
```

Zusätzlich bleibt `crm` im **Entwurf** (`customers/{id}.draftData`) für lokale/Firebase-Admin-Arbeit.

**Live-Version** (`publishedData` / `publishedSnapshot`) enthält **kein** `crm`.

## Kundenakte – Funktionsweise

1. Jeder Kunde hat `customer.crm` im Admin-Entwurf.
2. **Stammdaten** und **Kontakt** werden mit den bestehenden Reisefeldern synchronisiert (`customerName`, `phone`, `email`, …).
3. **Familie**, **Präferenzen**, **Kommunikation**, **Notizen**, **Aufgaben**, **Erinnerungen**, **Bewertungen** werden nur in der Kundenakte gepflegt.
4. Speichern: „Kundenakte speichern“ → `localStorage` + Firestore (`saveDraftCustomer` + `saveCrmRecord`).
5. Öffnen: Button **Kundenakte** in Kundenliste oder CRM-Suche.

### Bereiche der Kundenakte

- Stammdaten (Anrede, Name, Sprache, Nationalität, Geburtsdatum, Firma, Beruf)
- Kontaktdaten (Telefon, Mobil, WhatsApp, E-Mail, Adresse, Land)
- Familienmitglieder (mehrere Personen)
- Präferenzen (Hotels, Restaurants, Aktivitäten – Mehrfachauswahl)
- Lieblingsorte (Hotel, Restaurant, Aktivität)
- Reisehistorie (automatisch + Anzeige)
- Kommunikation (manuell, keine Auto-Sync)
- Interne Notizen (nur Admin)
- Aufgaben (Typ, Status: Offen / In Arbeit / Erledigt)
- Erinnerungen (vorbereitet, ohne Push)
- Bewertungen (Hotel, Restaurant, Aktivität, Service, Kommentar)

## Reisehistorie

Bei jeder **Veröffentlichung** (`applyLocalPublish`):

1. `ACTCrmLibrary.appendTripHistoryOnPublish()` erstellt einen Eintrag aus Reise, Zeitraum, Region, Hotels, Restaurants, Aktivitäten, Dokumenten und Version.
2. **Lieblingsorte** werden aus der aktuellen Reise aktualisiert (erstes Hotel, erstes Restaurant, erste Aktivität).
3. Eintrag wird in `crm.tripHistory` gespeichert (max. 40 Einträge).
4. Firestore-Spiegel: `customerHistory` + `customerCrm`.

## CRM-Dashboard

Startseite unter **CRM** in der Admin-Navigation:

- Nächste Reisen
- Offene Aufgaben
- Geburtstage (Kunde + Familie)
- Neue Anfragen (Status enthält „Anfrage“)
- Unveröffentlichte Programme

**Suche** filtert nach Name, Telefon, E-Mail, Reise, Hotel, Restaurant, Aktivität.

## Datenschutz – Was niemals im Kundenportal erscheint

| Daten | Portal |
|-------|--------|
| Gesamtes `crm`-Objekt | Nein |
| Interne Notizen | Nein |
| Aufgaben | Nein |
| Erinnerungen | Nein |
| Kommunikationshistorie (CRM) | Nein |
| CRM-Bewertungen | Nein |
| Familien-Allergien/Ernährung (CRM) | Nein |
| Entwurf / unveröffentlichte Daten | Nein |

Das Portal lädt ausschließlich `publishedData` ohne `crm`.

## KI-Vorbereitung (`crm.aiContext`)

In jeder Kundenakte:

```json
{
  "summary": "Kurzprofil für spätere KI",
  "adjustableFields": ["preferences", "favorites", "family", "tripHistory"],
  "promptHints": "Später: KI-gestützte Reiseempfehlungen ..."
}
```

Präferenzen, Historie und Favoriten sind strukturiert für zukünftige Empfehlungs-Assistenten.

## Test-Checkliste

| Test | Erwartung |
|------|-----------|
| Kunde anlegen | CRM-Struktur wird initialisiert |
| Kundenakte öffnen | Alle Bereiche sichtbar |
| Familienmitglieder | Hinzufügen/Entfernen/Speichern |
| Präferenzen | Mehrfachauswahl bleibt gespeichert |
| Veröffentlichen | Reisehistorie + Lieblingsorte aktualisiert |
| Aufgaben | Status änderbar |
| Bewertungen | Eintrag mit Sternen |
| Suche | Treffer nach Name/Telefon/Hotel |
| Dashboard | Widgets mit aktuellen Daten |
| Firebase | „CRM in Firebase speichern“ / Entwurf speichern |
| Mobile | Responsive Grid und Formulare |

## Admin öffnen

```
http://localhost:3456/admin.html
```

Nach Updates: **Strg+F5** (Hard Refresh).
