// @ts-nocheck — harness di integrazione: monta l'app VERA con Firebase finto
//
// ⚠️ IMPORTANTE: i moduli (firestore-sync, app-utils, AppProvider) catturano
// `window.db` al PRIMO import. Quindi l'harness deve fare boot UNA SOLA volta
// per file di test e riusare lo stesso db (resettandolo) tra i test.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createFakeDb } from './fake-firestore';

// Espone React global (come globals.ts, ma senza caricare il firebase reale)
window.React = React;
window.ReactDOM = ReactDOM;

// test-setup.ts sostituisce useSyncExternalStore con una versione NON
// sottoscrivente (per i test unitari isolati). Per l'integrazione serve una
// implementazione REALE che ascolti lo store: shim compatibile React 18.
window.React.useSyncExternalStore = function (subscribe, getSnapshot, _getServerSnapshot) {
  var valueRef = React.useRef(getSnapshot());
  var state = React.useState(valueRef.current);
  var setState = state[1];
  React.useEffect(
    function () {
      var checkSnapshot = function () {
        var next = getSnapshot();
        if (next !== valueRef.current) {
          valueRef.current = next;
          setState(next);
        }
      };
      checkSnapshot();
      var unsubscribe = subscribe(checkSnapshot);
      return unsubscribe;
    },
    [subscribe, getSnapshot]
  );
  return valueRef.current;
};

// ── Fake Auth ─────────────────────────────────────────────────────────────
function makeFakeAuth(getUser) {
  const authFn = () => authInstance;
  authFn.GoogleAuthProvider = class GoogleAuthProvider {
    setCustomParameters() {}
  };
  const authInstance = {
    onAuthStateChanged(cb) {
      setTimeout(() => cb(getUser()), 0);
      return () => {};
    },
    getRedirectResult: () => Promise.resolve(null),
    signInWithPopup: () => Promise.resolve({ user: getUser() }),
    signOut: () => Promise.resolve(),
    currentUser: { getIdToken: () => Promise.resolve('fake-token') },
  };
  return authFn;
}

// ── Fake Firebase ─────────────────────────────────────────────────────────
function makeFakeFirebase(db, getUser) {
  const firestoreFn = () => db;
  firestoreFn.FieldValue = { arrayUnion: (v) => ({ __arrayUnion: v }) };
  return {
    initializeApp: () => {},
    app: () => ({ options: { storageBucket: null } }),
    storage: () => null,
    auth: makeFakeAuth(getUser),
    firestore: firestoreFn,
  };
}

// ── Boot (idempotente) ────────────────────────────────────────────────────
let _booted = null; // { db, setUser }

function seedUserDoc(db, seed, user) {
  if (!user || !user.uid) return;
  if (seed.users && seed.users[user.uid]) return; // già fornito dal seed
  const np = (user.displayName || 'Utente').split(' ');
  db._seed('users', {
    [user.uid]: {
      role: 'studente',
      nome: np[0] || 'Utente',
      cognome: np.slice(1).join(' ') || '',
      displayName: user.displayName || null,
      classiPerAnno: {},
    },
  });
}

export async function bootApp({ seed = {}, user = null } = {}) {
  if (_booted) {
    _booted.db._reset(seed);
    seedUserDoc(_booted.db, seed, user);
    _booted.setUser(user);
    return _booted;
  }

  const db = createFakeDb(seed);
  const userRef = { current: user };
  seedUserDoc(db, seed, user);

  window.firebase = makeFakeFirebase(db, () => userRef.current);
  window.db = db;
  window.SB = window.SB || {};
  window.SB.h = React.createElement;
  window.SB.Fragment = React.Fragment;

  // Ordine di import = main.tsx (senza globals/styles/app-bootstrap)
  await import('../firebase-init.ts');
  await import('../app-state.ts');
  await import('../app-utils.ts');
  await import('../ai-services.ts');
  await import('../firestore-services.ts');
  await import('../AppComponents.tsx');
  await import('../Modals.tsx');
  await import('../modals.ts');
  await import('../auth.ts');
  await import('../cards.ts');
  await import('../app-handlers.ts');
  await import('../firestore-sync.ts');
  await import('../AppLayout.tsx');
  await import('../app.ts');

  _booted = { db, setUser: (u) => (userRef.current = u) };
  return _booted;
}

// ── Render dell'app vera ──────────────────────────────────────────────────
export async function renderApp({ seed = {}, user = null } = {}) {
  await bootApp({ seed, user });
  const App = window.App;
  if (!App) throw new Error('window.App non definito: boot fallito');
  const { render } = await import('@testing-library/react');
  const result = render(React.createElement(App));
  return {
    ...result,
    db: window.db,
    get cards() {
      return window.db._all('cards');
    },
  };
}

// Attende che l'app sia renderizzata (auth risolto + card caricate).
export async function waitForApp(screen, text, timeout = 3000) {
  return screen.findByText(text, {}, { timeout });
}
