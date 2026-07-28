# ScuolaBoard

Applicazione web per la gestione della bacheca digitale scolastica, con supporto AI per docenti e studenti.

## Struttura del progetto

- `index.html` — pagina principale dell'app
- `app.js` — componente React principale
- `app-ai.js` — integrazione con l'AI tramite Cloudflare Worker
- `app-layout.js` — layout e componenti UI
- `auth.js` — gestione autenticazione Firebase
- `firebase-init.js` — inizializzazione Firebase
- `worker cloudflare.txt` — codice del Cloudflare Worker (proxy AI)
- `rules firestore.txt` — regole di sicurezza Firestore

## Variabili d'ambiente del Worker

Nel dashboard di Cloudflare devono essere configurate le seguenti variabili:

| Nome | Tipo | Descrizione |
|------|------|-------------|
| `ALLOWED_ORIGINS` | Testo | Domini autorizzati separati da virgola, es. `https://scuolaboard.app,http://localhost:5500` |
| `FIREBASE_PROJECT_ID` | Testo | Project ID Firebase, es. `scuolaboard-874d4` |
| `FIREBASE_API_KEY` | Testo | API Key pubblica di Firebase |
| `GROQ_API_KEY` | Segreto | Chiave API Groq |
| `OPENROUTER_API_KEY` | Segreto | Chiave API OpenRouter (fallback) |

## Deploy del Worker

1. Apri il file `worker cloudflare.txt`.
2. Copia tutto il contenuto.
3. Nel dashboard di Cloudflare vai su **Workers & Pages** → seleziona lo worker `scuolaboard-groq-proxy`.
4. Incolla il codice nella sezione **Code / Quick Edit**.
5. Clicca **Save and deploy**.

## Sicurezza AI

Il worker controlla che la richiesta provenga da un dominio autorizzato (CORS) e che l'utente abbia fornito un Firebase ID token valido (verifica struttura, scadenza, audience e issuer). La verifica crittografica della firma del token è attualmente disabilitata per evitare problemi con le chiavi JWK di Google. Per questo, l'accesso all'AI dipende principalmente dal controllo CORS e dall'autenticità del token Firebase.

## Sviluppo locale

Per testare l'app in locale, avvia un server HTTP nella root del progetto:

```bash
npx serve .
```

Assicurati che l'origine locale sia inclusa in `ALLOWED_ORIGINS` del worker.
