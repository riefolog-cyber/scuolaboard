// ScuolaBoard - Vite Entry Point
/// <reference types="vite/client" />
import './globals.ts'; // window.firebase (test seam, letto dai moduli legacy all'import)
// Font Inter self-hosted (niente Google Fonts: zero richieste terze parti e
// offline-friendly). @fontsource include font-display:swap, come prima.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
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
