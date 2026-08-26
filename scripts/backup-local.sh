#!/usr/bin/env bash
# backup-local.sh — Copia di sicurezza LOCALE del progetto ScuolaBoard.
#
# Copia l'ULTIMA VERSIONE FUNZIONANTE del codice (senza history git,
# senza cartelle rigenerabili). Se GitHub avesse problemi, hai comunque
# il codice completo pronto da ricaricare su un'altra piattaforma.
#
# Uso:
#   bash scripts/backup-local.sh [cartella-destinazione]
#   (default: ../scuolaboard-backup-YYYYMMDD-HHMM)

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$(dirname "$PROJECT_DIR")/scuolaboard-backup-$(date +%Y%m%d-%H%M)}"

echo "▶ Copia dell'ultima versione del codice..."
mkdir -p "$DEST"

# rsync se disponibile, altrimenti tar+cp come fallback.
# Esclude: cartelle rigenerabili (node_modules, docs, test-images,
# test-results), history git (.git), backup vecchi e log.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude 'node_modules' --exclude 'docs' --exclude 'test-images' \
    --exclude 'test-results' --exclude '.git' --exclude 'backup' \
    --exclude '*.log' "$PROJECT_DIR/" "$DEST/"
else
  tar --exclude='node_modules' --exclude='docs' --exclude='test-images' \
    --exclude='test-results' --exclude='.git' --exclude='backup' \
    --exclude='*.log' -cf - -C "$PROJECT_DIR" . | tar -xf - -C "$DEST"
fi

# ── Backup della chiave Admin SDK (solo locale, non su GitHub) ─────────────
if [ -f "$PROJECT_DIR/migrations/service-account.json" ]; then
  mkdir -p "$DEST/migrations"
  cp "$PROJECT_DIR/migrations/service-account.json" "$DEST/migrations/service-account.json"
  echo "  ✓ service-account.json copiato (contiene credenziali: custodiscilo al sicuro!)"
else
  echo "  ⚠ service-account.json NON trovato: ricordati di copiarlo a mano."
fi

echo ""
echo "✅ Backup completato in: $DEST"
echo "   ($(du -sh "$DEST" 2>/dev/null | cut -f1))"
echo ""
echo "⚠️  Il backup NON include i dati Firestore (card, utenti, risposte):"
echo "    per quelli usa la Firebase Console → Firestore → Esporta."
