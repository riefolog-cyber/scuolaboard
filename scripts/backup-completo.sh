#!/usr/bin/env bash
# backup-completo.sh — Backup COMPLETO di ScuolaBoard in un comando.
#
# Crea una cartella datata con:
#   codice/          → tutto il codice sorgente + config + service-account.json
#                      (senza node_modules/docs/test-images/.git)
#   dati-firestore/  → TUTTI i dati di Firestore (tutti gli anni, nessun filtro):
#                      cards, users, quiz_risposte, ai_results, config,
#                      preferiti, ammonizioni, _internal_
#
# Uso:
#   bash scripts/backup-completo.sh [cartella-destinazione]
#   (default: ../scuolaboard-backup-completo-YYYYMMDD-HHMM, fuori dal progetto)
#
# Richiede: migrations/service-account.json (la chiave Firebase, git-ignored).

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$(dirname "$PROJECT_DIR")/scuolaboard-backup-completo-$(date +%Y%m%d-%H%M)}"

echo "════════════════════════════════════════════════════"
echo "  BACKUP COMPLETO ScuolaBoard"
echo "════════════════════════════════════════════════════"
echo "▶ Destinazione: $DEST"
echo ""

# ── 1. DATI Firestore (tutti, nessun filtro anno) ─────────────────────────
echo "▶ 1/2 Export dati Firestore (tutte le collezioni, tutti gli anni)..."
node "$PROJECT_DIR/migrations/export-firestore.js" --out "$DEST/dati-firestore"
echo ""

# ── 2. CODICE (ultima versione, senza rigenerabili) ────────────────────────
echo "▶ 2/2 Copia del codice..."
mkdir -p "$DEST/codice"

if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude 'node_modules' --exclude 'docs' --exclude 'test-images' \
    --exclude 'test-results' --exclude '.git' --exclude 'backup' \
    --exclude '*.log' "$PROJECT_DIR/" "$DEST/codice/"
else
  tar --exclude='node_modules' --exclude='docs' --exclude='test-images' \
    --exclude='test-results' --exclude='.git' --exclude='backup' \
    --exclude='*.log' -cf - -C "$PROJECT_DIR" . | tar -xf - -C "$DEST/codice"
fi

# service-account.json è già incluso in codice/migrations/ (copia sicura:
# se per qualche motivo manca, lo segnaliamo)
if [ ! -f "$DEST/codice/migrations/service-account.json" ]; then
  if [ -f "$PROJECT_DIR/migrations/service-account.json" ]; then
    cp "$PROJECT_DIR/migrations/service-account.json" "$DEST/codice/migrations/service-account.json"
    echo "  ✓ service-account.json copiato"
  else
    echo "  ⚠ service-account.json NON trovato nel progetto: copialo a mano!"
  fi
fi
echo ""

# ── Riepilogo ──────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════"
echo "✅ Backup completato in: $DEST"
TOT=0
for d in "$DEST"/{codice,dati-firestore}; do
  if [ -d "$d" ]; then
    SZ=$(du -sh "$d" 2>/dev/null | cut -f1)
    echo "   $SZ  $(basename "$d")/"
    TOT=1
  fi
done
echo ""
echo "Per RIPRISTINARE i dati:"
echo "   node migrations/import-firestore.js --dir \"$DEST/dati-firestore\""
echo ""
echo "⚠️  Il backup contiene dati personali di studenti: custodiscilo al sicuro."
