// app-state.js  ·  ScuolaBoard  ·  Configurazione + stato globale (ex app-config.js + app-state.js)
(function () {
  // ── CONFIGURAZIONE (ex app-config.js) ────────────────────────────
  var CFG = {
    ANNO_DEFAULT: '2026/2027',
    ANNI_DISPONIBILI: ['2025/2026', '2026/2027', '2027/2028', '2028/2029', '2029/2030'],
    AI_CACHE_TTL_MS: 15 * 60 * 1000,
    IMG_MAX_BYTES: 5 * 1024 * 1024,
    IMG_MAX_COUNT: 5,
    IMG_COVER_SIZE: 900,
    IMG_QUALITY: 0.72,
    QUIZ_EVAL_CHUNK: 4,
    UNDO_TIMEOUT_MS: 5000,
    TOAST_TIMEOUT_MS: 2400,
    ALARM_WINDOW_MS: 2000,
    // NB: il modello AI NON si sceglie qui. La selezione è server-side nel
    // Cloudflare Worker (worker cloudflare.txt → pickBestModel), che interroga
    // i cataloghi Groq/OpenRouter e adotta automaticamente il miglior modello
    // gratuito disponibile (cache 24h). Override manuale: env var GROQ_MODEL /
    // OPENROUTER_MODEL nel pannello Cloudflare.
    LS_KEYS: {
      seen: 'seen_cards',
      anno: 'annoScolasticoAttivo',
      aiCache: 'ai_results_cache',
      aiCacheAt: 'ai_results_cache_at',
      privacy: function (uid: string) {
        return 'privacy_accepted_' + uid;
      },
    },
  };
  window.SB_CONFIG = CFG;

  window._SB_LS = {
    seen: {
      get: function () {
        try {
          var s = typeof localStorage !== 'undefined' ? localStorage.getItem(CFG.LS_KEYS.seen) : null;
          return new Set(s ? JSON.parse(s) : []);
        } catch (e) {
          return new Set();
        }
      },
      set: function (s: Set<any>) {
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem(CFG.LS_KEYS.seen, JSON.stringify([...s]));
        } catch (e) {}
      },
      rm: function () {
        try {
          if (typeof localStorage !== 'undefined') localStorage.removeItem(CFG.LS_KEYS.seen);
        } catch (e) {}
      },
    },
    privacy: {
      get: function (uid: string) {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(CFG.LS_KEYS.privacy(uid)) : null;
      },
      set: function (uid: string) {
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem(CFG.LS_KEYS.privacy(uid), '1');
        } catch (e) {}
      },
    },
    anno: {
      get: function () {
        try {
          return (
            (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CFG.LS_KEYS.anno) : null) ||
            CFG.ANNO_DEFAULT
          );
        } catch (e) {
          return CFG.ANNO_DEFAULT;
        }
      },
      set: function (v: string) {
        try {
          if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(CFG.LS_KEYS.anno, v);
        } catch (e) {}
      },
    },
    aiCache: {
      get: function () {
        return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CFG.LS_KEYS.aiCache) : null;
      },
      set: function (v: string) {
        try {
          if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(CFG.LS_KEYS.aiCache, v);
        } catch (e) {}
      },
      rm: function () {
        try {
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(CFG.LS_KEYS.aiCache);
        } catch (e) {}
      },
    },
    aiCacheAt: {
      get: function () {
        return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CFG.LS_KEYS.aiCacheAt) : null;
      },
      set: function (v: string) {
        try {
          if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(CFG.LS_KEYS.aiCacheAt, v);
        } catch (e) {}
      },
      rm: function () {
        try {
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(CFG.LS_KEYS.aiCacheAt);
        } catch (e) {}
      },
    },
  };

  // ── STATO GLOBALE (ex app-state.js) ──────────────────────────────
  var SB = window.SB || {};
  window.SB = SB;

  // SB.LS: app-utils.ts copia window._SB_LS → SB.LS (bridge automatico).
  // NON ridefinire SB.LS qui — lo fa già app-utils.ts con le chiavi corrette.
  // safeDocId / normalizeLinks / escapeForPrompt / FORM0 sono definiti in
  // modo canonico in app-utils.ts (import da utils/format.ts) e qui NON
  // vengono duplicati per evitare drift tra le due versioni.

  SB.user = null;

  SB.showToast = function (msg: string, type?: string) {
    console.warn('[ScuolaBoard]', type || 'info', msg);
  };

  SB.myName = function (u: any) {
    return u
      ? u.role === 'prof'
        ? 'Prof'
        : SB.safeDocId(u.displayName || (u.nome + ' ' + u.cognome).trim() || u.email)
      : '?';
  };

  // Log di caricamento disabilitato in produzione
})();
