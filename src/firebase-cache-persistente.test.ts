// firebase-cache-persistente.test.ts — La cache IndexedDB di Firestore
//
// La cache persistente (firebase-modular.ts → fs()) è ciò che fa comparire le
// card al primo paint invece di aspettare la rete: senza, a ogni riapertura
// dell'app la bacheca riparte dagli skeleton. Misure del rendering lato client
// (src/integration): il montaggio della griglia costa ~700 ms fissi + ~5,7 ms per
// card e il re-render è costante (~160 ms) a 12 o 200 card — il tempo percepito
// non è il rendering ma l'attesa dei dati. Per questo il cache è l'intervento
// su quel tempo, non uno sforzo sui byte del bundle.
//
// Il percorso di degradazione (IndexedDB non disponibile) è in
// firebase-cache-fallback.test.ts: non può stare qui perché l'SDK Firestore
// rifiuta due inizializzazioni con opzioni diverse sulla stessa app `[DEFAULT]`.

import { describe, it, expect } from 'vitest';
// Lettura del sorgente con l'import `?raw` di Vite, come già si fa in
// src/rules-anni-consistency.test.ts (nessuna API di Node nel test).
import srcModular from './firebase-modular.ts?raw';
import { firebase } from './firebase-modular.ts';

describe('cache Firestore persistente', () => {
  it('il db si crea e resta MEMOIZZATO (un solo Firestore per app)', () => {
    firebase.initializeApp({ projectId: 'scuolaboard-test', apiKey: 'fake-key' });
    const db = firebase.firestore();
    expect(typeof db.collection).toBe('function');
    expect(typeof db.batch).toBe('function');
    // Seconda chiamata → stessa istanza: è ciò che fanno affidamento
    // firestore-sync e app-utils, che capturano il riferimento al primo import.
    expect(firebase.firestore()).toBe(db);
  });
});

// ── Invarianti di sorgente ──────────────────────────────────────────────────
// `tabManager` e `cacheSizeBytes` sono consumati internamente dall'SDK: non sono
// proprietà ispezionabili dell'oggetto restituito da persistentLocalCache(), quindi
// non si possono congelare con un'asserzione a runtime. Si congelano leggendo il
// sorgente, come già avviene per le regole Firestore.
describe('impostazioni della persistenza (sorgente)', () => {
  var src = srcModular;

  it('attiva la persistenza su disco', () => {
    expect(src).toMatch(/localCache:\s*persistentLocalCache\(/);
  });

  it('passa il tabManager: senza, due tab su Firebase si avvisano e vedono dati incoerenti', () => {
    expect(src).toMatch(/tabManager:\s*persistentMultipleTabManager\(\)/);
  });

  it('dichiara il tetto di 40 MB: `allegati` sta base64 dentro il documento card (~900 KB a card)', () => {
    expect(src).toMatch(/cacheSizeBytes:\s*40\s*\*\s*1024\s*\*\s*1024/);
  });

  it('degrada in memoria se IndexedDB non è disponibile (Safari in privata)', () => {
    // La chiamata di fallback: STESSA app, ma senza localCache. Se reintentasse
    // con la persistenza rifarebbe esattamente la chiamata appena fallita.
    expect(src).toMatch(/initializeFirestore\(_app,\s*\{\s*experimentalAutoDetectLongPolling:\s*true\s*\}\s*\)/);
    expect(src).toMatch(/catch\s*\(/);
  });
});