// card-tipo-tema.ts — linguaggio visivo per tipo di card (griglia, lista, dettaglio)
// Non cambia i dati: solo presentazione coerente (colore, etichetta, pattern).
//
// FONTE UNICA: colore, icona ed etichetta del tipo vivono SOLO qui. `badgeBg` e
// `tipoIcon` in utils/format.ts derivano da questo modulo (restano come alias per
// i punti non ancora migrati al tema). Una seconda tabella con gli stessi valori
// era una deriva in attesa di accadere: cambiare il colore del quiz in un punto
// e non nell'altro avrebbe fatto divergere la bacheca dalla ricerca e dalla stampa.

export type TipoCard = 'domanda' | 'sondaggio' | 'quiz' | string;

export type TemaTipo = {
  key: string;
  label: string;
  icon: string;
  /** Colore pieno del badge (il primary segue il token CSS del tema). */
  badge: string;
  /**
   * Fondo del chip con ETICHETTA BIANCA: è una variante più scura di `color`,
   * perché il colore pieno non regge il bianco (verde #22c55e ≈2,2:1, blu
   * #3b82f6 ≈3,7:1: sotto AA per testo da 11–12 px). Il modulo resta la fonte
   * unica, `grafica-testi.test.ts` verifica il contrasto di questi quattro
   * valori (non `card-tipo-tema.test.ts`, che controlla solo la fonte unica).
   */
  chipBg: string;
  color: string;
  soft: string;
  border: string;
  glow: string;
  gradient: string;
  pattern: string;
};

var TEMI: Record<string, TemaTipo> = {
  domanda: {
    key: 'domanda',
    label: 'DOMANDA',
    icon: '💬',
    badge: 'var(--c-primary, #6366f1)',
    chipBg: '#4f46e5',
    color: '#6366f1',
    soft: 'rgba(var(--c-primary-rgb),.18)',
    border: 'rgba(var(--c-primary-rgb),.45)',
    glow: 'rgba(var(--c-primary-rgb),.32)',
    gradient: 'linear-gradient(135deg, rgba(var(--c-primary-rgb),.22), rgba(59,130,246,.10))',
    pattern: 'radial-gradient(circle at 85% 15%, rgba(var(--c-primary-rgb),.22) 0, transparent 42%)',
  },
  sondaggio: {
    key: 'sondaggio',
    label: 'SONDAGGIO',
    icon: '🗳️',
    badge: '#22c55e',
    chipBg: '#15803d',
    color: '#22c55e',
    soft: 'rgba(34,197,94,.18)',
    border: 'rgba(34,197,94,.45)',
    glow: 'rgba(34,197,94,.30)',
    gradient: 'linear-gradient(135deg, rgba(34,197,94,.22), rgba(16,185,129,.10))',
    pattern: 'radial-gradient(circle at 85% 15%, rgba(34,197,94,.22) 0, transparent 42%)',
  },
  quiz: {
    key: 'quiz',
    label: 'QUIZ',
    icon: '🧩',
    badge: '#a855f7',
    chipBg: '#7e22ce',
    color: '#a855f7',
    soft: 'rgba(168,85,247,.18)',
    border: 'rgba(168,85,247,.45)',
    glow: 'rgba(168,85,247,.32)',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,.24), rgba(236,72,153,.10))',
    pattern: 'radial-gradient(circle at 85% 15%, rgba(168,85,247,.24) 0, transparent 42%)',
  },
  nota: {
    key: 'nota',
    label: 'NOTA',
    icon: '📄',
    badge: '#94a3b8',
    chipBg: '#475569',
    color: '#94a3b8',
    soft: 'rgba(148,163,184,.18)',
    border: 'rgba(148,163,184,.40)',
    glow: 'rgba(148,163,184,.24)',
    gradient: 'linear-gradient(135deg, rgba(148,163,184,.18), rgba(71,85,105,.10))',
    pattern: 'radial-gradient(circle at 85% 15%, rgba(148,163,184,.18) 0, transparent 42%)',
  },
};

export function temaTipo(t: TipoCard): TemaTipo {
  var k = String(t || 'nota').toLowerCase();
  if (k === 'quiz' || k === 'sondaggio' || k === 'domanda') return TEMI[k];
  return TEMI.nota;
}

export function etichettaTipo(t: TipoCard): string {
  var k = String(t || '').trim();
  if (!k) return 'NOTA';
  return k.toUpperCase();
}
