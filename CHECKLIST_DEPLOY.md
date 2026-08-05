# CHECKLIST_DEPLOY.md — Checklist pre/post deploy (versione Vite/TS)

> Stato verificato: 03/08/2026 — 138/138 test · 22/22 E2E · tsc/lint puliti ·
> build docs/ fresca · service-account.json NON tracciato.

---

## PRIMA del push (checklist di pre-deploy)

### Gia verificato (non serve rifare)
- [x] npm test → 138/138 superati
- [x] npm run test:e2e → 22/22 superati
- [x] npx tsc --noEmit → pulito
- [x] npm run lint → pulita
- [x] npm run build → docs/ rigenerata con CSP meta + PWA (sw.js, manifest)
- [x] npm audit → 0 vulnerabilità
- [x] Dry-run deploy: service-account.json non finirà nel commit
- [x] Domini autorizzati Firebase (Authentication → Settings → Authorized domains): riefolog-cyber.github.io presente

### Da confermare in console (1 minuto ciascuno)
- [ ] Firestore Rules: console → Firestore → Rules → devono essere le nuove regole (con affectedKeys(), gating prof/studente). Se è la prima volta che le pubblichi, copia da rules firestore.txt → Publish.
- [ ] Migration annoScolastico: le card legacy devono avere il campo annoScolastico (GUIDA_DEPLOY dice 116/116 fatte). Senza, le card vecchie spariscono dal filtro server-side. Se non l'hai mai eseguita:
      cd migrations && npm install
      npm run dry-run-anno && npm run migrate-anno
      (serve migrations/service-account.json — già presente, NON committarlo)
- [ ] Worker Cloudflare (dashboard → Workers → scuolaboard-groq-proxy → Settings → Variables): presenti GROQ_API_KEY, OPENROUTER_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_API_KEY, ALLOWED_ORIGINS (deve includere https://riefolog-cyber.github.io)

### Ultimo controllo visivo (facoltativo ma consigliato)
- [ ] Apri http://localhost:4173/scuolaboard/ (preview della build in docs/) → login, bacheca, una card, QR. È esattamente ciò che andrà online.

---

## IL DEPLOY (ordine rigoroso — durata ~2 minuti)

> **Novità**: la CI ora rigenera e committa `docs/` automaticamente (job `deploy-docs`)
> quando lint/typecheck/test/build/E2E passano. Il passaggio manuale `npm run build`
> prima del push non serve più: basta il commit dei sorgenti.

### Passo 1 — Commit + push
bash scripts/deploy.sh "refactor: migrazione Vite/TS + pulizia dead code + PWA + CI"

> ⚠️ Da questo momento il sito passa alla root con l'entry di sviluppo (schermata bianca) — è atteso. Prosegui SUBITO al Passo 2.

### Passo 2 — Cambia la cartella di GitHub Pages (entro 1 minuto!)
1. GitHub → repo scuolaboard → Settings → Pages
2. Source: Deploy from a branch · Branch: main · Folder: /docs
3. Save

### Passo 3 — Verifica post-deploy (~1 minuto)
1. Aspetta che Pages completi il deploy (pagina Actions/Environments o ~1 min)
2. Apri https://riefolog-cyber.github.io/scuolaboard/ con hard refresh (Ctrl+Shift+R)
3. Login Google reale → bacheca → apri una card → prova una funzione AI
   > IMPORTANTE: è l'unico punto che i test non coprono (SDK Firebase 12 appena aggiornato). Se il login funziona, tutto il resto è già verificato.
4. Controlla la console del browser (F12): nessun errore rosso

---

## SE QUALCOSA VA STORTO (rollback)

| Problema | Fix |
|---|---|
| Schermata bianca dopo il push | Hai dimenticato il Passo 2 (folder /docs). Fallo ora. |
| Sito ancora vecchio dopo il deploy | Hard refresh (Ctrl+Shift+R) o attendi 1 minuto. |
| Login non funziona | Controlla i domini autorizzati Firebase (punto 2). |
| Errore AI / 403 | Env vars del Worker Cloudflare + ALLOWED_ORIGINS. |
| Regole che bloccano scritture | permission-denied → regole Firestore non pubblicate. |
| Rollback completo | Il vecchio codice è nel commit 596068b: git revert del push, oppure rimetti Pages su root e ripristina i file vecchi da git history. |

---

## DOPO il deploy (consigliato)

- [ ] Fai un secondo login (anche da un altro browser/incognito) per confermare
- [ ] Verifica PWA: icona installa nel browser su HTTPS
- [ ] Se il sito sembra lento, fai un hard refresh per scartare la vecchia cache
