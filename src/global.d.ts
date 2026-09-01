// global.d.ts — Type declarations for ScuolaBoard's UMD/global pattern
// Unico file di dichiarazioni globali (fusione di global.d.ts + globals.d.ts,
// agosto 2026): dichiara i globali impostati dai moduli e l'interfaccia Window
// estesa con le funzioni esposte via window.*. I file script (IIFE/UMD)
// definiscono i propri globali via `function`/`var` e non servono declare qui.
// NB: i tipi Window restano volutamente permissivi (`any` per i duplicati):
// il vecchio global.d.ts usava `any` e i consumer (test inclusi) ci si appoggiano.

// ── CSS modules ────────────────────────────────────────────────────────────
declare module '*.css' {}

// ── Globals set by globals.ts / moduli legacy ─────────────────────────────
// firebase è il singleton esposto su window (test seam: l'harness lo mocka).
declare var firebase: any;
declare var SB: any;

// ── React (global UMD per i file che ancora usano `React.X` nudo) ──────────
// NOTA: i global React/ReactDOM sono stati RIMOSSI da globals.ts (migrazione
// UMD→ES) — window.React NON esiste più. I componenti devono importare i
// membri direttamente da 'react'; un uso di `React` nudo a runtime è un bug
// (ReferenceError, es. SommarioModal.tsx). Questa dichiarazione resta solo
// per compatibilità di tipo nei file non ancora migrati.
declare var React: any;

// ── JSX (jsxFactory: 'h', jsxFragmentFactory: 'Fragment' — tsconfig.json) ──
// Il progetto usa JSX "classico" UMD con factory `h`: senza questa
// dichiarazione i file .tsx nell'allowlist strict darebbero TS7026
// ("JSX element implicitly has type 'any'"). Elementi permissivi: i
// componenti UMD scrivono le style prop come oggetti non tipizzati.
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// ── Globals esposti da app-utils.tsx via window.* ─────────────────────────
// Solo i nomi ancora letti via window.* (AppProvider, useQuiz) o mockati dai
// test (compressImage, quizListenRisposte, ValutazioneApertaAI,
// ANNI_DISPONIBILI, db). S e FORM0 sono ora importati direttamente.

// ── Window extensions — fixes TS2339 Property does not exist on Window ──────
interface Window {
  // Core SB
  SB: any;
  SB_CONFIG: any;
  SB_DEBUG: boolean;
  _SB_LS: any;

  // Runtime / librerie (impostati da globals.ts)
  firebase: any;

  // Firebase instances
  db: any;
  __firestoreSync: any;

  // Functions exposed via window.X = ... (needed for window.X access).
  // Wave 2/3 UMD→ES: i globali migrati (fbSave, fmt, normalizeLinks, …) sono
  // ora importati direttamente; restano quelli ancora usati via window.* o
  // mockati dai test (db, FORM0, compressImage, quizListenRisposte,
  // ValutazioneApertaAI, ANNI_DISPONIBILI, S, h, hook React, ErrorBoundary, App).
  callGroqJSON: (...args: any[]) => any;
  callGroqText: (...args: any[]) => any;
  aiLoad: any;
  aiSave: any;
  aiCacheInvalidate: any;
  aiCacheGet: any;
  aiCacheSetAll: any;
  ANNI_DISPONIBILI: string[];
  compressImage: any;
  quizListenRisposte: any;
  ValutazioneApertaAI: any;
  h: any;
  useState: any;
  useEffect: any;
  useRef: any;
  useCallback: any;
  useMemo: any;
  useReducer: any;
  useLayoutEffect: any;
  Fragment: any;
  ErrorBoundary: any;
  App: any;

  // Audio
  webkitAudioContext?: typeof AudioContext;
}
