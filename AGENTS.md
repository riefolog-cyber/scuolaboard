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

8. **Ordine della griglia** (leggere prima di toccarlo): `compareCards()` in `src/cards.ts` è l'unico punto che lo decide, con questa gerarchia di **priorità**:
   1. **fissate** (`pinned`): sempre davanti a tutte, per TUTTI (campo sul documento Firestore, non locale);
   2. **trascinamento** (`ordine`, drag & drop del prof): quando il prof trascina, i bump si **azzerano** (`clearAperti()` passata a `useDragDrop`) e l'ordine manuale vince;
   3. **apertura recente** (mappa `{ id: timestamp }` per utente in `localStorage: sb_aperti_<uid>`): sale in cima ciò che è stato aperto di recente, sotto il gruppo fissato.
   - La griglia (`GRID_STYLE` in `CardGrid.tsx`) è una **grid row-major** (`repeat(auto-fill, minmax(min(300px, 100%), 1fr))`): così la priorità si legge da sinistra a destra sulla prima riga. **Non** tornare alle colonne CSS (`columns`/masonry): riempiono la prima colonna dall'alto in basso e la priorità finisce impilata in verticale. Le media query di `styles.css` usano `grid-template-columns`, non `columns`.
   - `markAperto()` si chiama **solo** dove una card viene davvero aperta (click su `openCard` e deep-link `?card=`); l'aperti è una preferenza di lettura locale, non va mai su Firestore.
   - `visibleSorted` può cambiare **senza** che cambi `cards`: ogni `useMemo` che lo contiene deve avere la sua identità tra le dipendenze (vedi `cardsValue` in `AppProvider`), altrimenti la griglia resta nell'ordine vecchio.

9. **UI della card in bacheca** (`CardItem.tsx`): a riposo si vedono il chip del **tipo** + al massimo **uno stato** (priorità: fissata → nascosta → nuova). **Eccezione**: il badge `card-avviso` "📣 AVVISO NON INVIATO" (solo docente, annuncio di classe non partito) è **sempre visibile** e non ha `.card-badge-extra`: segnala un problema, non uno stato informativo. La decisione (e il testo con i nomi di chi manca) stanno in `avvisoInSospeso`/`etichettaAvviso`/`dettaglioMancanti` in `avvisi-classe.ts`, non nel componente. Gli altri badge hanno la classe `card-badge-extra` (rivelati dal CSS al passaggio del mouse, sempre visibili su touch) e **devono restare nel DOM**: i test li cercano. Le azioni sono su due righe: primarie (👍 like, 💬 Commenta, ★/✏️, toggle `aria-label="Altre azioni"`) e secondarie dietro il toggle (fissa, riassumi, copia link, modifica del prof, duplica, copia anno, elimina, reazioni). Una azione nuova va nel gruppo secondario, e i test devono **aprire il toggle prima di cliccarla**.

10. **Avvisi di classe / notifiche in-app** (leggere prima di toccarli):
    - Tutta la regola vive in **`src/avvisi-classe.ts`**, ed è l'**unico punto** ammesso: `conAnnuncioInCoda(card)` mette una card in coda d'annuncio, `senzaAnnuncio(card)` la toglie (copie/dupliche: NON sono card nuove per la classe), `annunciaClasse({card, anno, excludeUid})` fa il fan-out e chiude il flag, `avvisiDaRecuperare()` seleziona gli invii interrotti. **Non scrivere `avvisiPendenti`/`avvisiDaMs` a mano** in un altro file: ogni azione nuova che rende visibile una card deve passare da qui, altrimenti non viene annunciata (né recuperata).
    - Il fan-out lo fa il **browser del docente** (non c'è un server): `annunciaClasse` tiene `avvisiPendenti: true` finché l'invio non è concluso, e il flag torna `false` **solo** a fan-out riuscito. Se la scheda si chiude a metà, alla riapertura dell'app un client **docente** ripesca le card ancora pendenti (`avvisiDaRecuperare`: non proposte, non nascoste, anno corrente, entro `AVVISI_RECUPERO_MS` = 72h). Senza il flag le card **non** vengono ri-annunciate (quelle vecchie le ha già annunciate il codice precedente): non togliere il flag né allargare la finestra senza motivo.
    - Le card del docente entrano in coda **al momento della pubblicazione** (`addCard`), non dentro `buildNewCard`: se aggiungi un altro percorso che pubblica qualcosa, chiama `conAnnuncioInCoda` lì.
    - Anche **approvare una proposta** (`appCard`) è una pubblicazione. `avvisiDaMs` serve proprio a questo: la proposta può essere stata creata giorni prima, e senza quell'istante di annuncio il recupero la considererebbe fuori finestra.
    - Gli id delle notifiche di una card sono **deterministici** (`nuova_card_<cardId>`, vedi `notifiche-service.ts`) e `useNotifiche` fa **dedupe per id** in lettura: è così che una riannuncio non produce un doppio avviso. Non tornare a id casuali per `nuova_card`.
    - Un secondo client docente può completare il fan-out di una card pubblicata da un altro: è voluto (chi apre per primo l'app recupera).
    - **Esito e conferma al docente**: `SB.notifyClasse` risolve `{ ok, avvisati }` (`ok: false` = invio non partito o **solo parziale**; non rifiuta mai, i chiamanti storici non hanno `.catch`). `annunciaClasse` condivide **una sola promessa per card e per sessione** (una `Map`, non un flag): recupero e pubblicazione possono partire quasi insieme e chiunque chieda l'annuncio riceve lo stesso esito — senza questo il secondo chiamante riceverebbe 0 e il docente non vedrebbe mai la conferma. `confermaAnnuncio(esito)` traduce l'esito nel toast (`🔔 N studenti avvisati`, oppure l'avviso se non è partito; `null` se non c'è nessuno da avvisare). Il toast lo mostra `mostraEsitoAnnuncio` in `AppProvider` **solo** per pubblicazione e approvazione: il recupero resta silenzioso di proposito. Se un invio non è riuscito il flag NON si chiude, quindi `avvisiPendenti: false` significa davvero "annuncio concluso".
    - **Badge persistente sulla card** (solo docente): finché la coda è aperta il docente vede `card-avviso` con **i nomi di chi non ha ricevuto l'avviso** (`avvisiMancanti: [{ uid, nome }]`, scritto da `annunciaClasse` quando il fan-out è parziale), e può premere **↻ Riprova** → `riprovaAnnuncio` in `AppProvider` chiama `annunciaClasse({ card, forza: true })` (senza `forza` la memoria di sessione restituirebbe il vecchio esito senza riprovare). Quando `avvisiMancanti` c'è, `annunciaClasse` passa `soloUid` a `notifyClasse`: la riprova avvisa **solo quelli**, non tutta la classe (extra, id deterministico → nessun doppione se qualcuno l'aveva già ricevuto). `avvisiMancanti` non è solo un contatore: `mancantiDi()` è la verità per i nomi E per la riprova mirata. ‼️ Contiene nomi di studenti (uid opachi non bastano al docente) e sta in un documento leggibile dagli studenti: è la stessa categoria di dato già presente nei commenti (`autore`), ma se in futuro la si vuole togliere si tenga lì la sola lista di `uid` e si risolvano i nomi lato docente. Se il conteggio non è noto il badge compare dopo `AVVISO_SOSPETTO_MS` (60s): così la pubblicazione normale, che si conclude in un attimo, non fa lampeggiare un falso allarme. Il tempo che passa da solo non fa re-render: se c'è almeno una card pendente parte un battito da 30s (`tickSospesi` in `AppProvider`), spento quando non serve.
    - **Ritentativi automatici**: un annuncio non partito non aspetta la prossima apertura. `creaRitentativiAvvisi` in `avvisi-classe.ts` (controllore senza React, timer iniettabili) tiene per card il tentativo in volo, il ritentativo in programma e i fallimenti consecutivi; le attese sono in `AVVISI_RITENTATIVI_MS` (5s, 15s, 1min, 5min, 15min) e `attesaRitentativo(n)` dice la prossima (`null` = scaletta esaurita: si riprende all'apertura successiva o col pulsante). Un ritentativo **forza** (`forza: true`, altrimenti la memoria di sessione di `annunciaClasse` restituirebbe il vecchio esito senza riprovare) e **rilegge la card** prima di partire: nel frattempo può essere stata nascosta o annunciata altrove. Se riesce dopo un fallimento il docente riceve `confermaRecupero`, altrimenti il badge sparirebbe da solo senza spiegazioni. `Riprova`/`Riprova tutti` usano `{ forza: true, riparti: true }`: azzerano la scaletta, così chi interviene non aspetta l'attesa già cresciuta. `esegui(card)` senza `forza` è idempotente (una sola fan-out per card alla volta), quindi pubblicazione, approvazione e recupero all'apertura possono chiamarla senza duplicare gli invii.
    - **Indicatore in alto** (fascia sticky, solo docente): `annunciInSospeso(cards, now)` elenca le card da riprovare e `etichettaSospesi(n)` ne fa il testo; il pulsante **↻ Riprova tutti** chiama `riprovaTuttiAnnunci`, che rilancia tutte le card con `forza: true` e riporta **un solo** messaggio aggregato (`confermaAnnunci(esiti)`).

## Test

- Unit/integrazione: `src/**/*.test.{ts,tsx}` (jsdom, `globals: true`, setup `src/test-setup.js`). I test di integrazione in `src/integration/` usano il fake Firestore e hanno timeout 15s: non sono flaky per caso, prima di allungarli verifica che non sia un deadlock.
- E2E: `e2e/` con Playwright, Firebase finto, `baseURL http://localhost:5173` (più il preview di produzione su 4173). Un comportamento verificabile a mano va coperto da un test, non solo descritto.
- ⚠️ L'harness E2E (`e2e/harness.html` + `harness-boot.ts`) monta l'app **senza `src/styles.css`**: i test coprono comportamento e stili _inline_, non il CSS. Tutto ciò che vive solo nel CSS (rivelazione dei badge al hover, alone delle card fissate, tema chiaro) non è coperto dalla suite: verificalo a mano (`styles.css?direct` nella preview, o il browser) oppure esprimi il comportamento anche in JS.
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
- `diagrams/cose-la-bacheca.architecture.json` — sorgente **Archify** del diagramma "Cos'è la bacheca" (badge viola nella fascia LIVE → modale `src/modals/GuidaModal.tsx`). L'artifact servito è `public/cose-la-bacheca.html` (generato, non modificare a mano): per rigenerarlo, dalla cartella del tool Archify:
  ```bash
  node bin/archify.mjs validate architecture <repo>/diagrams/cose-la-bacheca.architecture.json --quality showcase --repo-root <repo> --json
  node bin/archify.mjs deliver  architecture <repo>/diagrams/cose-la-bacheca.architecture.json <repo>/public/cose-la-bacheca.html --quality showcase --repo-root <repo>
  ```
  Il JSON dichiara `meta.repository` + `sources`, quindi **serve `--repo-root`** e la revisione deve esistere nel checkout locale. La larghezza del viewBox è un vincolo: oltre ~1170px il check `composition/desktop-readability` fallisce (testo sotto i 6px proiettati a 1440px).
- `archive/` — piani di refactoring/testing completati: contesto storico, non istruzioni attuali.
- `scripts/backup-completo.sh` — backup codice + dati Firestore (contiene dati personali: mai committarlo).
