# ScuolaBoard

Applicazione web per la gestione della bacheca digitale scolastica, con supporto AI per docenti e studenti.

## Struttura del progetto

```
scuolaboard/
├── src/                    # Codice sorgente TypeScript + React
│   ├── main.tsx            # Entry point Vite (import dei moduli in ordine)
│   ├── contexts/           # React Context API (Auth, Cards, Modals, AI, UI)
│   ├── hooks/              # Hook di dominio (useToast, useQuiz, useAmmonizioni, useClassi)
│   ├── carddetail/         # Pannelli della CardDetail (AI, quiz, partecipazione, commenti)
│   ├── modals/             # Tutte le modali (split da Modals.tsx) + focusTrap
│   ├── utils/              # Utility pure (format, cloud, hooks)
│   ├── integration/        # Test di integrazione (fake-firestore + harness)
│   ├── AppLayout.tsx       # Layout principale
│   ├── CardGrid.tsx        # Griglia card
│   ├── CardDetail.tsx      # Dettaglio card (lazy-loaded)
│   ├── Modals.tsx          # Aggregatore modali
│   ├── ai-services.ts      # Integrazione AI (Groq/OpenRouter)
│   ├── auth.ts             # Autenticazione Firebase
│   ├── firebase-init.ts    # Inizializzazione Firebase
│   ├── firebase-modular.ts # Shim compat sopra il modular SDK
│   ├── firestore-services.ts # Servizi Firestore
│   ├── firestore-sync.ts   # Adapter useSyncExternalStore per Firestore
│   ├── app-handlers.ts     # Handler operazioni CRUD
│   ├── app-utils.ts        # Utility e funzioni globali
│   ├── app-state.ts        # Stato globale e bootstrap
│   ├── globals.ts          # Espone npm packages su window (legacy UMD)
│   └── global.d.ts         # Dichiarazioni dei globali (UMD + window.*)
├── e2e/                    # Test E2E Playwright (harness con Firebase finto)
├── migrations/             # Script di migrazione dati (firebase-admin)
├── scripts/                # Script di supporto (deploy.sh)
├── archive/                # Documentazione di piani completati (REFACTORING/TESTING_PLAN)
├── docs/                   # Build di produzione (Vite → GitHub Pages, committata)
├── public/                 # PWA: manifest, service worker, icona
├── index.html              # Entry point sviluppo (NON produzione)
├── vite.config.js          # Configurazione Vite
├── tsconfig.json           # Configurazione TypeScript
├── vitest.config.js        # Configurazione test
└── playwright.config.js    # Configurazione E2E
```

## Sviluppo locale

```bash
npm install        # Installa dipendenze
npm run dev        # Avvia server sviluppo su http://localhost:5173
npm run build      # Build di produzione in docs/
npm test           # Esegue i test (157 test, 22 file)
npm run lint       # ESLint
npx tsc --noEmit   # Typecheck
npm run test:e2e   # Test E2E (Playwright, usa il Chrome di sistema)
```

## CI/CD (GitHub Actions)

A ogni push/PR su `main` il workflow `.github/workflows/ci.yml` esegue in automatico:
**lint + typecheck + test unit/integrazione**, poi la **build** di produzione e i **test E2E**
(Playwright). Un push che non supera i controlli viene bloccato.

- **Deploy automatico di `docs/`**: a ogni push su `main` che supera tutti i controlli, il job
  `deploy-docs` rigenera la build (`npm run build`) e **committa e pusha da solo la cartella
  `docs/`** (messaggio con `[skip ci]`, nessun loop). Non serve più eseguire `npm run build`
  a mano prima del push: la CI lo fa al posto tuo.
- GitHub Pages serve la cartella **`docs/`** committata su `main` (Settings → Pages → branch
  `main`, folder `/docs`).
- In locale gli E2E usano il Chrome di sistema; in CI usano il Chromium bundle di Playwright.

## PWA / Offline

L'app è installabile come PWA: manifest (`public/manifest.webmanifest`), icona SVG e
service worker (`public/sw.js`) — tutti copiati in `docs/` dalla build. Il service worker
mette in cache l'app shell per l'avvio offline; i dati (Firestore) e le chiamate AI
passano comunque dalla rete. La registrazione avviene **solo in produzione** (in sviluppo
resta disattiva per non interferire con l'HMR di Vite).

## Regole Firestore (obbligatorio!)

> **Il piano Spark gratuito include Cloud Firestore** (con quote: 1 GB storage, 50k letture/giorno, 20k scritture/giorno). L'app usa Firestore come database, non il Realtime Database.

Se le operazioni di scrittura falliscono con `FirebaseError: Missing or insufficient permissions`, significa che le **regole di sicurezza** nella console Firebase non sono quelle corrette (o mancano del tutto).

1. Apri la **Firebase Console** → progetto → **Firestore Database** → tab **Rules**.
2. Sostituisci tutto il contenuto con quello del file **`rules firestore.txt`** (presente nella root del progetto).
3. Clicca **Publish**.

### Attivare il ruolo prof

Le regole permettono le scritture (creare/duplicare/copiare/eliminare card) **solo al prof**. Per abilitare il ruolo:

1. In Firestore → collezione **`users`** → apri il documento con il tuo **uid**.
2. Imposta il campo **`role`** su **`"prof"`**.
3. Ricarica l'app (F5) e rieffettua il login.

> Se il documento `users/{uid}` non esiste, le regole rifiutano tutto. Viene creato automaticamente al primo login con `role: "studente"`.

## Deploy su GitHub Pages

1. **⚠️ Prima del primo deploy di questa versione** esegui la migration che aggiunge `annoScolastico` alle card legacy (il filtro server-side per anno nasconde le card senza questo campo). Serve la service account Admin SDK: vedi `migrations/README.md` per le variabili d'ambiente. Prova prima in dry-run:
   ```bash
   cd migrations && npm install && npm run dry-run-anno && npm run migrate-anno
   ```
2. Fai commit e push su GitHub:
   ```bash
   bash scripts/deploy.sh "messaggio commit"
   ```
   > La build di `docs/` viene rigenerata e committata **automaticamente dalla CI**
   > (job `deploy-docs`) quando i controlli passano: non serve `npm run build` a mano.

3. **⚠️ IMPORTANTE:** Vai su **Settings → Pages** del repo e imposta:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/docs`

   > Senza questo, GitHub Pages servirà `index.html` (sviluppo) invece di `docs/index.html` (produzione) → schermata bianca.

4. Aggiungi `riefolog-cyber.github.io` ai domini autorizzati nella console Firebase (Authentication → Settings → Authorized domains).

> **Hosting: solo GitHub Pages.** GitHub Pages è un hosting **statico**: il file `_headers` (meccanismo di Cloudflare Pages) viene **ignorato**. La CSP di produzione viene quindi iniettata come `<meta>` direttamente nella build (`docs/index.html`) dal plugin `injectCspMeta` in `vite.config.js` — nessuna azione necessaria.
> Limite noto: `frame-ancestors`/`X-Frame-Options`/`Permissions-Policy` non sono esprimibili via `<meta>`; se in futuro serviranno, metti Cloudflare davanti a Pages.
> Il **backend AI resta su Cloudflare Workers** (come nella versione precedente): GitHub Pages non può eseguire codice server, quindi il proxy `scuolaboard-groq-proxy` continua a essere indispensabile per le funzioni AI.

## Variabili d'ambiente del Worker (Cloudflare)

Nel dashboard di Cloudflare devono essere configurate le seguenti variabili:

| Nome                  | Tipo    | Descrizione                                                                                 |
| --------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS`     | Testo   | Domini autorizzati separati da virgola, es. `https://riefolog-cyber.github.io,http://localhost:5173` |
| `FIREBASE_PROJECT_ID` | Testo   | Project ID Firebase, es. `scuolaboard-874d4`                                                |
| `FIREBASE_API_KEY`    | Testo   | API Key pubblica di Firebase                                                                |
| `GROQ_API_KEY`        | Segreto | Chiave API Groq                                                                             |
| `OPENROUTER_API_KEY`  | Segreto | Chiave API OpenRouter (fallback)                                                            |

## Deploy del Worker

1. Apri il file `worker cloudflare.txt`.
2. Copia tutto il contenuto.
3. Nel dashboard di Cloudflare vai su **Workers & Pages** → seleziona lo worker `scuolaboard-groq-proxy`.
4. Incolla il codice nella sezione **Code / Quick Edit**.
5. Clicca **Save and deploy**.

## Sicurezza AI

Il worker verifica la firma crittografica RS256 del token Firebase ID tramite le chiavi pubbliche Google (JWKS). Questo garantisce che solo utenti autentici con un token firmato da Google possano accedere all'AI. L'accesso AI è riservato esclusivamente al ruolo `prof`, verificato lato server dal Worker tramite la collection `users` di Firestore.
