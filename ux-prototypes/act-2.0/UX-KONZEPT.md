# Alpine Concierge Tirol 2.0 - UX-Konzept

## UX-Analyse

### Was gut funktioniert
- Die technische Basis deckt den kompletten Concierge-Prozess ab: CRM, Reisen, Programm, Dokumente, Buchungen, Wetter, Veröffentlichung und sichere Share-Links.
- Der aktuelle Adminbereich hat bereits klare Funktionsanker wie Kunden, Buchungen, CRM, Vorlagen, Dokumente und Publish.
- Das Kundenportal lädt nur veröffentlichte Daten und hat wichtige Module: Übersicht, Kalender, Timeline, Dokumente, Wetter und Kontakt.
- Der bestehende Wizard zeigt, dass geführte Erfassung bereits fachlich sinnvoll ist.

### Was kompliziert wirkt
- Zu viele gleichzeitige Navigationsebenen: Hauptbereiche, Edit-Navigation, CRM-Navigation und viele Section-Anker.
- Kundenbearbeitung ist formularlastig und wirkt eher wie Verwaltung als Concierge-App.
- CRM, Buchungen, Vorlagen und Kunden liegen nebeneinander, obwohl Nutzer meist von einem Kunden oder einer Reise ausgehen.
- Veröffentlichung, Vorschau, Historie und Links sind funktional richtig, aber über mehrere Bereiche verteilt.
- Das Kundenportal hat zu viele gleichrangige Navigationseinträge für eine mobile First Experience.

### Doppelte oder verwirrende Muster
- Mehrere Such- und Filterflächen für Kunden, CRM und Buchungen.
- Dokumente existieren als allgemeine Kundendokumente, Programmdokumente und Buchungsdokumente.
- Vorschau, Live-Version, Portal-Link und Share-Link sind fachlich unterschiedlich, im UI aber nah beieinander.
- CRM-Kundenakte und Kundenreise können wie zwei unterschiedliche Welten wirken.

## Neue Informationsarchitektur

### Admin Sitemap
```text
Start
  Dashboard
  Kunden
    Kundenliste
    Kundenkarte
      Kunde
      Reise
      Programm
      Dokumente
      Kommunikation
      Veröffentlichung
    Neuer Kunde Wizard
  Kalender
  Dokumente
  Einstellungen
```

### Kundenportal Sitemap
```text
Willkommen
  Countdown
  Wetter
  Heute
  Programm
  Dokumente
  Concierge
```

## Wireframes

### Dashboard
```text
[Hero: Guten Morgen + schnelle Aktion]
[Heute] [Offene Aufgaben] [Live-Portale] [Dokumente]
[Reisen und Aufgaben heute]      [Letzte Aktivitäten]
```

### Kundenliste
```text
[Suche + Neuer Kunde]
[Kundenkarte] [Kundenkarte] [Kundenkarte]
Foto, Name, Zeitraum, Region, Status, Veröffentlichungsstatus
```

### Kundenbearbeitung
```text
[Kundenhero mit Foto, Status, Reisezeitraum]
[Tabs: Kunde | Reise | Programm | Dokumente | Kommunikation | Veröffentlichung]
[Karten je Tab, keine große Formularwand]
```

### Wizard
```text
[Schrittliste links]
[Aktueller Schritt rechts]
Kundendaten -> Reise -> Wünsche -> Programm -> Dokumente -> KI-Vorschlag -> Prüfen -> Veröffentlichen
```

### Dokumente
```text
[Upload]
[Dokumentkarte]
Icon, Titel, Kategorie, Upload-Datum, Sichtbarkeit, Veröffentlichungsstatus
```

### Veröffentlichung
```text
[Prüfansicht]
OK Kundendaten
OK Dokumente
OK Programmpunkte
OK Wetter
OK Kontakte
Offen Bilder
[Veröffentlichen]
```

### Kundenportal
```text
[Willkommen + Countdown + Bild]
[Wetter] [Heute]
[Programm heute]
[Dokumente]
[Concierge kontaktieren]
```

## Designsystem

### Farben
- Primary Green: `#0d3b2f`
- Concierge Green: `#1f6b54`
- Soft Mint: `#dff0e6`
- Gold Accent: `#c99d45`
- Background: `#f6f8f5`
- Surface: `#ffffff`
- Ink: `#17231f`
- Muted Text: `#697872`
- Warning: `#fff0cf`
- Info: `#dfeafa`
- Error Soft: `#f8e6e1`

### Typografie
- System Font Stack wie iOS: `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial`
- Große klare Seitentitel
- Kleine Uppercase Labels nur als Orientierung
- Weniger Fließtext, mehr strukturierte Karten

### Komponenten
- Karten mit Radius 22px, weichem Schatten und klaren Innenabständen.
- Buttons groß, rund, eindeutig: Primary, Ghost, Small.
- Status als Badges: bereit, offen, wartet, intern, veröffentlicht.
- Tabs nur innerhalb einer Kundenkarte, nicht als globale Hauptnavigation.
- Dialoge für Wizard und fokussierte Aktionen.
- Mobile Bottom-Navigation, Desktop Sidebar.

### Animationen
- Kleine View-Transitions mit 220ms.
- Hover nur leichtes Anheben.
- Keine verspielten Effekte, keine Ablenkung.

## Spätere technische Einbindung

Die 2.0-Oberfläche soll die bestehende Logik nur konsumieren:
- Firebase bleibt Datenquelle.
- Upload-Service bleibt Upload-Service.
- Publish-Workflow bleibt Publish-Workflow.
- Redaction und Share-Link-System bleiben verbindlich.
- Wetterlogik wird in neue Wetterkarten eingebunden.
- Dokumentmodell aus Auftrag 17 wird direkt in Dokumentkarten dargestellt.

## Umsetzungsplan

1. Prototyp intern prüfen und Informationsarchitektur freigeben.
2. Neue UI-Schicht parallel zur bestehenden App anlegen.
3. Dashboard mit echten Lesedaten anbinden.
4. Kundenliste als Kartenlayout anbinden.
5. Kunden-Tabs an bestehende Customer-Objekte anbinden.
6. Programmpunkte als Karteneditor ersetzen, Speicherfunktionen weiterverwenden.
7. Dokumentkarten an bestehende Upload- und Dokumentlogik anbinden.
8. Veröffentlichungs-Prüfansicht vor bestehende Publish-Logik setzen.
9. Kundenportal mobile first neu strukturieren, Published-Daten unverändert nutzen.
10. Schrittweise Regression gegen Auftrag 16 und 17 ausführen.

## Grenzen von Auftrag 18A

- Keine Firebase-Anbindung im Prototyp.
- Keine Speicherlogik geändert.
- Keine Uploadlogik geändert.
- Keine Publish- oder Share-Link-Logik geändert.
- Kein Commit.
- Kein Push.
- Kein Deployment.
