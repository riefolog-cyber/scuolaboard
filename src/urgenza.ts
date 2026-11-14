// urgenza.ts — stato urgenza/scadenza per badge e viste (UI pura)

export type StatoScadenza = 'ok' | 'soon' | 'today' | 'expired' | 'none';

export function statoScadenza(scadenza: any, now = Date.now()): StatoScadenza {
  if (!scadenza) return 'none';
  var t = new Date(scadenza).getTime();
  if (isNaN(t)) return 'none';
  var diff = t - now;
  if (diff < 0) return 'expired';
  if (diff <= 24 * 60 * 60 * 1000) return 'today';
  if (diff <= 48 * 60 * 60 * 1000) return 'soon';
  return 'ok';
}

export function labelScadenza(stato: StatoScadenza): string {
  if (stato === 'expired') return 'Scaduta';
  if (stato === 'today') return 'Oggi';
  if (stato === 'soon') return 'In scadenza';
  return '';
}

export function coloreScadenza(stato: StatoScadenza): { bg: string; fg: string; bd: string } {
  if (stato === 'expired') return { bg: 'rgba(239,68,68,.16)', fg: '#f87171', bd: 'rgba(239,68,68,.35)' };
  if (stato === 'today') return { bg: 'rgba(245,158,11,.18)', fg: '#fbbf24', bd: 'rgba(245,158,11,.38)' };
  if (stato === 'soon') return { bg: 'rgba(251,191,36,.14)', fg: '#fcd34d', bd: 'rgba(251,191,36,.30)' };
  return { bg: 'rgba(255,255,255,.08)', fg: 'rgba(255,255,255,.7)', bd: 'rgba(255,255,255,.12)' };
}
