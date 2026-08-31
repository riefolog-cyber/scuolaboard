// test-setup.js — Set up React globals and mocks for Vitest
import React from 'react';
import '@testing-library/jest-dom';

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
window.quizListenRisposte = () => () => {};
window.callGroqJSON = () => Promise.resolve(null);
window.callGroqText = () => Promise.resolve('');
window.ValutazioneApertaAI = () => null;
