// apertura-card.ts — quanto ci mette una card ad aprirsi (dal click al dettaglio).
//
// PERCHÉ non `diagnostica.segna`: quella conserva solo la PRIMA tappa con un
// nome, quindi racconterebbe solo la prima card aperta nella sessione. Qui ogni
// apertura sovrascrive la precedente (interessa l'ultima), si tiene la media
// storica e si conservano gli ultimi campioni per p50/p95: la media da sola non
// dice se il problema è la PRIMA apertura (chunk da scaricare) o tutte.
//
// Nessun invio, nessun log: la durata la legge solo il pannello Diagnostica
// (visibile con SB_DEBUG).
var inizio: number | null = null;
var ultima: number | null = null;
var somma = 0;
var misure = 0;
// Finestra mobile: bastano gli ultimi 20 campioni per accorgersi di una coda
// lunga, senza tenere in memoria tutta la sessione.
var MAX_CAMPIONI = 20;
var campioni: number[] = [];

function adesso(): number {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  } catch {
    // In un ambiente senza performance (o con performance bloccata) si usa
    // Date.now: la misura è più grossolana, ma non deve mai far fallire l'apertura.
  }
  return Date.now();
}

/** Segna il click che apre una card. */
export function segnaApertura(now?: number) {
  inizio = now == null ? adesso() : now;
}

/** Segna il dettaglio montato: chiude la misura aperta, se c'è. */
export function segnaCardPronta(now?: number) {
  if (inizio == null) return;
  var t = now == null ? adesso() : now;
  ultima = Math.max(0, t - inizio);
  inizio = null;
  somma += ultima;
  misure++;
  campioni.push(ultima);
  if (campioni.length > MAX_CAMPIONI) campioni.shift();
}

export function durataApertura(): number | null {
  return ultima;
}

export function mediaApertura(): number | null {
  return misure ? somma / misure : null;
}

function percentile(p: number): number | null {
  if (!campioni.length) return null;
  var ord = campioni.slice().sort(function (a, b) {
    return a - b;
  });
  // Indice nearest-rank: con 20 campioni p95 è il 19° (non il massimo), così un
  // singolo picco non diventa il numero che si guarda.
  var i = Math.min(ord.length - 1, Math.max(0, Math.ceil((p / 100) * ord.length) - 1));
  return ord[i];
}

/** Mediana degli ultimi campioni (tipicamente uguale a `durataApertura`). */
export function p50Apertura(): number | null {
  return percentile(50);
}

/** Coda degli ultimi campioni: è qui che si vede la prima apertura lenta. */
export function p95Apertura(): number | null {
  return percentile(95);
}

/**
 * Quanti campioni ci sono nella finestra: un p95 su 2 misure non significa
 * niente, e chi legge la Diagnostica deve poterlo capire.
 */
export function campioniApertura(): number {
  return campioni.length;
}

/** Solo per i test: riporta il modulo allo stato iniziale. */
export function azzeraApertura() {
  inizio = null;
  ultima = null;
  somma = 0;
  misure = 0;
  campioni = [];
}
