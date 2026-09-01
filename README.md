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
npm test           # Esegue i test (495 test, 46 file — copertura critica >60%)
npm run lint       # ESLint
npx tsc --noEmit   # Typecheck
npm run test:e2e   # Test E2E (Playwright, usa il Chrome di sistema)
```

### ⚠️ Porta del dev server: SOLO 5173

Il dev server **deve** girare su **`http://localhost:5173`**: è l'unica porta locale
inclusa nella whitelist `ALLOWED_ORIGINS` del Cloudflare Worker AI
(`scuolaboard-groq-proxy`, vedi `worker cloudflare.txt`). Se Vite parte su
un'altra porta (es. 5174 perché la 5173 è occupata), **tutte le chiamate AI
falliscono con `403 Forbidden` "Origine non autorizzata"**.

- Per forzare la porta: `npx vite --port 5173 --strictPort` (o libera la 5173
  prima di `npm run dev`).
- Se la 5173 è occupata: trova e chiudi il processo che la blocca
  (es. `netstat -ano | findstr :5173`, poi `taskkill /PID <pid> /F`).
- In produzione la whitelist va allargata con il dominio reale di deploy:
  variabile `ALLOWED_ORIGINS` del Worker (dashboard Cloudflare).
- Se un 403 AI compare comunque, il toast ora mostra il body del worker
  (error + hint + allowedOrigins) per diagnosticare subito la causa.

## CI/CD (GitHub Actions)

A ogni push/PR su `main` il workflow `.github/workflows/ci.yml` esegue in automatico:
**lint + typecheck + test unit/integrazione**, poi la **build** di produzione e i **test E2E**
(Playwright). Un push che non supera i controlli viene bloccato.

- **Deploy automatico di `docs/`**: a ogni push su `main` che supera tutti i controlli, il job
  `deploy-docs` rigenera la build (`npm run build`) e **committa e pusha da solo la cartella
  `docs/`** (messaggio con `[skip ci]`, nessun loop). Non serve più eseguire `npm run build`
  a mano prima del push: la CI lo fa al posto tuo.
- **Policy `docs/` (importante)**: la build di produzione **non va mai committata a mano**.
  Il job `deploy-docs` della CI è l'unico autorizzato a toccare `docs/`; se `git status` la
  mostra come modificata in locale, ripristinala con `git checkout -- docs/` e lascia che
  sia la CI a rigenerarla. Eventuali modifiche manuali a `docs/` nei tuoi commit possono
  generare conflitti con i commit automatici della CI.
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

> **Hosting: solo GitHub Pages.** GitHub Pages è un hosting **statico** e non supporta header HTTP custom (il meccanismo `_headers` di Cloudflare Pages non si applica). La CSP di produzione viene quindi iniettata come `<meta>` direttamente nella build (`docs/index.html`) dal plugin `injectCspMeta` in `vite.config.js` — nessuna azione necessaria.
> Limite noto: `frame-ancestors`/`X-Frame-Options`/`Permissions-Policy` non sono esprimibili via `<meta>`; se in futuro serviranno, metti Cloudflare davanti a Pages.
> Il **backend AI resta su Cloudflare Workers** (come nella versione precedente): GitHub Pages non può eseguire codice server, quindi il proxy `scuolaboard-groq-proxy` continua a essere indispensabile per le funzioni AI.

## Backup (consigliato)

Il codice è su GitHub (quindi già versionato), ma **i dati** (card, utenti, risposte
quiz, analisi AI) vivono solo su Firestore: se si perdono, non si recuperano.
Per questo è disponibile uno script che fa un backup **completo** (codice + tutti
i dati Firestore, tutti gli anni) in un'unica cartella datata:

```bash
bash scripts/backup-completo.sh
```

Crea (accanto al progetto, sul Desktop) `scuolaboard-backup-completo-YYYYMMDD-HHMM/` con:

- `codice/` — sorgente + config + `migrations/service-account.json` (senza `node_modules`, `docs/`, `.git`)
- `dati-firestore/` — export JSON di tutte le collezioni (`cards`, `users`, `quiz_risposte`, `ai_results`, …)

**Ripristino dati** (solo in caso di necessità, sovrascrive i documenti esistenti):

```bash
node migrations/import-firestore.js --dir "<cartella>/dati-firestore"
```

> ⚠️ Il backup contiene dati personali di studenti: custodiscilo al sicuro
> (disco esterno / cloud personale) e non committarlo mai su GitHub.
> Consiglio: eseguilo a inizio/fine quadrimestre o dopo modifiche importanti.

---

## Variabili d'ambiente del Worker (Cloudflare)

Nel dashboard di Cloudflare devono essere configurate le seguenti variabili:

| Nome                  | Tipo    | Descrizione                                                                                          |
| --------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS`     | Testo   | Domini autorizzati separati da virgola, es. `https://riefolog-cyber.github.io,http://localhost:5173` |
| `FIREBASE_PROJECT_ID` | Testo   | Project ID Firebase, es. `scuolaboard-874d4`                                                         |
| `FIREBASE_API_KEY`    | Testo   | API Key pubblica di Firebase                                                                         |
| `GROQ_API_KEY`        | Segreto | Chiave API Groq                                                                                      |
| `OPENROUTER_API_KEY`  | Segreto | Chiave API OpenRouter (fallback)                                                                     |

## Deploy del Worker

1. Apri il file `worker cloudflare.txt`.
2. Copia tutto il contenuto.
3. Nel dashboard di Cloudflare vai su **Workers & Pages** → seleziona lo worker `scuolaboard-groq-proxy`.
4. Incolla il codice nella sezione **Code / Quick Edit**.
5. Clicca **Save and deploy**.

## Sicurezza AI

Il worker verifica la firma crittografica RS256 del token Firebase ID tramite le chiavi pubbliche Google (JWKS). Questo garantisce che solo utenti autentici con un token firmato da Google possano accedere all'AI. L'accesso AI è riservato esclusivamente al ruolo `prof`, verificato lato server dal Worker tramite la collection `users` di Firestore.

## Privacy e Conformità GDPR

ScuolaBoard gestisce dati di studenti minorenni. Di seguito le misure tecniche adottate per garantire la conformità al **GDPR (Regolamento UE 2016/679)**, all'**AI Act (Regolamento UE 2024/1689)** e al **Regolamento IA d'Istituto**.

### Pseudonimizzazione dei commenti

Prima di inviare i commenti degli studenti all'API Groq, i nomi reali vengono sostituiti con identificativi anonimi (`Studente 1`, `Studente 2`, …). La mappatura avviene **nel browser** (client-side) e non viene mai trasmessa al server esterno. Alla ricezione della risposta IA, i nomi reali vengono ripristinati automaticamente prima di mostrare il risultato al docente.

```
Browser                           Groq
─────────                        ──────
"Mario: l'acqua bolle a 100°"  →  "Studente 1: l'acqua bolle a 100°"
                                   (Groq NON sa chi è Mario)
"Mario ha ragione"            ←  "Studente 1 ha ragione"
                                   (browser ripristina il nome)
```

**Funzioni protette:** `riassuntiCommentiRun`, `runCardAI`, `runCardQ` — le uniche tre funzioni che inviano testi con riferimenti agli studenti.

**Funzioni già safe** (non inviano nomi): `performAnalysis` (solo titoli e conteggi), `valutaAperteProfAI` (solo testo risposta), `aiAnalisiSondaggio` (solo voti aggregati), `aiGenerateQuiz` (solo testo didattico).

### Trasparenza IA (AI Act Art. 50)

Ogni contenuto generato dall'IA include un badge visibile in fondo al pannello:

> 🤖 _Supporto IA – revisionato dal docente_

Il badge appare in:

- **AIPanel.tsx** — Analisi singola card (vista prof e studente)
- **SommarioModal.tsx** — Riassunto discussione commenti
- **AppLayout.tsx** — Analisi globale della bacheca

### Difesa da Prompt Injection

I contenuti utente vengono incapsulati in delimitatori rigidi `<USER_DATA>` con istruzioni di sistema che impediscono la sovrascrittura delle direttive didattiche. Questo previene attacchi in cui uno studente potrebbe inserire istruzioni malevole nei commenti.

### Sicurezza delle chiavi API

- Le chiavi API (Groq, OpenRouter) **non sono mai esposte** nel client frontend
- Tutte le chiamate AI transitano dal **Cloudflare Worker** (`scuolaboard-groq-proxy`), che:
  - Valida il token Firebase ID (firma RS256 / JWKS)
  - Verifica il ruolo `prof` nella collection `users`
  - Applica rate-limiting globale (`AI_THROTTLE_MS = 5000`)
  - Limita l'accesso ai soli domini autorizzati (`ALLOWED_ORIGINS`)

### Human-in-the-loop

- I quiz generati dall'IA vengono prodotti come **bozze** che il docente deve revisionare, modificare e approvare esplicitamente (`aiConfirmaQuiz`) prima della somministrazione
- L'IA non attribuisce mai voti o giudizi docimologici automatici senza validazione umana

### Autenticazione

- Login tramite **Firebase Auth** con Google Sign-In
- **Filtro dominio attivo**: possono accedere solo gli account `@ferrarisfermiclass.it` e gli
  indirizzi docente in whitelist (`DOCENTI_WHITELIST` in `src/auth.ts`, es. `riefolog@gmail.com`).
  Gli altri account Google vengono disconnessi all'istante, prima di qualsiasi scrittura su
  Firestore. Il filtro è presidiato **sia lato client** (`src/auth.ts`, tre flussi: popup,
  redirect, sessioni persistite) **sia lato server** (helper `isEmailAutorizzata()` nelle
  Firestore Rules, ereditato da `isAuth()` per tutte le collection)
  → ⚠️ dopo ogni modifica alle regole, pubblicarle su Firebase Console
- Il ruolo `prof` viene verificato lato server sia dal Worker AI che dalle regole Firestore
- Il ruolo `studente` è il default e non ha accesso alla scrittura card

> **Nota su localhost**: in sviluppo può comparire in console il warning
> `Cross-Origin-Opener-Policy policy would block the window.closed call` durante il
> login Google. È un warning del popup cross-origin (accounts.google.com) — innocuo se
> il login riesce. Se il popup fallisce, l'app ripiega automaticamente su
> `signInWithRedirect` (non usa `window.opener`, quindi non è affetto da COOP).

---

### Suggerimenti per ulteriori miglioramenti

| Area                     | Suggerimento                                                                                                                  | Priorità |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Informativa privacy**  | Aggiornare il testo della `PrivacyModal` con richiamo all'Informativa d'Istituto e al Patto di Corresponsabilità (Allegato A) | Alta     |
| **Whitelist AI**         | Compilare l'Allegato B2 con Groq/Cloudflare per l'inserimento nello strumentario ufficiale                                    | Media    |
| **Data retention**       | Documentare la politica di retention di Groq e la conformità GDPR                                                             | Media    |
| **Logging audit**        | Aggiungere log lato proxy per tracciare le chiamate AI (chi, quando, cosa)                                                    | Bassa    |
| **Crittografia at-rest** | Valutare la cifratura dei dati sensibili in Firestore per dati particolarmente sensibili                                      | Bassa    |
