// e2e/harness-boot.ts — monta l'app VERA (AppProvider + AppLayout + modali)
// nel browser con Firebase/Auth finti, per la verifica E2E in Chrome delle
// modali (Copia in altro anno, Rifiuta proposta, Timer, Ammonizioni, EditAmm,
// Profilo studente) senza credenziali reali.
//
// Parametri URL:
//   ?user=studente  → login come studente (per la ProfiloModal e la vista studente)
//   (default)       → login come prof (Timer, Ammonizioni, EditAmm, Copia anno, Rifiuta)
//
// ⚠️ I moduli (firestore-sync, app-utils, AppProvider) catturano window.db al
// PRIMO import → il boot deve impostare window.firebase/window.db PRIMA di
// importare i moduli dell'app.
// @ts-nocheck — script E2E, non incluso nel typecheck del progetto (src/**).
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createFakeDb } from '../src/integration/fake-firestore';

window.React = React;
window.ReactDOM = ReactDOM;

// useSyncExternalStore reale (test-setup.ts la shimma per i test unitari,
// ma per il browser serve quella vera con subscription attiva).
window.React.useSyncExternalStore = function (subscribe, getSnapshot, getServerSnapshot) {
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
// Fedele a Firebase reale: onAuthStateChanged viene RI-INNESCATA da
// signInWithPopup e da signOut. Senza questo, dopo "Esci" il re-login non
// funzionava nell'harness (loginGoogle si affida a onAuthStateChanged per
// impostare l'utente) e il flusso logout non era testabile end-to-end.
function makeFakeAuth(getUser) {
  const authFn = () => authInstance;
  authFn.GoogleAuthProvider = class GoogleAuthProvider {
    setCustomParameters() {}
  };
  // L'utente corrente si legge SEMPRE da getUser(): la harness cambia utente
  // (userRef.current), uno snapshot all'avvio resterebbe stale. signedOut
  // simula lo stato post-signOut di Firebase.
  let signedOut = false;
  const listeners = new Set();
  function getCurrent() {
    return signedOut ? null : getUser();
  }
  function emit() {
    listeners.forEach((cb) => cb(getCurrent()));
  }
  const authInstance = {
    onAuthStateChanged(cb) {
      listeners.add(cb);
      setTimeout(() => cb(getCurrent()), 0);
      return () => listeners.delete(cb);
    },
    getRedirectResult: () => Promise.resolve(null),
    signInWithPopup: () => {
      signedOut = false;
      emit();
      return Promise.resolve({ user: getCurrent() });
    },
    signOut: () => {
      signedOut = true;
      emit();
      return Promise.resolve();
    },
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

// ── Seed dinamico in base al parametro URL ────────────────────────────────
const params = new URLSearchParams(location.search);
const asStudent = params.get('user') === 'studente';

// Email allineate al filtro d'accesso di src/auth.ts (dominio scuola + whitelist docente)
const PROF = { uid: 'prof1', email: 'riefolog@gmail.com', displayName: 'Prof Rossi' };
const STUD = { uid: 'stud1', email: 'luca.bianchi@ferrarisfermiclass.it', displayName: 'Luca Bianchi' };

// Accettazione privacy pre-seeded: la modale privacy (ora attiva al primo
// accesso per uid, in localStorage) non deve bloccare la UI nei test E2E.
try {
  localStorage.setItem('privacy_accepted_prof1', '1');
  localStorage.setItem('privacy_accepted_stud1', '1');
} catch (e) {}

// Card condivisa: per il prof include un commento di Luca (per il bottone
// "⚠️ Ammonisci" nella CardDetail); per lo studente è visibile nella sua classe.
const c1 = {
  id: 'c1',
  tipo: 'nota',
  titolo: 'Lezione su X',
  testo: 'Contenuto della lezione',
  data: '2026-09-01',
  autore: 'Prof',
  likes: 0,
  likesBy: [],
  reazioni: {},
  commenti: asStudent
    ? []
    : [
        {
          id: 'cm1',
          autore: 'Luca Bianchi',
          testo: 'Non ho capito il punto 2',
          data: '2026-09-03T09:00:00',
          reazioni: {},
          risposte: [],
        },
      ],
  ordine: 1,
  classi: asStudent ? ['3AO'] : ['TUTTE'],
  visibile: true,
  annoScolastico: '2026/2027',
};

const p1 = {
  id: 'p1',
  tipo: 'nota',
  titolo: 'Proposta di Luca',
  testo: 'Vorrei un approfondimento',
  data: '2026-09-02',
  autore: 'Luca Bianchi',
  likes: 0,
  likesBy: [],
  reazioni: {},
  commenti: [],
  ordine: 2,
  classi: ['TUTTE'],
  visibile: true,
  annoScolastico: '2026/2027',
  proposta: true,
};

// Card quiz per la vista prof (RISULTATI + classifica + "Valuta aperte con AI")
const q1 = {
  id: 'q1',
  tipo: 'quiz',
  titolo: 'Quiz sulle frazioni',
  testo: 'Rispondi alle domande entro il tempo',
  data: '2026-09-04',
  autore: 'Prof',
  likes: 0,
  likesBy: [],
  reazioni: {},
  commenti: [],
  ordine: 3,
  classi: ['3AO'],
  visibile: true,
  annoScolastico: '2026/2027',
  quizDomande: [
    { tipo: 'multipla', testo: 'Quanto fa 2+2?', opzioni: ['3', '4', '5'], corretta: '1' },
    { tipo: 'aperta', testo: 'Spiega perché 2+2=4' },
  ],
  quizTimer: 5,
};

// Risposte quiz: una in attesa di valutazione AI, una già valutata (classifica)
const quizRisposte = {
  'q1_Luca Bianchi': {
    cardId: 'q1',
    studente: 'Luca Bianchi',
    risposte: { 0: 1, 1: 'Perché due più due fa quattro' },
    punteggio: { score: 1, totale: 2, pct: 50 },
    tempoUsato: 0,
    data: '2026-09-04T10:00:00',
    aiValutato: false,
    aiScores: {},
  },
  'q1_Giulia Verdi': {
    cardId: 'q1',
    studente: 'Giulia Verdi',
    risposte: { 0: 1, 1: 'Somma di due uguali' },
    punteggio: { score: 1.8, totale: 2, pct: 90 },
    tempoUsato: 0,
    data: '2026-09-04T10:05:00',
    aiValutato: true,
    aiScores: {
      1: { voto: 0.8, punti_forza: 'Ottima argomentazione', lacune: 'Nessuna', suggerimento: 'Perfetto' },
    },
  },
};

const seed = asStudent
  ? {
      users: {
        stud1: {
          role: 'studente',
          nome: 'Luca',
          cognome: 'Bianchi',
          classe: '3AO',
          displayName: 'Luca Bianchi',
          classiPerAnno: { '2026/2027': '3AO' },
        },
      },
      cards: { c1, p1 },
    }
  : {
      users: { prof1: { role: 'prof', nome: 'Prof', cognome: 'Rossi', classiPerAnno: {} } },
      cards: { c1, p1, q1 },
      quiz_risposte: quizRisposte,
      // Ammonizione pre-esistente sulla card c1: alimenta il pannello
      // "⚠️ Ammoniti in questa card" della CardDetail → bottone ✏️ (EditAmm)
      ammonizioni: {
        'Luca Bianchi': {
          lista: [
            {
              id: 1701,
              cardId: 'c1',
              cmId: 'cm1',
              autore: 'Luca Bianchi',
              motivazione: 'Fuori tema',
              data: '2026-09-03T09:10:00',
            },
          ],
        },
      },
    };

const db = createFakeDb(seed);
const userRef = { current: asStudent ? STUD : PROF };

window.firebase = makeFakeFirebase(db, () => userRef.current);
window.db = db;
window.SB = window.SB || {};

// Espone il fake db alle asserzioni Playwright
window.__db = db;

// ── Boot (stesso ordine di import di main.tsx, senza globals/app-bootstrap) ──
async function boot() {
  const mods = [
    '../src/firebase-init.ts',
    '../src/app-state.ts',
    '../src/app-utils.tsx',
    '../src/ai-services.ts',
    '../src/firestore-services.ts',
    '../src/Modals.tsx',
    '../src/modals.ts',
    '../src/auth.ts',
    '../src/cards.ts',
    '../src/app-handlers.ts',
    '../src/firestore-sync.ts',
    '../src/AppLayout.tsx',
    '../src/app.tsx',
  ];
  for (const m of mods) {
    await import(/* @vite-ignore */ m);
  }
  const { default: App } = await import('../src/app.tsx');
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
}

boot().catch((e) => {
  console.error('[harness] boot fallito', e);
  document.getElementById('root').textContent = 'BOOT FAILED: ' + (e && e.message);
});
