// src/utils/format.ts — utility pure di formattazione
// Estratto da app-utils.ts (Fase 2d): nessuna dipendenza da Firestore/React.
// app-utils.ts importa queste funzioni e le ri-registra su window.* / SB.*.

var CLASSI_COLORS = [
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
export function classeColor(nome: string, lista: string[]) {
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
export function compareStudenti(a: { cognome?: string; nome?: string }, b: { cognome?: string; nome?: string }) {
  var ca = (a.cognome || '').toLowerCase();
  var cb = (b.cognome || '').toLowerCase();
  if (ca !== cb) return ca.localeCompare(cb, 'it');
  var na = (a.nome || '').toLowerCase();
  var nb = (b.nome || '').toLowerCase();
  return na.localeCompare(nb, 'it');
}

export function fmt(d: string | number | Date) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDT(d: any) {
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
export function timeAgo(d: string | number | Date) {
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
export function badgeBg(t: string) {
  return t === 'domanda' ? '#6366f1' : t === 'sondaggio' ? '#22c55e' : t === 'quiz' ? '#a855f7' : '#94a3b8';
}
export function tipoIcon(t: string) {
  return t === 'domanda' ? '💬' : t === 'sondaggio' ? '🗳️' : t === 'quiz' ? '🧩' : '📌';
}

// Allowlist URL: solo http(s). Blocca esplicitamente javascript:, data:, vbscript:,
// file:, ecc. Previene stored XSS via URL malevolo passato da docente.
export function sbSafeUrl(s: string) {
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
export function safeDocId(s: unknown) {
  var str = String(s == null ? '' : s).trim();
  if (!str) return '_anon_';
  // Sostituisce caratteri proibiti da Firestore
  str = str.replace(/[\/\\\.\#\$\[\]\*]/g, '_');
  // Evita id riservati e collisioni
  str = str.replace(/_+/g, '_');
  // Limite docId: 1500 bytes (UTF-8). Tronca con margine.
  return str.slice(0, 256) || '_anon_';
}

export function normalizeLinks(c: any) {
  if (c.links && Array.isArray(c.links)) return c.links;
  if (c.linkEsterno && typeof c.linkEsterno === 'string') return [{ url: c.linkEsterno, label: '' }];
  return [];
}

// Utility per sanificare input utente prima di inviarlo a modelli AI (Prompt Injection)
export function escapeForPrompt(text: unknown) {
  return String(text || '')
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
}
