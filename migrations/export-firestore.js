#!/usr/bin/env node
/**
 * export-firestore.js — Backup dei DATI Firestore (sola lettura, nessuna scrittura).
 *
 * Scarica TUTTE le collezioni (cards, users, quiz_risposte, config, preferiti,
 * ammonizioni, ai_results, _internal_) in una cartella locale datata, come JSON.
 * È la copia di sicurezza del lavoro dell'anno in corso (le card, le risposte
 * dei quiz, ecc.) — l'unica cosa che NON sta su GitHub.
 *
 * USO:
 *   node migrations/export-firestore.js [--anno 2026/2027] [--out cartella]
 *
 *   --anno  filtra solo le card dell'anno indicato (default: nessun filtro,
 *           esporta tutto)
 *   --out   cartella di destinazione (default: ../scuolaboard-firestore-export-YYYYMMDD-HHMM)
 *
 * Richiede: migrations/service-account.json (git-ignored, NON committare).
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SA_PATH = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(SA_PATH)) {
  console.error("\n[ERRORE] 'migrations/service-account.json' non trovato.");
  console.error('Scaricalo da Firebase Console → Project settings → Service accounts.');
  console.error("Salvalo come migrations/service-account.json e NON committarlo.\n");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Argomenti ──────────────────────────────────────────────────────────────
function arg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}
const annoFilter = arg('--anno');
const outDir =
  arg('--out') ||
  path.join(__dirname, '..', 'scuolaboard-firestore-export-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ''));

// Collezioni da esportare (tutte quelle usate dall'app)
const COLLECTIONS = ['cards', 'users', 'quiz_risposte', 'config', 'preferiti', 'ammonizioni', 'ai_results', '_internal_'];

(async () => {
  console.log('[EXPORT] Backup dati Firestore (sola lettura)');
  console.log('         Project: ' + (serviceAccount.project_id || '(non specificato)'));
  if (annoFilter) console.log('         Filtro card anno: ' + annoFilter);
  console.log('');

  fs.mkdirSync(outDir, { recursive: true });
  const riepilogo = {};

  for (const coll of COLLECTIONS) {
    try {
      const snap = await db.collection(coll).get();
      const docs = [];
      snap.forEach((d) => {
        let data = Object.assign({ id: d.id }, d.data());
        // Filtro opzionale per anno scolastico (solo cards)
        if (coll === 'cards' && annoFilter && data.annoScolastico !== annoFilter) return;
        docs.push(data);
      });
      const file = path.join(outDir, coll + '.json');
      fs.writeFileSync(file, JSON.stringify(docs, null, 2));
      riepilogo[coll] = docs.length;
      console.log('  ✓ ' + coll + ': ' + docs.length + ' documenti');
    } catch (e) {
      // Collezione vuota o permessi → registra ma non blocca
      riepilogo[coll] = 'ERRORE: ' + (e.message || e);
      console.log('  ⚠ ' + coll + ': ' + (e.message || e));
    }
  }

  // Riepilogo + info utili al ripristino
  fs.writeFileSync(
    path.join(outDir, 'README.txt'),
    [
      'Backup Firestore ScuolaBoard',
      'Data: ' + new Date().toISOString(),
      'Project: ' + serviceAccount.project_id,
      'Anno (filtro card): ' + (annoFilter || 'tutto'),
      '',
      'Documenti per collezione:',
      ...Object.entries(riepilogo).map(([k, v]) => '  ' + k + ': ' + v),
      '',
      'Questo backup contiene SOLO i dati (JSON). Per ripristinare:',
      '  node migrations/import-firestore.js --dir ' + outDir,
      '',
      'I file sono leggibili anche a mano (ogni riga = documento).',
      '⚠️ Contiene dati personali di studenti: custodiscilo al sicuro.',
    ].join('\n')
  );

  // Dimensione totale reale (somma dei file, non della cartella)
  const totBytes = fs.readdirSync(outDir).reduce(function (acc, f) {
    try {
      return acc + fs.statSync(path.join(outDir, f)).size;
    } catch (e) {
      return acc;
    }
  }, 0);
  console.log('');
  console.log('✅ Backup completato in: ' + outDir);
  console.log('   (' + (totBytes / 1024 / 1024).toFixed(1) + ' MB)');
  process.exit(0);
})().catch((e) => {
  console.error('\n[ERRORE] Export fallito:', e.message || e);
  process.exit(1);
});
