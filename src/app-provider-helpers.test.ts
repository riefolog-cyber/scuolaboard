// app-provider-helpers.test.ts — guard dimensione card (limite doc Firestore 1 MiB).
// Le immagini/allegati base64 stanno DENTRO il documento card: una card troppo
// grande supererebbe il limite e il salvataggio fallirebbe. Il guard blocca
// prima con un toast (vedi AppProvider.addCard).
import { describe, it, expect } from 'vitest';
import {
  cardJsonSize,
  CARD_SIZE_LIMIT,
  imgUsageKB,
  computeImageTargetKB,
  aggiungiDomandaPubblicata,
  rimuoviDomandaPubblicata,
  isDomandaPubblicata,
} from './app-provider-helpers.ts';

function fakeImage(kb: number): string {
  // base64 ~1 byte per carattere: genera una stringa di ~kb kilobyte
  return 'data:image/jpeg;base64,' + 'A'.repeat(Math.round(kb * 1024));
}

describe('cardJsonSize / CARD_SIZE_LIMIT (guard 1MB Firestore)', () => {
  it('card semplice senza immagini: ben sotto il limite', () => {
    const card = { id: 1, titolo: 'Lezione su X', testo: 'Contenuto', classi: ['3AO'], commenti: [] };
    expect(cardJsonSize(card)).toBeLessThan(1024);
    expect(cardJsonSize(card)).toBeLessThan(CARD_SIZE_LIMIT);
  });

  it('card con 5 immagini grandi: supera il limite (sarebbe fallita su Firestore)', () => {
    const card = {
      id: 2,
      titolo: 'Card con foto',
      copertina: fakeImage(200),
      immagini: [0, 1, 2, 3, 4].map(() => ({ url: fakeImage(180) })),
    };
    const size = cardJsonSize(card);
    expect(size).toBeGreaterThan(CARD_SIZE_LIMIT);
    expect(size).toBeGreaterThan(1024 * 1024); // oltre 1 MiB reale di Firestore
  });

  it('card con 2 allegati da 700KB: supera il limite', () => {
    const card = {
      id: 3,
      titolo: 'Card con allegati',
      allegati: [
        { name: 'a.pdf', url: fakeImage(700) },
        { name: 'b.pdf', url: fakeImage(700) },
      ],
    };
    expect(cardJsonSize(card)).toBeGreaterThan(CARD_SIZE_LIMIT);
  });

  it('card borderline sotto il limite: passa', () => {
    const card = { id: 4, titolo: 'T', immagini: [{ url: fakeImage(400) }] };
    // ~400KB base64 + overhead → sotto i 900KB
    expect(cardJsonSize(card)).toBeLessThan(CARD_SIZE_LIMIT);
    expect(cardJsonSize(card)).toBeGreaterThan(400 * 1024);
  });

  it('valore null/undefined non crasha', () => {
    expect(cardJsonSize(null)).toBeLessThan(CARD_SIZE_LIMIT);
    expect(cardJsonSize(undefined)).toBeLessThan(CARD_SIZE_LIMIT);
    expect(typeof cardJsonSize(undefined)).toBe('number');
  });
});

describe('imgUsageKB / computeImageTargetKB (budget dinamico immagini)', () => {
  it('misura copertina + galleria in KB', () => {
    // fakeImage(200) = 200KB base64 ≈ 150KB reali (0.75) → usa url reali
    const url = 'A'.repeat(1024 * 1000); // 1000KB di stringa ≈ 750KB
    expect(imgUsageKB(url, [])).toBeGreaterThan(700);
    expect(imgUsageKB(null, [{ url: 'A'.repeat(1024 * 400) }])).toBeGreaterThan(280);
    expect(imgUsageKB(undefined, [])).toBe(0);
  });

  it('card vuota: prima immagine con qualità alta (~890KB/3 riservati)', () => {
    const t = computeImageTargetKB({ usedKB: 0, currentSlots: 0, maxSlots: 6, cardLimitKB: 900 });
    expect(t).toBe(Math.round((900 - 10) / 3)); // ~297KB
    expect(t).toBeLessThan(700);
  });

  it('maxSlots piccolo: rispetta il cap di 700KB', () => {
    const t = computeImageTargetKB({ usedKB: 0, currentSlots: 0, maxSlots: 1, cardLimitKB: 900 });
    expect(t).toBe(700);
  });

  it('card quasi piena: target ridotto ma mai sotto il floor', () => {
    const t = computeImageTargetKB({ usedKB: 860, currentSlots: 5, maxSlots: 6, cardLimitKB: 900 });
    expect(t).toBeGreaterThanOrEqual(25);
    expect(t).toBeLessThan(120);
  });

  it('la somma su 6 slot non supera il limite card', () => {
    let used = 0;
    let slots = 0;
    const targets: number[] = [];
    while (slots < 6) {
      const t = computeImageTargetKB({ usedKB: used, currentSlots: slots, maxSlots: 6, cardLimitKB: 900 });
      targets.push(t);
      used += t;
      slots++;
    }
    const total = targets.reduce((a, b) => a + b, 0);
    expect(total).toBeLessThan(900); // resta salvabile (guard a 900KB)
  });
});

describe('domande AI pubblicate (docente → studenti sola lettura)', () => {
  const dq1 = { id: 1, q: "Cos'è X?", risposta: 'R1', data: '2026-01-01' };
  const dq2 = { id: 2, q: "Cos'è Y?", risposta: 'R2', data: '2026-01-02' };

  it('aggiunge senza duplicati e senza mutare la lista originale', () => {
    const base: any[] = [];
    const una = aggiungiDomandaPubblicata(base, dq1);
    expect(una).toHaveLength(1);
    expect(base).toHaveLength(0); // input non mutato
    const due = aggiungiDomandaPubblicata(una, dq1);
    expect(due).toHaveLength(1); // niente duplicati
    expect(aggiungiDomandaPubblicata(due, dq2)).toHaveLength(2);
  });

  it('rimuove per id e isDomandaPubblicata riflette lo stato', () => {
    const lista = [dq1, dq2];
    expect(isDomandaPubblicata(lista, 1)).toBe(true);
    const ridotta = rimuoviDomandaPubblicata(lista, 1);
    expect(ridotta).toHaveLength(1);
    expect(isDomandaPubblicata(ridotta, 1)).toBe(false);
    expect(isDomandaPubblicata(ridotta, 2)).toBe(true);
    expect(isDomandaPubblicata(undefined, 1)).toBe(false);
  });

  it('pubblica solo i campi q/risposta/data (niente dati interni)', () => {
    const piena = { id: 9, q: 'Q', risposta: 'R', data: 'd', extra: 'x', mappaNomi: {} };
    const lista = aggiungiDomandaPubblicata([], piena);
    expect(lista[0]).toEqual({ id: 9, q: 'Q', risposta: 'R', data: 'd' });
  });
});
