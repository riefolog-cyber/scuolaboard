// hooks/useDragDrop.test.ts — riordinamento card (reorderCards, logica pura).
// Copre: drop senza filtro (semantica dell'e2e: c1 su p1 → p1=1, c1=2),
// riordino con filtro classe attivo (card nascoste ricompattate, NESSUN ordine
// duplicato o stale, ordine relativo visibile corretto) e casi invalidi.
import { describe, it, expect } from 'vitest';
import { reorderCards } from './useDragDrop.ts';

describe('reorderCards', () => {
  it('drop c1 su p1: c1 finisce dopo p1 (semantica e2e)', () => {
    var cards = [
      { id: 'c1', ordine: 1 },
      { id: 'p1', ordine: 2 },
    ];
    var res = reorderCards(cards, 'c1', 'p1');
    expect(res.length).toBe(2);
    expect(res[0].id).toBe('p1');
    expect(res[1].id).toBe('c1');
    expect(res[1].ordine).toBe(2);
  });

  it('con filtro classe attivo: nessun ordine duplicato, nascoste ricompattate', () => {
    // Visibili (3A): A(1), C(3); nascoste (3B): B(2), D(4)
    var cards = [
      { id: 'A', ordine: 1, classi: ['3A'] },
      { id: 'B', ordine: 2, classi: ['3B'] },
      { id: 'C', ordine: 3, classi: ['3A'] },
      { id: 'D', ordine: 4, classi: ['3B'] },
    ];
    // L'utente vede [A, C] e trascina A su C → il visibile deve diventare [C, A]
    var res = reorderCards(cards, 'A', 'C');
    // ordine 1..N senza duplicati su TUTTE le card (nascoste incluse)
    var order = res.map(function (c: any) {
      return c.ordine;
    });
    expect(order.slice().sort(function (a: any, b: any) {
      return a - b;
    })).toEqual([1, 2, 3, 4]);
    expect(new Set(order).size).toBe(4);
    // ordine relativo visibile corretto: C prima di A
    var vis = res.filter(function (c: any) {
      return c.classi[0] === '3A';
    });
    expect(vis.map(function (c: any) {
      return c.id;
    })).toEqual(['C', 'A']);
    // anche le nascoste sono state riscritte in sequenza (niente ordine stale)
    expect(res.map(function (c: any) {
      return c.id + ':' + c.ordine;
    }).join(' ')).toBe('B:1 C:2 A:3 D:4');
  });

  it('copia difensiva: non muta l\'array in input', () => {
    var cards = [{ id: 'A', ordine: 1 }, { id: 'B', ordine: 2 }];
    reorderCards(cards, 'A', 'B');
    expect(cards[0].ordine).toBe(1);
    expect(cards[1].ordine).toBe(2);
  });

  it('id non trovati → lista vuota (nessun salvataggio)', () => {
    var cards = [{ id: 'A', ordine: 1 }];
    expect(reorderCards(cards, 'A', 'ZZZ')).toEqual([]);
    expect(reorderCards(cards, 'ZZZ', 'A')).toEqual([]);
  });
});
