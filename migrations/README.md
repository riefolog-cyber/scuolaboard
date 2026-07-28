# migrations/

Script di migrazione dati per ScuolaBoard. Da eseguire **una sola volta** dopo
aver deployato le nuove Firestore Rules che richiedono il `displayName`
canonico come chiave in `quiz_risposte` / `ammonizioni`.

## Contenuto

| File | Scopo |
|---|---|
| `migrate-legacy-displayname.js` | Riscrivi i doc legacy usando il displayName canonico. |
| `package.json` | Dipendenze (firebase-admin). |
| `service-account.json` | **DA NON COMMITTARE**. Service account Firebase. |

## Setup

1. **Scarica le credenziali Admin SDK** da Firebase Console:
   - Project settings → Service accounts → "Generate new private key".
   - Salva il JSON come `migrations/service-account.json`.
   - Aggiungi `migrations/service-account.json` al tuo `.gitignore`!
2. **Installa le dipendenze**:
   ```sh
   cd migrations
   npm install
   ```

## Esecuzione

Prima esegui un **dry run** per vedere cosa verrà fatto:

```sh
npm run dry-run
```

Output atteso (esempio):

```
[DRY-RUN] Nessuna scrittura verrà eseguita.

[FASE 1] Lettura users e costruzione mappa nomi...
[FASE 1] Trovati 7 studenti con nome legacy da migrare.

[FASE 2] Migrazione ammonizioni...
  Mario Rossi → Mario Rossi
  Maria Bianchi → Maria Bianchi

[FASE 3] Migrazione quiz_risposte...
  1700000000000_Mario Rossi → 1700000000000_Mario Rossi
```

(I nomi verranno effettivamente modificati solo se `displayName` è diverso da
`nome + " " + cognome` nei record utente.)

Quando sei soddisfatto, esegui la migrazione reale:

```sh
npm run migrate-legacy
```

Lo script è **idempotente**: i doc già migrati saltano senza modifiche; quelli
non ancora migarti vengono spostati dal vecchio docId al nuovo.

## Verifica post-migrazione

1. **Testa le nuove rules** prima del deploy (vedi sezione nel README principale).
2. **Controlla i log** della Console Firebase → Firestore → Usage.
3. **Verifica manualmente** che gli studenti possano ancora vedere le proprie
   ammonizioni e le risposte quiz dopo l'accesso.

## Rollback (se qualcosa va storto)

Lo script ha cancellato i doc vecchi. Se devi rollback:

- Se hai un backup `firestore:export` di Firebase: ripristinalo.
- Altrimenti, gli studenti dovranno ri-fare i quiz (perdita di ammonimenti legacy).

Per evitare perdite in futuro: usa `--dry-run` SEMPRE prima.

## Edge case noti

### Display name rinominato dopo le prime scritture

Lo scenario problematico è uno studente che rinomina il proprio displayName
Google *dopo* aver scritto ammonizioni / quiz_risposte. Cosa succede:

- **READ**: continua a funzionare. Il rule `isOwnAmmDoc()` ha tre rami:
  `docId == token.name` (nome corrente), `== users/{uid}.displayName`, e
  `== users/{uid}.nome + " " + cognome` (immutabile dal signup). Il terzo ramo
  mantiene l'accesso ai doc legacy anche dopo rename.
- **WRITE su doc legacy**: rotto, e in modo più subdolo: il listener in `app.js`
  è `db.collection("ammonizioni").doc(myName(user)).onSnapshot(...)`, quindi
  è sottoscritto sul docId CORRENTE. Dopo rename lo studente vede un documento
  vuoto (nuovo docId) e **non vede nemmeno** le ammonizioni legacy nella UI.
  Anche il bottone "✓ Ho letto" in `app-layout.js:1163` chiama `myName(user)`
  e scrive su docId nuovo, non aggiorna quello legacy.
- **Migrazione**: necessaria per ristabilire la simmetria docId ↔ displayName.
  Lo script rinomina i doc legacy al displayName corrente, così sia la
  visualizzazione (listener) sia la feature "mark as read" tornano a
  funzionare.

### Caratteri in displayName e parsing

`safeDocId` rimuove 8 caratteri: `\`, `/`, `.`, `#`, `$`, `[`, `]`, `*`.
NOTA importante: di questi, **Firestore rifiuta davvero solo `/`** (semantica
di path). Gli altri sette sarebbero accettati da Firestore, ma `safeDocId` li
rimuove comunque per evitare ambiguità nel parsing di docId composti come
`quiz_risposte/{cardId}_{studente}` (che fa `lastIndexOf("_")` per separare
le due parti): eventuali `_` carrier-by-displayName produrrebbero split
sbagliati.

Apostrofi (`'`) e accenti italiani (`à è ò ù`) passano indenni perché sono
Unicode validi in Firestore docId: nessun impatto funzionale, e non
attivano la sanitizzazione.

## Verifica residui atipici

Durante l'esecuzione della migrazione, lo script logga:

- `[MAIN] Doc ammonizioni legacy rimasti: <N>` (0 = tutto migrato)
- `[MAIN] Doc quiz_risposte legacy rimasti: <N>` (0 = tutto migrato)

Se `N > 0` significa che alcuni doc usano un `nome+cognome` *legacy* che
non corrisponde a nessun `displayName` canonico nel sistema. Tipicamente
questo è lo scenario "studente ha cambiato displayName" descritto sopra.

L'operatore può interrogare direttamente Firestore per capire quali sono:

```sh
firebase firestore:get /ammonizioni/<legacy-id>
firebase firestore:get /quiz_risposte/<legacy-id> --shallow
```

E ricostruire manualmente se necessario.

## Note su App Check

Per abilitare App Check in produzione:

1. Crea progetto reCAPTCHA v3 su https://www.google.com/recaptcha/admin
2. Registra il dominio ScuolaBoard
3. In `app-config.js` aggiungi:
   ```js
   SB_CONFIG.APP_CHECK_RECAPTCHA_KEY = "il_tuo_site_key_v3";
   ```
4. Firebase Console → App Check → collega l'app e applica enforce dopo aver
   verificato in monitor mode per almeno 24h.

⚠️ **ORDINE SCRIPT CRITICO**: `app-config.js` (che popola `SB_CONFIG`) DEVE
essere caricato PRIMA di `firebase-init.js` nell'`<head>` dell'`index.html`.
Se l'ordine è invertito, `SB_CONFIG` sarà `undefined` quando `firebase-init.js`
prova ad attivare App Check, l'attivazione verrà saltata e apparirà un warning
visibile in console ("App Check NON attivo...").

Vedi `firebase-init.js` per il wiring automatico.
