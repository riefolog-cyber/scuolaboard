// app-bootstrap.ts — Avvio dell'app ScuolaBoard
// 1) Applica il tema chiaro/scuro prima del primo paint (evita il "flash" di
//    tema sbagliato all'apertura della pagina). La logica è in utils/theme.ts.
// 2) Monta React (ErrorBoundary + App) gestendo gli errori in modo sicuro.
//
// Rimosso in questo refactor (era codice diagnostico legacy):
// - cache-busting con data scritta a mano ("2026-05-26-FIX-v2"): in pratica
//   non scattava mai, perché la variabile veniva scritta solo in fondo allo
//   stesso script (in una finestra nuova era sempre indefinita al check).
//   Lo stale-cache in produzione è gestito dal service worker (public/sw.js:
//   bump di CACHE, skipWaiting, clients.claim, navigazioni network-first).
// - rilevatore di "infinite render loop" (svuotava la pagina dopo 5 tentativi):
//   in produzione il modulo viene valutato una sola volta per caricamento.
// - diagnostica delle dipendenze + log di boot (in produzione tutto è bundle).
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { getInitialTheme, applyTheme, type Theme } from './utils/theme.ts';
import App from './app.tsx';
import { ErrorBoundary } from './app-utils.tsx';

// ── Tema chiaro/scuro: applica data-theme prima del render ─────────────────
// Legge la preferenza salvata in localStorage ('sb_theme') o, in mancanza,
// quella di sistema. Ogni accesso è protetto: un errore non deve bloccare
// l'avvio (privacy mode, browser vecchi, DOM non ancora pronto).
(function (): void {
  try {
    const theme: Theme = getInitialTheme();
    applyTheme(theme);
    // Se il body non esiste ancora (script nel <head>), applica data-theme
    // anche al body appena il DOM è pronto.
    try {
      if (!document.body)
        document.addEventListener('DOMContentLoaded', function (): void {
          try {
            applyTheme(theme);
          } catch (e: any) {}
        });
    } catch (e: any) {}
  } catch (e: any) {}
})();

// ── Render dell'app con ErrorBoundary ──────────────────────────────────────
// Gli errori React vengono intercettati da ErrorBoundary (definito in
// AppLayout); il catch qui sotto copre l'eventuale fallimento del primo
// render e mostra l'errore via textContent — mai innerHTML, per evitare XSS.
(function (): void {
  try {
    createRoot(document.getElementById('root')!).render(
      createElement(ErrorBoundary as any, null, createElement(App, null))
    );
  } catch (e: any) {
    console.error('[ScuolaBoard] Render error:', e && e.message, e && e.stack);
    const root = document.getElementById('root');
    if (root) root.textContent = '❌ Errore di avvio: ' + String((e && e.message) || e);
  }
})();
