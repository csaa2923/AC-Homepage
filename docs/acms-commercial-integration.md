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
- Bei Annahme bzw. Freigabe werden Version und SHA-256-Hash des gespeicherten Snapshots geprüft. Der Server speichert nur dann, wenn Versionsnummer, Snapshot und Hash zusammenpassen. Doppelte Entscheidungen, abgelaufene Datensätze und unzulässige Statussprünge werden abgewiesen.
- Eine Änderung verbindlicher Angebots- oder Freigabedaten erzeugt eine neue Entwurfsversion. Diese muss erneut veröffentlicht bzw. vorgelegt werden. Ein angenommenes Angebot ist nicht editierbar.
- Verbindliche Zustimmungstexte kommen aus dem serverseitigen Katalog `act-commercial-statements-2026-10-24` in Deutsch, Englisch, Italienisch und Französisch. Vom Browser gesendete Erklärungstexte werden abgelehnt. Die Texte sind bis zur anwaltlichen Freigabe als vorläufig gekennzeichnet.
- Die gesonderte Zustimmung zum vorzeitigen Planungsbeginn ist optional, nicht vorausgewählt und behauptet keinen pauschalen Verlust gesetzlicher Rechte.
- Drittbuchungsfreigaben aktualisieren nie automatisch den Buchungsstatus und lösen weder Anbieterbuchung noch Zahlung aus. Vor der Entscheidung sieht der Kunde Anbieter, Vertragspartei, Leistung, Preise, Fälligkeiten, Gebühren, Zahlungsweg, Storno- und Umbuchungsbedingungen sowie die vollständigen Anbieterbedingungen.

## Bedienung

Im Kundenarbeitsbereich steht der Tab **Angebote & Freigaben** zur Verfügung. Dort können Angebote als Entwurf gespeichert und in das authentifizierte Portal gestellt werden. Druck und PDF verwenden ausschließlich den gespeicherten Snapshot, nicht den ungespeicherten Formularstand. Vorhandene Buchungen können einzeln zur Drittbuchungsfreigabe vorgelegt werden.

Im Kundenportal erscheinen offene Angebote und Freigaben im Bereich Service. AGB und Rücktrittsinformation sind verlinkt. Annahme, frühes Tätigwerden und Drittbuchungsentscheidung bleiben getrennte Handlungen.

## Offene Punkte vor Produktion

- Die finalen, je Sprache anwaltlich geprüften Erklärungswortlaute und Versionskennungen müssen freigegeben werden.
- Die Regel „Planungsbeginn erst nach bestätigtem Zahlungseingang“ benötigt einen serverseitigen Start-Workflow; diese Integration bestätigt weder Zahlung noch Planungsbeginn automatisch.
- Es gibt keine revisionssichere, serverseitig archivierte PDF-Datei und keinen Versandnachweis. Der Browserdruck gibt den gespeicherten Snapshot wieder, speichert das Dokument aber nicht als Nachweis in Firebase Storage oder einer anderen Ablage.
- Für persönliche Begleitung sind 50/50-Fälligkeiten fachlich beschrieben, aber nicht automatisch eingezogen. Bestehende manuelle Zahlungsbestätigung bleibt maßgeblich.
- Lokale Firebase-Emulatoren haben die Firestore-Regeln sowie die Auth- und Callable-Prüfungen bestanden: fremde Kunden sehen keine Angebote oder Freigaben, Admins können keine Kundenannahme oder Freigabeentscheidung schreiben, abgelaufene oder geänderte Stände lassen sich nicht bestätigen. Vor Deployment bleiben die produktiven Firestore-Indizes zu prüfen. Es wurde kein Deployment und keine Datenmigration durchgeführt.
