# Guida Git Push - ScuolaBoard

Procedura **esatta, verificata passo-passo**, per fare commit e push verso GitHub da Windows + VSCode + PowerShell.

> **Stato attuale del repo GitHub**: 1 solo commit su `main` con tutti i 33+ file del progetto allineati (root commit `74c7ba8`).
> **Working tree locale**: pulito, branch `main` ancorato sull'ultimo commit condiviso.

---

## 1. Requisiti minimi (una tantum)

| Software | Scopo | Verifica |
|---|---|---|
| **Visual Studio Code** | editor + Source Control UI + terminale integrato | `code --version` |
| **Git for Windows** | fornisce `bash.exe` (Git Bash) | `Test-Path 'C:\Program Files\Git\bin\bash.exe'` -> `True` |
| **Estensione GitHub** in VSCode | autenticazione browser-based al push | `Ctrl+Shift+X` -> cerca `GitHub` -> Installa `GitHub Pull Requests and Issues` |
| **Account GitHub** con accesso al repo | autorizzazione push | https://github.com/riefolog-cyber/scuolaboard |

> **Se l'estensione GitHub NON autentica**: vedi sezione 6 (Fallback PAT).

---

## 2. Struttura del progetto (cosa committare)

```
scuolaboard/
  index.html              <- pagina principale
  app.js, app-*.js        <- sorgenti React (un solo bundle)
  build.js                <- bundler (Terser)
  package.json, package-lock.json
  dist/
    app.min.js            <- bundle minificato (serve GitHub Pages)
    index.html
    styles.css
  firebase-init.js
  auth.js, cards.js, modals.js, ai.js
  rules firestore.txt     <- testo regole Firestore
  worker cloudflare.txt   <- sorgente Worker Cloudflare per chiavi AI
  migrations/             <- script Admin SDK per pulizia legacy
  scripts/
    deploy.sh             <- automa commit+push (vedi sezione 4B)
  _headers                <- config Cloudflare Pages (CSP/HSTS)
  README.md, .gitignore, GIT_PUSH_GUIDE.md (questo file)
```

> `node_modules/` e `.git/` esclusi da `.gitignore`. Non committare **mai** `node_modules/` (rigenera con `npm install`).

---

## 3. Setup iniziale (una tantum, gia fatto nel tuo repo)

Da terminale **PowerShell di VSCode** (apri con `Ctrl+` `):

```powershell
# 1. Identita git (solo se non ancora configurata)
& "C:\Program Files\Git\bin\bash.exe" -c "git config user.name 'Riefolog' && git config user.email 'riefolog@gmail.com'"

# 2. Init repo + branch main + remote (solo se non ancora inizializzato)
& "C:\Program Files\Git\bin\bash.exe" -c "git init && git checkout -B main && git remote add origin https://github.com/riefolog-cyber/scuolaboard.git"
```

---

## 4. Tre modalita di commit

| Accesso | Modalita | Pro | Contro |
|---|---|---|---|
| **A. VSCode UI (consigliato quando impari)** | grafico, interattivo | diff viewer, prompt grafici, undo facile | richiede click manuali |
| **B. Script bash (consigliato batch)** | automazione ripetibile | DRY-RUN sicuro, idempotente, force-push gestito | serve path bash.exe |
| **C. Alias PowerShell** | one-line dal terminale | comando familiare sempre disponibile | richiede modifica `$PROFILE` |

### 4A. Flusso VSCode UI

1. Modifica/crea i file
2. `Ctrl+Shift+G` -> Source Control
3. File modificati appaiono sotto `Changes`
4. Click `+` accanto a un file per stagearlo (o `+` su `Changes` per tutti)
5. Scrivi messaggio commit nel textbox sopra
6. `Ctrl+Enter` -> commit locale
7. Click **`···`** in alto a destra -> **`Push`** (oppure icona `Sync Changes`)
8. Se appare warning "diverged" -> scegli **`Push (Force)`**

### 4B. Flusso Script bash

```powershell
# Test senza side-effect (stampa cosa farebbe)
& "C:\Program Files\Git\bin\bash.exe" "scripts\deploy.sh" "msg di test" --dry-run

# Esecuzione reale (commit + push)
& "C:\Program Files\Git\bin\bash.exe" "scripts\deploy.sh" "msg di commit"
```

Lo script fa **7 sezioni in automatico**:
1. Set identita git (idempotente)
2. Init `.git` se serve
3. Branch `main` via `git checkout -B` (gestisce HEAD detached)
4. Remote `origin` con pattern `if get-url; then set-url; else add`
5. Fetch + status check
6. Stage + commit (messaggio anti-injection via `printf '%s'`)
7. Push con rebase automatico se diverged

### 4C. Flusso Alias PowerShell

Apri il tuo profilo PowerShell:

```powershell
notepad $PROFILE
```

Aggiungi in fondo:

```powershell
function sb {
    & "C:\Program Files\Git\bin\bash.exe" "C:\Users\Gianni\Desktop\scuolaboard\scripts\deploy.sh" $args
}
```

Salva + riavvia terminale PowerShell. D'ora in poi:

```powershell
sb "fix: validazione URL"           # commit + push
sb "fix: validazione URL" --dry-run # solo simulazione
```

> **IMPORTANTE**: usa path **assoluto completo** nel wrapper. NON scrivere solo `bash` (alcuni ambienti PowerShell 7 Core / Windows Terminal non lo trovano nel PATH).

---

## 5. Caso speciale: primo push diverged (root-commit scenario)

**Quando succede**: hai creato il repo GitHub con file iniziali (README + LICENSE via web UI) e vuoi pushare la tua versione locale. Git trova gli stessi `README.md`, `app.js`, ecc. su entrambi i lati ma con contenuto diverso -> **add/add conflict** su ogni file.

**Fix in 2 comandi**:

```powershell
& "C:\Program Files\Git\bin\bash.exe" -c "git rebase --abort"           # 1. esci da rebase interrotto
& "C:\Program Files\Git\bin\bash.exe" -c "git push --force-with-lease origin main"  # 2. sovrascrivi cronologia remota
```

**Cosa succede**:
- I 3 commit `Add files via upload` sul remoto vengono **sostituiti** dal tuo commit unico locale
- `--force-with-lease` controlla che nessun altro abbia pushato nel frattempo (best practice)
- Risultato: GitHub mostra 1 solo commit con tutti i tuoi 33+ file

**Per evitarlo la prossima volta**: crea il repo GitHub **VUOTO** (senza `Initialize with README`), poi pusha il tuo commit locale come primo push.

---

## 6. Fallback: autenticazione manuale con PAT

Se l'estensione GitHub di VSCode non autentica al push:

1. Vai su `https://github.com/settings/tokens/new?scopes=repo`
2. `Generate new token (classic)` -> seleziona scope **`repo`** (full)
3. Copia il token (formato `ghp_xxxxxxxxxxxx`)

**Push con PAT** (sostituisce la password al prompt):

```powershell
git push https://riefolog-cyber:<TOKEN>@github.com/riefolog-cyber/scuolaboard.git main
```

> **Sicurezza - revoca periodica**: dopo l'uso o periodicamente, revoca il PAT da `https://github.com/settings/tokens` (clic `Delete` sul token). I PAT non scadono da soli e sono un vettore di attacco se esfiltati.

> **Persistenza credenziali** (alternativa al PAT inline): usa il Credential Manager di Windows per evitare di inserire il PAT ogni volta:
> ```powershell
> git config --global credential.helper manager
> # Al prossimo push inserisci username + PAT una volta, Git li ricorda
> ```

**Scope raccomandato**: se il repo è pubblico e pushi solo tu, lo scope `public_repo` è sufficiente (più restrittivo di `repo`).

---

## 7. Branch protection (main protetto)

Se il repo ha regole di branch protection su `main`, il push diretto fallisce con:

> `remote: Write access to repository not granted.`

**Fix alternativo**: push su branch feature + PR.

```powershell
& "C:\Program Files\Git\bin\bash.exe" -c "git checkout -b feat-primo-commit && git push -u origin feat-primo-commit"
```

Poi vai su GitHub -> `Compare & pull request` -> mergia.

---

## 8. Errori comuni -> Fix

| Errore | Causa | Fix |
|---|---|---|
| `bash: The term 'bash' is not recognized` | terminale PowerShell, `bash` non in PATH | usa path assoluto `& 'C:\Program Files\Git\bin\bash.exe'` OPPURE cambia terminale VSCode a `Git Bash` (dropdown freccia `˅` in barra terminale) |
| `Author identity unknown` | `user.name` / `user.email` non configurati | comando sezione 3.1 |
| `fatal: Authentication failed for ...` | PAT / credenziali mancanti | sezione 6 (Fallback PAT) |
| `remote: Repository not found` | URL repo sbagliato o repo non creato | `git remote -v` per verificare URL |
| `CONFLICT (add/add)` su OGNI file | primo push diverged | sezione 5 (force-with-lease) |
| `Permission denied (publickey)` | autenticazione SSH non configurata | usa HTTPS + PAT (sezione 6), OPPURE configura SSH key |
| `Updates were rejected` (remote ahead) | 
