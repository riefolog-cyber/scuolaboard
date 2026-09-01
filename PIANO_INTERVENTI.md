# 📋 Piano interventi — ScuolaBoard (aggiornato 01/09/2026)

> Documento ATTIVO: elenca cosa resta da fare dopo i fix già committati.
> Stato verificato con: typecheck ✅, suite vitest ✅ (42 file, 449 test),
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

**⚠️ Obiettivo raggiunto 01/09**: i 3 file di sicurezza/permessi e i 2 più usati sono tutti **sopra il 60%**:
app-handlers 81.2% · ai-services 85.3% · auth 74.6% · CardDetail 73.7% · FilterBar 92.5%.

| File | Coverage | Stato |
|------|----------|-------|
| `app-handlers.ts` (81.2%) | 376/463 ✅ | `src/app-handlers.test.ts` 39 casi: routing saveCard/updateCard, classi (add/remove/rinomina default↔custom), preferiti, notifiche addCom/addReply, ammonisci, handleAllegatiUpload (MIME allowlist, doppia estensione, >700KB, HTML/SVG, budget) |
| `ai-services.ts` (85.3%) | 296/347 ✅ | `src/ai-services-errors.test.ts` 9 casi (rami errore chiamaAI) + `src/ai-services-hook.test.tsx` 15 casi (runAI, runCardAI, runCardQ, quiz, sommario, sondaggio) |
| `auth.ts` (74.6%) | 88/118 ✅ | `src/auth-access.test.tsx` 10 casi (filtro dominio/whitelist, accesso negato senza profilo fantasma, creazione profilo, fallback redirect, logout, offline) |
| `CardDetail.tsx` (73.7%) | 42/57 ✅ | `src/integration/card-detail-flows.test.tsx` 8 casi in stato APERTO (like, reazioni, commento, scadenza, NASCOSTA, voto, isOwner, chiusura) |
| `FilterBar.tsx` (92.5%) | 37/40 ✅ | `FilterBar.test.tsx` 18 casi (rinomina, rimozione, aggiunta classe, Solo prof, reset filtro, colore custom) |
| `Header.tsx` (42.9%) | 19/44 | **OPZIONALE** — test menu anno, notifiche, profilo |
| `firestore-services.ts` (34.9%) | 15/43 | Test unitari dei servizi CRUD con fake db |
| `StudentiPanel.tsx` (42.4%) | 14/33 | Test vista studenti (già coperto in parte da `secondary-flows`) |

**Obiettivo raggiunto ✅** (01/09): tutti i file critici sopra il 60% — i rimanenti (`Header`, `firestore-services`, `StudentiPanel`) sono opzionali.

### Coverage per area (baseline 01/09/2026)
```
src/carddetail    83.8% lines · src/contexts 72.3% · src/hooks 67.9%
src/integration   77.2% (test) · src/modals 58.5% · src/utils 57.6%
```

## 🟢 Blocco C — Ottimizzazioni prestazioni (dopo il blocco B)

| # | Intervento | Rischio | Beneficio |
|---|-----------|---------|-----------|
| C1 | Misurare con React Profiler il guadagno reale dello split FormContext + memo CardItem (digitazione in form/rename) | basso | numeri concreti per decidere se proseguire |
| C2 | Ridurre la dipendenza `__handlers` residua in `uiValue` (oggi i handler like/vote restano ricreati) | medio | meno re-render della griglia |
| C3 | `writeBatch` anche per like/voti/reazioni (oggi solo drag&drop) | medio | scritture atomiche e meno round-trip |
| C4 | Valutare il re-render di `AppProvider` intero (un solo provider ~1500 righe): eventuale split per dominio | alto | il grosso del guadagno, ma da fare con rete di test calda |
| C5 | `React.lazy`/`memo` residui: verificare che CardDetail/SommarioModal non forzino re-render inutili del layout | basso | minor lavoro React |

## 🔵 Blocco D — Manutenzione tecnica / debito

- [ ] `.freebuff/` nel working tree: NON committare (dati locali dell'agente)
- [ ] Policy `docs/`: la build rigenera asset committati — decidere se committare la build a ogni intervento o lasciarla al CI/deploy (oggi si ripristina con `git checkout -- docs/`)
- [ ] `README.md`: il conteggio test è ora "~352 test, 37 file" — aggiornarlo a ogni milestone
- [ ] Verificare che il workflow CI (`.github/workflows/ci.yml`) includa anche la guardia anti-React-nudo e gli smoke test lazy (sono test vitest normali, dovrebbero esserci già)
- [ ] Valutare un threshold di coverage nel CI (es. non far regredire sotto il 55% stmt) per blindare il lavoro fatto

## 📌 Ordine consigliato

1. **Blocco A** (deploy: rules, indice, ALLOWED_ORIGINS) — sblocca l'uso reale, zero rischio codice
2. **Blocco B** (test su `app-handlers` → `ai-services` → `auth`) — alza la rete prima di toccare altro
3. **Blocco C** (C1 misura → C2/C3 piccoli → C4 grosso)
4. **Blocco D** quando capita (housekeeping)
