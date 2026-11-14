// ScuolaBoard - Vite Entry Point
/// <reference types="vite/client" />
import './globals.ts'; // window.firebase (test seam, letto dai moduli legacy all'import)
import { avviaDiagnostica, segna } from './diagnostica.ts';
avviaDiagnostica(); // ascoltatori globali (errori + promise non gestite), in memoria
// Font Inter self-hosted (niente Google Fonts: zero richieste terze parti e
// offline-friendly). @fontsource-variable include font-display:swap, come prima.
// ── Un solo file VARIABILE per subset (peso 100–900) invece di 5 pesi statici.
// Prima si importavano 10 CSS (400/600/700/800/900 × latin/latin-ext): 20 file
// woff2+woff in docs/ e ~295 KB di woff2 scaricati. La versione variabile
// dichiara 7 subset (latin, latin-ext, cyrillic, cyrillic-ext, greek, greek-ext,
// vietnamese) ma il browser ne scarica solo 2 (~133 KB) grazie a unicode-range;
// in docs/ finiscono 7 woff2 (~213 KB) invece di 20 file tra woff e woff2.
// Il peso 500 torna disponibile senza costo: è l'asse variabile continuo.
// · PERCHÉ si tiene latin-ext: i nomi degli studenti e i testi delle card
//   arrivano da Firestore e possono contenere caratteri fuori dal latino base
//   (ł, š, ř, ă…). Toglierlo mostrerebbe quadratini.
import '@fontsource-variable/inter/wght.css';
import './styles.css'; // Global styles

// Setup dell'ambiente legacy in ordine di dipendenza: alcuni moduli leggono i
// global su window AL MOMENTO DELL'IMPORT, quindi l'ordine qui sotto conta.
// - globals → window.firebase
// - firebase-init → window.SB, window.db
// - app-state → window.SB_CONFIG, SB.LS
// - app-utils → legge SB_CONFIG/SB all'import
// - firestore-services → SB.services (letto da app-handlers a runtime)
// - firestore-sync → window.__firestoreSync (letto da useCards a runtime)
// I moduli React (auth, cards, ai-services, modals, app-handlers, AppLayout,
// Modals) sono importati direttamente da AppProvider/AppLayout: qui non servono.
import './firebase-init.ts';
import './app-state.ts';
import './app-utils.tsx';
import './firestore-services.ts';
import './firestore-sync.ts';

// ── Render dell'app (AppProvider + AppLayout via import diretti ES) ────────
import './app-bootstrap.ts';

// ── PWA: registrazione del service worker (solo in produzione) ──
// In sviluppo il service worker è disattivato per evitare cache stale durante
// l'HMR. I dati dell'app passano comunque dalla rete (Firestore/AI), il SW
// gestisce solo offline e asset statici.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {
      /* offline non disponibile: non bloccare l'app */
    });
  });
}

// Tappa "avvio": il grafo di moduli è stato valutato. Serve a misurare il costo
// dell'import iniziale (font, firebase-init, app-state, ecc.) sul campo.
segna('avvio');
