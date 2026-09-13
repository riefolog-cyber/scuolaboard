// cards-order.test.ts — compareCards (ordinamento della griglia).
// Regole: 1) le card FISSATE (📌) stanno davanti a tutte; 2) poi le card aperte
// di recente, apertura più recente per prima; 3) infine le card mai aperte nel
// loro ordine manuale (drag & drop). La memoria di apertura è { id: timestamp }.
import { describe, it, expect } from 'vitest';
import { compareCards } from './cards.ts';

function card(id: string, extra: any = {}) {
  return Object.assign({ id: id, ordine: 1 }, extra);
}

// Ordina una lista come fa visibleSorted e restituisce gli id nell'ordine finale.
function ordina(cards: any[], aperti?: Record<string, number>) {
  return cards
    .slice()
    .sort(function (a: any, b: any) {
      return compareCards(a, b, aperti);
    })
    .map(function (c: any) {
      return c.id;
    });
}

describe('compareCards (cards.ts) — ordinamento della griglia', () => {
  const A = card('A', { ordine: 1, titolo: 'Alfa' });
  const B = card('B', { ordine: 2, titolo: 'Beta' });
  const C = card('C', { ordine: 3, titolo: 'Gamma' });

  it('senza memoria di apertura resta l ordine manuale (comportamento invariato)', () => {
    expect(ordina([C, A, B])).toEqual(['A', 'B', 'C']);
    expect(ordina([C, A, B], {})).toEqual(['A', 'B', 'C']);
  });

  it('tra le card non fissate, quella aperta di recente sale in cima', () => {
    // C è stata aperta: sta sopra A e B che non lo sono mai state.
    expect(ordina([A, B, C], { C: 1000 })).toEqual(['C', 'A', 'B']);
  });

  it('due card aperte: prima la più recente', () => {
    expect(ordina([A, B, C], { A: 1000, C: 2000 })).toEqual(['C', 'A', 'B']);
    expect(ordina([A, B, C], { A: 3000, C: 2000 })).toEqual(['A', 'C', 'B']);
  });

  it('le card mai aperte restano sotto quelle aperte, nel loro ordine manuale', () => {
    expect(ordina([C, B, A], { B: 5 })).toEqual(['B', 'A', 'C']);
  });

  it('le fissate stanno davanti a tutte, anche se un altra è stata aperta di recente', () => {
    const A2 = card('A', { ordine: 1, pinned: true });
    expect(ordina([A2, B, C], { C: 999 })).toEqual(['A', 'C', 'B']);
  });

  it('tra le fissate resta l ordine manuale (il pin non si riordina da solo)', () => {
    const A2 = card('A', { ordine: 1, pinned: true });
    const B2 = card('B', { ordine: 2, pinned: true });
    // B è stata aperta di recente ma resta dopo A: il gruppo fissato è stabile.
    expect(ordina([B2, A2, C], { B: 999 })).toEqual(['A', 'B', 'C']);
    // ...e resta comunque davanti alle non fissate aperte.
    expect(ordina([B2, A2, C], { A: 1, B: 1, C: 999 })).toEqual(['A', 'B', 'C']);
  });

  it('una fissata senza ordine non finisce mai sotto le altre', () => {
    const P = { id: 'P', pinned: true };
    expect(ordina([A, P], { A: 5000 })).toEqual(['P', 'A']);
  });

  it('aperti undefined/oggetto vuoto non fanno crashare il comparatore', () => {
    expect(compareCards(A, B)).toBeLessThan(0);
    expect(compareCards(A, B, {})).toBeLessThan(0);
    expect(compareCards({ id: 'X' }, { id: 'Y' })).toBe(0);
  });
});
