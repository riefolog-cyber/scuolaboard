// test-setup.js — Set up React globals and mocks for Vitest
import React from 'react';
import '@testing-library/jest-dom';
import { configure } from '@testing-library/dom';

// I test di INTEGRAZIONE montano l'app VERA (lazy CardDetail + moduli) e,
// sotto coverage, lo strumento v8 rallenta il rendering: il default di 1s
// per findBy/waitFor diventava flaky (fallimenti sporadici in CI).
// 12s dà margine sotto coverage senza nascondere veri deadlock (restano
// < testTimeout 15s).
configure({ asyncUtilTimeout: 12000 });

// Expose React globally (matching globals.js)
window.React = React;

// Set up SB namespace (matching firebase-init.js)
window.SB = window.SB || {};

// Mock useSyncExternalStore (React 18+)
window.React.useSyncExternalStore = function (_subscribe: any, getSnapshot: any) {
  return getSnapshot();
};

// Mock Firebase: app-utils chiama firebase.firestore()/auth() all'import.
// firestore() restituisce il mock window.db così le utility importate usano
// lo stesso db finto dei test (coerenza con il pattern pre-migrazione).
window.firebase = {
  firestore: () => window.db,
  auth: () => undefined,
};

// Mock Firebase (components may reference db, fbSave, etc.)
window.db = {
  collection: () => ({
    doc: () => ({
      get: () => Promise.resolve({ exists: false, data: () => ({}) }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
      onSnapshot: () => () => {}, // returns unsubscribe fn
    }),
    where: () => ({
      get: () => Promise.resolve({ forEach: () => {} }),
    }),
    orderBy: () => ({
      onSnapshot: () => () => {},
    }),
    get: () => Promise.resolve({ forEach: () => {} }),
  }),
};

// Mock firestore-sync combined store
window.__firestoreSync = {
  createCombinedStore: function () {
    return {
      subscribe: function (_cb: any) {
        return function () {};
      },
      getSnapshot: function () {
        return { allCards: [], classiCustom: [], classiNascoste: [], preferiti: [] };
      },
      destroy: function () {},
    };
  },
};
// Wave 2/3 UMD→ES: fbSave/fmt/normalizeLinks/… sono importati direttamente dai
// componenti, quindi i loro mock su window non servono più. Restano i mock dei
// nomi ancora letti via window.* (db, ANNI_DISPONIBILI, compressImage,
// quizListenRisposte, ValutazioneApertaAI, callGroqJSON/Text).
window.ANNI_DISPONIBILI = ['2025/2026', '2026/2027'];
window.compressImage = () => Promise.resolve('');
// Secondo ingresso della compressione (miniatura da data URL): senza stub, un
// test che carica una copertina userebbe il canvas di jsdom.
(window as any).compressDataUrl = () => Promise.resolve('');
window.quizListenRisposte = () => () => {};
window.callGroqJSON = () => Promise.resolve(null);
window.callGroqText = () => Promise.resolve('');
window.ValutazioneApertaAI = () => null;

// ── Rejection non gestite: nome del test colpevole ─────────────────────────
// `vitest run` esce con 1 quando resta una promise rifiutata senza gestore, ma
// non dice QUALE test l'ha creata: è già costato tre volte e un commit rosso
// (AGENTS, «Il verde non basta»). L'handler attribuisce la rejection al test in
// corso e l'afterEach la trasforma in un errore con nome e messaggio, così il
// fallimento dice cosa cercare invece di lasciare solo un exit code.
import { creaGuardiaRejection } from './utils/rejection-guardia.ts';
import { afterAll, afterEach, beforeEach } from 'vitest';

const guardiaRejection = creaGuardiaRejection();
// `process` via globalThis: il progetto non carica @types/node (nessuna
// dipendenza da tipi Node nel resto del codice).
const processo = (globalThis as any).process;
if (processo && typeof processo.on === 'function') {
  processo.on('unhandledRejection', function (reason: any) {
    // Solo registrare: lanciare qui farebbe cadere il worker a metà file.
    guardiaRejection.registra(reason);
  });
}

beforeEach(function (ctx: any) {
  guardiaRejection.inizia((ctx && ctx.task && ctx.task.name) || '(test sconosciuto)');
});

afterEach(function () {
  var nome = guardiaRejection.corrente() || '';
  var voci = guardiaRejection.consuma(nome);
  if (!voci.length) return;
  throw new Error(
    'Unhandled rejection durante «' +
      nome +
      '»: ' +
      voci
        .map(function (v) {
          return v.messaggio;
        })
        .join(' | ') +
      '. Chiudi la catena con .catch(): se fbSave ha già mostrato il toast, il catch serve solo a marcare la promise come gestita.'
  );
});

// La coda può arrivare dopo l'afterEach dell'ultimo test: non deve sparire.
afterAll(function () {
  var rimaste = guardiaRejection.orfane();
  if (!rimaste.length) return;
  throw new Error(
    'Unhandled rejection non attribuita: ' +
      rimaste
        .map(function (v) {
          return v.test + ': ' + v.messaggio;
        })
        .join(' | ')
  );
});
