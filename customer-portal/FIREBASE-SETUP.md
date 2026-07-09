# Firebase-Anbindung Kundenportal

## Neue Dateien

- `firebase-config.js`: zentrale Firebase-Konfiguration. Standardmäßig deaktiviert.
- `firebase-service.js`: Initialisierung, anonyme Anmeldung, Firestore- und Storage-Basis.
- `firebase-auth.js`: Auth-Vorbereitung für Schritt 3.
- `firebase-database.js`: Firestore-Zugriff für Admin und Kundenportal.
- `firebase-storage.js`: vorbereitete Storage-Schnittstelle für spätere Dokument-Uploads.

## Aktivierung

In `firebase-config.js` müssen `enabled:true` und die Firebase-Web-Konfiguration aus der Firebase Console eingetragen werden.

Die Werte sind technische Web-Konfigurationswerte. Vor echten Kundendaten müssen trotzdem Authentifizierung, Rollen und Security Rules sauber eingerichtet werden.

## Firestore-Struktur

Collection:

```text
customers
```

Document:

```text
customers/{customerId}
```

Felder:

- `customerId`
- `draftData`
- `publishedData`
- `publishStatus`
- `createdAt`
- `updatedAt`
- `lastUpdated`

## Entwurf und Veröffentlicht

- **Entwurf speichern** schreibt in `draftData`.
- **Veröffentlichen** kopiert die aktuellen Daten nach `publishedData`.
- Das Kundenportal lädt nur `publishedData`.
- Wenn Firestore nicht erreichbar ist, verwendet der Admin weiter `localStorage`.
- Wenn keine Firestore-Daten vorhanden sind, prüft das Kundenportal `localStorage` und danach Demo-Daten.

## Migration

Im Adminbereich gibt es den Button:

```text
Lokale Daten in Firebase übernehmen
```

Die Migration liest lokale Kundendaten und schreibt sie nach Firestore. Bereits vorhandene Firestore-Kunden werden nur nach Rückfrage überschrieben.

## Storage

Firebase Storage ist vorbereitet, aber Uploads sind noch nicht umgesetzt. Dokument-Links funktionieren weiterhin wie bisher.

## Spätere Security Rules

Vor echten Kundendaten empfohlen:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /customers/{customerId} {
      allow read: if false;
      allow write: if request.auth != null && request.auth.token.admin == true;

      match /published/{document=**} {
        allow read: if true;
        allow write: if request.auth != null && request.auth.token.admin == true;
      }
    }
  }
}
```

Die aktuelle Schritt-3-Integration ist die technische Basis. Für Produktion braucht es echte Admin-Authentifizierung, Rollen und Regeln, damit Entwürfe niemals öffentlich lesbar sind.
