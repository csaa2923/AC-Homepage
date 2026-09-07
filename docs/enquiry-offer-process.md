# Anfrage-, Angebots- und Auftragsprozess

Diese Dokumentation beschreibt den verbindlichen Geschäftsprozess von Alpine Concierge Tirol. Sie verhindert, dass aus dem unverbindlichen Website- bzw. WhatsApp-Kontakt später versehentlich ein Online-Buchungsprozess wird.

Stand der veröffentlichten AGB: **September 2026**

## Prozess

Homepage  
→ unverbindliche WhatsApp-Anfrage  
→ individuelles Angebot  
→ Übermittlung Angebot + AGB + Verbraucherinformationen  
→ Annahme des Angebots  
→ ggf. separate ausdrückliche Erklärung zum vorzeitigen Leistungsbeginn  
→ Auftragsbestätigung  
→ Beginn der Concierge-Leistung

## Was die Homepage darf und was nicht

Die Homepage dient der Information und der Kontaktaufnahme.

Zulässig:

- WhatsApp- und Kontaktbuttons als unverbindliche Kontaktaufnahme
- Anfrageformular, das eine WhatsApp-Nachricht vorbereitet
- dauerhaft erreichbare AGB im Footer: Impressum | Datenschutz | AGB
- Hinweis, dass die Anfrage unverbindlich ist

Nicht zulässig:

- keinen künstlichen Online-Buchungsprozess einführen
- kein technisches Annehmen eines Angebots auf der Website
- keine FAGG-Zustimmungscheckbox beim bloßen Öffnen von WhatsApp
- keine FAGG-Zustimmungscheckbox bei einer unverbindlichen Anfrage
- die Angebotsannahme nicht mit der Erklärung zum vorzeitigen Leistungsbeginn vermischen

Die AGB-Checkbox im Anfrageformular bestätigt nur, dass die veröffentlichten AGB und die Datenschutzerklärung zur Kenntnis genommen wurden. Sie ist **keine** Angebotsannahme und **keine** Zustimmung zum vorzeitigen Leistungsbeginn.

## WhatsApp-Prozess

Die eigentliche Kundenanfrage erfolgt überwiegend über WhatsApp und ist zunächst unverbindlich.

Alpine Concierge Tirol erstellt anschließend ein individuelles Angebot und übermittelt es über WhatsApp zusammen mit:

- den AGB, Stand September 2026
- soweit erforderlich der Rücktrittsinformation für Verbraucher
- dem Muster-Rücktrittsformular

Die Website führt die Annahme des Angebots nicht technisch durch.

### Normale Angebotsannahme

Vorgesehene Kundenantwort:

`Ja, ich nehme das Angebot an.`

Damit wird eindeutig das konkret übermittelte Angebot angenommen, einschließlich der darin wirksam einbezogenen AGB.

Diese Annahme darf technisch und textlich **nicht** automatisch als Zustimmung zum vorzeitigen Beginn der Dienstleistung innerhalb der gesetzlichen Rücktrittsfrist behandelt werden.

### Vorzeitiger Leistungsbeginn

Nur wenn Alpine Concierge Tirol auf Wunsch eines Verbrauchers bereits innerhalb der gesetzlichen Rücktrittsfrist tätig werden soll, ist eine **zusätzliche, ausdrückliche** Erklärung erforderlich.

Vorgesehene Kurzfassung für WhatsApp:

`Ich wünsche den sofortigen Beginn.`

Die dazugehörige Information muss dem Kunden eindeutig erklären, dass er damit ausdrücklich verlangt, dass Alpine Concierge Tirol bereits vor Ablauf der gesetzlichen Rücktrittsfrist mit der vereinbarten Dienstleistung beginnt.

Der Kunde muss vor Beginn außerdem ausdrücklich darüber informiert werden und bestätigen, dass er zur Kenntnis genommen hat, dass er sein Rücktrittsrecht bei vollständiger Vertragserfüllung verliert.

Die endgültige juristische Formulierung dieser Information wird nicht in diesem Dokument vorweggenommen. Sobald ein freigegebener Text hinterlegt ist, darf er nicht eigenmächtig verändert werden.

## Angebotsdokument

Die spätere Angebotsvorlage soll einen Abschnitt **Vertragsunterlagen** enthalten mit Hinweis auf:

- dieses Angebot
- AGB Alpine Concierge Tirol, Stand September 2026
- Rücktrittsinformation für Verbraucher
- Muster-Rücktrittsformular

Bei kurzfristigem Leistungsbeginn zusätzlich einen klar hervorgehobenen Abschnitt:

**Beginn der Dienstleistung vor Ablauf der Rücktrittsfrist**

Die endgültige Formulierung dieses Abschnitts nicht eigenmächtig juristisch verändern, sobald ein freigegebener Text hinterlegt wurde.

## Öffentliche Seiten und Downloads

| Dokument | Öffentliche Seite | Vorgesehene PDF |
| --- | --- | --- |
| AGB, Stand September 2026 | `agb.html` | `assets/downloads/Alpine_Concierge_Tirol_AGB_2026.pdf` |
| Verbraucherinformation zum Rücktrittsrecht | `ruecktritt.html` | `assets/downloads/Alpine_Concierge_Tirol_Ruecktrittsinformation_2026.pdf` |
| Muster-Rücktrittsformular | `ruecktritt.html` | `assets/downloads/Alpine_Concierge_Tirol_Muster_Ruecktrittsformular_2026.pdf` |

Die auf der Homepage veröffentlichte AGB-Fassung und die dem Kunden mit dem Angebot zugesandte PDF-Fassung müssen inhaltlich übereinstimmen.

Für Rücktrittsbelehrung und Muster-Rücktrittsformular sind die finalen, freigegebenen Texte noch einzusetzen. Bis dahin bleiben Seite und Downloadpositionen als Struktur gekennzeichnet.

## Technische Leitplanken

- WhatsApp- und Kontaktlinks bleiben unverbindliche Kontaktaufnahme.
- Das Anfrageformular in `index.html` erzeugt nur eine WhatsApp-Nachricht.
- Es gibt keinen `data-binding-request`-Pfad und keine FAGG-Checkbox auf der Homepage.
- Eine spätere Angebotsannahme gehört in den WhatsApp- bzw. Angebotsprozess, nicht in die Website.
