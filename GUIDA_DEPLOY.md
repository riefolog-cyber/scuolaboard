# Guida al deploy — versione nuova (Vite + TypeScript) su GitHub Pages

> Stato: refactoring completato · `tsc` pulito · **138/138 unit test** · **22/22 E2E** ·
> build `docs/` pronta · migration `annoScolastico` già eseguita (116/116 card con anno) ·
> **regole Firestore nuove già pubblicate** in console.
>
> In questa build: fix "aggiungi classe" e "classe che sparisce dopo la rinomina",
> spunti AI visibili al prof, fix CSP QR, guard dimensione card (limite Firestore 1MB),
> title/meta puliti, suite E2E estesa a 22 test.

---

## ⚠️ La cosa più importante: la cartella di GitHub Pages va cambiata

- **Versione vecchia (attuale su GitHub)**: GitHub Pages serve la **root** (`index.html` + `dist/`).
- **Versione nuova**: la build di produzione sta in **`docs/`** (base `/scuolaboard/`).

Il file `index.html` nella root ora è **solo l'entry di sviluppo**: carica `/src/main.tsx`
(TypeScript crudo) che il browser **non sa eseguire**.
👉 **Se fai commit+push senza cambiare la cartella di Pages, il sito va in schermata bianca.**

---

## Passo 1 — Commit + push con VSCode Source Control (4 click, niente terminale)

1. Apri la barra **Source Control** → `Ctrl+Shift+G`
2. Clicca l'icona **`+`** (Stage All Changes) per mettere in coda tutto
   (file nuovi + modificati + cancellati)
3. Scrivi il messaggio nel campo in alto, es. `refactor: migrazione Vite/TS completa + fix vari`
4. Premi **`Ctrl+Enter`** (commit) e poi l'icona **Sync Changes** (🔄, in basso) per il push

> Al primo push chiederà il login GitHub (estensione GitHub, una volta sola).

**Alternativa "tutto in un comando"**: `bash scripts/deploy.sh "messaggio"`
(idempotente, supporta `--dry-run`, gestisce le divergenze con rebase).

---

## Passo 2 — Cambia la cartella su GitHub Pages

Su GitHub → repo → **Settings → Pages**:

- **Source**: *Deploy from a branch*
- **Branch**: `main`
- **Folder**: `/docs`
- **Save**

---

## Passo 3 — Verifica

1. Aspetta ~1 minuto (il deploy di Pages parte da solo)
2. Apri `https://riefolog-cyber.github.io/scuolaboard/` con **hard refresh** (`Ctrl+Shift+R`)
3. Naviga: login, bacheca, CardDetail, modali, QR

---

---

## 🚨 Rollback: tornare alla versione vecchia (solo se la nuova ha problemi)

> Come funziona GitHub Pages: serve **sempre l'ultimo commit di `main`**.
> Impostare la cartella in Settings → Pages NON ripristina un commit vecchio:
> sceglie solo **quale cartella** dell'ultimo commit pubblicare.
> Per tornare indietro devi quindi (1) riportare `main` al commit vecchio e
> (2) riportare la cartella di Pages a `/`.

### Cosa serve sapere prima

- Il codice **vecchio** (JS con `dist/`) è il commit **`596068b`**, già su GitHub.
- Il codice **nuovo** (Vite/TS) sarà un commit NUOVO sopra a quello.
- **I dati (Firestore) non si toccano mai** nel rollback: restano identici.
- ⚠️ Tornando indietro perdi i fix recenti (bug "+ classe", guard 1MB, CSP QR,
  title pulito) finché non rifai il commit nuovo.

### Strada A — Revert da GitHub (consigliata, 3 click, nessun terminale)

1. Vai su GitHub → repo → **Commits**
2. Trova il commit del deploy nuovo (quello col codice Vite/TS)
3. Clicca **`...`** accanto al commit → **Revert** → conferma
   (GitHub crea un commit che *annulla* il nuovo codice → `main` torna al vecchio)
4. **Settings → Pages → Folder: `/`** (root, come prima) → Save
5. Aspetta ~1 minuto e fai hard refresh (`Ctrl+Shift+R`)

### Strada B — Reset + force push (da terminale, più radicale)

```bash
git reset --hard 596068b      # riporta main esattamente al codice vecchio
# ⚠️ CANCELLA dal repo il commit nuovo (e il working tree!):
#     se hai modifiche locali non committate, prima fai un backup/copia della cartella src/
git push --force-with-lease origin main
```

Poi ripeti il punto 4-5 della Strada A (cartella `/` + hard refresh).

> ⚠️ `git reset --hard` riscrive la cronologia e **cancella i file locali non committati**.
> Se il codice nuovo non è ancora committato e vuoi solo "non toccarlo più",
> la Strada A (Revert) è più sicura.

### Come tornare POI al codice nuovo (dopo il rollback)

1. Il commit nuovo esiste ancora nella cronologia (Strada A) → **Revert del revert**
   oppure trova il commit e fai Cherry-pick / merge.
2. Strada B: il commit nuovo è sparito → devi rifare commit+push da zero
   (i file li hai in locale se non li hai persi).
3. In entrambi i casi: **Settings → Pages → Folder: `/docs`** → Save → hard refresh.

---

## CI automatica (nuovo)

Da ora `.github/workflows/ci.yml` esegue a ogni push su `main`: **lint + typecheck + test
unit + build + E2E**. Se un commit non supera i controlli, il push viene bloccato prima
che il sito si rompa. Il deploy resta quello descritto sopra (Pages → `main` → `/docs`).

**Novità — build automatica di `docs/`**: se tutti i controlli passano, il job
`deploy-docs` rigenera da solo la build (`npm run build`) e **committa e pusha `docs/`**
con messaggio `[skip ci]` (niente loop di CI). Da ora non serve più eseguire
`npm run build` a mano prima del push: basta il commit dei sorgenti.

## Avvertenze

- **Downtime breve**: tra il push (Passo 1) e il Save (Passo 2) il sito è irraggiungibile
  per qualche minuto (schermata bianca o 404). È normale: fai i passi 1 → 2 di fila.
- **I dati sono al sicuro**: la migration è già applicata; Firestore non viene toccato dal deploy.
- **`migrations/service-account.json` non va MAI committato** (già in `.gitignore`).
- Il file `_headers` (CSP via HTTP) funziona **solo su Cloudflare Pages**: su GitHub Pages
  la CSP viaggia via `<meta>` (già iniettata nella build di produzione in `docs/`).
