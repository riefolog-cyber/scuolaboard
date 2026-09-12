# AGENTS.md — Convenzioni per gli agenti su ScuolaBoard

Istruzioni operative per chi (umano o agente) modifica questo repository.
Quando un punto di questo file contraddice `README.md`, vince `README.md`.

## Lingua

- **Rispondi sempre in italiano**, sia nel testo verso l'utente sia nei commenti al codice.
- Messaggi di commit, issue, PR e documentazione sono in italiano (vedi la cronologia: `fix(classi,login): sblocco salvataggio…`).

## Panoramica

ScuolaBoard è una web app per la bacheca digitale scolastica (docenti + studenti):

- **Frontend**: React 18 + TypeScript, bundler **Vite**. `main.tsx` importa i moduli in ordine; il JSX usa il runtime **classic** con pragma `h` (configurato in `vitest.config.js` e `vite.config.js`) → niente `React` implicito, non introdurre il runtime automatico.
- **Backend dati**: **Firestore** (non Realtime Database) + Firebase Auth (Google Sign-In).
- **AI**: mai chiamate dirette dal client; tutto passa dal Cloudflare Worker `scuolaboard-groq-proxy` (vedi `worker cloudflare.txt`), che valida il token Firebase e il ruolo `prof`.
- **Hosting**: GitHub Pages serve la cartella **`docs/`** committata su `main`.

## Comandi

```bash
npm run dev          # dev server — DEVE stare su http://localhost:5173
npm test             # vitest run (unit + integrazione)
npm run lint         # eslint
npm run typecheck    # tsc --noEmit (strict: true)
npm run test:e2e     # Playwright (in locale usa il Chrome di sistema)
npm run build        # build di produzione → docs/
npm run format       # prettier
bash scripts/deploy.sh "messaggio commit"
```

- **Porta 5173 obbligatoria**: è l'unica origine in whitelist nel Worker (`ALLOWED_ORIGINS`). Su un'altra porta (es. 5174) tutte le chiamate AI falliscono con `403 Forbidden` "Origine non autorizzata". Usa `npx vite --port 5173 --strictPort`.
- Prima di considerare finito un cambio non banale: `npm run typecheck` + i test pertinenti.

## Regole non negoziabili

1. **`docs/` non va mai committata a mano.** Il job `deploy-docs` della CI rigenera e pusha `docs/` a ogni push su `main` che supera i controlli (commit `build(docs): rigenerazione automatica da CI [skip ci]`). Se `git status` la mostra modificata in locale: `git checkout -- docs/`.
2. **"Ripubblicare le regole Firestore"**: ogni modifica a `rules firestore.txt` richiede pubblicazione manuale in Firebase Console → Firestore → Rules. Un cambio alle rules senza pubblicazione è un cambio incompleto: segnalalo sempre all'utente.
3. **Privacy (GDPR/AI Act)** — dati di studenti minorenni:
   - I nomi reali non devono mai raggiungere l'AI: la pseudonimizzazione (`Studente 1`, …) avviene client-side e le funzioni protette sono `riassuntiCommentiRun`, `runCardAI`, `runCardQ`. Non aggiungere nuovi invii con nomi.
   - Non loggare né mettere in chiaro nomi reali, email o dati di studenti in console, commit, issue o file di test.
   - Ogni contenuto generato dall'IA deve mostrare il badge `🤖 Supporto IA – revisionato dal docente`.
   - L'IA non assegna voti: i quiz restano bozze da approvare (`aiConfirmaQuiz`).
4. **Segreti**: `migrations/service-account.json`, `.env*`, `*.key`, `*.pem` non vanno mai committati né stampati.
5. **Filtro email**: possono accedere solo `@ferrarisfermiclass.it` e la whitelist docente. Il controllo esiste sia client (`src/auth.ts`) sia server (`isEmailAutorizzata()` nelle rules): se ne tocchi uno, allinea l'altro.
6. **Coverage**: non abbassare le soglie in `vitest.config.js` per far passare un test; se salgono, alzale.
7. **Anni scolastici** (leggere prima di toccarli):
   - `CFG.ANNI_DISPONIBILI` (`src/app-state.ts`) e gli anni enumerati nelle Firestore Rules (`classiPerAnnoSoloAggiunte()`) **devono restare uguali**: lo verifica `src/rules-anni-consistency.test.ts` (test statico che legge i due file). Se ne aggiungi uno, aggiorna entrambi nello stesso commit.
   - `CFG.ANNO_DEFAULT` = anno "ufficiale": è l'**unico** per cui la scelta classe è obbligatoria (`AppProvider` → effect su `annoScolastico`).
   - `ANNO_LEGACY` (`src/app-provider-helpers.ts`) = anno dell'epoca in cui il vecchio sistema scriveva il campo piatto `classe`. **Non** usare `ANNI_DISPONIBILI[0]`.
   - La classe dello studente per un anno si calcola **solo** con `classeCorrenteOf(user, anno, ANNO_LEGACY)` (UI, filtro card, elenco studenti, rinomina classe): niente copie locali della formula.
   - La scelta classe dello studente è **irreversibile** lato rules per un anno già valorizzato: nessun flusso deve poter far scegliere una classe "per sbaglio" (l'anno legacy è l'unica eccezione, via `classe` piatto).

## Test

- Unit/integrazione: `src/**/*.test.{ts,tsx}` (jsdom, `globals: true`, setup `src/test-setup.js`). I test di integrazione in `src/integration/` usano il fake Firestore e hanno timeout 15s: non sono flaky per caso, prima di allungarli verifica che non sia un deadlock.
- E2E: `e2e/` con Playwright, Firebase finto, `baseURL http://localhost:5173` (più il preview di produzione su 4173). Un comportamento verificabile a mano va coperto da un test, non solo descritto.
- Il monitor quotidiano del login di produzione è `.github/workflows/login-monitor.yml` + `.github/scripts/check-login.mjs`; in locale lo script scrive screenshot (`login-monitor.png`, `login-non-carica.png`) che **non** vanno committati.

## Stile

- Prettier (`.prettierrc`): 2 spazi, single quote, `printWidth` 120, `trailingComma: es5`, parentesi sempre sugli arrow. Formatta solo ciò che tocchi.
- Commenti in italiano che spiegano il **perché** (il repository è pieno di note "perché" su bug passati: mantieni quello stile), non il cosa.
- Commit in stile conventional commits in italiano con scope: `fix(classi,login): …`, `build(docs): …`, `test(quiz): …`.
- I file del repository usano terminatori **CRLF**: mantienili quando modifichi file esistenti.

## File di riferimento utili

- `README.md` — setup, deploy, PWA, variabili del Worker.
- `PROMEMORIA_PRIVACY_MANUTENZIONE.md` — checklist privacy/manutenzione e cose da fare al prossimo deploy.
- `Sintesi_Conformita_ScuolaBoard_Regolamento_IA.md`, `rules firestore.txt`, `worker cloudflare.txt`.
- `archive/` — piani di refactoring/testing completati: contesto storico, non istruzioni attuali.
- `scripts/backup-completo.sh` — backup codice + dati Firestore (contiene dati personali: mai committarlo).
