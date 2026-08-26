#!/usr/bin/env node
/**
 * import-firestore.js — RIPRISTINO di un backup Firestore (SCRIVE su Firestore!).
 *
 * Legge una cartella di export creata da export-firestore.js e riscrive i
 * documenti nelle collezioni. ATTENZIONE: è un'operazione che MODIFICA i dati
 * reali — eseguila SOLO per ripristinare un backup (es. dopo un disastro),
 * mai per prova. Se i doc esistono già, vengono sovrascritti.
 *
 * USO:
 *   node migrations/import-firestore.js --dir <cartella-export> [--solo cards]
 *
 *   --dir       cartella con i .json prodotti dall'export (obbligatorio)
 *   --solo      importa solo la collezione indicata (es. cards) — opzionale
 *
 * Richiede: migrations/service-account.json.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SA_PATH = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(SA_PATH)) {
  console.error("\n[ERRORE] 'migrations/service-account.json' non trovato.");
  console.error('Scaricalo da Firebase Console → Project settings → Service accounts.\n');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function arg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}
const dir = arg('--dir');
const solo = arg('--solo');

if (!dir || !fs.existsSync(dir)) {
  console.error('[ERRORE] Specifica una cartella di export valida con --dir');
  process.exit(1);
}

const COLLECTIONS = ['cards', 'users', 'quiz_risposte', 'config', 'preferiti', 'ammonizioni', 'ai_results', '_internal_'];

(async () => {
  console.log('[IMPORT] Ripristino dati su Firestore (SCRITTURA!)');
  console.log('         Project: ' + (serviceAccount.project_id || '(non specificato)'));
  console.log('         Cartella: ' + dir);
  if (solo) console.log('         Solo collezione: ' + solo);
  console.log('');

  // Conferma obbligatoria prima di scrivere
  if (!process.argv.includes('--yes')) {
    console.log('⚠️  Questa operazione SOVRASCRIVE i documenti esistenti.');
    process.stdout.write('Digitare "ripristina" per continuare: ');
    const answer = await new Promise((r) => {
      process.stdin.once('data', (d) => r(String(d).trim().toLowerCase()));
    });
    if (answer !== 'ripristina') {
      console.log('Annullato.');
      process.exit(0);
    }
  }

  let tot = 0;
  for (const coll of COLLECTIONS) {
    if (solo && coll !== solo) continue;
    const file = path.join(dir, coll + '.json');
    if (!fs.existsSync(file)) continue;
    const docs = JSON.parse(fs.readFileSync(file, 'utf8'));
    let n = 0;
    for (const doc of docs) {
      const { id, ...data } = doc;
      if (!id) continue;
      // I campi id non vanno salvati dentro il doc (id è la chiave del doc)
      delete data.id;
      await db.collection(coll).doc(String(id)).set(data, { merge: false });
      n++;
    }
    tot += n;
    console.log('  ✓ ' + coll + ': ' + n + ' documenti importati');
  }
  console.log('\n✅ Import completato: ' + tot + ' documenti.');
  process.exit(0);
})().catch((e) => {
  console.error('\n[ERRORE] Import fallito:', e.message || e);
  process.exit(1);
});
