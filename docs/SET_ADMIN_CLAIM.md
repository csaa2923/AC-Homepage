# Admin-Claim lokal setzen

Diese Anleitung setzt fuer einen bereits angelegten Firebase-Authentication-Benutzer den serverseitigen Custom Claim:

```json
{
  "role": "owner"
}
```

Der Claim wird anhand der E-Mail-Adresse gesetzt. Es werden keine Claims im Client gesetzt, keine Firebase Rules deployed und keine Kundendaten veraendert.

## Voraussetzungen

- Firebase Authentication ist im Projekt aktiv.
- Der Admin-Benutzer existiert bereits in Firebase Authentication.
- Node.js ist lokal verfuegbar.
- Das Firebase Admin SDK ist lokal verfuegbar.
- Ein Firebase-Service-Account-Schluessel liegt ausserhalb des Repositorys.

Wichtig: Die Service-Account-Datei niemals in dieses Repository kopieren oder committen.

## Empfohlener Weg mit lokaler Service-Account-Datei

1. In Firebase Console oeffnen:
   - Projekteinstellungen
   - Service accounts
   - Generate new private key

2. Die JSON-Datei ausserhalb des Projekts speichern, zum Beispiel:

```powershell
C:\Users\<BENUTZER>\FirebaseKeys\alpine-concierge-service-account.json
```

3. Im Projektverzeichnis das Firebase Admin SDK lokal bereitstellen.

Falls im Projekt noch kein Node-Paket eingerichtet ist:

```powershell
npm install --no-save firebase-admin
```

4. In derselben PowerShell-Sitzung den lokalen Credential-Pfad setzen:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\<BENUTZER>\FirebaseKeys\alpine-concierge-service-account.json"
```

Falls der Projektkontext nicht automatisch erkannt wird, zusaetzlich die Firebase Project ID setzen:

```powershell
$env:FIREBASE_PROJECT_ID="<FIREBASE_PROJECT_ID>"
```

5. Claim anhand der E-Mail-Adresse setzen:

```powershell
node tools/set-admin-claim.mjs --email "admin@example.com"
```

Erwartete Ausgabe:

```text
Custom Claim gesetzt: role=owner
Benutzer: admin@example.com
Hinweis: Der Benutzer muss sich abmelden und neu anmelden, damit der neue Token aktiv wird.
```

6. Danach die Umgebung der aktuellen PowerShell-Sitzung bereinigen:

```powershell
Remove-Item Env:\GOOGLE_APPLICATION_CREDENTIALS
Remove-Item Env:\FIREBASE_PROJECT_ID
```

7. Im Adminbereich abmelden und neu anmelden.

Erst nach einer neuen Anmeldung enthaelt der ID Token den Claim `role = owner`.

## Alternative mit Application Default Credentials

Falls `gcloud` lokal eingerichtet ist und das Konto ausreichende Firebase-/IAM-Rechte besitzt:

```powershell
gcloud auth application-default login
gcloud config set project <FIREBASE_PROJECT_ID>
node tools/set-admin-claim.mjs --email "admin@example.com"
```

Auch hier gilt: Danach im Adminbereich abmelden und neu anmelden.

## Sicherheitsregeln fuer diesen Schritt

- Keine Service-Account-Datei im Repository speichern.
- Keine Zugangsdaten in `.env`, HTML, JavaScript oder Dokumentation eintragen.
- Keine Claims im Client setzen.
- Keine Firebase Rules deployen.
- Keine Kundendaten veraendern.
- Keine Datenmigration ausfuehren.

## Fehlerbehebung

`Cannot find package 'firebase-admin'`

Das Admin SDK ist lokal nicht installiert. Im Projektverzeichnis ausfuehren:

```powershell
npm install --no-save firebase-admin
```

`Could not load the default credentials`

Der Pfad in `GOOGLE_APPLICATION_CREDENTIALS` ist nicht gesetzt oder zeigt nicht auf die Service-Account-JSON.

`auth/user-not-found`

In Firebase Authentication existiert kein Benutzer mit dieser E-Mail-Adresse.

`PERMISSION_DENIED`

Der verwendete Service Account oder das verwendete Application-Default-Credentials-Konto hat nicht die noetigen Rechte fuer Firebase Authentication.

## Kontrolle

Nach erfolgreicher Ausfuehrung:

1. Adminseite lokal oder produktiv oeffnen.
2. Mit dem betroffenen Benutzer abmelden.
3. Neu anmelden.
4. Der Adminbereich darf erst dann freigegeben werden, wenn der ID Token den Claim `role = owner` enthaelt.
