# REFACTORING_PLAN.md — Piano di refactoring ScuolaBoard

> Piano dettagliato per ridurre il debito tecnico emerso dall'analisi
> (vedi conversazione: valutazione con god-file, `@ts-nocheck`, globali
> `window.*`, ESLint non funzionante per TS).
>
> **Principio guida**: ogni fase è un passo autonomo, verdi `tsc` + `vitest`
> + lint, e NON modifica il comportamento dell'app. Niente "big bang".

---

## Fase 0 — Quick win: far funzionare ESLint (gate di qualità reale)

Stato: **COMPLETATA** ✅ (2026-08-01 lint gate · 2026-08-02 warning puliti) —
obiettivo "lint come gate" raggiunto e **0 warning residui**.

- [x] Cablare `@typescript-eslint/parser` in `eslint.config.js` (era in
      `package.json` ma mai usato → i file `.ts` davano parse error)
- [x] Portare `ecmaVersion` a `2022` (il codice usa `||=` = ES2021, es.
      `fake-firestore.ts`)
- [x] Risolvere i 2 parse error residui — **causa radice**: `typescript@7.0.2`
      non supportato da `@typescript-eslint/parser@8` (richiede `<6.1.0`, anche
      la canary). **Downgrade a `typescript@~6.0.3`** (tilde! caret tirerebbe
      6.1.x e ricrasherebbe il parser; devDependency, solo typecheck; build
      Vite usa esbuild). tsc + 105 test restano verdi.
- [x] Lint ora parte: **0 errori, 31 warning** (prima: 2 errori + 95 warning in
      gran parte falsi negativi). `caughtErrors:'none'` in no-unused-vars
      (i `catch(e){}` silenziosi sono pattern voluti).
- [x] Ridurre i warning residui alle sole "scelte volute" — **0 warning**
      (2026-08-02): rimossi 13 file di debito reale (variabili morte in
      CardItem/FilterBar/AmmModal/ConfirmDelModal/NuovaCardModal/cards,
      no-redeclare in ai-services e cards, no-useless-assignment in auth e
      app-utils, direttiva eslint inutile in app-state, parametri `_` nei
      test/harness, import side-effect SommarioModal in Modals.tsx).

### Perché prima di tutto
Il lint attuale è inutilizzabile: 2 errori di parsing su file `.ts` e 95
warning in gran parte falsi negativi (non vede i veri errori perché non
parsa la sintassi TS). Senza un lint funzionante ogni refactoring successivo
è fatto "al buio".

---

## Fase 1 — De-risking: rimozione incrementale di `@ts-nocheck`

Stato: **COMPLETATA** ✅ (2026-08-01) — tutti i 6 file senza più `@ts-nocheck`.

- [x] **1b. `auth.ts`** — tipo inline `AuthUser` (campi Firestore opzionali +
      index signature, senza import da types.ts per non rompere l'export
      globale `SB.useAuth`); `var auth` spostato fuori dall'if/else
      (no-redeclare); `finalUser: AuthUser | null = null`.
- [x] **1c. `app-handlers.ts`** — cast `Array.from(...) as File[]` in
      `handleAllegatiUpload` (Array.from su target non tipizzato dà
      `unknown[]` con TS6); rimossa `getSb` morta.
- [x] **1d. `AppLayout.tsx`** — solo rimozione direttiva (già type-safe).
- [x] **1e. `ai-services.ts` / `app-utils.ts`** — `aiLog(...args: any[])`
      (in UMD le function di modulo diventano globali e TS6 inferiva
      `() => void` → TS2554 su ogni chiamata); firme esplicite sulle catture
      `_callGroqJSON/_callGroqText/_aiLoad/_aiSave`; cast `[string, number][]`
      su `Object.entries(freq)` (inferito `Record<string, unknown>`); rimossi
      `C`, `FS`, `memo`, `auth`, `AI_CACHE_TTL` (verificati mai usati).

File con `@ts-nocheck` (0 rimanenti).

- [x] **1a. `firestore-sync.ts` (215 righe)** — il più piccolo e isolato:
      tipizzare store/subscribe con `useSyncExternalStore`.
      Annotazioni aggiunte: `_cardsSnapshot: any[]`, `_cardsListeners:
      Set<() => void>`, `_cardsUnsub/_classiUnsub/_preferitiUnsub:
      (() => void) | null`, `_classiCustom/_classiNascoste/_preferiti:
      string[]`, `_classiAnno/_preferitiUid: string | null`, `_cachedCombined`
      con tipo esplicito. Rimossa riga morta `var SB = window.SB || {};`.
      Gate: tsc pulito, 105/105 test, lint 0 warning sul file.
      > ⚠️ Nota: in un run completo `ai-elimina-flows.test.tsx` ha dato un
      > timeout 5000ms flaky (catena async lunga + suite in parallelo);
      > rieseguito isolato passa 4/4. Se i falsi rossi si ripetono,
      > valutare `testTimeout` dedicato per i file di integrazione.
- [ ] **1b. `auth.ts` (163 righe)** — tipizzare il `user` object e il ritorno
      di `useAuth`.
- [ ] **1c. `app-handlers.ts` (573 righe)** — tipizzare il `ctx` degli
      handler (oggetto già documentato in `AppProvider.tsx`).
- [ ] **1d. `AppLayout.tsx` (754 righe)** — tipizzare la fusione `$`.
- [ ] **1e. `ai-services.ts` / `app-utils.ts`** — i più grossi, lasciati per
      ultimi (dipendono dai tipi definiti nelle fasi precedenti).
- [ ] Opzionale: abilitare `strict: true` **per singolo file** con
      `// @ts-check` e `// @ts-expect-error` puntuali, tenendo
      `tsconfig` globale a `strict: false`.

> Ogni sottopasso: `npx tsc --noEmit` + suite. Nessun `// @ts-ignore`
> generalizzato.
>
> ⚠️ Gap noto da colmare in questa fase: con `no-undef: off` in eslint.config.js,
> i 6 file `@ts-nocheck` perdono **anche** il check ESLint sugli identificatori
> non definiti (tsc li skippa + no-undef off). Rimuovendo `@ts-nocheck` per
> file, il gap è coperto da **tsc** (`no-undef` resta off nella config).

---

## Fase 2 — Decomposizione dei god-file

Stato: **COMPLETATA** ✅ (2026-08-01) — 2a, 2b, 2c, 2d tutti chiusi.

| File | Righe | Intervento |
|---|---|---|
| `Modals.tsx` | 3.843 | Split per modale (già nominate: `LightboxModal`, `PrivacyModal`, `ClasseModal`, `AiQuizGenModal`, `AmmModal`, `EditAmmModal`, `ProfiloModal`, `TimerModal`, `NuovaCardModal`, `WordCloudModal`, `RifiutaModal`, `ConfirmDelModal`, `QRModal`, `DuplicaModal`, `CopiaAnnoModal`) → `src/modals/*.tsx` + `index` che esporta `SB.Modals` |
| `CardDetail.tsx` | 1.723 | Estrarre pannelli (AI, quiz RISULTATI, timer, ammonizioni) in componenti separati |
| `AppProvider.tsx` | 1.721 | Estrarre hook di dominio: `useQuiz`, `useAmmonizioni`, `useClassi`, `useToast` |
| `app-utils.ts` | 1.440 | Separare utility pure (stringhe/date) dai servizi Firestore |

- [x] **2a. `Modals.tsx` → `src/modals/`** — 3843 → 16 file `src/modals/<Name>.tsx` (pattern UMD, `SB.<Name>` + export default) + `filterBtn.ts` + aggregatore `Modals.tsx` (stessa API `SB.Modals`). Estrazione con `@babel/parser`. Fix: `var h` nell'aggregatore, `import filterBtn` in NuovaCardModal, `testTimeout: 15000` in vitest.config.js.
- [x] **2b. `CardDetail.tsx` → 6 pannelli `src/carddetail/`** (QuizPanel, AIPanel, PartecipazionePanel, DomandeLiberePanel, CommentsSection, RifiutaModal) — 1723 → 638 righe. Bug reale trovato e fixato: il matcher AST di `domandeButton` prendeva lo stesso nodo di `domandeOpen` (placeholder contiene "Fai una domanda") → 2 copie del pannello; DomandeLiberePanel riscritto a mano.
- [x] **2c. `AppProvider.tsx` → 4 hook `src/hooks/`** (useToast, useQuiz, useAmmonizioni, useClassi) — 1721 → 1427 righe. Fix lint: `quizListenRisposte` cattura rimossa, `_e`/`_id` nei callback.
- [x] **2d. `app-utils.ts` → `src/utils/`** (format.ts, cloud.ts, hooks.ts) — 1411 → 963 righe. Fix tsc: app-utils ora è un ES module → 5 `declare var` (Avatar, S, FORM0, fmtDT, timeAgo) aggiunte in `global.d.ts` per i consumer UMD che li usano come bare identifiers. Tutti gli export `SB.*`/`window.*` preservati.

---

## Fase 3 — Modernizzazione (lungo periodo)

Stato: **COMPLETATA (3a, 3c, 3d ✅ · 3b risolta in Fase 5 via shim)**

- [x] **3a. Ridurre i globali `window.*`** — rimosse 10 registrazioni morte
      (fbListen, fbFavListen, fbClassiListen, quizSalvaRisposta, debounce,
      useDebounce, safeUnsub, isNew, sbSafeUrl, cleanMarkdownText: 0 lettori,
      0 chiamate) + le 4 funzioni Firestore mai chiamate + import orfani.
      API `SB.*` UMD preservata. tsc pulito, 105/105, lint 0 errori.
- [x] **3b. Firebase compat → modular SDK** (`firebase/app` + `firebase/auth`
      + `firebase/firestore`): bundle più piccolo, tree-shaking.
      **RISOLTA in Fase 5 (2026-08-02, via shim — vedi sotto)**. Il compat
      SDK resta supportato e l'app funziona, ma la migrazione è stata eseguita
      in sicurezza con `src/firebase-modular.ts` (shim compat sopra i moduli
      modular): i ~54 call-site `db.collection(` restano invariati e i test di
      integrazione (fake-firestore.ts + harness.ts, che mockano l'API compat)
      non sono stati toccati. Resta solo la conversione call-site all'API
      funzionale, ora opzionale (nessun beneficio bundle residuo).
- [x] **3c. `React.lazy`** sulle modali non critiche — WordCloudModal,
      QRModal, DuplicaModal, CopiaAnnoModal ora lazy + guard condizionali
      (flag nel context `$`) + `Suspense fallback={null}`. Le altre 11 restano
      eager. Test integration già async (`findByText`), Modals.test.tsx solo
      modali eager → nessun impatto.
- [x] **3d. Tipizzare i globali** — `globals.d.ts` riscritto con tipi reali
      (firme `(d:any)=>string`, `Avatar(name,size)`, `SB` namespace,
      `Window` interface).

---

---

## Fase 4 — Ottimizzazione Firestore (perf: payload + re-render)

Stato: **PARZIALE (4a ✅, 4b/documentazione ✅)**

- [x] **4a. Filtro anno scolastico lato server sulle card** — `firestore-sync.ts`:
      `createCardsStore(anno)` ora fa `where('annoScolastico', '==', anno)` e
      ri-sottoscrive al cambio anno (`_cardsAnno`); rimosso `orderBy('ordine')`
      dalla query (l'ordinamento è già client-side in `visibleSorted`, e così
      serve solo un indice single-field, automatico, NON composto). Gate: tsc
      pulito, 105/105 test, lint 0 warning.
      > ⚠️ **PRIMA DEL DEPLOY**: eseguire `migrations/migrate-card-annoscolastico.js`
      > (dry-run → reale) per backfillare `annoScolastico` sulle card legacy:
      > senza, le card senza il campo spariscono dalla query server-side.
- [x] **4b. Migration script** — `migrations/migrate-card-annoscolastico.js`
      (idempotente, dry-run, `--anno` opzionale, default calcolato come il
      client). Da registrare in `migrations/package.json` per comodità.
- [x] **4c. `ai_results` selettivo** — COMPLETATA (2026-08-02) con approccio
      reattivo: `SB.useAI(user)` riceve l'utente da `AppProvider` e il
      `useEffect` dipende da `[user]`. Al mount (auth async) `user` è null e la
      collezione NON viene scaricata; quando il prof è autenticato l'effect
      riparte e carica `ai_results` (analisi + domande AI, prof-only). Gli
      studenti non scaricano più la collezione (meno letture Firestore) e
      continuano a vedere l'analisi via `card.aiAnalisi`. Il vecchio gate
      falliva perché leggeva `window.SB.user` (impostato DOPO il mount) con
      deps vuote; ora la dipendenza reattiva risolve il timing. Verificato:
      113/113 test (incluso `ai-elimina-flows` che dipende da aiMap popolato).

---

## Fase 5 — Firebase compat → modular SDK ✅ COMPLETATA

Stato: **COMPLETATA** (2026-08-02) — **vendor-firebase: 497 → 326 kB raw
(145 → 99 kB gzip)**.

- [x] **5a. Shim compat sopra il modular SDK** — nuovo `src/firebase-modular.ts`:
      importa SOLO `firebase/app`, `firebase/auth`, `firebase/firestore`
      (modular, tree-shakeable) ed espone la STESSA superficie namespaced usata
      dal codebase: `firebase.initializeApp/app/storage/firestore/auth`,
      `db.collection(...).doc(...).set/update/delete/get/onSnapshot` con catena
      `where/orderBy`, `db.runTransaction`, `db.batch`, `FieldValue.arrayUnion`,
      `GoogleAuthProvider`, `auth.signInWithPopup/signInWithRedirect/
      getRedirectResult/signOut`. I ~54 call-site compat restano INVARIATI e i
      test di integrazione non vengono toccati (iniettano il proprio fake).
      Guard di idempotenza su `initializeApp` (HMR-safe) e memoizzazione
      `_db`/`_auth` (identità tra `window.db`/`SB.db`/moduli che catturano il ref).
- [x] **5b. `globals.ts`** — sostituiti i 3 import `firebase/compat/*` con
      `./firebase-modular.ts`; `window.firebase` mantiene la stessa forma.
- [x] **5c. Test dello shim** — nuovo `src/firebase-modular.test.ts` (6 test,
      zero rete): superficie compat, idempotenza, catena db, FieldValue,
      auth namespaced, storage graceful. È l'unico test che esercita lo shim
      REALE (production-only).
- [ ] **Estensione futura (opzionale)**: convertire i call-site `db.collection(...)`
      all'API funzionale modulare (`collection(db,'x')`, `getDoc`, `setDoc`, …)
      e rimuovere lo shim — oggi lo shim garantisce zero rischi con lo stesso
      beneficio bundle, quindi la conversione non è più necessaria.

> ⚠️ Le regole Firestore e la console non cambiano (stessa API namespaced).

---

## Fase 6 — Estrazione stili inline in CSS/design-token ✅ PARZIALE (CardItem)

Stato: **PARZIALE (passata mirata CardItem ✅, 2026-08-02)**

- [x] **6a. Classi CSS utility** — `styles.css`: `.pill-btn` (azioni card),
      `.badge-chip` (badge testuali), `.icon-btn` (solo emoji). Default neutri
      (fontWeight/fontSize/gap/padding NON forzati → ogni bottone li tiene
      inline quando differiscono: like 12px/gap4, commenta 12px, reazioni
      3px 7px, preferito 13px). Visual preservato.
- [x] **6b. CardItem.tsx** — applicate `.pill-btn` ai bottoni footer (like,
      reazioni, commenta, riassumi, preferito, copia-link, pin, modifica ×2,
      duplica, copia-anno, elimina) e `.badge-chip` ai badge (tipo, classi,
      PIN, NUOVO, NASCOSTA, Solo-prof). Colori/bordi restano inline.
- [x] **6c. Estensione** — COMPLETATA (2026-08-02). Nuove classi utility in
      `styles.css`: `.cd-pill` (bottone azione CardDetail), `.u-label` (label
      di sezione modali/form), `.header-chip` (chip Header), `.icon-del`
      (bottone × rimozione modali). Applicate a: `CardDetail.tsx` (7 bottoni
      azione → `.cd-pill` + badge PIN/NASCOSTA/classi → `.badge-chip`),
      `AppLayout.tsx` (2 bottoni primari → `.btn .btn-primary`),
      `NuovaCardModal.tsx` (9 label → `.u-label`, 2 × → `.icon-del`),
      `AiQuizGenModal.tsx`, `ClasseModal.tsx`, `CopiaAnnoModal.tsx`,
      `RifiutaModal.tsx` (label → `.u-label`). Colori/sfondo/bordo restano
      inline: visual preservato al 100% (113/113 test).

---

## Fase 7 — Split AppProvider (god-file 1427 righe) ✅ COMPLETATA

Stato: **COMPLETATA** (2026-08-02) — estratto `src/app-provider-helpers.ts`
(14 helper puri, ~200 righe): `playAlarm`, `escHtml`, `classeCorrenteOf`,
`buildOpzioni`, `buildQuizDomande`, `cleanLinks`, `cleanImmagini`,
`buildEditCard`, `buildNewCard`, `buildEditForm`, `buildDuplicaCopia`,
`buildCopiaAnno`, `countCommenti`, `getProposte`. AppProvider usa gli import:
`addCard`, `editCard`, `confermaDuplica`, `confermaCopiaAnno`, `totC`,
`proposte`, `escHtml`, `classeCorrente`, `playAlarm` delegano a funzioni pure
senza dipendenze da stato React (testabili). Logica IDENTICA (verificata con
107+ test verdi). Restano nel provider solo stato + orchestrazione.

---

## Fase 8 — Accessibilità (audit + fix mirati)

Stato: **PARZIALE (passata mirata su CardItem ✅)**

- [x] **8a. Bottoni icona-pura con aria-label** — CardItem: 👁️/🚫 (convertito
      da `<span role=button>` a `<button type=button>` con stopPropagation,
      coerente con gli altri bottoni), reazioni 🤔💡🔥, ✏️ modifica ×2, 📋
      duplica. I test usano `getByText` (testo visibile invariato) → 105/105.
- [x] **8b. Audit esteso** — COMPLETATA (2026-08-02):
  - **Focus trap condiviso**: nuovo `src/modals/focusTrap.tsx` (componente
    `FocusTrap` con `display:contents`, loop Tab first↔last, focus iniziale
    dentro la modale al mount, restore sull'opener all'unmount). Avvolge
    TUTTE le modali nell'aggregatore `Modals.tsx` e la CardDetail lazy in
    `AppLayout.tsx`. Guard anti-conflitto (`data-focus-trap`): quando una
    modale si apre sopra la CardDetail (Timer/Amm/EditAmm), i due trap non si
    combattono — il trap che non contiene il focus lascia gestire all'altro.
    Coperto da 3 test unitari `src/modals/focusTrap.test.tsx` (loop Tab,
    shift+Tab, anti-conflitto; stub `offsetParent` perché jsdom non calcola
    il layout).
  - **aria-label su bottoni icona-pura**: CardDetail (× scadenza, reazioni
    🤔💡🔥), Header (✏️ scegli classe, tab 📌/🤖/👥), PartecipazionePanel
    (✏️/× ammonizioni), NuovaCardModal (× link/copertina/immagine/opzione/
    domanda, radio risposta corretta), WordCloud/Lightbox/AiQuizGen (×
    chiudi, ‹/› lightbox).
  - **aria-label su input/select/textarea senza label**:  NuovaCardModal
    (titolo, testo, link, didascalie, opzioni, domande, timer),
    ClasseModal, TimerModal, AmmModal, EditAmmModal, RifiutaModal,
    CopiaAnnoModal, AppLayout (select analisi/assegna classe).
  - Test aggiornati ai nuovi accessible name (tab 👥 → /Gestione studenti/,
    ✏️ ammonizione → /Modifica ammonizione/, Modals.test wrapper FocusTrap).
    Contrasto colori: già conforme (le fondamenta focus-visible,
    prefers-reduced-motion, touch-target erano già presenti).

---

## Come riprendere da qui (PIANO COMPLETATO — 2026-08-02)

Tutte le fasi del piano (0→8) sono chiuse. Lo stato è tutto verde: tsc pulito,
**118/118 test** (113 pre-esistenti + 3 per il FocusTrap 8b + 2 per il fix
EditAmmModal), lint 0 warning, build docs rigenerata, E2E Playwright **14/14**
verdi (8 pre-esistenti + 6 della nuova suite di esplorazione
`e2e/explore.spec.js`).

> **Post-refactoring (2026-08-02, esplorazione E2E)**: la suite ha trovato e
> fatto correggere un **bug reale** — la EditAmmModal non si chiudeva dopo
> "✓ Salva modifica" e l'overlay z-600 bloccava i click su tutta l'UI
> (`src/modals/EditAmmModal.tsx` ora chiama `setEditAmm(null)` dopo il
> salvataggio; coperto da test unitario + asserzione E2E).

Opzionali a lungo termine (nessuno urgente, nessun beneficio funzionale):

1. **Convertire i call-site compat all'API funzionale modulare** (opzionale,
   nessun beneficio bundle residuo: lo shim già consegna il taglio 497→326 kB
   con zero rischio). Da fare solo se si vuole eliminare lo shim per pulizia.
2. **`strict: true` file-per-file** (`// @ts-check` + `@ts-expect-error`
   puntuali) ora che il bundler è Vite/esbuild.
3. **Nota 4c**: il gate prof su `aiLoad` è ora reattivo su `user`; se in
   futuro si volesse estenderlo anche alla modalità "simula studente" del
   prof, basta passare a `useAI` un flag derivato da `simulaSt`.

---

## Validazione (ogni fase)

| Comando | Gate |
|---|---|
| `npx tsc --noEmit` | Typecheck pulito |
| `npm test` | 118 test verdi |
| `npm run lint` | Zero errori; warning solo voluti |
| `npx vitest run src/integration/ai-elimina-flows.test.tsx` | Rilancio isolato se flaky nella suite |
| `testTimeout: 15000` in vitest.config.js | Fix definitivo dei timeout flaky sui test integration (caricamento app vera + 16 moduli modal) |
| code review | Revisione delle modifiche |

> **Anti-regressione**: dopo ogni fase, il comportamento utente non cambia —
> solo struttura/type-safety. Se un test cambia comportamento, il refactoring
> è sbagliato.
>
> **Fasi completate**: 0, 1, 2, 3 (3b/5 via shim), 4 (4a/4b/4c), 5, 6
> (6a/6b/6c), 7, 8 (8a/8b). **Aperte**: nessuna obbligatoria. Restano solo
> gli opzionali a lungo termine: conversione call-site all'API funzionale
> modulare (per rimuovere lo shim) e `strict: true` file-per-file.
