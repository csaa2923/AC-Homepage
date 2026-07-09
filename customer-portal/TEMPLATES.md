# Vorlagenbibliothek (Schritt 5)

Dokumentation für die wiederverwendbare Vorlagenbibliothek im Alpine Concierge Management System (ACMS).

## Überblick

Die Vorlagenbibliothek ermöglicht es, **Komplettreisen** und **einzelne Bausteine** zu speichern und für neue Kundenprogramme wiederzuverwenden – ohne Kundendaten zu kopieren.

| Bereich | Zweck |
|---------|--------|
| **Vorlagen** | Zentrale Bibliothek (Übersicht, Suche, Favoriten) |
| **Als Vorlage speichern** | Aktuelle Reise oder Baustein sichern |
| **Neue Reise aus Vorlage** | Komplettreise mit Kundendaten + Zeitraum erzeugen |
| **Baustein hinzufügen** | Einzelne Vorlage ins aktuelle Kundenprogramm einfügen |

---

## Vorlagentypen

| Typ | Firestore-Pfad | Beschreibung |
|-----|----------------|--------------|
| `completeTrips` | `templates/library/completeTrips/{id}` | Komplette Reise inkl. Programm, Hotels, Dokumente |
| `hotels` | `templates/library/hotels/{id}` | Einzelnes Hotel / Unterkunft |
| `restaurants` | `templates/library/restaurants/{id}` | Restaurant als Programmpunkt |
| `activities` | `templates/library/activities/{id}` | Aktivität als Programmpunkt |
| `transfers` | `templates/library/transfers/{id}` | Transfer als Programmpunkt |
| `documents` | `templates/library/documents/{id}` | Dokumentenvorlage |
| `programTemplates` | `templates/library/programTemplates/{id}` | Einzelner Programmpunkt |
| `dayTemplates` | `templates/library/dayTemplates/{id}` | Tagesprogramm (mehrere Punkte) |
| `buildingBlocks` | `templates/library/buildingBlocks/{id}` | Allgemeiner Reisebaustein |

---

## Was wird gespeichert / nicht gespeichert

### Gespeichert
- Programmpunkte, Hotels, Restaurants, Aktivitäten, Transfers
- Dokumente (URLs, Typ, Sichtbarkeit)
- Region, Wetterstandort, Koordinaten
- Hinweise, Kategorien, Bilder
- Metadaten: Titel, Beschreibung, Kategorie, Saison, Dauer, Zielgruppe, Schlagwörter

### Nicht gespeichert (PII-Filter)
- Kundenname, Kunden-ID, Mitreisende
- Telefon, E-Mail, WhatsApp
- Rechnungen, Zahlungen, persönliche Nachrichten

---

## Neue Reise aus Vorlage

1. **„Neue Reise aus Vorlage“** (Kundenübersicht)
2. Komplettreise-Vorlage wählen
3. Kundenname, Reisebezeichnung, Zeitraum, Region eingeben
4. **„Reise erzeugen“**

Das System:
- legt einen neuen Kunden an
- übernimmt Programm, Hotels, Dokumente aus der Vorlage
- verschiebt Programmdaten auf den neuen Zeitraum (relativ zum ersten Termin der Vorlage)
- setzt Status auf **Entwurf**

Danach: bearbeiten → veröffentlichen (bestehender Workflow Schritt 4).

---

## Baustein hinzufügen

Im Bearbeitungsmodus unter **Programmpunkte**:

1. **„Baustein hinzufügen“**
2. Typ wählen (Hotel, Restaurant, Aktivität, …)
3. Vorlage auswählen
4. **„Baustein übernehmen“**

Der Baustein wird in `program`, `accommodations` oder `documents` eingefügt – mit neuer ID.

---

## Suche, Favoriten, Duplizieren

- **Suche:** Titel, Kategorie, Region, Schlagwort, Hotel, Restaurant, Aktivität
- **Favorit:** ⭐ markieren (Sortierung oben)
- **Duplizieren:** Kopie mit neuem Titel und Version 1.0
- **Versionierung:** Bei jedem Speichern optional Kommentar; Historie in `history[]`

---

## Firebase

### Firestore
```
templates/library/{type}/{templateId}
```

Felder u. a.: `templateId`, `templateType`, `title`, `description`, `category`, `region`, `season`, `duration`, `targetAudience`, `tags`, `favorite`, `version`, `payload`, `images`, `history`, `aiContext`, `permissions`

### Storage (Bilder)
```
templates/{type}/{templateId}/images/{timestamp}-{filename}
```

### localStorage-Fallback
Key: `act_template_library`

---

## Import / Export

- **Exportieren:** JSON-Download aller Vorlagen
- **Importieren:** JSON einfügen und mergen
- **Vorlagen in Firebase:** Lokale Vorlagen nach Firestore migrieren

---

## Rechte (vorbereitet)

```javascript
permissions: { canEdit: true, canUse: true, role: "admin" }
```

- Administrator: Vorlagen ändern (aktuell alle Nutzer des Admin-Passworts)
- Mitarbeiter: nur verwenden (für spätere Benutzerverwaltung vorbereitet)

---

## KI-Vorbereitung

Jede Vorlage enthält `aiContext`:

```javascript
{
  summary: "Vorlagentitel (Kategorie) in Region",
  adjustableFields: ["targetAudience", "duration", "region", "season", "tags", "category"],
  promptHints: "Später: Luxusreise oder Familienanpassung per KI"
}
```

Noch **keine KI-Integration** – nur Datenstruktur für spätere Prompts.

---

## Neue Kategorien ergänzen

In `template-library.js`:

```javascript
const TEMPLATE_CATEGORIES = [
  "Sommer", "Winter", "Familie", ...
  // Neue Kategorie hier ergänzen
];
```

Keine Datenbankmigration nötig – Kategorien sind Freitext mit Vorschlagsliste.

---

## Geänderte / neue Dateien

| Datei | Rolle |
|-------|--------|
| `template-library.js` | Kernlogik, PII-Filter, Suche, Anwendung auf Kunden |
| `firebase-service.js` | Firestore CRUD, Storage-Upload für Vorlagenbilder |
| `firebase-database.js` | Wrapper für Template-API |
| `firebase-storage.js` | `uploadTemplateImage` |
| `admin.html` | Vorlagen-Sektion, Modals, Buttons |
| `admin.js` | UI, Speichern, Laden, Einfügen, Import/Export |
| `admin.css` | Vorlagen-Karten, Tabs, Vorschau |
| `TEMPLATES.md` | Diese Dokumentation |

**Nicht geändert:** `customer-portal.js`, `customer-portal.css`, Veröffentlichungsworkflow, Kundenportal-Design.

---

## Test-Checkliste

- [ ] Komplettreise als Vorlage speichern
- [ ] Neue Reise aus Vorlage erzeugen
- [ ] Baustein (Hotel/Programm/Dokument) einfügen
- [ ] Suche und Favoriten
- [ ] Duplizieren und Version erhöhen
- [ ] JSON Export/Import
- [ ] Firebase Speicherung + Bild-Upload
- [ ] Kalender, Timeline, Wetter nach Übernahme prüfen
- [ ] Veröffentlichung unverändert funktionsfähig
