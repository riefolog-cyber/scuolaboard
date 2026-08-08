#!/usr/bin/env bash
# dead-code.sh — audit di codice morto per ScuolaBoard (sola lettura).
# Uso: bash scripts/dead-code.sh   (o: npm run deadcode)
# Scan euristici: registrazioni globali senza consumer, classi CSS mai usate,
# export mai importati. Non modifica nulla: stampa solo un report.
set -u
cd "$(dirname "$0")/.."

# grep -rlm1: elenca i file con match, fermandosi al PRIMO match per file
# (veloce sui simboli vivi; i morti richiedono comunque lo scan completo).

echo "=== 1) Registrazioni window.* senza consumer (escluso file di definizione) ==="
for sym in $(grep -rhoP 'window\.\K[A-Za-z_][A-Za-z0-9_]*(?=\s*=)' src --include='*.ts' --include='*.tsx' | sort -u); do
  defs=$(grep -rl "window\.$sym *=" src --include='*.ts' --include='*.tsx' | head -1)
  defb=$(basename "$defs")
  uses=$(grep -rlm1 "\b$sym\b" src | grep -v "$defb" | wc -l)
  [ "$uses" -eq 0 ] && echo "  window.$sym (definita in $defb)"
done

echo
echo "=== 2) Registrazioni SB.* senza consumer (escluso file di definizione) ==="
for sym in $(grep -rhoP 'SB\.\K[A-Za-z_][A-Za-z0-9_]*(?=\s*=)' src --include='*.ts' --include='*.tsx' | sort -u); do
  defs=$(grep -rl "SB\.$sym *=" src --include='*.ts' --include='*.tsx' | head -1)
  defb=$(basename "$defs")
  uses=$(grep -rlm1 "\b$sym\b" src | grep -v "$defb" | wc -l)
  [ "$uses" -eq 0 ] && echo "  SB.$sym (definita in $defb)"
done

echo
echo "=== 3) Classi CSS definite ma mai usate in src/index.html ==="
grep -oP '\.[a-zA-Z_][a-zA-Z0-9_-]*' src/styles.css | sed 's/^\.//' \
  | grep -vE '^(png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|css|js|map|ico)$' | sort -u \
  | while read cls; do
      n=$(grep -rlm1 "\b$cls\b" src index.html --include='*.tsx' --include='*.ts' --include='*.html' | wc -l)
      [ "$n" -eq 0 ] && echo "  .$cls"
    done

echo
echo "=== 4) Export mai importati (nome | file) ==="
for f in $(grep -rl '^export ' src --include='*.ts' --include='*.tsx' | grep -vE '\.(test|spec)\.'); do
  grep -oP 'export (async )?(function|const|var|let|class) \K[A-Za-z_][A-Za-z0-9_]*' "$f" | sort -u \
    | while read sym; do
        n=$(grep -rlm1 "\b$sym\b" src e2e --include='*.ts' --include='*.tsx' --include='*.js' | grep -v "$(basename "$f")" | wc -l)
        [ "$n" -eq 0 ] && echo "  $sym | ${f#src/}"
      done
done

echo
echo "Scan completato. (Nessun output = nessun codice morto rilevato)"
