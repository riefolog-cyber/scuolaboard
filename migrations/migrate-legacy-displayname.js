#!/usr/bin/env node
/**
 * migrate-legacy-displayname.js
 *
 * Migra i doc scritti PRIMA del refactor Firestore Rules:
 *   - ammonizioni                → usa come docId il displayName canonico
 *   - quiz_risposte / {cardId}_…  → usa come docId il displayName canonico
 *
 * Esegue via Admin SDK per by-passare le rules di sicurezza.
 * Idempotente: se il doc nuovo esiste già, sovrascrive (admin) e rimuove il vecchio.
 *
 * USO:
 *   1. Vai su Firebase Console → Project settings → Service accounts
 *   2. "Generate new private key" per scaricare il JSON service account
 *   3. Salvalo in `migrations/service-account.json` (NON committarlo!)
 *   4. npm install firebase-admin
 *   5. node migrations/migrate-legacy-displayname.js [--dry-run]
 *
 *   --dry-run: logga le operazioni senza scrivere
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Carica service account
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

if (DRY_RUN) console.log("[DRY-RUN] Nessuna scrittura verrà eseguita.\n");

// Stessa funzione di safeDocId lato client. Mantenerli allineati.
function safeDocId(s) {
  s = String(s == null ? "" : s).trim();
  if (!s) return "_anon_";
  s = s.replace(/[\/\\.\#\$\[\]\*]/g, "_");
  s = s.replace(/_+/g, "_");
  return s.slice(0, 256) || "_anon_";
}

// Schema consono alle rules (hasOnly per item).
// Include 'autore' perché le rules lo richiedono nella lista (EXACT-match hasOnly).
// 'autore' qui = nome studente a cui è riferita l'ammonizione (== docId canonicalizzato).
const AMMONIZIONE_ITEM_KEYS = ['id', 'cardId', 'cmId', 'motivazione', 'data', 'autore', 'letta'];

function cleanAmmItem(item, docIdFallback) {
  const clean = {};
  for (const k of AMMONIZIONE_ITEM_KEYS) {
    if (item[k] !== undefined) clean[k] = item[k];
  }
  // Backfill 'autore' se mancante (legacy items scritti prima del current rules
  // system spesso NON avevano questo campo). Usa il docId come fallback perché
  // l'ammonizione è SEMPRE associata allo studente del doc path.
  if (clean.autore === undefined && docIdFallback) clean.autore = docIdFallback;
  return clean;
}

function cleanAmmData(data, docId) {
  return Object.assign({}, data, {
    lista: (data.lista || []).map(function(i){ return cleanAmmItem(i, docId); })
  });
}

// Fase 1: costruisci mappa legacyName → safeDocId(displayName)
async function buildNameMap() {
  console.log("[FASE 1] Lettura users, costruzione mappa nomi e check collisioni...");
  const usersSnap = await db.collection("users").get();

  const collisions = new Map();
  const allUsers = [];
  usersSnap.forEach((doc) => {
    const u = doc.data();
    const legacyName = ((u.nome || "") + " " + (u.cognome || "")).trim();
    const displayName = safeDocId(u.displayName || legacyName || u.email || "Studente");
    allUsers.push({ uid: doc.id, u, legacyName, displayName });
    for (const key of [legacyName, displayName]) {
      if (!key || key === "_anon_") continue;
      if (!collisions.has(key)) collisions.set(key, []);
      collisions.get(key).push(doc.id);
    }
  });

  const realCollisions = [...collisions.entries()].filter(([k, uids]) => uids.length > 1);
  if (realCollisions.length) {
    console.error("");
    console.error("================================================================");
    console.error("[ERRORE] COLLISIONI RILEVATE sui displayName / legacy name!");
    console.error("================================================================");
    for (const [key, uids] of realCollisions) {
      console.error(`  Chiave "${key}" → ${uids.length} studenti (uids: ${uids.join(", ")})`);
      for (const uid of uids) {
        const u = allUsers.find(x => x.uid === uid);
        if (u) console.error(`     ${uid}: "${u.legacyName}" → "${u.displayName}"`);
      }
    }
    console.error("");
    console.error("Migrazione interrotta per evitare perdita di dati.");
    console.error("SOLUZIONI POSSIBILI:");
    console.error("  1. Modifica manualmente displayName (o nome/cognome) in users/{uid} per renderli unici.");
    console.error("  2. Esegui la migrazione per il sottoinsieme senza collisioni, poi gestisci i casi singolarmente.");
    console.error("  3. Cambia schema docId in ammonizioni per usare uid invece di nome.");
    process.exit(2);
  }

  const map = new Map();
  for (const { uid, u, legacyName, displayName } of allUsers) {
    if (legacyName && legacyName !== displayName) {
      map.set(legacyName, displayName);
    }
  }
  console.log(`[FASE 1] Trovati ${map.size} studenti con nome legacy da migrare.\n`);
  return map;
}

// Fase 2: migra ammonizioni + cleaning per-item + backfill autore
async function migrateAmmonizioni(map) {
  console.log("[FASE 2] Migrazione ammonizioni (con cleaning + backfill autore)...");
  const snap = await db.collection("ammonizioni").get();
  let renamed = 0, cleaned = 0, skipped = 0;
  for (const doc of snap.docs) {
    const oldId = doc.id;
    const rawData = doc.data();
    const targetId = map.has(oldId) ? map.get(oldId) : oldId;
    const cleanedData = cleanAmmData(rawData, targetId);
    const hasLegacyId = map.has(oldId);
    const noChangeNeeded = !hasLegacyId && JSON.stringify(rawData) === JSON.stringify(cleanedData);
    if (noChangeNeeded) { skipped++; continue; }
    if (hasLegacyId) {
      console.log(`  ${oldId} → ${targetId} (rinomina + cleaning + autore backfill)`);
      if (!DRY_RUN) {
        const newRef = db.collection("ammonizioni").doc(targetId);
        await newRef.set(cleanedData, { merge: false });
        await doc.ref.delete();
      }
      renamed++;
    } else {
      console.log(`  ${oldId} → ${oldId} (in-place cleaning + autore backfill)`);
      if (!DRY_RUN) {
        await doc.ref.set(cleanedData, { merge: false });
      }
      cleaned++;
    }
  }
  console.log(`[FASE 2] Rinominati: ${renamed}, cleaning in-place: ${cleaned}, saltati: ${skipped}\n`);
}

// Fase 3: migra quiz_risposte
async function migrateQuizRisposte(map) {
  console.log("[FASE 3] Migrazione quiz_risposte...");
  const snap = await db.collection("quiz_risposte").get();
  let migrated = 0, skipped = 0;
  for (const doc of snap.docs) {
    const oldId = doc.id;
    const idx = oldId.lastIndexOf("_");
    if (idx < 0) { skipped++; continue; }
    const cardId = oldId.slice(0, idx);
    const legacyName = oldId.slice(idx + 1);
    if (!map.has(legacyName)) { skipped++; continue; }
    const newName = map.get(legacyName);
    const newId = cardId + "_" + newName;
    const data = doc.data();
    const updated = Object.assign({}, data, { studente: newName });
    console.log(`  ${oldId} → ${newId}`);
    if (!DRY_RUN) {
      const newRef = db.collection("quiz_risposte").doc(newId);
      await newRef.set(updated, { merge: false });
      await doc.ref.delete();
    }
    migrated++;
  }
  console.log(`[FASE 3] Migrati ${migrated}, saltati ${skipped}\n`);
}

// Main
(async () => {
  try {
    console.log("[MAIN] Avvio migrazione ScuolaBoard legacy → displayName.");
    console.log("        Project: " + (serviceAccount.project_id || "(non specificato)"));
    console.log("        Dry run: " + DRY_RUN);
    console.log("");

    const map = await buildNameMap();
    if (map.size === 0) {
      console.log("[INFO] Nessuno studente da migrare. Probabilmente è già stato fatto.");
      process.exit(0);
    }
    await migrateAmmonizioni(map);
    await migrateQuizRisposte(map);

    
