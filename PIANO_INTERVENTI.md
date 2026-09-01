# 📋 Piano interventi — ScuolaBoard (aggiornato 01/09/2026)

> Documento ATTIVO: elenca cosa resta da fare dopo i fix già committati.
> Stato verificato con: typecheck ✅, suite vitest ✅ (44 file, 460 test),
> build di produzione ✅, e2e Playwright ✅ (25/25 su Chrome reale).
> Coverage aggiornata (01/09/2026): **~58.3% lines radice src** (era 56.2%).
> App-handlers: 44.5% → **81.2%**. Ai-services: 45.8% → **85.3%**. Auth: 41.3% → **74.6%**. CardDetail: 42.9% → **73.7%**. FilterBar: 32.4% → **92.5%**.

## ✅ Già fatto (commit `c562bb3` → `3926a68` → `a3b076f` → `07fe734`)

- 5 bug critici (auth offline, onSnapshot error handler, lazy `window.db`, lost-update notifiche, race redirect auth)
- 4 fix medi (hilite accent-insensitive, destroy-in-render, privacy documentata, drag&drop in writeBatch)
- Refactor `firestore-sync` per-provider (niente più `destroy()` globale)
- Countdown isolato (niente più tick 1s globale) + split `UIContext` → `FormContext` + `AppLayout` memo
- Micro-fix blocco B (SB.user in effect, deepEq strutturale, bulkHide toast, undo timer cleanup, qrUrl privacy)
- Blocco C (handler rinomina/classi in FormContext, `__handlers` fuori dalle deps di uiValue, `CardItem` memo)
- Fix `SommarioModal` (React nudo dopo rimozione global UMD) + guardia anti-React-nudo + smoke test lazy-loaded
- Fix 403 worker: dev server SOLO su porta 5173 (whitelist `ALLOWED_ORIGINS`) + messaggio d'errore con hint del worker
- Fix riassunto commenti AI (C1): persistito in `ai_results/{id}.sommario` con `nCommenti` → la riapertura (anche dopo reload) NON richiama Groq se i commenti non sono cambiati; "↻ Rigenera" resta manuale (force=true)

---

## 🔴 Blocco A — Deploy & operatività ✅ FATTO (01/09/2026, dall'utente)

| # | Cosa | Stato |
|---|------|-------|
| A1 | Pubblicare le Firestore Rules aggiornate | ✅ fatto |
| A2 | Creare l'indice composito `(annoScolastico ASC, visibile ASC)` | ✅ fatto |
| A3 | Verificare `role:"prof"` sul profilo docente | ✅ fatto |
| A4 | Impostare `ALLOWED_ORIGINS` sul Worker Cloudflare | ✅ fatto |
| A5 | Test pre-avvio manuale (docente/scuola/estraneo) | ✅ fatto |

## 🟡 Blocco B — Test e qualità (dal coverage, in ordine di impatto)

**⚠️ Obiettivo raggiunto 01/09**: tutti i file critici e usati ogni giorno sono **sopra il 60%**:
app-handlers 81.2% · ai-services 85.3% · auth 74.6% · CardDetail 73.7% · FilterBar 92.5% · Header 86.4% · firestore-services 90.7% · StudentiPanel 97.0%.

| File | Coverage | Stato |
|------|----------|-------|
| `app-handlers.ts` (81.2%) | 376/463 ✅ | `src/app-handlers.test.ts` 39 casi: routing saveCard/updateCard, classi (add/remove/rinomina default↔custom), preferiti, notifiche addCom/addReply, ammonisci, handleAllegatiUpload (MIME allowlist, doppia estensione, >700KB, HTML/SVG, budget) |
| `ai-services.ts` (85.3%) | 296/347 ✅ | `src/ai-services-errors.test.ts` 9 casi (rami errore chiamaAI) + `src/ai-services-hook.test.tsx` 15 casi (runAI, runCardAI, runCardQ, quiz, sommario, sondaggio) |
| `auth.ts` (74.6%) | 88/118 ✅ | `src/auth-access.test.tsx` 10 casi (filtro dominio/whitelist, accesso negato senza profilo fantasma, creazione profilo, fallback redirect, logout, offline) |
| `CardDetail.tsx` (73.7%) | 42/57 ✅ | `src/integration/card-detail-flows.test.tsx` 8 casi in stato APERTO (like, reazioni, commento, scadenza, NASCOSTA, voto, isOwner, chiusura) |
| `FilterBar.tsx` (92.5%) | 37/40 ✅ | `FilterBar.test.tsx` 18 casi (rinomina, rimozione, aggiunta classe, Solo prof, reset filtro, colore custom) |
| `Header.tsx` (86.4%) | 38/44 ✅ | `Header.test.tsx` esteso a 26 casi (menu anno con persistenza LS, tema, notifiche: badge/lista/segna lette/pulisci con confirm, QR, ricerca, ammonizioni, preview studente, tab studenti) |
| `firestore-services.ts` (90.7%) | 39/43 ✅ | `src/firestore-services.test.ts` 9 casi con fake db + import dinamico (saveCard con delega fbSave, delCard, updateCard con fallback, refreshAiMap, addAmmonizione arrayUnion, getNewCardOrder transazionale, createCardWithOrder) |
| `StudentiPanel.tsx` (97.0%) | 32/33 ✅ | `src/StudentiPanel.test.tsx` 10 casi (empty state, raggruppamento per classe con ordinamento, cambio/rimozione classe, export CSV con BOM+';', toast su errore) — il test ha scovato e corretto un bug di stringa: "2 studentei" → "2 studenti" |

**Obiettivo raggiunto ✅** (01/09): **tutti** i file del Blocco B sopra il 60% — il Blocco B è completo.

### Coverage per area (baseline 01/09/2026)
```
src/carddetail    83.8% lines · src/contexts 72.3% · src/hooks 67.9%
src/integration   77.2% (test) · src/modals 58.5% · src/utils 57.6%
```

## 🟢 Blocco C — Ottimizzazioni prestazioni (dopo il blocco B)

| # | Intervento | Rischio | Beneficio |
|---|-----------|---------|-----------|
| C1 | Misurare con React Profiler il guadagno reale dello split FormContext + memo CardItem (digitazione in form/rename) | basso | numeri concreti per decidere se proseguire — **FATTO 01/09**: `src/integration/perf-profiler.test.tsx` (3 test) — vedi risultati sotto |
| C2 | Ridurre la dipendenza `__handlers` residua in `uiValue` (oggi i handler like/vote restano ricreati) | medio | meno re-render della griglia — **FATTO 01/09**: `appHandlerCtx` ora è memoizzato su `[]` con un ref live unico (`liveRef`, aggiornato a ogni render) per TUTTI i valori letti dagli handler; le deps ridondanti (cards, classiCustom, preferiti…) che ricreavano `__handlers` → tutti i 15 handler a ogni update di card sono state rimosse. I getter leggono sempre l'ultima render via ref (stesso pattern `cardsHookRef` già usato). Rischio: nessun cambio di comportamento, solo identità stabili |
| C3 | `writeBatch` per le scritture MULTIPLE (oggi solo drag&drop) | medio | scritture atomiche — **FATTO 01/09**: like/voto/reazione sono update su UN SOLO doc (il batch non aggiunge nulla lì); il batch è stato applicato dove le scritture sono davvero N: `resetRisposte` (N delete → 1 commit) e `valutaAperteProfAI` (N update → 1 commit merge-set) in `useQuiz.ts`, con fallback alle scritture singole se `batch()` non esiste. Test: `src/useQuiz-batch.test.tsx` (3 casi) |
| C4 | Valutare il re-render di `AppProvider` intero (un solo provider ~1500 righe): eventuale split per dominio | alto | il grosso del guadagno, ma da fare con rete di test calda |
| C5 | `React.lazy`/`memo` residui: verificare che CardDetail/SommarioModal non forzino re-render inutili del layout | basso | minor lavoro React — **FATTO 01/09**: verifica conclusa — `LazyCardDetail`/`LazySommarioModal` sono già lazy (splitting del bundle) e `AppLayout` + `CardItem` sono già `memo` con comparatore custom (`cardItemAreEqual` confronta i campi renderizzati: isLight, isProf, bulk*, myLikes, seenRef, classiCustom, preferiti, aiMap, sommarioResult). Nessun intervento necessario |

## 🔵 Blocco D — Manutenzione tecnica / debito

- [ ] `.freebuff/` nel working tree: NON committare (dati locali dell'agente)
- [ ] Policy `docs/`: la build rigenera asset committati — decidere se committare la build a ogni intervento o lasciarla al CI/deploy (oggi si ripristina con `git checkout -- docs/`)
- [ ] `README.md`: il conteggio test è ora "~352 test, 37 file" — aggiornarlo a ogni milestone
- [ ] Verificare che il workflow CI (`.github/workflows/ci.yml`) includa anche la guardia anti-React-nudo e gli smoke test lazy (sono test vitest normali, dovrebbero esserci già)
- [ ] Valutare un threshold di coverage nel CI (es. non far regredire sotto il 55% stmt) per blindare il lavoro fatto

### Risultati misura C1 (React Profiler, 12 card, 3 esecuzioni stabili)

| Scenario | Commit per azione | actual (con memo) | base (senza memo) | Risparmio |
|----------|-------------------|-------------------|-------------------|-----------|
| **Keystroke nel rename classe** (FormContext) | **1** (solo FilterBar) | 1.7–3.4 ms | 4.3–5.8 ms | **41–62%** |
| **Keystroke nel commento** (FormContext, CardDetail) | **1** (solo pannello) | 2.3–4.3 ms | 4.7–6.2 ms | **30–53%** |
| **Click su filtro classe** (CardsContext, ri-renderizza la griglia) | 1 | 4.9–5.9 ms | — | baseline |

**Lettura**: lo split funziona come progettato — un keystroke nei form costa **1 commit isolato** (griglia intatta) e il costo reale è il **30–60% in meno** della stima "senza memo" (React Profiler `actualDuration` vs `baseDuration`). Un'azione che tocca la griglia (cambio filtro) costa **~3-4× un keystroke**: è esattamente il costo che il context-split evita a ogni tasto. Con 12 card il costo assoluto è già basso (~2-5 ms); il guadagno percentuale cresce con il numero di card. → **C4 (split di AppProvider) va valutato solo se la bacheca supera le decine di card**; per l'uso attuale (una classe, poche decine di card) i numeri non giustificano il rischio del refactor.

## 📌 Ordine consigliato

1. **Blocco A** (deploy: rules, indice, ALLOWED_ORIGINS) — sblocca l'uso reale, zero rischio codice
2. **Blocco B** (test su `app-handlers` → `ai-services` → `auth`) — alza la rete prima di toccare altro
3. **Blocco C** (C1 misura → C2/C3 piccoli → C4 grosso)
4. **Blocco D** quando capita (housekeeping)
