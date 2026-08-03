#!/usr/bin/env node
/**
 * migrate-card-annoscolastico.js
 *
 * Backfill del campo `annoScolastico` sulle card legacy che ne sono prive.
 *
 * PERCHÉ: la Fase 4 del refactoring filtra le card LATO SERVER per anno
 * scolastico (`where('annoScolastico', '==', anno)` in firestore-sync.ts).
 * Firestore NON restituisce i doc senza il campo in una query di uguaglianza:
 * senza questo backfill le card vecchie sparirebbero dalla bacheca.
 *
 * USO (come la migration displayName):
 *   node migrations/migrate-card-annoscolastico.js [--dry-run] [--anno 2026/2027]
 *
 *   --dry-run: logga le operazioni senza scrivere (RACCOMANDATO prima)
 *   --anno:    anno da scrivere sulle card senza campo (default: calcolato
 *              dalla data odierna, stessa logica del client: se mese >= 9
 *              → annoCorrente/annoCorrente+1, altrimenti annoCorrente-1/annoCorrente)
 *
 * Idempotente: le card che hanno già il campo vengono saltate.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SA_PATH = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(SA_PATH)) {
  console.error("\n[ERRORE] 'migrations/service-account.json' non trovato.");
  console.error("Scaricalo da Firebase Console → Project settings → Service accounts.");
  console.error("Salvalo come migrations/service-account.json e NON committarlo.\n");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const DRY_RUN = process.argv.includes('--dry-run');

function currentDefaultYear() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 9 ? y + '/' + (y + 1) : y - 1 + '/' + y;
}

function annoFromArgs() {
  const idx = process.argv.indexOf('--anno');
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}

(async () => {
  try {
    const anno = annoFromArgs() || currentDefaultYear();
    if (DRY_RUN) console.log("[DRY-RUN] Nessuna scrittura verrà eseguita.\n");
    console.log('[MAIN] Backfill annoScolastico su card legacy.');
    console.log('        Anno da applicare: ' + anno);
    console.log('        Project: ' + (serviceAccount.project_id || '(non specificato)'));
    console.log('');

    const snap = await db.collection('cards').get();
    let updated = 0, skipped = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.annoScolastico) {
        skipped++;
        continue;
      }
      console.log(`  ${doc.id} (${(data.titolo || '').slice(0, 40) || '(senza titolo)'}) → ${anno}`);
      if (!DRY_RUN) {
        await doc.ref.set({ annoScolastico: anno }, { merge: true });
      }
      updated++;
    }

    console.log(`\n[MAIN] Card aggiornate: ${updated}, saltate (già con anno): ${skipped}`);
    if (DRY_RUN && updated > 0) {
      console.log('\n⚠️ DRY-RUN: nessuna scrittura eseguita. Rilanciare senza --dry-run per applicare.');
    }
    process.exit(0);
  } catch (e) {
    console.error('\n[ERRORE] Migrazione fallita:', e.message || e);
    process.exit(1);
  }
})();
