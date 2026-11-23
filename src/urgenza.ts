// urgenza.ts — stato urgenza/scadenza per badge e viste (UI pura)

export type StatoScadenza = 'ok' | 'soon' | 'today' | 'expired' | 'none';

// Mezzanotte locale del giorno che contiene `t`. Serve a ragionare per giorni di
// calendario e non per "distanza in ore": prima la soglia era `diff <= 24h` e una
// card che scadeva DOMANI alle 9 compariva come "Oggi" — l'etichetta diceva una
// cosa falsa a tutta la classe.
function inizioGiorno(t: number): number {
  var d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Domani si calcola con `setDate` e non sommando 24h: nei giorni di cambio
// dell'ora legale il giorno dura 23 o 25 ore, e la somma fissa sbaglierebbe il
// confine (una scadenza di domani finirebbe in "ok" o in "Oggi").
function inizioDomani(oggiMs: number): number {
  var d = new Date(oggiMs);
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function statoScadenza(scadenza: any, now = Date.now()): StatoScadenza {
  if (!scadenza) return 'none';
  var t = new Date(scadenza).getTime();
  if (isNaN(t)) return 'none';
  if (t < now) return 'expired';
  var oggi = inizioGiorno(now);
  var giorno = inizioGiorno(t);
  if (giorno === oggi) return 'today';
  if (giorno === inizioDomani(oggi)) return 'soon';
  return 'ok';
}

export function labelScadenza(stato: StatoScadenza): string {
  if (stato === 'expired') return 'Scaduta';
  if (stato === 'today') return 'Oggi';
  // `soon` è "domani" (giorno di calendario successivo), non "entro 48 ore":
  // l'etichetta dice quello che lo stato significa davvero.
  if (stato === 'soon') return 'Domani';
  return '';
}

// Due tavolozze, non un ternario negli stili inline: i colori chiari pensati per
// il tema scuro sono invisibili sul fondo quasi bianco del tema chiaro (#fbbf24
// sta a 1,5:1). La funzione resta pura e misurabile (come card-tipo-tema.ts):
// è il call site a passare il tema, e grafica-testi.test.ts verifica entrambe.
export function coloreScadenza(stato: StatoScadenza, isLight = false): { bg: string; fg: string; bd: string } {
  var scuro: Record<string, { bg: string; fg: string; bd: string }> = {
    expired: { bg: 'rgba(239,68,68,.16)', fg: '#f87171', bd: 'rgba(239,68,68,.35)' },
    today: { bg: 'rgba(245,158,11,.18)', fg: '#fbbf24', bd: 'rgba(245,158,11,.38)' },
    soon: { bg: 'rgba(251,191,36,.14)', fg: '#fcd34d', bd: 'rgba(251,191,36,.30)' },
    ok: { bg: 'rgba(255,255,255,.08)', fg: 'rgba(255,255,255,.7)', bd: 'rgba(255,255,255,.12)' },
  };
  var chiaro: Record<string, { bg: string; fg: string; bd: string }> = {
    expired: { bg: 'rgba(239,68,68,.10)', fg: '#991b1b', bd: 'rgba(239,68,68,.30)' },
    today: { bg: 'rgba(245,158,11,.14)', fg: '#92400e', bd: 'rgba(245,158,11,.34)' },
    soon: { bg: 'rgba(251,191,36,.12)', fg: '#854d0e', bd: 'rgba(251,191,36,.28)' },
    ok: { bg: 'rgba(15,23,42,.05)', fg: '#475569', bd: 'rgba(15,23,42,.10)' },
  };
  var tav = isLight ? chiaro : scuro;
  return tav[stato] || tav.ok;
}
