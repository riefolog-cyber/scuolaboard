// ai-throttle.test.ts · l'attesa fra due chiamate AI in serie.
//
// Il difetto che questo test difende: l'analisi "suddivisa per classe" emette
// una chiamata per classe, e il throttle di `chiamaAI` è globale e sincrono.
// Senza attesa la seconda chiamata veniva rifiutata («Troppe richieste AI») e
// la suddivisione falliva del tutto, senza mostrare la prima classe già
// analizzata. La matematica sta in una funzione pura proprio per poterla
// provare senza attendere cinque secondi veri.

import { describe, it, expect } from 'vitest';
import { attesaProssimaChiamata, INTERVALLO_AI_MS } from './ai-throttle.ts';

describe('ai-throttle: attesa prima della prossima chiamata', function () {
  it('la finestra è di 5 secondi', function () {
    expect(INTERVALLO_AI_MS).toBe(5000);
  });

  it('subito dopo la chiamata si attende tutta la finestra', function () {
    expect(attesaProssimaChiamata(1000, 1000)).toBe(5000);
  });

  it('a metà finestra si attende solo il resto', function () {
    expect(attesaProssimaChiamata(1000, 4000)).toBe(2000);
  });

  it('a finestra scaduta non si attende', function () {
    expect(attesaProssimaChiamata(1000, 6000)).toBe(0);
    expect(attesaProssimaChiamata(1000, 9000)).toBe(0);
  });

  it('senza una chiamata precedente non si attende', function () {
    expect(attesaProssimaChiamata(0, 12345)).toBe(0);
  });

  it('il minimo è un parametro (un flusso può avere una finestra diversa)', function () {
    expect(attesaProssimaChiamata(1000, 3000, 8000)).toBe(6000);
    expect(attesaProssimaChiamata(1000, 3000, 0)).toBe(0);
  });
});
