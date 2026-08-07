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
declare var React: any;
declare var ReactDOM: any;
declare var App: any;
declare var ErrorBoundary: any;
declare var SB: any;

// ── Globals esposti da app-utils.ts via window.* (ES MODULE COMPAT) ─────────
// I consumer in stile UMD (AppComponents.tsx, CardGrid.tsx, FAB.tsx) li usano
// come bare identifiers; a runtime risolvono via window.<name>. Tipi dichiarati
// qui per non rompere tsc quando app-utils.ts è un ES module.
declare var Avatar: (name: string, size?: number) => any;
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
  storage: any;
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
  useCountUp: any;
  Avatar: any;
  sbSafeUrl: any;
  avatarColor: any;
  avatarInitials: (name: string) => string;
  cleanMarkdownText: any;
  classeColor: any;
  ErrorBoundary: any;
  App: any;

  // Audio
  webkitAudioContext?: typeof AudioContext;
}
