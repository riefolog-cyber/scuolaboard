// app-utils.ts — utility globali e servizi Firestore (pattern UMD)
import {
  CLASSI_COLORS,
  CLASSI_DEFAULT,
  classeColor,
  fmt,
  fmtDT,
  timeAgo,
  avatarColor,
  avatarInitials,
  badgeBg,
  tipoIcon,
  sbSafeUrl,
  safeDocId,
  normalizeLinks,
  cleanMarkdownText,
  escapeForPrompt,
} from './utils/format.ts';
import { buildWordCloud, collectCloudStats } from './utils/cloud.ts';
import { useCountUp } from './utils/hooks.ts';

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
SB.useReducer = React.useReducer;  SB.useLayoutEffect = React.useLayoutEffect;
  SB.Fragment = React.Fragment;
  SB.memo = React.memo;
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

SB.CLASSI_COLORS = CLASSI_COLORS;
SB.CLASSI_DEFAULT = CLASSI_DEFAULT;
SB.classeColor = classeColor;
// ── DESIGN TOKENS ───────────────────────────────────────────────────
var S_BASE = {
  muted: { fontSize: 11, color: 'rgba(255,255,255,.52)' },
  muted2: { fontSize: 11, color: 'rgba(255,255,255,.45)' },
  muted3: { fontSize: 11, color: 'rgba(255,255,255,.58)' },
  flex6: { display: 'flex', gap: 6 },
  flex8: { display: 'flex', gap: 8 },
  flex10: { display: 'flex', gap: 10 },
  mb8: { marginBottom: 8 },
  mb10: { marginBottom: 10 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
};

function fbClassiSave(arr, anno) {
  return db
    .collection('config')
    .doc('classi_custom_' + safeDocId(anno || ''))
    .set({ lista: arr, aggiornato: new Date().toISOString() }, { merge: true });
}
function fbNascosteSave(arr, anno) {
  return db
    .collection('config')
    .doc('classi_custom_' + safeDocId(anno || ''))
    .set({ nascoste: arr, aggiornato: new Date().toISOString() }, { merge: true });
}
function fbFavSave(uid, ids) {
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

function Avatar(name, size) {
  size = size || 28;
  var bg = avatarColor(name);
  var initials = avatarInitials(name);
  return h(
    'div',
    {
      title: name,
      style: {
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.36),
        fontWeight: 800,
        color: '#fff',
        flexShrink: 0,
        letterSpacing: 0.5,
      },
    },
    initials
  );
}

SB.useCountUp = useCountUp;

// Traduce gli errori Firestore in messaggi leggibili (regole che bloccano le scritture)
function fbErrTxt(e) {
  if (e && (e.code === 'permission-denied' || String(e.message || '').indexOf('Missing or insufficient permissions') >= 0)) {
    return 'Permesso negato: le regole Firestore bloccano questa operazione. Verifica il ruolo prof e le regole.';
  }
  return 'Errore di salvataggio: ' + ((e && e.message) || 'errore sconosciuto');
}
function fbSave(c) {
  var p = db.collection('cards').doc(String(c.id)).set(c);
  // Safety-net centralizzato: mostra il toast su OGNI percorso di scrittura,
  // non solo su quelli che chiamano .catch() esplicitamente.
  p.catch(function (e) {
    if (SB.showToast) SB.showToast(fbErrTxt(e), 'err');
  });
  return p;
}
SB.fbSave = fbSave;
function fbDel(id) {
  var p = db.collection('cards').doc(String(id)).delete();
  p.catch(function (e) {
    if (SB.showToast) SB.showToast(fbErrTxt(e), 'err');
  });
  return p;
}
function compressImage(file, maxW, maxH, quality) {
  if (!file.type.startsWith('image/'))
    return Promise.reject(new Error("Il file selezionato non è un'immagine valida."));
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
      var w = img.naturalWidth,
        h = img.naturalHeight;
      var scale = Math.min(1, maxW / w, maxH / h);
      var cw = Math.round(w * scale),
        ch = Math.round(h * scale);
      var canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, cw, ch);
      var TARGET_KB = 90;
      var q = quality != null ? quality : 0.8; // default quality
      var b64 = canvas.toDataURL('image/jpeg', q);
      var kb = Math.round((b64.length * 0.75) / 1024);
      if (kb > TARGET_KB) {
        b64 = canvas.toDataURL('image/jpeg', q * 0.65);
        kb = Math.round((b64.length * 0.75) / 1024);
      }
      if (kb > TARGET_KB * 2) {
        var c2 = document.createElement('canvas');
        c2.width = Math.round(cw * 0.75);
        c2.height = Math.round(ch * 0.75);
        c2.getContext('2d').drawImage(canvas, 0, 0, c2.width, c2.height);
        b64 = c2.toDataURL('image/jpeg', 0.6);
        kb = Math.round((b64.length * 0.75) / 1024);
      }
      if (kb > TARGET_KB * 3) {
        b64 = canvas.toDataURL('image/jpeg', 0.4);
      }
      resolve(b64);
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
function quizListenRisposte(cardId, cb) {
  return db
    .collection('quiz_risposte')
    .where('cardId', '==', String(cardId))
    .onSnapshot(function (s) {
      var arr = [];
      s.forEach(function (d) {
        arr.push(d.data());
      });
      cb(arr);
    });
}

var S = Object.assign({}, S_BASE, {
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid rgba(255,255,255,.15)',
    borderRadius: 8,
    fontSize: 13,
    background: 'rgba(255,255,255,.08)',
    color: '#f1f5f9',
  },
  filterBtn: function (a) {
    return {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '5px 12px',
      borderRadius: 20,
      border: '1px solid ' + (a ? '#6366f1' : 'rgba(255,255,255,.15)'),
      background: a ? '#6366f1' : 'rgba(255,255,255,.05)',
      color: a ? '#fff' : 'rgba(255,255,255,.6)',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer',
    };
  },
  // Common style tokens — avoids repeating the same strings hundreds of times
  c: {
    ptr: { cursor: 'pointer' },
    fw7: { fontWeight: 700 },
    fw8: { fontWeight: 800 },
    br8: { borderRadius: 8 },
    br11: { borderRadius: 11 },
    br20: { borderRadius: 20 },
    fs11: { fontSize: 11 },
    fs12: { fontSize: 12 },
    fs13: { fontSize: 13 },
    muted: { color: 'rgba(255,255,255,.58)' },
    light: { color: '#f1f5f9' },
    glass8: { background: 'rgba(255,255,255,.08)' },
    glass6: { background: 'rgba(255,255,255,.06)' },
    // Pre-built composite button bases
    btnGhost: {
      background: 'rgba(255,255,255,.07)',
      border: '1px solid rgba(255,255,255,.12)',
      borderRadius: 8,
      cursor: 'pointer',
      color: 'rgba(255,255,255,.6)',
      fontSize: 12,
      fontWeight: 700,
    },
    btnPrimary: {
      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      border: 'none',
      borderRadius: 11,
      cursor: 'pointer',
      color: '#fff',
      fontWeight: 800,
    },
    modal: {
      background: 'rgba(15,23,42,.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,.12)',
      borderRadius: 20,
      padding: 26,
      boxShadow: '0 24px 60px rgba(0,0,0,.5)',
    },
  },
  annullaBtn: {
    flex: 1,
    padding: 11,
    background: 'rgba(255,255,255,.08)',
    color: 'rgba(255,255,255,.6)',
    border: 'none',
    borderRadius: 11,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
});

SB.sbSafeUrl = sbSafeUrl;

SB.safeDocId = safeDocId;
// ── myName helper: ora definito in app-state.js ──
function renderLinks(card, setShowCard) {
  // Aggiunto setShowCard come parametro
  var links = normalizeLinks(card);
  if (!links.length) return null;

  // Lazily initialize Firebase save function if not already available
  var saveCardToFirebase = typeof SB !== 'undefined' && SB.fbSave ? SB.fbSave : null;

  function move(i, delta) {
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
    links.map(function (l, i) {
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
              onClick: function (e) {
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
              onClick: function (e) {
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
function ValutazioneApertaAI(h, s, risposta, di, d, isProf) {
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
  function ErrorBoundary(props) {
    React.Component.call(this, props);
    this.state = { hasError: false, error: null };
  }
  ErrorBoundary.prototype = Object.create(React.Component.prototype);
  ErrorBoundary.prototype.constructor = ErrorBoundary;
  ErrorBoundary.getDerivedStateFromError = function (error) {
    return { hasError: true, error: error };
  };
  ErrorBoundary.prototype.componentDidCatch = function (error, info) {
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

  function _safeGetItem(storage, key) {
    try {
      if (typeof window !== 'undefined' && storage) return storage.getItem(key);
    } catch (e) {
      console.warn('[ScuolaBoard] Storage getItem error:', e);
    }
    return null;
  }
  function _safeSetItem(storage, key, value) {
    try {
      if (typeof window !== 'undefined' && storage) storage.setItem(key, value);
    } catch (e) {
      console.warn('[ScuolaBoard] Storage setItem error:', e);
    }
  }
  function _safeRemoveItem(storage, key) {
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
      set: function (s) {
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
      get: function (uid) {
        return _safeGetItem(
          localStorage,
          (CFG_LS_KEYS.privacy && CFG_LS_KEYS.privacy(uid)) || 'privacy_accepted_' + uid
        );
      },
      set: function (uid) {
        _safeSetItem(localStorage, (CFG_LS_KEYS.privacy && CFG_LS_KEYS.privacy(uid)) || 'privacy_accepted_' + uid, '1');
      },
      rm: function (uid) {
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
      set: function (v) {
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
      set: function (v) {
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
      set: function (v) {
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
  window.SB_CONFIG = window.SB_CONFIG || CFG_LS_KEYS; // Assicura che la config sia disponibile
})();

SB.cleanMarkdownText = cleanMarkdownText;

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
window.useCountUp = useCountUp;
window.Avatar = Avatar;
window.avatarColor = avatarColor;
