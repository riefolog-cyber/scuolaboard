// cards-deepeq.test.ts — deepEq (confronto STRUTTURALE per chiavi).
// Bug B2: il confronto via JSON.stringify falliva il prune dell'overlay
// ottimistico quando il server restituiva le chiavi in ordine diverso
// (patch convergente ma mai riconosciuta → overlay fantasma in cards.ts).
import { describe, it, expect } from 'vitest';
import { deepEq } from './cards.ts';

describe('deepEq (cards.ts) — confronto strutturale per chiavi', () => {
  it('chiavi in ordine diverso: sono uguali (il caso del bug B2)', () => {
    // JSON.stringify({a:1,b:2}) !== JSON.stringify({b:2,a:1})
    expect(deepEq({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it('oggetti annidati con chiavi rimescolate: uguali', () => {
    expect(deepEq({ a: { x: 1, y: [1, 2] }, b: 2 }, { b: 2, a: { y: [1, 2], x: 1 } })).toBe(true);
  });

  it('primitivi e identità: true', () => {
    expect(deepEq(1, 1)).toBe(true);
    expect(deepEq('x', 'x')).toBe(true);
    expect(deepEq(null, null)).toBe(true);
    expect(deepEq(undefined, undefined)).toBe(true);
  });

  it('array: ordine significativo', () => {
    expect(deepEq([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEq([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  it('valori diversi: false', () => {
    expect(deepEq({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEq({ a: 1, b: 2 }, { a: 1 })).toBe(false); // chiavi diverse
    expect(deepEq({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('tipi diversi: false (mai deep-equal a un primitivo)', () => {
    expect(deepEq({ a: 1 }, null)).toBe(false);
    expect(deepEq(null, { a: 1 })).toBe(false);
    expect(deepEq({ a: 1 }, 1)).toBe(false);
    expect(deepEq('1', 1)).toBe(false);
  });

  it('stesso riferimento: true senza attraversare', () => {
    const o = { a: [1, 2, { b: 3 }] };
    expect(deepEq(o, o)).toBe(true);
  });
});
