# Piano di debug e ottimizzazioni — ScuolaBoard

Stato al **14/11/2026**, dopo i quick win 1–6 (timeout AI, log diagnostico gated, Node
allineato, `content-visibility` sulle card, font Inter variabile, soglie di coverage
alzate). Questo documento dice **cosa resta da fare, in che ordine e come si verifica**.
Non è una lista di desideri: ogni voce nasce da una misura o da un pezzo di codice
preciso, indicato con il file.

## Stato di avanzamento

| Voce | Stato | Commit |
| --- | --- | --- |
| Quick win 4 — `content-visibility` sulle card | ✅ fatto | `e103075` |
| Quick win 5 — font Inter variabile | ✅ fatto | `e103075` |
| Quick win 6 — soglie coverage 78/76/75/65 | ✅ fatto | `e103075` |
| P1-4 — diagnostica in produzione (errori + tempi di avvio) | ✅ fatto | `12451f4` |
| P0-1 (parte) — miniatura 320 px della copertina per la griglia | ✅ fatto | `d45bd06` |
| P1-3 — un solo ticker condiviso per i countdown | ✅ fatto | `82657f8` |
| P2-1 — helper condiviso `apriCardDetail` per il lazy-load | ✅ fatto | `cf79806` |
| P0-1 (resto) — immagini delle card in sottocollezione (come allegati) | ⏳ condizionato | — (solo se scatta una delle 3 condizioni del §7) |
| P0-2 — nomi in `avvisiMancanti` | ❌ won't fix | — (trade-off accettato: i nomi servono al badge e `loadStudenti` non è sempre caricato; già esposti nei commenti) |
| P1-2, P1-5, P2-3, P2-4, P3-* | ⏳ da fare | — |

Le priorità sono quattro, non cinque:

| Priorità | Significato | Regola |
| --- | --- | --- |
| **P0** | Rischio sui dati, sulla privacy o sui costi di Firestore | Si fa prima di ogni altra cosa |
| **P1** | L'utente lo sente (lentezza, attese, errori silenziosi) | Un item per volta, con misura prima/dopo |
| **P2** | Salute del debug e dei test: rende visibili i problemi | Si incastra fra un P1 e l'altro |
| **P3** | Evolutive e debito tecnico grande | Solo con finestra dedicata |

---

## 1. Misure di partenza (numeri reali, non stime)

Raccolte sulla suite e sul bundle di questo repository il 14/11/2026.

| Cosa | Valore | Come è stato misurato |
| --- | --- | --- |
| Test | 88 file, **1158 test** | `npm test` |
| Durata suite (8 worker) | **35–50 s** | `npm test` |
| Durata suite seriale + coverage | **280 s** | `npx vitest run --coverage --maxWorkers=1 --no-file-parallelism` |
| Coverage lines / stmts / funcs / branches | **80,46 / 78,93 / 78,11 / 68,38** | `--coverage --reporter=text-summary` |
| Soglie in `vitest.config.js` | 78 / 76 / 75 / 65 | 2–3 punti sotto il misurato |
| `vendor-firebase` | **620,63 kB** (181,73 gzip) | `npx vite build` |
| `index` (app) | 257,51 kB (69,40 gzip) | idem |
| `vendor-react` | 139,82 kB (45,29 gzip) | idem |
| `CardDetail` (lazy) | 58,60 kB (12,80 gzip) | idem |
| CSS | 23,41 kB (5,01 gzip) | idem |
| Font | 7 woff2, **213,4 kB** nel repo, ~133 kB scaricati | idem |

Due cose che questi numeri **non** dicono e che vanno lette nel codice:

- il documento di una card può arrivare a **900 KB** (`CARD_SIZE_LIMIT` in
  `src/app-provider-helpers.ts`) e **tutta la collezione dell'anno è sottoscritta**
  (`src/firestore-sync.ts:62`): è il punto P0-1;
- la griglia renderizza **tutte** le card (`src/CardGrid.tsx:171`), nessuna
  finestratura: il `content-visibility` di oggi risparmia layout e paint, non il
  lavoro di React.

---

## 2. Regola d'oro: prima si misura, poi si tocca

Ogni voce di questo piano ha una riga «Verifica». Se la verifica non si può fare,
la voce non è pronta per essere presa in carico. Gli strumenti che esistono già:

- `npm run test:budget` — durata di ogni test in percentuale del suo budget, sotto
  carico CPU (`--file=…` per un solo file, `--carico=N` per più contesa). È il modo
  corretto per decidere se un test è lento per progetto o per caso.
- `npx vite build --outDir dist-tmp --emptyOutDir` — **mai** `npm run build` per
  misurare: scrive in `docs/`, che è generata dalla CI.
- DevTools → Performance e Network (byte trasferiti reali), non il peso del bundle.
- `performance.mark`/`measure` per il boot: oggi non ce ne sono, ed è la prima cosa
  che aggiunge il P1-4.

---

## 3. P0 — Rischio su dati, privacy, costi

### P0-1 · Le immagini delle card stanno in base64 dentro i documenti sottoscritti

**Sintomo.** Ogni device scarica le copertine di **tutte** le card dell'anno a ogni
apertura dell'app, anche di quelle che non guarderà. Il docente che modifica una
card rimanda in fan-out il suo base64 a tutti i client connessi.

**Perché.** `AppProvider` (`handleImages`, ~riga 950 di `src/contexts/AppProvider.tsx`)
comprime l'immagine e la salva come data URL **nel documento della card**; la griglia
la usa direttamente (`src/CardItem.tsx:173`). La query di `firestore-sync.ts:62`
legge l'intera collezione `cards` dell'anno, quindi il base64 viaggia sempre.

**Conseguenze misurate e non:** una classe con 30 card con copertina significa decine
di MB di trasferimento per ogni studente; il limite di 1 MiB per documento è l'unica
ragione per cui `computeImageTargetKB` deve comprimere così aggressivamente; la cache
persistente (40 MB, `src/firebase-modular.ts:145`) si riempie di immagini e non di
testo.

**Proposta.** Riusare **lo stesso schema degli allegati** (AGENTS §12), che esiste già
e funziona: `cards/{cardId}/immagini/{imgId}`, un documento per file
(`src/allegati-card-servizio.ts` è il modello da copiare), più una **miniatura**
(`copertinaThumb`, ~320 px WebP, < 20 KB) che resta nel documento della card e serve
la griglia. `CardDetail` carica l'originale all'apertura, come fa già per gli allegati.
Nessuna migrazione forzata: le card vecchie continuano a usare l'`url` inline, la
migrazione avviene da sola alla prima modifica.

**File:** `src/app-provider-helpers.ts` (budget immagini), `src/contexts/AppProvider.tsx`
(handleImages, guardSize), `src/CardItem.tsx` (miniatura), `src/CardDetail.tsx`
(originale on-demand), nuovo `src/immagini-card-servizio.ts`, `rules firestore.txt`
(+ test statico di coerenza sui campi), `e2e/upload-*.spec.js`.

**Sforzo:** 2–3 giorni. **Rischio:** medio (tocca il percorso di pubblicazione).
**Verifica:** su una classe di prova con 6 card con copertina, confrontare i byte
trasferiti al primo caricamento prima/dopo (DevTools → Network, «Transferred»); il
numero atteso è un ordine di grandezza in meno. Le rules vanno **pubblicate a mano**
in Firebase Console, altrimenti il cambio è incompleto.

### P0-2 · Nomi di studenti in un documento leggibile dagli studenti

**Sintomo.** `avvisiMancanti: [{ uid, nome }]` sta nel documento della card, che gli
studenti leggono: chi apre la card vede i nomi dei compagni che non hanno ricevuto
l'avviso.

**Perché.** È una scelta consapevole documentata in AGENTS §11 (il docente deve sapere
*chi* riprovare, e gli uid opachi non bastano), ma è anche l'unico punto in cui la
bacheca espone un elenco nominale di «chi non ha ricevuto» senza che sia un commento o
un voto.

**Proposta minima.** Tenere nel documento solo `avvisiMancantiUid: string[]` e
risolvere i nomi lato docente dai `users` già in memoria (`avvisi-classe.ts` →
`mancantiDi()` è già l'unico punto che li legge). **Sforzo:** mezza giornata.
**Verifica:** test unitario su `mancantiDi()` + un test statico che vieti `nome`
dentro `avvisiMancanti`. **Nota:** se il docente deve vedere i nomi anche su un
device dove `users` non è ancora caricato, tenere i nomi ma valutare il costo/beneficio
— è una decisione, non un refactoring silenzioso.

---

## 4. P1 — Quello che l'utente sente

### P1-1 · Miniatura in griglia (dipende da P0-1)

Serve solo dopo P0-1: senza miniatura la griglia decodifica un'immagine da 1920 px per
mostrarla in 300 px (`src/CardItem.tsx:173-179`), e su un telefono con 30 card sono 30
decode grandi. **Sforzo:** incluso in P0-1. **Verifica:** DevTools → Performance,
«Decode Image» nella traccia.

### P1-2 · Finestratura della griglia

**Sintomo.** Con 200+ card il primo render crea 200 `CardItem` (ognuno con ~42 campi
letti, vedi AGENTS §9): il `content-visibility` evita il paint, non la riconciliazione
React.

**Proposta.** Renderizzare a blocchi (`INGRESSO = 40`, «Mostra altre» o
`IntersectionObserver`), **non** una libreria di virtualizzazione: il layout è una grid
row-major con altezze variabili e il drag & drop usa `getBoundingClientRect` su tutte
le card (`src/hooks/useDragDrop.ts`, `computeDropTarget`), che con la virtualizzazione
si romperebbe. Il blocco incrementale mantiene il DOM completo per il drag.

**File:** `src/CardGrid.tsx`, `src/contexts/AppProvider.tsx` (nessun cambio se il
blocco è locale allo stato della griglia). **Sforzo:** 1 giorno.
**Verifica:** con un seed di 300 card, misurare il tempo del primo render e il numero
di `CardItem` montati (React DevTools → Profiler).

### P1-3 · Un solo ticker per i countdown

**Sintomo.** Ogni card con scadenza sotto le 24h ha **il suo** `setInterval` da 1 s
(`src/Countdown.tsx:23`): con 30 card in scadenza sono 30 timer che svegliano 30
componenti ogni secondo, anche a scheda in background.

**Proposta.** Un unico ticker condiviso (store esterno + `useSyncExternalStore`, come
fa già la cache di Firestore) che emette un timestamp al secondo **solo se almeno un
countdown è sotto le 24h**, spento quando nessuno lo ascolta. Il commento in testa al
file spiega perché il timer è nato locale: quel vincolo (non ri-renderizzare l'app) va
conservato, cambia solo la granularità.

**Sforzo:** mezza giornata. **Verifica:** con 30 card in scadenza, DevTools →
Performance → «Timer Fired» per 5 secondi (atteso: ~5, non ~150).

### P1-4 · Diagnostica in produzione: errori e tempi di avvio

**Sintomo.** Oggi un errore in produzione lascia una riga in console che nessuno
vedrà mai, e non sappiamo quanto ci mette l'app ad aprirsi su un telefono vero. I due
difetti più costosi degli ultimi mesi (bacheca vuota per un errore di rete, toast
«Card aggiornata ✓» su una scrittura negata) sono stati trovati **per caso**, non
perché qualcosa li segnalasse.

**Proposta.** Un pannello diagnostico dietro `SB_DEBUG` (il seam esiste già:
`window.SB_DEBUG`, `?debug_ai=1`) che:
1. cattura `window.onerror` e `unhandledrejection` in un buffer circolare in memoria
   (mai invio automatico: niente PII a terzi);
2. mostra i `performance.mark` del boot — `boot`, `auth-ok`, `primo-snapshot`,
   `primo-paint` — così i P1-1/P1-2 si misurano sul campo e non a occhio;
3. ha un pulsante «Copia diagnostica» che produce un testo **senza nomi, email o
   contenuti di card** (solo codici, durate, user agent).

**File:** nuovo `src/diagnostica.ts` + un pannello in `src/modals/GuidaModal.tsx` o una
voce nel menu profilo; i `mark` in `src/main.tsx`, `src/auth.ts`,
`src/firestore-sync.ts`. **Sforzo:** 1 giorno. **Verifica:** forzare un errore con
`throw` dalla console e vedere la voce nel pannello, poi verificare che il testo
copiato non contenga PII (test unitario sul formattatore).

### P1-5 · Budget del bundle Firebase: misurare, non tagliare a caso

`vendor-firebase` è **181 kB gzip**, il 62% del JS trasferito. Non è detto che sia
riducibile: `src/firebase-modular.ts` importa Firestore + Auth + cache persistente, e
la cache persistente vale da sola il costo (AGENTS: il tempo di apertura si gioca
sulla cache, non sui byte). **Prima di toccare qualcosa** va misurato *cosa* c'è
dentro, con `rollup-plugin-visualizer` o `npx vite build --mode analyze`; poi si decide
se `firebase/auth` può essere caricato dopo il primo paint. **Sforzo:** mezza giornata
di sola misura. **Verifica:** il grafico delle dipendenze, non l'impressione.

---

## 5. P2 — Debug e salute dei test

### P2-1 · Chiudere la classe di flake del lazy-load (fatta, da generalizzare)

Il 14/11 `ai-elimina-flows` e `ai-403-flows` sono caduti **due volte su due file
diversi** per lo stesso motivo: la prima attesa di un test di integrazione che apre
`CardDetail` paga l'import pigro, e sotto 8 worker + coverage il solo import supera i
12 s di `asyncUtilTimeout`. Il budget per-test di 40 s restava largo (8,65 s misurati):
scattava il tetto di testing-library, non quello del test.

Oggi è risolto con un timeout esplicito di 30 s sulle due attese (deroga ammessa,
perché è **più alto** del default, con il motivo scritto accanto). Il passo successivo
è evitare che la terza volta si scopra in CI: un helper `apriCardDetail()` in
`src/integration/harness.ts` che apre la card e attende la modale con quel budget, e
una riga in AGENTS. **Sforzo:** 2 ore. **Verifica:** `npm run test:budget` sui file di
integrazione (i più carichi devono stare sotto l'80%).

### P2-2 · `console` come unico canale di diagnosi

Restano **2** `console.log`/`debug` fuori dai test (erano decine). Il punto non è
azzerarli: è che oggi la diagnostica «buona» e quella «rumore» hanno lo stesso canale.
Regola da scrivere in AGENTS e da applicare: `console.error`/`warn` solo per cose
azionabili, `console.log` solo dietro `SB_DEBUG`. **Sforzo:** incluso in P1-4.

### P2-3 · Il cruscotto dei test lenti, usato davvero

`npm run test:budget` esiste ed è la risposta giusta ai flake, ma viene invocato solo
quando qualcosa è già rosso. Va usato **prima**: una passata al mese, e comunque dopo
ogni nuovo file di integrazione. **Sforzo:** ricorrente, 10 minuti.

### P2-4 · `scripts/dead-code.mjs` in CI come report non bloccante

Lo script c'è (`npm run deadcode`). Oggi nessuno lo guarda. Metterlo in CI con
`continue-on-error` e pubblicare l'artefatto costa poco e intercetta i residui dei
refactoring. **Sforzo:** 1 ora.

---

## 6. P3 — Debito tecnico grande

### P3-1 · Ridurre gli `any` partendo dai moduli puri

Il codebase è `any` ovunque (`db` arriva da `window.db`), e questo è il motivo per cui
`@typescript-eslint/no-floating-promises` non vede le catene di promise (AGENTS: la
rete che funziona è l'exit code, non il linter). Non si tipizza tutto: si parte dai
moduli **puri e già testati**, dove il tipo si scrive una volta e nessun `window`
interferisce — `src/cards.ts` (`compareCards`), `src/avvisi-classe.ts`,
`src/allegati.ts`, `src/quiz-corretta.ts`, `src/quiz-import.ts`. Sono ~1500 righe in
totale e valgono più di 10.000 righe di `.tsx` legacy. **Sforzo:** 3–4 giorni
spezzettabili. **Verifica:** `npm run typecheck` deve restare 0 dopo ogni modulo.

### P3-2 · Spezzare `AppProvider.tsx` (2203 righe)

I context sono già separati (6 provider con `useMemo`, gli handler sono già in
`app-handlers.ts`). Il file resta il punto più rischioso del repository: qualunque
modifica ha un raggio d'azione enorme. **Sforzo:** 2–3 giorni, **rischio alto**.
Da fare solo con una finestra dedicata e una suite verde *prima* di iniziare, non
«mentre si sistema altro».

### P3-3 · Immagini su storage esterno (solo se P0-1 non basta)

Lo schema «un documento per file» risolve il limite da 1 MiB e i byte letti dalla
lista, ma resta Firestore: ogni immagine è un documento e la cache locale si riempie.
Se P0-1 non basta, la strada è il Worker Cloudflare che esiste già (`worker
cloudflare.txt`) come proxy verso R2, con URL firmati e cache edge. **Da non fare
prima di P0-1**: aggiunge un servizio, un costo e una superficie privacy.

### P3-4 · Coda di scritture offline

La cache persistente dà letture offline, non scritture: un commento scritto senza rete
va in errore con un toast. Una coda in IndexedDB con replay e idempotenza è la voce
«evolutiva» più richiesta dagli utenti in mobilità, ma è un progetto a sé (5+ giorni)
e va deciso con l'utente, non deciso dal piano.

---

## 7. Ordine consigliato

| # | Voce | Sforzo | Perché in questo ordine |
| --- | --- | --- | --- |
| 1 | **P1-4** diagnostica + mark di boot | 1 g | Rende misurabili tutte le altre voci: senza numeri, P1-1/P1-2 si fanno a occhio |
| 2 | **P0-1** immagini in sottocollezione + miniatura | 2–3 g | È il costo e la lentezza più grossi, e ha già un precedente collaudato (allegati) |
| 3 | **P1-3** ticker unico dei countdown | 0,5 g | Piccolo, indipendente, effetto misurabile |
| 4 | **P0-2** nomi in `avvisiMancanti` | 0,5 g | Privacy: meglio chiuderla prima della prossima revisione |
| 5 | **P1-2** finestratura della griglia | 1 g | Da fare **dopo** la miniatura: altrimenti si ottimizza il render su immagini ancora enormi |
| 6 | **P2-1/P2-3** igiene dei test | 0,5 g | Continua, non blocca nulla |
| 7 | **P1-5** misura del bundle Firebase | 0,5 g | Solo misura: decide se c'è un lavoro da mettere in P1 |
| 8 | **P3-1** tipi nei moduli puri | 3–4 g | Quando c'è una finestra senza urgenze |

**Fuori dal piano, ma da non dimenticare:** ogni modifica a `rules firestore.txt`
(P0-1, P0-2) richiede **pubblicazione manuale** in Firebase Console → Firestore →
Rules. Un cambio alle rules senza pubblicazione è un cambio incompleto, e il test
statico non se ne accorge.

---

## 8. Come si riconosce che il piano ha funzionato

Tre numeri, da rileggere fra tre mesi:

1. **Byte trasferiti al primo caricamento** su una classe da 30 card con copertina:
   deve scendere di almeno un ordine di grandezza (P0-1 + P1-1).
2. **Tempo da `boot` a `primo-paint`** su un telefono di fascia media: misurato dai
   `mark` di P1-4, non a impressione.
3. **Test al 100% del budget**: zero in `npm run test:budget`. Oggi i due file di
   integrazione del lazy-load erano esattamente lì.
