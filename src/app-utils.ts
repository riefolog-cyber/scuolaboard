// app-utils.ts — utility globali e servizi Firestore (pattern UMD)
import {
  CLASSI_DEFAULT,
  classeColor,
  fmt,
  fmtDT,
  timeAgo,
  badgeBg,
  tipoIcon,
  sbSafeUrl,
  safeDocId,
  normalizeLinks,
  escapeForPrompt,
} from './utils/format.ts';
import { buildWordCloud, collectCloudStats } from './utils/cloud.ts';

var SB = window.SB || {};
window.SB = SB;
SB.db = firebase.firestore();
SB.auth = firebase.auth();
SB.h = React.createElement;
SB.useState = React.useState;
SB.useEffect = React.useEffect;
SB.useRef = React.useRef;
SB.useCallback = React.useCallback;
SB.useMemo = React.useMemo;
SB.useReducer = React.useReducer;
SB.useLayoutEffect = React.useLayoutEffect;
SB.Fragment = React.Fragment;
var db = SB.db;
var h = SB.h,
  useState = SB.useState,
  useEffect = SB.useEffect,
  useRef = SB.useRef,
  useCallback = SB.useCallback,
  useMemo = SB.useMemo,
  useReducer = SB.useReducer,
  useLayoutEffect = SB.useLayoutEffect,
  Fragment = SB.Fragment;

SB.CLASSI_DEFAULT = CLASSI_DEFAULT;
SB.classeColor = classeColor;
// ── DESIGN TOKENS ───────────────────────────────────────────────────
function fbClassiSave(arr: string[], anno: string) {
  return db
    .collection('config')
    .doc('classi_custom_' + safeDocId(anno || ''))
    .set({ lista: arr, aggiornato: new Date().toISOString() }, { merge: true });
}
function fbNascosteSave(arr: string[], anno: string) {
  return db
    .collection('config')
    .doc('classi_custom_' + safeDocId(anno || ''))
    .set({ nascoste: arr, aggiornato: new Date().toISOString() }, { merge: true });
}
function fbFavSave(uid: string, ids: string[]) {
  return db.collection('preferiti').doc(uid).set({ ids: ids, aggiornato: new Date().toISOString() });
}
var FORM0 = {
  tipo: 'domanda',
  titolo: '',
  testo: '',
  opzioni: ['', ''],
  links: [{ url: '', label: '' }],
  classi: [],
  quizDomande: [],
  quizTimer: 10,
  immagini: [],
  copertina: null,
  allegati: [],
};

// ── ANNO DEFAULT: centralizzato (da SB_CONFIG) ──
var ANNI_DISPONIBILI = (window.SB_CONFIG && window.SB_CONFIG.ANNI_DISPONIBILI) || [
  '2025/2026',
  '2026/2027',
  '2027/2028',
  '2028/2029',
  '2029/2030',
];
SB.ANNI_DISPONIBILI = ANNI_DISPONIBILI;
SB.FORM0 = FORM0;

// Traduce gli errori Firestore in messaggi leggibili (regole che bloccano le scritture)
function fbErrTxt(e: any) {
  if (
    e &&
    (e.code === 'permission-denied' || String(e.message || '').indexOf('Missing or insufficient permissions') >= 0)
  ) {
    return 'Permesso negato: le regole Firestore bloccano questa operazione. Verifica il ruolo prof e le regole.';
  }
  return 'Errore di salvataggio: ' + ((e && e.message) || 'errore sconosciuto');
}
function fbSave(c: any) {
  var p = db.collection('cards').doc(String(c.id)).set(c);
  // Safety-net centralizzato: mostra il toast su OGNI percorso di scrittura,
  // non solo su quelli che chiamano .catch() esplicitamente.
  p.catch(function (e: any) {
    if (SB.showToast) SB.showToast(fbErrTxt(e), 'err');
  });
  return p;
}
SB.fbSave = fbSave;
function fbDel(id: any) {
  var p = db.collection('cards').doc(String(id)).delete();
  p.catch(function (e: any) {
    if (SB.showToast) SB.showToast(fbErrTxt(e), 'err');
  });
  return p;
}
function compressImage(file: File, maxW: number, maxH: number, quality?: number, targetKB?: number) {
  if (!file.type.startsWith('image/'))
    return Promise.reject(new Error("Il file selezionato non è un'immagine valida."));
  var CFG = window.SB_CONFIG || {};
  var TARGET_KB = targetKB != null ? targetKB : CFG.IMG_TARGET_KB != null ? CFG.IMG_TARGET_KB : 250;
  var qStart = quality != null ? quality : CFG.IMG_QUALITY != null ? CFG.IMG_QUALITY : 0.85;
  var qMin = CFG.IMG_QUALITY_MIN != null ? CFG.IMG_QUALITY_MIN : 0.55;
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    var revoked = false;
    function cleanup() {
      if (!revoked) {
        URL.revokeObjectURL(url);
        revoked = true;
      }
    }
    img.onload = function () {
      cleanup();
      try {
        var w = img.naturalWidth,
          h = img.naturalHeight;
        var scale = Math.min(1, maxW / w, maxH / h);
        var cw = Math.round(w * scale),
          ch = Math.round(h * scale);
        var canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, cw, ch);
        // Encoding: WebP quando il browser lo supporta (≈30% più piccolo a parità
        // di qualità e mantiene la trasparenza); altrimenti JPEG. Se toDataURL
        // non supporta il tipo, il canvas restituisce PNG: in quel caso si usa
        // JPEG (molto più compatto).
        function encode(cur: any, q: number) {
          var webp: any;
          try {
            webp = cur.toDataURL('image/webp', q);
          } catch (e) {
            // toDataURL webp non supportato: caduta su JPEG
            return cur.toDataURL('image/jpeg', q);
          }
          if (webp.indexOf('data:image/webp') === 0) return webp;
          return cur.toDataURL('image/jpeg', q);
        }
        function kbOf(b64: string) {
          return Math.round((b64.length * 0.75) / 1024);
        }
        // Ricerca adattiva della qualità: parte da qStart e scende finché il
        // risultato entra nel target (mai sotto qMin). Massimizza la qualità per
        // il budget disponibile — molto meglio dei gradini fissi.
        function fit(cur: any, fromQ: number) {
          var q = fromQ;
          var last: any = null;
          var lastKb = 0;
          for (var i = 0; i < 10; i++) {
            var b64 = encode(cur, q);
            var kb = kbOf(b64);
            if (kb <= TARGET_KB) return { b64: b64, kb: kb };
            last = b64;
            lastKb = kb;
            if (q <= qMin) break;
            q = Math.max(qMin, Math.round((q - 0.05) * 100) / 100);
          }
          return { b64: last, kb: lastKb };
        }
        function downscale(src: any, factor: number) {
          var c = document.createElement('canvas');
          c.width = Math.max(64, Math.round(src.width * factor));
          c.height = Math.max(64, Math.round(src.height * factor));
          c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
          return c;
        }
        var cur = canvas;
        var result = fit(cur, qStart);
        if (result.kb > TARGET_KB) {
          cur = downscale(cur, 0.85);
          result = fit(cur, qStart);
        }
        if (result.kb > TARGET_KB) {
          cur = downscale(cur, 0.8);
          result = fit(cur, qStart);
        }
        resolve(result.b64);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = function (e) {
      cleanup();
      reject(e);
    };
    img.src = url;
  });
}

// aiSave è definita canonicamente in ai-services.ts (con invalidazione cache
// SB.LS). NON ridefinire qui per evitare conflitti di override su
// window.SB.aiSave. Se serve chiamarla qui, usare: SB.aiSave(cardId, data)
function quizListenRisposte(cardId: any, cb: (_arr: any[]) => void) {
  return db
    .collection('quiz_risposte')
    .where('cardId', '==', String(cardId))
    .onSnapshot(function (s: any) {
      var arr: any[] = [];
      s.forEach(function (d: any) {
        arr.push(d.data());
      });
      cb(arr);
    });
}

var S = {
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid rgba(255,255,255,.15)',
    borderRadius: 8,
    fontSize: 13,
    background: 'rgba(255,255,255,.08)',
    color: '#f1f5f9',
  },
};

SB.sbSafeUrl = sbSafeUrl;

SB.safeDocId = safeDocId;
// ── myName helper: ora definito in app-state.js ──
function renderLinks(card: any, setShowCard: any) {
  // Aggiunto setShowCard come parametro
  var links = normalizeLinks(card);
  if (!links.length) return null;

  // Lazily initialize Firebase save function if not already available
  var saveCardToFirebase = typeof SB !== 'undefined' && SB.fbSave ? SB.fbSave : null;

  function move(i: number, delta: number) {
    var newIdx = i + delta;
    if (newIdx < 0 || newIdx >= links.length) return;
    var currentLinks = normalizeLinks(card);
    var newLinks = [...currentLinks];
    var tmp = newLinks[i];
    newLinks[i] = newLinks[newIdx];
    newLinks[newIdx] = tmp;

    // Aggiorna l'oggetto card con il nuovo array di links
    var updatedCard = Object.assign({}, card, { links: newLinks });

    // Salva su Firebase se la funzione è disponibile
    if (saveCardToFirebase) {
      saveCardToFirebase(updatedCard);
      if (setShowCard) {
        // Aggiorna lo stato locale della card aperta
        setShowCard(updatedCard);
      }
    } else {
      console.warn('SB.fbSave not available. Links reordering will not be persisted.');
    }
  }
  return h(
    'div',
    { style: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 } },
    links.map(function (l: any, i: number) {
      if (!l.url || !sbSafeUrl(l.url)) return null;
      return h(
        'div',
        { key: l.url + '-' + i, style: { display: 'flex', alignItems: 'center', gap: 4 } },
        h(
          'a',
          {
            href: l.url,
            target: '_blank',
            rel: 'noopener noreferrer',
            style: {
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(59,130,246,.15)',
              color: '#60a5fa',
              padding: '5px 10px',
              borderRadius: 7,
              textDecoration: 'none',
              fontSize: 11,
              fontWeight: 600,
              border: '1px solid rgba(59,130,246,.3)',
            },
          },
          '🔗 ' + (l.label || 'Approfondisci')
        ),
        links.length > 1 &&
          h(
            'button',
            {
              onClick: function (e: any) {
                e.stopPropagation();
                move(i, -1);
              },
              style: {
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,.5)',
                fontSize: 16,
                padding: 0,
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
            },
            '⬆️'
          ),
        links.length > 1 &&
          h(
            'button',
            {
              onClick: function (e: any) {
                e.stopPropagation();
                move(i, 1);
              },
              style: {
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,.5)',
                fontSize: 16,
                padding: 0,
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
            },
            '⬇️'
          )
      );
    })
  );
}

// ── Componente valutazione AI aperta (riusato da prof e studente) ──
function ValutazioneApertaAI(h: any, s: any, risposta: any, di: number, d: any, isProf: boolean) {
  if (!s) return null;
  var colore = s.voto >= 0.75 ? '#4ade80' : s.voto >= 0.5 ? '#fbbf24' : '#f87171';
  var etichetta = s.voto >= 0.75 ? 'Ottima risposta' : s.voto >= 0.5 ? 'Risposta parziale' : 'Da rivedere';
  var icona = s.voto >= 0.75 ? '✅' : s.voto >= 0.5 ? '⚠️' : '❌';
  return h(
    'div',
    {
      style: {
        background: 'rgba(99,102,241,.07)',
        border: '1px solid rgba(99,102,241,.2)',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 8,
      },
    },
    // Intestazione domanda
    h(
      'div',
      { style: { fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.58)', marginBottom: 6, letterSpacing: 0.5 } },
      'D' + (di + 1) + ': ' + d.testo
    ),
    // Risposta studente
    risposta
      ? h(
          'div',
          {
            style: {
              fontSize: 12,
              color: 'rgba(255,255,255,.65)',
              fontStyle: 'italic',
              background: 'rgba(255,255,255,.04)',
              borderRadius: 7,
              padding: '7px 10px',
              marginBottom: 10,
              lineHeight: 1.6,
            },
          },
          '"' + risposta + '"'
        )
      : h(
          'div',
          { style: { fontSize: 11, color: 'rgba(255,255,255,.40)', marginBottom: 10 } },
          '(nessuna risposta fornita)'
        ),
    // Voto sintetico
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
      h('span', { style: { fontSize: 22 } }, icona),
      h(
        'div',
        null,
        h('div', { style: { fontWeight: 800, fontSize: 13, color: colore } }, etichetta),
        h(
          'div',
          { style: { fontSize: 11, color: 'rgba(255,255,255,.52)' } },
          'Punteggio: ' + Math.round(s.voto * 100) + '/100'
        )
      )
    ),
    // Punti di forza
    s.punti_forza &&
      h(
        'div',
        { style: { marginBottom: 8 } },
        h(
          'div',
          {
            style: {
              fontSize: 11,
              fontWeight: 800,
              color: '#4ade80',
              letterSpacing: 0.5,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            },
          },
          h('span', null, '💪'),
          'PUNTI DI FORZA'
        ),
        h(
          'div',
          {
            style: {
              fontSize: 12,
              color: 'rgba(255,255,255,.8)',
              lineHeight: 1.7,
              background: 'rgba(34,197,94,.06)',
              borderRadius: 7,
              padding: '7px 10px',
              borderLeft: '3px solid rgba(34,197,94,.4)',
            },
          },
          s.punti_forza
        )
      ),
    // Lacune
    s.lacune &&
      h(
        'div',
        { style: { marginBottom: 8 } },
        h(
          'div',
          {
            style: {
              fontSize: 11,
              fontWeight: 800,
              color: '#f87171',
              letterSpacing: 0.5,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            },
          },
          h('span', null, '🔍'),
          'ASPETTI DA MIGLIORARE'
        ),
        h(
          'div',
          {
            style: {
              fontSize: 12,
              color: 'rgba(255,255,255,.8)',
              lineHeight: 1.7,
              background: 'rgba(239,68,68,.06)',
              borderRadius: 7,
              padding: '7px 10px',
              borderLeft: '3px solid rgba(239,68,68,.4)',
            },
          },
          s.lacune
        )
      ),
    // Suggerimento didattico (solo prof)
    isProf &&
      s.suggerimento &&
      h(
        'div',
        null,
        h(
          'div',
          {
            style: {
              fontSize: 11,
              fontWeight: 800,
              color: '#fbbf24',
              letterSpacing: 0.5,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            },
          },
          h('span', null, '💡'),
          'SUGGERIMENTO DIDATTICO'
        ),
        h(
          'div',
          {
            style: {
              fontSize: 12,
              color: 'rgba(255,255,255,.8)',
              lineHeight: 1.7,
              background: 'rgba(245,158,11,.06)',
              borderRadius: 7,
              padding: '7px 10px',
              borderLeft: '3px solid rgba(245,158,11,.4)',
              fontStyle: 'italic',
            },
          },
          s.suggerimento
        )
      )
  );
}

// ── ERROR BOUNDARY ──────────────────────────────────────────────────────────
var ErrorBoundary = (function () {
  function ErrorBoundary(this: any, props: any) {
    React.Component.call(this, props);
    this.state = { hasError: false, error: null };
  }
  ErrorBoundary.prototype = Object.create(React.Component.prototype);
  ErrorBoundary.prototype.constructor = ErrorBoundary;
  ErrorBoundary.getDerivedStateFromError = function (error: any) {
    return { hasError: true, error: error };
  };
  ErrorBoundary.prototype.componentDidCatch = function (error: any, info: any) {
    console.error('[ScuolaBoard] Crash:', error, info);
  };
  ErrorBoundary.prototype.render = function () {
    var h = React.createElement;
    if (this.state.hasError) {
      var self = this;
      return h(
        'div',
        {
          style: {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a2e',
            color: '#f1f5f9',
            fontFamily: 'Inter,sans-serif',
            gap: 16,
            padding: 32,
          },
        },
        h('div', { style: { fontSize: 56 } }, '⚠️'),
        h('h2', { style: { fontSize: 22, fontWeight: 800, margin: 0 } }, 'Qualcosa è andato storto'),
        h(
          'p',
          { style: { opacity: 0.6, fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 380 } },
          (this.state.error && this.state.error.message) || 'Errore imprevisto'
        ),
        h(
          'button',
          {
            onClick: function () {
              self.setState({ hasError: false, error: null });
            },
            style: {
              marginTop: 8,
              padding: '10px 24px',
              background: '#6366f1',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 700,
            },
          },
          '↩ Riprova'
        )
      );
    }
    return this.props.children;
  };
  return ErrorBoundary;
})();
window.ErrorBoundary = ErrorBoundary;

// SB.LS — localStorage centralizzato (opt. #6)
(function () {
  if (window._SB_LS) {
    SB.LS = window._SB_LS;
    return;
  }

  function _safeGetItem(storage: any, key: string) {
    try {
      if (typeof window !== 'undefined' && storage) return storage.getItem(key);
    } catch (e) {
      console.warn('[ScuolaBoard] Storage getItem error:', e);
    }
    return null;
  }
  function _safeSetItem(storage: any, key: string, value: string) {
    try {
      if (typeof window !== 'undefined' && storage) storage.setItem(key, value);
    } catch (e) {
      console.warn('[ScuolaBoard] Storage setItem error:', e);
    }
  }
  function _safeRemoveItem(storage: any, key: string) {
    try {
      if (typeof window !== 'undefined' && storage) storage.removeItem(key);
    } catch (e) {
      console.warn('[ScuolaBoard] Storage removeItem error:', e);
    }
  }

  // ponytail: LS_KEYS_DRY; Usare CFG.LS_KEYS per tutti i riferimenti, non duplicare stringhe.
  // Tuttavia, per massima retrocompatibilità e safety, si mantengono alcuni letterali.
  var CFG_LS_KEYS = (window.SB_CONFIG && window.SB_CONFIG.LS_KEYS) || {};

  SB.LS = {
    seen: {
      get: function () {
        try {
          var s = _safeGetItem(localStorage, CFG_LS_KEYS.seen || 'seen_cards');
          return new Set(s ? JSON.parse(s) : []);
        } catch (e) {
          console.warn('[ScuolaBoard] LS.seen get error:', e);
          return new Set();
        }
      },
      set: function (s: Set<any>) {
        try {
          _safeSetItem(localStorage, CFG_LS_KEYS.seen || 'seen_cards', JSON.stringify([...s]));
        } catch (e) {
          console.warn('[ScuolaBoard] LS.seen set error:', e);
        }
      },
      rm: function () {
        try {
          _safeRemoveItem(localStorage, CFG_LS_KEYS.seen || 'seen_cards');
        } catch (e) {}
      },
    },
    privacy: {
      get: function (uid: string) {
        return _safeGetItem(
          localStorage,
          (CFG_LS_KEYS.privacy && CFG_LS_KEYS.privacy(uid)) || 'privacy_accepted_' + uid
        );
      },
      set: function (uid: string) {
        _safeSetItem(localStorage, (CFG_LS_KEYS.privacy && CFG_LS_KEYS.privacy(uid)) || 'privacy_accepted_' + uid, '1');
      },
      rm: function (uid: string) {
        try {
          _safeRemoveItem(localStorage, (CFG_LS_KEYS.privacy && CFG_LS_KEYS.privacy(uid)) || 'privacy_accepted_' + uid);
        } catch (e) {}
      },
    },
    anno: {
      get: function () {
        try {
          return (
            _safeGetItem(sessionStorage, CFG_LS_KEYS.anno || 'annoScolasticoAttivo') ||
            (window.SB_CONFIG && window.SB_CONFIG.ANNO_DEFAULT) ||
            '2026/2027'
          );
        } catch (e) {
          console.warn('[ScuolaBoard] LS.anno get error:', e);
          return (window.SB_CONFIG && window.SB_CONFIG.ANNO_DEFAULT) || '2026/2027';
        }
      },
      set: function (v: string) {
        try {
          _safeSetItem(sessionStorage, CFG_LS_KEYS.anno || 'annoScolasticoAttivo', v);
        } catch (e) {
          console.warn('[ScuolaBoard] LS.anno set error:', e);
        }
      },
      rm: function () {
        try {
          _safeRemoveItem(sessionStorage, CFG_LS_KEYS.anno || 'annoScolasticoAttivo');
        } catch (e) {}
      },
    },
    aiCache: {
      get: function () {
        return _safeGetItem(sessionStorage, CFG_LS_KEYS.aiCache || 'ai_results_cache');
      },
      set: function (v: string) {
        try {
          _safeSetItem(sessionStorage, CFG_LS_KEYS.aiCache || 'ai_results_cache', v);
        } catch (e) {}
      },
      rm: function () {
        try {
          _safeRemoveItem(sessionStorage, CFG_LS_KEYS.aiCache || 'ai_results_cache');
        } catch (e) {}
      },
    },
    aiCacheAt: {
      get: function () {
        return _safeGetItem(sessionStorage, CFG_LS_KEYS.aiCacheAt || 'ai_results_cache_at');
      },
      set: function (v: string) {
        try {
          _safeSetItem(sessionStorage, CFG_LS_KEYS.aiCacheAt || 'ai_results_cache_at', v);
        } catch (e) {}
      },
      rm: function () {
        try {
          _safeRemoveItem(sessionStorage, CFG_LS_KEYS.aiCacheAt || 'ai_results_cache_at');
        } catch (e) {}
      },
    },
  };
  window._SB_LS = SB.LS; // Esporta per evitare reinizializzazione
})();

// Utility per sanificare input utente prima di inviarlo a modelli AI (Prompt Injection)

SB.escapeForPrompt = escapeForPrompt;

// ── ES MODULE COMPAT: expose module-scoped vars to window ──
// In IIFE mode these were global; ES modules need explicit window assignment.
window.classeColor = classeColor;
window.fbSave = fbSave;
window.fbDel = fbDel;
window.fbClassiSave = fbClassiSave;
window.fbNascosteSave = fbNascosteSave;
window.fbFavSave = fbFavSave;
window.FORM0 = FORM0;
window.fmt = fmt;
window.fmtDT = fmtDT;
window.timeAgo = timeAgo;
window.badgeBg = badgeBg;
window.tipoIcon = tipoIcon;
window.normalizeLinks = normalizeLinks;
window.renderLinks = renderLinks;
window.compressImage = compressImage;
window.quizListenRisposte = quizListenRisposte;
window.buildWordCloud = buildWordCloud;
window.collectCloudStats = collectCloudStats;
window.ValutazioneApertaAI = ValutazioneApertaAI;
window.safeDocId = safeDocId;
window.escapeForPrompt = escapeForPrompt;
window.S = S;
window.db = db;
window.h = h;
window.useState = useState;
window.useEffect = useEffect;
window.useRef = useRef;
window.useCallback = useCallback;
window.useMemo = useMemo;
window.useReducer = useReducer;
window.useLayoutEffect = useLayoutEffect;
window.Fragment = Fragment;
window.CLASSI_DEFAULT = CLASSI_DEFAULT;
window.ANNI_DISPONIBILI = ANNI_DISPONIBILI;
