// app-provider-helpers.test.ts — guard dimensione card (limite doc Firestore 1 MiB).
// Le immagini/allegati base64 stanno DENTRO il documento card: una card troppo
// grande supererebbe il limite e il salvataggio fallirebbe. Il guard blocca
// prima con un toast (vedi AppProvider.addCard).
import { describe, it, expect } from 'vitest';
import { cardJsonSize, CARD_SIZE_LIMIT } from './app-provider-helpers.ts';

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
      allegati: [{ name: 'a.pdf', url: fakeImage(700) }, { name: 'b.pdf', url: fakeImage(700) }],
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
