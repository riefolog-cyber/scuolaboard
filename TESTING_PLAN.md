# TESTING_PLAN.md — Sistema di test automatico di ScuolaBoard

Questo documento descrive il sistema di test automatico costruito per verificare
l'app **dall'inizio alla fine** senza dover cacciare ogni bug a mano.

---

## Test: come eseguire

| Comando | Cosa fa | Dove |
|---|---|---|
| `npm test` | Suite completa vitest (unit + integrazione, jsdom) — monta l'app **vera** | `src/**/*.test.tsx` |
| `npm run test:e2e` | E2E nel browser reale (Chrome di sistema): smoke + modali | `e2e/*.spec.js` |
| `npx tsc --noEmit` | Typecheck dell'intero progetto | — |

> ℹ️ Nota TypeScript: `typescript` è **pinnato a 6.0.x** (`~6.0.3` — tilde, non
> caret!): `@typescript-eslint/parser@8` richiede `typescript <6.1.0` e non
> supporta ancora TS 7 (nessuna versione del parser lo fa, incluso la canary).
> La tilde impedisce a `npm install` di tirare 6.1.x che ricrasherebbe il
> parser. Il downgrade da `7.0.2` è voluto e non impatta la build (Vite usa
> esbuild, `tsc` è solo `noEmit` typecheck con `strict:false`). Se in futuro
> typescript-eslint supporterà TS 7, si potrà riportare `typescript` a `^7`.
>
> ⚠️ Nota E2E: se `npm run dev` è già attivo sulla porta 5173, Playwright lo
> **riusa** (`reuseExistingServer`) invece di avviarne uno proprio (che poi
> ucciderebbe al termine → tab aperto perde il server, vedi errore
> `ERR_CONNECTION_REFUSED` su `CardDetail.tsx`).

---

## Architettura

### 1. `src/integration/fake-firestore.ts`
Firestore **finto in memoria** che implementa `collection/doc/get/set/update/delete/where/orderBy/onSnapshot` e helper `_reset/_seed/_get/_all`. I test scrivono e leggono dati come se fosse il database vero.

### 2. `src/integration/harness.ts`
Monta l'app **vera al 100%**: `AppProvider` + `AppLayout` + tutte le modali, con Firebase e Auth finti. Punti chiave:
- I moduli catturano `window.db` al **primo import** → boot **una sola volta** per file, poi `_reset(seed)` tra i test.
- Shim di `React.useSyncExternalStore` per ripristinare le subscription reali (test-setup.js le aveva disattivate per i test unitari isolati).
- `window.App` è definito da `app.ts` come nel bundle reale.
- `renderApp` supporta anche `?user=studente` via `e2e/harness-boot.ts` per gli E2E.

### 3. Suite di integrazione
- **`main-flows.test.tsx`** — flussi principali: login prof, creazione card, commento, like, filtro per classe, vista studente, gating AI studente.
- **`secondary-flows.test.tsx`** — flussi secondari: duplica card, copia in altro anno, elimina+undo, proposta studente→prof (approva/rifiuta), AI prof, gestione studenti.
- **`quiz-flows.test.tsx`** — flusso quiz interattivo: quiz a tempo (timer), invio risposte con punteggio salvato su `quiz_risposte` e display "✅ Quiz completato", punteggio pieno con tutte le risposte corrette.
- **`prof-quiz-flows.test.tsx`** — valutazione quiz **lato prof**: `valutaAperteProfAI` con AI mockata (aggiorna `aiScores`/`punteggio` su `quiz_risposte`), classifica ordinata per percentuale decrescente, `resetRisposte` (cancella le risposte).
- **`upload-flows.test.tsx`** — upload immagini nella NuovaCardModal con `window.compressImage` mockato (compress → anteprima → salvataggio card con `immagini`).
- **`ai-elimina-flows.test.tsx`** — eliminazione dell'analisi AI del prof dalla card (`🗑️ Elimina analisi` svuota `aiAnalisi` e cancella il doc `ai_results/{id}`) e della cronologia domande (`🗑️ Elimina domande` svuota solo `domande`), con conferma/cancellazione annullata.
- **`fixtures.ts`** — fixture condivise (`PROF`/`STUD`/`PROF_DOC`/`STUD_DOC`/`mkCard`/`setupTestEnv`/`teardownTestEnv`) usate da tutte le suite.

### 4. E2E Playwright (`e2e/*.spec.js`)
Browser reale (Chrome di sistema, `channel: 'chrome'`, nessun download).
- **`smoke.spec.js`** — l'app carica, mostra il brand e non emette errori console fatali.
- **`modals.spec.js`** — harness con Firebase finto (`harness.html` + `harness-boot.ts` che monta l'app vera, `window.__db` per le asserzioni): verifica che **Copia in altro anno**, **Rifiuta proposta**, **Timer (scadenza)**, **Ammonizioni**, **EditAmm** e **Profilo studente** (`?user=studente`) si aprano davvero e funzionino end-to-end nel browser.

---

## Bug REALI trovati e corretti dai test

1. **Modali mai aperte** (`src/contexts/AppProvider.tsx`)
   `modalsValue` aveva `useMemo` con deps **incomplete**: mancavano `showRifiutaModal`, `showCopiaAnno`, `showAiQuizGen`, `editAmm`, `showProfilo`, `showTimerModal`. Il context restava stantio → le modali **Copia in altro anno, Rifiuta proposta, Ammonizioni edit, Profilo, Timer** non si aprivano MAI (nemmeno in produzione!). Ora le deps coprono tutti gli stati letti.

2. **Stessa classe di bug in `cardsValue`**
   Deps incomplete per `filtroBarOpen`, `newCardsBanner`, `classiNascoste`, `now`, `confirmRimuovi`, `addingClasse`, `newClasseInput` → filtro bar, banner "nuova card" e gestione classi restavano stantii. Corretto.

3. **Flusso quiz rotto** (scoperto dal nuovo `quiz-flows.test.tsx`)
   - `inviaRisposteQuiz(cardId)` riceveva l'**id** (da `c.id`) ma lo trattava come oggetto card → `quizDomande` undefined e docId `undefined_Luca Bianchi`.
   - Leggeva `qRisposte` (mai popolato: la UI scrive in `quizRisposte`) → punteggio sempre 0.
   - Confronto risposta/corretta sbagliato → nuovo helper `quizRispostaGiusta(d, idx)` che normalizza con `String()` e gestisce sia l'indice (multipla) sia il testo (vero/falso).
   - `valutaAperteProfAI` usava lo stesso confronto sbagliato → ora usa `quizRispostaGiusta`.
   - Display "Quiz completato" leggeva `c.risposte` **mai scritto** (le Firestore Rules vietano allo studente di scrivere sulla card) → ora derivato dal listener `quizRisposte` in `CardDetail.tsx`.

4. **Regressioni della migrazione TS ripristinate** (richieste dai nuovi test)
   - **Vista prof quiz persa** in `CardDetail.tsx` (RISULTATI + classifica + "Valuta risposte aperte con AI" + Reset): ripristinata.
   - **Pulsante ⏰ Timer** e **×** per rimuovere la scadenza (prof): ripristinati.
   - **Pannello ammonizioni** nella CardDetail con bottoni ✏️ (EditAmmModal) e × (`eliminaAmm`): ripristinato.
   - `AppProvider`: aggiunto `resetRisposte`; `compressImage`/`callGroqJSON` ora letti da `window.*` **al momento della chiamata** (prima erano catturati al load → non mockabili nei test).

---

## Modello per-anno scolastico — fix recenti (rinomina per-anno + ClasseModal)

> Questi fix NON sono ancora coperti da test automatici dedicati: sono stati
> implementati dopo l'analisi manuale del modello dati (mappa `classiPerAnno`).
> Se vuoi, i flussi sotto sono la base per nuovi test di integrazione.

### 1. Rinomina classe per-anno (`src/app-handlers.ts` → `eseguiRinomina`)

- **Prima**: query `users.where('classe', '==', oldN)` → aggiornava il campo
  **piatto** `classe`. Gli studenti NON venivano spostati nella classe
  rinominata per l'anno corrente (e la rinomina ignorava la mappa per-anno).
- **Ora**: query `users.where('role', '==', 'studente')` + filtro in memoria su
  `classiPerAnno[anno]` → aggiorna **solo la casella dell'anno corrente**
  (`nextMap[anno] = newN`), lasciando intatti gli anni precedenti come record
  storico. Fallback legacy: studente senza `classiPerAnno` viene abbinato col
  campo piatto `classe` e migrato alla mappa.
- Richiede `ctx.annoScolastico` nel context handlers (aggiunto in
  `AppProvider.tsx`).
- Regole Firestore: il prof può aggiornare solo `classe`/`classiPerAnno`/`rimosso`
  sui doc `users/{uid}` (match con `isProf() && affectedKeys().hasOnly(...)`).
- NB: nessun `return` anticipato nel blocco — il cleanup della modale
  (`setRinominaClasse(null)`, `setRinominaConferma(false)`) deve girare sempre.

### 2. ClasseModal filtrata sulle classi attive dell'anno (`src/Modals.tsx`)

- **Prima**: iterava `CLASSI_DEFAULT` direttamente → mostrava TUTTE le classi
  predefinite, incluse quelle **nascoste** dal prof per quell'anno.
- **Ora**: usa `CLASSI_LIST` (già filtrata per anno da `AppProvider`:
  default − nascoste + custom) → lo studente può scegliere **solo le classi
  attive dell'anno**. Empty-state "Nessuna classe attiva per quest'anno" se la
  lista è vuota.
- `isDisabled` è **per-anno-only**: disabilita solo se `classiPerAnno[anno]` è
  già scelto. Uno studente legacy con solo il campo piatto `classe` può comunque
  scegliere per l'anno corrente (niente dead-end popup aperto/modale bloccata).

### 3. Coerenza per-anno (`AppProvider.tsx`, `cards.ts`, `Header.tsx`)

- `classeCorrente = classiPerAnno[anno] || user.classe` (con ramo extra:
  utente senza `classiPerAnno` → fallback diretto su `user.classe`; stessa
  formula in `AppProvider` e `cards.ts`) esposta via `$`.
- Popup "Scegli classe": scatta solo se manca `classiPerAnno[anno]` (prima
  bastava `!user.classe` → il popup si riapriva ad ogni reload).
- Filtro bacheca + banner "nuove card": usano la classe per-anno → lo studente
  non perde le card della propria classe dopo un reload.
- Badge Header e ProfiloModal mostrano la classe dell'anno selezionato.
- Accesso a `classiPerAnno` sempre protetto con `(user.classiPerAnno || {})`
  (utenti legacy senza mappa non causano TypeError).

---

## Strategia di test (perché questi test trovano i bug)

- I **vecchi 78 test unitari** montavano componenti isolati con mock a mano → non potevano scoprire bug di integrazione (es. deps stantie nei context).
- Le **nuove suite di integrazione** montano l'app vera → qualsiasi disallineamento tra context, modali e UI emerge subito.
- Gli **E2E Playwright** verificano nel browser reale che le modali si aprano davvero (i test jsdom non simulano il ciclo di vita completo delle lazy modal).

---

## Verifiche manuali rimaste (non automatizzabili senza credenziali)

Queste richiedono un utente Firebase reale e NON sono coperte dai test automatici:

- Login Google vero (il fake auth è simulato nei test).
- Chiamate AI reali (Groq/OpenRouter): i test verificano solo il **gating** (studente bloccato, prof abilitato), non la risposta del modello.
- Upload immagini su Firebase Storage **reale** (nei test il `compressImage` è mockato e i dati restano in memoria).
- Notifiche push (richiede service worker + permessi browser).
- QR code (dipende da api.qrserver.com).

---

## Come aggiungere un nuovo test di integrazione

```ts
// src/integration/mio-flusso.test.tsx
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures'; // fixture condivise

beforeEach(setupTestEnv);
afterEach(teardownTestEnv); // MOLTO importante: smonta l'albero tra i test

it('descrive il flusso', async () => {
  const { db } = await renderApp({
    seed: { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1') } },
    user: PROF,
  });
  await screen.findByText('...', {}, { timeout: 4000 });
  // ... interazioni ...
  await waitFor(() => {
    expect(db._get('cards', 'c1').qualcosa).toBe(...);
  });
});
```

> Pitfall noti:
> - `findByText` con testo esatto fallisce se il nodo contiene **due nodi testo**
>   (es. bottone "🤖" + "✓ Tutte valutate" → testo concat "🤖✓ Tutte valutate"):
>   usare regex `/✓ Tutte valutate/`.
> - I mock `window.callGroqJSON`/`window.compressImage` vanno impostati **DOPO**
>   `renderApp`: il boot importa `ai-services.ts` che sovrascrive
>   `window.callGroqJSON` incondizionatamente al primo import.
> - Il deep-link `?card=...` persiste tra i test → resettare con
>   `history.replaceState(null,'','/')`.
> - Le chip classe della CardItem sono `<span>` (non `button`) → nessun conflitto
>   con i chip della FilterBar.
> - `getByText` matcha SOLO i nodi testo diretti ("Punteggio: " e "1/2" sono nodi
>   separati) → cercare il testo del figlio o usare `getAllByText`.
> - In Playwright usare **scoping** (`page.locator('#card-<id>')` o il pannello
>   padre) quando `getByRole` trova più bottoni con lo stesso nome: es. `✏️`
>   compare in 21 bottoni della UI → scoping al pannello ammonizioni.
> - **Flakiness nota**: `ai-elimina-flows.test.tsx` può fallire a intermittenza
>   nella suite completa (timeout 4s sul lazy-load di `CardDetail` sotto carico
>   parallelo). Rilanciato **isolato** passa sempre 4/4 → non è una regressione.
>   Se fallisce in CI, rilancia il solo file: `npx vitest run src/integration/ai-elimina-flows.test.tsx`.
