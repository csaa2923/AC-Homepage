# ACMS-Angebote und Drittbuchungsfreigaben

## Bestandsanalyse

- Kunden und Interessenten liegen im bestehenden `customers`-Modell; Interessentenstatus und Konvertierung bleiben unverändert.
- Die vorhandenen Wunschvorschläge (`wishRequests` und `customer-proposal`) sind redaktionelle Vorschläge, keine versionierten Vertragsangebote. Sie werden weiterverwendet und nicht ersetzt.
- Buchungen liegen in `bookings` und zusätzlich im Kundenarbeitsdatensatz. Drittbuchungsfreigaben referenzieren ausschließlich eine vorhandene Buchung desselben Kunden.
- Kunden authentifizieren sich über Firebase Auth, OTP und `customerPortalAccess`. Verbindliche Aktionen werden über Callable Functions gegen diesen serverseitigen Grant geprüft.
- Entwurf/Veröffentlichung, Dokumente und Versionssicherungen bleiben unverändert. Angebote und Freigaben sind wegen ihrer verbindlichen Nachweise separate, Functions-only Datensätze.
- Die vorhandene Zahlungsansicht trennt ACT-Beträge, Drittanbieter-Direktzahlungen und manuell bestätigten Zahlungseingang. Der neue Workflow löst keine Zahlung oder Buchung aus.
- Die Portal-i18n unterstützt Deutsch, Englisch, Italienisch und Französisch. Die neue Kundenansicht verwendet dieselben vier Sprachcodes.
- Bestehende Security-Tests prüfen Portalzugriff, Firestore-Regeln, Veröffentlichung, Dokumentzugriff und Zahlungs-Hardening.

## Datenmodell und Sicherheit

- `customerCommercialOffers/{customerId}__{offerId}`: versionierter Angebotssnapshot, Hash, Statushistorie und optional unveränderlicher Annahmenachweis.
- `thirdPartyBookingApprovals/{customerId}__{approvalId}`: versionierter Freigabesnapshot, Buchungsreferenz, Preise/Bedingungen, Statushistorie und optional Kundenentscheidung.
- Firestore-Clients haben auf beide Collections keinen direkten Zugriff. Admin- und Kundenaktionen laufen ausschließlich über Callable Functions.
- Bei Annahme bzw. Freigabe werden Version und SHA-256-Hash des tatsächlich angezeigten Snapshots geprüft. Doppelte Entscheidungen, abgelaufene Datensätze und unzulässige Statussprünge werden abgewiesen.
- Eine Änderung verbindlicher Angebots- oder Freigabedaten erzeugt eine neue Entwurfsversion. Ein angenommenes Angebot ist nicht editierbar.
- Die gesonderte Zustimmung zum vorzeitigen Planungsbeginn ist optional, nicht vorausgewählt und behauptet keinen pauschalen Verlust gesetzlicher Rechte.
- Drittbuchungsfreigaben aktualisieren nie automatisch den Buchungsstatus und lösen weder Anbieterbuchung noch Zahlung aus.

## Bedienung

Im Kundenarbeitsbereich steht der Tab **Angebote & Freigaben** zur Verfügung. Dort können Angebote als Entwurf gespeichert, in das authentifizierte Portal gestellt und per Browser-Druck als PDF vorbereitet werden. Vorhandene Buchungen können einzeln zur Drittbuchungsfreigabe vorgelegt werden.

Im Kundenportal erscheinen offene Angebote und Freigaben im Bereich Service. AGB und Rücktrittsinformation sind verlinkt. Annahme, frühes Tätigwerden und Drittbuchungsentscheidung bleiben getrennte Handlungen.

## Offene Punkte vor Produktion

- Die finalen, je Sprache anwaltlich geprüften Erklärungswortlaute und Versionskennungen müssen freigegeben werden.
- Die Regel „Planungsbeginn erst nach bestätigtem Zahlungseingang“ benötigt einen serverseitigen Start-Workflow; diese Integration bestätigt weder Zahlung noch Planungsbeginn automatisch.
- E-Mail/PDF-Artefakte können vorbereitet bzw. gedruckt werden. Ein revisionssicher archiviertes, serverseitig erzeugtes PDF und Versandnachweis benötigen eine freigegebene Dokumenten-/Mailstrategie.
- Für persönliche Begleitung sind 50/50-Fälligkeiten fachlich beschrieben, aber nicht automatisch eingezogen. Bestehende manuelle Zahlungsbestätigung bleibt maßgeblich.
- Vor Deployment sind Emulator-Integrationstests mit echten Auth-Grants sowie die finalen Firestore-Indizes zu prüfen. Es wurde kein Deployment und keine Datenmigration durchgeführt.
