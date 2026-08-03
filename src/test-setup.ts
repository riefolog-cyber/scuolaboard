// test-setup.js — Set up React globals and mocks for Vitest
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@testing-library/jest-dom';

// Expose React globally (matching globals.js)
window.React = React;
window.ReactDOM = ReactDOM;

// Set up SB namespace (matching firebase-init.js)
window.SB = window.SB || {};
window.SB.h = React.createElement;
window.SB.Fragment = React.Fragment;

// Mock useSyncExternalStore (React 18+)
window.React.useSyncExternalStore = function (subscribe, getSnapshot) {
  return getSnapshot();
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
      subscribe: function (_cb) {
        return function () {};
      },
      getSnapshot: function () {
        return { allCards: [], classiCustom: [], classiNascoste: [], preferiti: [] };
      },
      destroy: function () {},
    };
  },
};
window.fbSave = () => Promise.resolve();
window.fbDel = () => Promise.resolve();
window.fbClassiSave = () => Promise.resolve();
window.fbNascosteSave = () => Promise.resolve();
window.fbFavSave = () => Promise.resolve();

// Mock globale per funzioni di utilità
window.CLASSI_DEFAULT = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B'];
window.classeColor = () => '#6366f1';
window.fmt = (d) => d || '';
window.fmtDT = (d) => d || '';
window.timeAgo = () => '1g fa';
window.badgeBg = () => '#6366f1';
window.tipoIcon = () => '📌';
window.normalizeLinks = () => [];
window.renderLinks = () => '';
window.buildWordCloud = () => [];
window.collectCloudStats = () => ({ cardCount: 0, commentCount: 0, studentCount: 0 });
window.ANNI_DISPONIBILI = ['2025/2026', '2026/2027'];
window.compressImage = () => Promise.resolve('');
window.quizListenRisposte = () => () => {};
window.callGroqJSON = () => Promise.resolve(null);
window.callGroqText = () => Promise.resolve('');
window.ValutazioneApertaAI = () => null;

// Mock FORM0 globale
window.FORM0 = {
  tipo: 'nota',
  titolo: '',
  testo: '',
  classi: ['TUTTE'],
  opzioni: ['', ''],
  links: [{ url: '', label: '' }],
  immagini: [],
  allegati: [],
  quizDomande: [],
  quizTimer: 10,
  copertina: null,
};
