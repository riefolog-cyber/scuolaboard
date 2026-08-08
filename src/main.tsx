// ScuolaBoard - Vite Entry Point
/// <reference types="vite/client" />
import './globals.ts'; // window.React, window.ReactDOM, window.firebase
import './styles.css'; // Global styles

// Legacy files in dependency order (matching build.js)
import './firebase-init.ts'; // window.SB, window.db
import './app-state.ts'; // window.SB_CONFIG, window._SB_LS, SB.safeDocId, SB.myName, etc.
import './app-utils.ts'; // Utilities, CLASSI_DEFAULT, fbSave, etc.
import './ai-services.ts'; // AI module (callGroqJSON, callGroqText, etc.)
import './firestore-services.ts'; // SB.services
import './Modals.tsx'; // Modal components (JSX)
import './modals.ts'; // useModals hook
import './auth.ts'; // useAuth hook
import './cards.ts'; // useCards hook
import './app-handlers.ts'; // SB.createAppHandlers — DEVE essere prima di AppLayout!
import './firestore-sync.ts'; // useSyncExternalStore adapter per Firestore
import './AppLayout.tsx'; // SB.AppLayout (JSX) + all sub-components
import './app.ts'; // window.App
import './app-bootstrap.ts'; // ReactDOM.createRoot render

// ── PWA: registrazione del service worker (solo in produzione) ──
// In sviluppo il service worker è disattivato per evitare cache stale durante
// l'HMR. I dati dell'app passano comunque dalla rete (Firestore/AI), il SW
// gestisce solo offline e asset statici.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('./sw.js')
      .catch(function () {
        /* offline non disponibile: non bloccare l'app */
      });
  });
}
