// global.d.ts — Type declarations for ScuolaBoard's UMD/global pattern
// Unico file di dichiarazioni globali (fusione di global.d.ts + globals.d.ts,
// agosto 2026): dichiara i globali impostati dai moduli e l'interfaccia Window
// estesa con le funzioni esposte via window.*. I file script (IIFE/UMD)
// definiscono i propri globali via `function`/`var` e non servono declare qui.
// NB: i tipi Window restano volutamente permissivi (`any` per i duplicati):
// il vecchio global.d.ts usava `any` e i consumer (test inclusi) ci si appoggiano.

// ── CSS modules ────────────────────────────────────────────────────────────
declare module '*.css' {}

// ── Globals set by globals.ts (a module with import/export) ────────────────
declare var firebase: any;
declare var ReactDOM: any;
declare var App: any;
declare var ErrorBoundary: any;
declare var SB: any;

// ── React (firme reali degli hook usati, migrazione strict incrementale) ───
// React è un global UMD (globals.ts fa window.React = React). Prima era `any`;
// ora tipizzato con le firme dei membri usati dal codebase. I tipi generici
// hanno default `any` per non rompere i file non ancora strict: un parametro
// non annotato resta `any` come prima, ma dove il tipo è inferibile (o passato
// esplicitamente) il check è reale. createElement/Fragment/Component/Suspense
// restano volutamente permissivi: il JSX runtime è `h` e i consumer li usano
// in modo dinamico (React.Component.call, Object.create(prototype), …).
declare var React: {
  createElement: (type: any, props?: any, ...children: any[]) => any;
  Fragment: any;
  Component: any;
  Suspense: any;
  lazy: (loader: () => Promise<{ default: any }>) => any;
  memo: <T>(component: T) => T;
  useState: <T = any>(initial: T | (() => T)) => [T, (value: T | ((prev: T) => T)) => void];
  useEffect: (effect: () => void | (() => void), deps?: any[]) => void;
  useRef: <T = any>(initial: T) => { current: T };
  useCallback: <T extends (...args: any[]) => any>(fn: T, deps?: any[]) => T;
  useMemo: <T = any>(factory: () => T, deps?: any[]) => T;
  useReducer: <S, A>(reducer: (state: S, action: A) => S, initial: S, init?: (i: S) => S) => [S, (action: A) => void];
  useLayoutEffect: (effect: () => void | (() => void), deps?: any[]) => void;
  useContext: <T = any>(context: any) => T;
  useSyncExternalStore: <T = any>(
    subscribe: (onStoreChange: () => void) => (() => void) | void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T
  ) => T;
  // Fallback permissivo: i membri NON dichiarati sopra (StrictMode, cloneElement,
  // Children, isValidElement, startTransition, useId, …) restano `any` come prima,
  // così il tipo chiuso non rompe i ~30 file UMD che usano React in modo dinamico.
  [key: string]: any;
};

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

// ── Globals esposti da app-utils.ts via window.* (ES MODULE COMPAT) ─────────
// I consumer in stile UMD (CardGrid.tsx, CardItem.tsx, FAB.tsx, ...) li usano
// come bare identifiers; a runtime risolvono via window.<name>. Tipi dichiarati
// qui per non rompere tsc quando app-utils.ts è un ES module.
declare var S: any;
declare var FORM0: any;
declare var fmtDT: (d: any) => string;
declare var timeAgo: (d: any) => string;

// ── Window extensions — fixes TS2339 Property does not exist on Window ──────
interface Window {
  // Core SB
  SB: any;
  SB_CONFIG: any;
  _SB_LS: any;
  _appVersionLoaded: string;
  _appRenderAttempts: number;

  // Runtime / librerie (impostati da globals.ts)
  React: any;
  ReactDOM: any;
  firebase: any;

  // Firebase instances
  db: any;
  __firestoreSync: any;

  // Functions exposed via window.X = ... (needed for window.X access)
  callGroqJSON: (...args: any[]) => any;
  callGroqText: (...args: any[]) => any;
  aiLoad: any;
  aiSave: any;
  aiCacheInvalidate: any;
  aiCacheGet: any;
  aiCacheSetAll: any;
  fbSave: any;
  fbDel: any;
  fbClassiSave: any;
  fbNascosteSave: any;
  fbFavSave: any;
  CLASSI_DEFAULT: string[];
  ANNI_DISPONIBILI: string[];
  FORM0: any;
  fmt: any;
  fmtDT: any;
  timeAgo: any;
  badgeBg: any;
  tipoIcon: any;
  normalizeLinks: any;
  renderLinks: any;
  compressImage: any;
  quizListenRisposte: any;
  buildWordCloud: any;
  collectCloudStats: any;
  ValutazioneApertaAI: any;
  safeDocId: any;
  escapeForPrompt: any;
  S: any;
  h: any;
  useState: any;
  useEffect: any;
  useRef: any;
  useCallback: any;
  useMemo: any;
  useReducer: any;
  useLayoutEffect: any;
  Fragment: any;
  sbSafeUrl: any;
  classeColor: any;
  ErrorBoundary: any;
  App: any;

  // Audio
  webkitAudioContext?: typeof AudioContext;
}
