// src/utils/format.ts — utility pure di formattazione
// Estratto da app-utils.ts (Fase 2d): nessuna dipendenza da Firestore/React.
// app-utils.ts importa queste funzioni e le ri-registra su window.* / SB.*.

export var CLASSI_COLORS = [
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#a855f7',
];
export function classeColor(nome, lista) {
  var idx = lista.indexOf(nome);
  return CLASSI_COLORS[idx % CLASSI_COLORS.length] || '#f59e0b';
}
export var CLASSI_DEFAULT = [
  '1AO',
  '1AI',
  '1BO',
  '1CO',
  '2AO',
  '2AI',
  '2BO',
  '2CO',
  '3AO',
  '3AI',
  '3BO',
  '4AO',
  '4AI',
  '4BO',
  '5AO',
  '5AA',
  '5AI',
  '5BO',
];

// Comparatore per ordinare gli studenti per cognome (A→Z), poi per nome.
// Usato sia da loadStudenti (useClassi) sia dal render della vista Gestione
// Studenti (AppLayout) per evitare logiche duplicate e divergenze future.
export function compareStudenti(a, b) {
  var ca = (a.cognome || '').toLowerCase();
  var cb = (b.cognome || '').toLowerCase();
  if (ca !== cb) return ca.localeCompare(cb, 'it');
  var na = (a.nome || '').toLowerCase();
  var nb = (b.nome || '').toLowerCase();
  return na.localeCompare(nb, 'it');
}

export function fmt(d) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDT(d) {
  if (!d) return '';
  // Gestione Firestore Timestamp (oggetto con metodo toDate)
  if (d && typeof d.toDate === 'function') {
    try {
      d = d.toDate();
    } catch (e) {
      return '';
    }
  }
  if (typeof d === 'string' && d.length === 10) {
    return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  var dt = new Date(d);
  if (isNaN(dt.getTime())) return ''; // fallback string vuota, non oggetto raw
  return (
    dt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  );
}
export function timeAgo(d) {
  if (!d) return '';
  var ms = Date.now() - new Date(d).getTime();
  var s = Math.floor(ms / 1000),
    m = Math.floor(s / 60),
    h = Math.floor(m / 60),
    days = Math.floor(h / 24),
    weeks = Math.floor(days / 7);
  if (s < 60) return 'ora';
  if (m < 60) return m + 'm fa';
  if (h < 24) return h + 'h fa';
  if (days === 1) return 'ieri';
  if (days < 7) return days + 'g fa';
  if (weeks < 5) return weeks + 'sett fa';
  return fmt(d);
}
export function avatarColor(name) {
  var colors = [
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#22c55e',
    '#f59e0b',
    '#ef4444',
    '#3b82f6',
    '#a855f7',
    '#14b8a6',
  ];
  var hash = 0;
  for (var i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
export function avatarInitials(name) {
  var parts = (name || '?').trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (name[0] || '?').toUpperCase();
}
export function badgeBg(t) {
  return t === 'domanda' ? '#6366f1' : t === 'sondaggio' ? '#22c55e' : t === 'quiz' ? '#a855f7' : '#94a3b8';
}
export function tipoIcon(t) {
  return t === 'domanda' ? '💬' : t === 'sondaggio' ? '🗳️' : t === 'quiz' ? '🧩' : '📌';
}

// Allowlist URL: solo http(s). Blocca esplicitamente javascript:, data:, vbscript:,
// file:, ecc. Previene stored XSS via URL malevolo passato da docente.
export function sbSafeUrl(s) {
  try {
    var u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch (e) {
    return false;
  }
}

// ── SAFE DOC ID ──
// Firestore rifiuta docId che contengono / . [ ] # $ *
// (vedi https://firebase.google.com/docs/firestore/quotas#limits).
// Questo helper sanitizza un nome (displayName o nome legacy) per renderlo
// utilizzabile come docId. Non modifica l'aspetto del nome ai fini del
// matching con Google Auth token.name; viene applicato SOLO nei punti dove
// il valore viene usato come document ID in Firestore.
// Edge-case edge: se il nome Google contiene caratteri proibiti, il match con
// request.auth.token.name nelle rules può fallire. Soluzione: persistere un
// `displayNameSafe` su users/{uid} e usarlo nelle rules. Per ora manteniamo
// il check basato su token.name + backward-compat; il rischio è limitato a
// nomi che contengono / . # $ [ ] *, rari in Italia.
export function safeDocId(s) {
  s = String(s == null ? '' : s).trim();
  if (!s) return '_anon_';
  // Sostituisce caratteri proibiti da Firestore
  s = s.replace(/[\/\\\.\#\$\[\]\*]/g, '_');
  // Evita id riservati e collisioni
  s = s.replace(/_+/g, '_');
  // Limite docId: 1500 bytes (UTF-8). Tronca con margine.
  return s.slice(0, 256) || '_anon_';
}

export function normalizeLinks(c) {
  if (c.links && Array.isArray(c.links)) return c.links;
  if (c.linkEsterno && typeof c.linkEsterno === 'string') return [{ url: c.linkEsterno, label: '' }];
  return [];
}

export function cleanMarkdownText(s) {
  return String(s || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// Utility per sanificare input utente prima di inviarlo a modelli AI (Prompt Injection)
export function escapeForPrompt(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
}
