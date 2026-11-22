import { describe, it, expect, beforeEach } from 'vitest';
import {
  segnaApertura,
  segnaCardPronta,
  durataApertura,
  mediaApertura,
  p50Apertura,
  p95Apertura,
  azzeraApertura,
} from './apertura-card.ts';

beforeEach(function () {
  azzeraApertura();
});

describe('utils/apertura-card', function () {
  it('misura dal click al dettaglio montato', function () {
    segnaApertura(1000);
    segnaCardPronta(1042);
    expect(durataApertura()).toBe(42);
  });

  it('una card pronta senza click precedente non produce misure', function () {
    segnaCardPronta(50);
    expect(durataApertura()).toBeNull();
    expect(mediaApertura()).toBeNull();
    expect(p50Apertura()).toBeNull();
    expect(p95Apertura()).toBeNull();
  });

  it('l’ultima apertura sovrascrive la precedente e la media tiene conto di tutte', function () {
    segnaApertura(0);
    segnaCardPronta(10);
    segnaApertura(100);
    segnaCardPronta(130);
    expect(durataApertura()).toBe(30);
    expect(mediaApertura()).toBe(20);
  });

  it('un tempo negativo (orologio strano) viene limitato a zero', function () {
    segnaApertura(100);
    segnaCardPronta(90);
    expect(durataApertura()).toBe(0);
  });

  it('p50/p95 mostrano la coda che la media nasconde', function () {
    // 18 aperture veloci e 2 lente: la media dice 59 ms (sembra accettabile),
    // il p95 dice 500 (c'è una coda da guardare). È esattamente il caso in cui
    // la media da sola inganna.
    for (var i = 0; i < 18; i++) {
      segnaApertura(0);
      segnaCardPronta(10);
    }
    for (var j = 0; j < 2; j++) {
      segnaApertura(0);
      segnaCardPronta(500);
    }
    expect(p50Apertura()).toBe(10);
    expect(p95Apertura()).toBe(500);
    expect(mediaApertura()).toBeCloseTo((18 * 10 + 2 * 500) / 20, 5);
  });

  it('la finestra tiene solo gli ultimi 20 campioni', function () {
    // Il primo campione (1000 ms) esce quando ne arriva un ventunesimo: i
    // percentili descrivono la sessione recente, non tutta la giornata.
    segnaApertura(0);
    segnaCardPronta(1000);
    for (var i = 0; i < 20; i++) {
      segnaApertura(0);
      segnaCardPronta(10);
    }
    expect(p50Apertura()).toBe(10);
    expect(p95Apertura()).toBe(10);
    // La media storica invece non dimentica: (1000 + 20×10) / 21.
    expect(mediaApertura()).toBeCloseTo(1200 / 21, 5);
  });
});
