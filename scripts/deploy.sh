#!/bin/bash
# ── scripts/deploy.sh ────────────────────────────────────────────────
# Commit + push automatizzato per ScuolaBoard.
# Totalmente idempotente: sicuro rilanciarlo piu volte, anche dopo divergenze.
# Uso:
#   bash scripts/deploy.sh                       # commit con msg di default + push
#   bash scripts/deploy.sh "msg custom"         # commit con msg custom + push
#   bash scripts/deploy.sh "msg" --dry-run      # mostra cosa farebbe, niente side-effect
#
# Override tramite env var:
#   GIT_USER_NAME, GIT_USER_EMAIL,
#   GIT_REMOTE_NAME (default origin),
#   GIT_REMOTE_URL,
#   GIT_BRANCH (default main)

set -euo pipefail

# ── CONFIG ──
GIT_USER_NAME="${GIT_USER_NAME:-Riefolog}"
GIT_USER_EMAIL="${GIT_USER_EMAIL:-riefolog@gmail.com}"
GIT_REMOTE_NAME="${GIT_REMOTE_NAME:-origin}"
GIT_REMOTE_URL="${GIT_REMOTE_URL:-https://github.com/riefolog-cyber/scuolaboard.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
COMMIT_MSG="${1:-ScuolaBoard: sicurezza completa + deploy}"
DRY_RUN="${2:-}"

# ── Colori ──
G="\033[0;32m"; Y="\033[1;33m"; R="\033[0;31m"; N="\033[0m"
say_green(){ echo -e "${G}[OK]${N} $*"; }
say_yellow(){ echo -e "${Y}[INFO]${N} $*"; }
say_red(){ echo -e "${R}[ERR]${N} $*"; }
# Wrapper per DRY-RUN: in dry stampa, altrimenti esegue
run(){ if [ "$DRY_RUN" = "--dry-run" ]; then echo "    DRY: $*"; else eval "$@"; fi; }
step(){ echo -e "\n${Y}────────── $* ──────────${N}"; }

# ── 0. Working directory ──
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"
say_yellow "Working directory: $PROJECT_ROOT"

# ── 1. Identita git (solo se manca, NON sovrascrive) ──
step "Identita git"
if git config --get user.name >/dev/null 2>&1; then
  say_green "user.name: $(git config --get user.name)"
else
  say_yellow "Set user.name = $GIT_USER_NAME"
  run git config user.name "$GIT_USER_NAME"
fi
if git config --get user.email >/dev/null 2>&1; then
  say_green "user.email: $(git config --get user.email)"
else
  say_yellow "Set user.email = $GIT_USER_EMAIL"
  run git config user.email "$GIT_USER_EMAIL"
fi

# ── 2. Init repo (idiomatic idempotente con rev-parse) ──
step "Repo init"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  say_green "Repo gia inizializzato: $(git rev-parse --show-toplevel)"
else
  say_yellow "Inizializzo repo..."
  run git init
fi

# ── 3. Branch (checkout -B = force-create/reset) ──
step "Branch $GIT_BRANCH"
if [ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')" = "$GIT_BRANCH" ]; then
  say_green "Gia su $GIT_BRANCH"
else
  say_yellow "Creo/reset branch $GIT_BRANCH (gestisce anche HEAD detached)"
  run git checkout -B "$GIT_BRANCH"
fi

# ── 4. Remote (idempotente + diagnostica preservata) ──
step "Remote $GIT_REMOTE_NAME"
# Pattern idempotente esplicito: get-url checka presenza, poi add OR set-url.
# A differenza di `set-url || add`, questo preserva errori reali (network, perms)
# che `2>/dev/null || true` maschererebbe.
if git remote get-url "$GIT_REMOTE_NAME" >/dev/null 2>&1; then
  say_green "Remote $GIT_REMOTE_NAME esiste gia, aggiorno URL"
  run git remote set-url "$GIT_REMOTE_NAME" "$GIT_REMOTE_URL"
else
  say_yellow "Aggiungo remote $GIT_REMOTE_NAME -> $GIT_REMOTE_URL"
  run git remote add "$GIT_REMOTE_NAME" "$GIT_REMOTE_URL"
fi
say_green "Remote $GIT_REMOTE_NAME -> $GIT_REMOTE_URL"

# ── 5. Fetch + status ──
step "Status"
run git fetch "$GIT_REMOTE_NAME" "$GIT_BRANCH" 2>/dev/null || say_yellow "Fetch fallita (forse branch remoto non esiste ancora, normale al primo push)"
git status --short | head -40

# ── 6. Stage + commit ──
step "Stage + commit"
if git diff --cached --quiet 2>/dev/null && [ -z "$(git status --porcelain)" ]; then
  say_green "Working tree pulito (nessun file modificato)"
else
  run git add .
  if [ "$DRY_RUN" = "--dry-run" ]; then
    say_yellow "DRY-RUN: NON commito"
  else
    # Neutralizza espansione shell $(...) e backtick nel messaggio
    # (printf '%s' passa la stringa verbatim a git, senza rivalutarla).
    git commit -m "$(printf '%s' "$COMMIT_MSG")"
    say_green "Commit creato"
  fi
fi

# ── 7. Push (con rebase automatico se diverged) ──
step "Push"
if [ "$DRY_RUN" = "--dry-run" ]; then
  say_yellow "DRY-RUN: NON pusho"
else
  # Se il remote ha commits che non abbiamo (es. fatto da un altro device),
  # prova prima rebase locale. Safe perche non modifica il remoto.
  LOCAL=$(git rev-parse --abbrev-ref --symbolic-full-name "$GIT_BRANCH" 2>/dev/null || echo $GIT_BRANCH)
  REMOTE_REF="$GIT_REMOTE_NAME/$GIT_BRANCH"
  if git rev-parse --verify --quiet "$REMOTE_REF" >/dev/null 2>&1; then
    # Esiste un tracking ref: prova rebase solo se effettivamente diverged
    # NOTA: rebase riscrive history LOCALE prima del push. Safe per single-dev branch.
    # Per branch multi-developer, rimuovi questo blocco (richiede merge manuale).
    if ! git merge-base --is-ancestor "$REMOTE_REF" "$GIT_BRANCH" 2>/dev/null \
       && ! git merge-base --is-ancestor "$GIT_BRANCH" "$REMOTE_REF" 2>/dev/null; then
      say_yellow "Branch diverged, provo rebase locale..."
      if git rebase "$REMOTE_REF" 2>/dev/null; then
        say_green "Rebase OK"
      else
        say_yellow "Rebase fallita (probabili conflitti locali). Push con --force-with-lease necessario."
        say_red "Interrompo: risolvi i conflitti manualmente o usa --force-with-lease se sai cosa fai."
        exit 1
      fi
    fi
  fi
  # Push con -u solo al primo (imposta upstream tracking)
  if git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
    git push "$GIT_REMOTE_NAME" "$GIT_BRANCH"
  else
    git push -u "$GIT_REMOTE_NAME" "$GIT_BRANCH"
  fi
fi

step "Fatto!"
if [ "$DRY_RUN" = "--dry-run" ]; then
  say_yellow "Rilancia senza --dry-run per pushare davvero:"
  say_yellow "  bash scripts/deploy.sh"
fi
