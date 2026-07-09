# Veröffentlichungsprozess (Publishing Workflow)

Dokumentation für Schritt 4 des Alpine Concierge Management Systems (ACMS).

## Überblick

Der Veröffentlichungsprozess trennt **Entwurf** und **Live-Version** klar voneinander:

| Bereich | Bedeutung | Wer sieht es? |
|---------|-----------|---------------|
| **Entwurf** (`draftData`) | Arbeitskopie aller Kundendaten | Nur Admin |
| **Live** (`publishedData` / `publishedSnapshot`) | Veröffentlichte Version | Kundenportal |

Alle Bearbeitungen im Admin ändern ausschließlich den Entwurf. Das Kundenportal lädt ausschließlich die Live-Version.

---

## Wie funktioniert der Entwurf?

1. Der Admin bearbeitet Stammdaten, Programm, Unterkunft, Dokumente usw.
2. Mit **„Entwurf speichern“** werden die Daten lokal (`localStorage`) und optional in Firestore unter `draftData` gespeichert.
3. Der Entwurf bleibt vom Live-Stand getrennt über `publishedSnapshot` (lokal) bzw. `publishedData` (Firestore).
4. Die Live-Vorschau im Admin kann zwischen **Entwurf** und **Live-Version** umgeschaltet werden.

**Lokale Speicherung:** `localStorage` Key `act_customer_portal_customers` – jedes Kundenobjekt enthält:
- Arbeitsdaten (Entwurf)
- `publishedSnapshot` – letzte veröffentlichte Version
- `publishMeta` – Metadaten zur letzten Veröffentlichung
- `history` – Änderungsprotokoll (lokal)

---

## Wie funktioniert die Veröffentlichung?

### Ablauf

1. Admin klickt **„Veröffentlichen“**
2. **Validierung** prüft Pflichtfelder (Kunde, Reise, Concierge, Unterkunft, Programm, Dokumentlinks …)
3. **Änderungsvergleich** listet nur tatsächlich geänderte Bereiche (Entwurf vs. Live)
4. **Veröffentlichungsdialog** zeigt Kunde, Versionssprung (z. B. 1.4 → 1.5), Änderungen und optionales Kommentarfeld
5. Bei Bestätigung:
   - Version wird automatisch erhöht (`bumpVersion`)
   - Backup der bisherigen Live-Version (Firestore: `customers/{id}/versions`)
   - Lokales Backup in `publishMeta.previousLocalBackup`
   - `publishedSnapshot` / `publishedData` wird auf aktuellen Entwurf gesetzt
   - Historie-Eintrag wird angelegt
6. **Benachrichtigungsdialog** (WhatsApp / E-Mail vorbereiten – noch keine automatische Versendung)

### Wiederherstellen

**„Letzte Veröffentlichung wiederherstellen“** setzt den Entwurf auf die zuletzt veröffentlichte Version zurück (aus Firestore-Backup oder lokalem `previousLocalBackup`).

---

## Versionierung

Bei jeder Veröffentlichung:

- Versionsnummer wird um die letzte Stelle erhöht: `1.0` → `1.1` → `1.2` …
- Gespeichert werden:
  - Versionsnummer
  - Datum und Uhrzeit (`publishedAt`)
  - Bearbeiter (`publisher`, Standard: „Alpine Concierge Tirol“)
  - Kommentar (optional)
  - Änderungsübersicht (`changes`)

---

## Wie wird die Historie gespeichert?

| Speicherort | Feld | Inhalt |
|-------------|------|--------|
| **localStorage** | `customer.history[]` | Bis zu 30 Einträge |
| **Firestore** | `customers/{id}.publishHistory[]` | Gleiche Struktur, synchron bei Veröffentlichung |

Jeder Eintrag enthält: `date`, `time`, `version`, `editor`, `comment`, `changes[]`, `publishedAt`.

Im Admin unter **„Historie“** werden die Einträge neueste zuerst angezeigt.

---

## Firestore-Dokumente

### `customers/{customerId}` (Hauptdokument)

| Feld | Beschreibung |
|------|--------------|
| `draftData` | Aktueller Entwurf (normalisiert) |
| `publishedData` | Veröffentlichte Live-Version |
| `publishStatus` | `"draft"` oder `"published"` |
| `publishMeta` | `lastPublishedAt`, `lastPublisher`, `lastPublishComment`, `version`, `lastChanges`, `previousVersionBackupId`, `publishError` |
| `publishHistory` | Array der Veröffentlichungshistorie |
| `updatedAt`, `lastUpdated` | Zeitstempel |

### `customers/{customerId}/versions/{versionId}` (Backups)

Automatisches Backup **vor** jeder Veröffentlichung:

| Feld | Beschreibung |
|------|--------------|
| `versionId` | z. B. `v1-4-1739123456789` |
| `version` | Versionsnummer zum Zeitpunkt des Backups |
| `publishedAt`, `publisher`, `comment`, `changes` | Metadaten |
| `publishedData` | Vollständige Live-Version als Snapshot |

---

## Geänderte / neue Dateien

| Datei | Rolle |
|-------|-------|
| `publish-workflow.js` | Vergleich, Validierung, Versionierung, Status, Benachrichtigungstexte |
| `admin.js` | Dashboard, Dialoge, Vorschau-Modi, Veröffentlichung, Wiederherstellung |
| `admin.html` | UI: Veröffentlichungsstatus, Historie, Dialoge, Vorschau-Buttons |
| `admin.css` | Styles für Status, Änderungsliste, Modals, Historie, Diff-Farben |
| `firebase-service.js` | `draftData` / `publishedData`, Backups, Historie, Restore |
| `customer-portal.js` | Lädt nur `publishedData`; localStorage nutzt `publishedSnapshot` |
| `index.html` | Optionaler Admin-Hinweis (`?admin=1`) |
| `customer-portal.css` | Stil für Admin-Versionshinweis |
| `PUBLISHING.md` | Diese Dokumentation |

---

## Kundenportal

- Lädt **niemals** Entwurfsdaten
- **Firestore:** `loadPublishedCustomer()` → `publishedData`
- **localStorage:** `publishedSnapshot` (Fallback auf Legacy-Objekt wenn noch kein Snapshot)
- **Admin-Vorschau im Portal:** URL-Parameter `?admin=1` zeigt dezent „Version X · Stand: DD.MM.YYYY“

Beispiel: `index.html?customer=familie-mueller&admin=1`

---

## Veröffentlichungsstatus im Admin

| Symbol | Bedeutung |
|--------|-----------|
| 🟢 | Live-Version aktuell (Entwurf = Live) |
| 🟡 | Entwurf vorhanden (noch nie veröffentlicht) |
| 🟠 | Unveröffentlichte Änderungen |
| 🔴 | Fehler beim letzten Veröffentlichen (`publishMeta.publishError`) |

---

## Änderungsfarben in der Vorschau

| Farbe | Bedeutung |
|-------|-----------|
| Grün (`is-new`) | Neu hinzugefügt |
| Gelb (`is-changed`) | Geändert |
| Rot (`is-removed`) | Entfernt |

---

## Test-Checkliste

- [ ] Entwurf ändern und speichern
- [ ] Vorschau Entwurf / Live-Version umschalten
- [ ] Änderungsübersicht zeigt nur echte Unterschiede
- [ ] Veröffentlichungsdialog mit Kommentar
- [ ] Version wird erhöht
- [ ] Kundenportal zeigt neue Version (nach Veröffentlichung)
- [ ] Historie enthält Eintrag
- [ ] Firestore-Backup unter `versions/`
- [ ] „Letzte Veröffentlichung wiederherstellen“
- [ ] localStorage-Fallback mit `publishedSnapshot`
- [ ] Kalender, Timeline, Wetter, Dokumente unverändert funktionsfähig
