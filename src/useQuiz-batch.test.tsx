// @ts-nocheck — Blocco C3: atomicità delle scritture quiz in useQuiz.
// resetRisposte (N delete) e valutaAperteProfAI (N update) devono andare in un
// UNICO writeBatch (prima: N scritture in Promise.all, applicabili parzialmente
// se una falliva). useQuiz cattura `db = window.db` ALL'IMPORT → setup in
// beforeAll con import dinamico; il fallback si testa rimuovendo db.batch
// (lo stesso oggetto db è condiviso dal modulo).
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

let useQuiz: any = null;
let apiRef: any = null;
let fakeDb: any;
let commitMock: any;
let docDeleteSpies: any[] = [];
let docUpdateSpies: any[] = [];
const originalBatch = null;

function Probe() {
  const quiz = useQuiz({
    user: { uid: 'p1', role: 'prof' },
    myName: () => 'Prof',
    cards: [],
    showToast: vi.fn(),
    showCard: null,
  });
  apiRef = quiz;
  return null;
}

function makeDb() {
  const ops: any = { delete: [], set: [] };
  const db: any = {
    _ops: ops,
    collection: (name: string) => ({
      where: () => ({
        get: () =>
          Promise.resolve({
            forEach: (cb: any) => {
              if (name === 'quiz_risposte') ['c1_Luca', 'c1_Anna'].forEach((id) => cb({ id }));
            },
          }),
      }),
      doc: (id: string) => {
        const del = vi.fn().mockResolvedValue({});
        const upd = vi.fn().mockResolvedValue({});
        docDeleteSpies.push(del);
        docUpdateSpies.push(upd);
        return { delete: del, update: upd, _id: id }; // _id per le asserzioni del batch
      },
    }),
  };
  db.batch = () => ({
    delete: (ref: any) => ops.delete.push(ref),
    set: (ref: any, data: any, opts: any) => ops.set.push({ ref, data, opts }),
    commit: commitMock,
  });
  return db;
}

beforeAll(async () => {
  commitMock = vi.fn().mockResolvedValue({});
  fakeDb = makeDb();
  (window as any).db = fakeDb;
  const mod: any = await import('./hooks/useQuiz.ts');
  useQuiz = mod.default;
});

beforeEach(() => {
  docDeleteSpies = [];
  docUpdateSpies = [];
  fakeDb._ops.delete = [];
  fakeDb._ops.set = [];
  commitMock.mockClear();
  render(React.createElement(Probe));
});

describe('C3 — writeBatch in useQuiz', () => {
  it('resetRisposte: N delete → UN commit atomico (nessun delete singolo)', async () => {
    apiRef.resetRisposte('c1');
    await waitFor(() => expect(commitMock).toHaveBeenCalledTimes(1));
    expect(fakeDb._ops.delete.length).toBe(2); // c1_Luca + c1_Anna
    expect(docDeleteSpies.some((s) => s.mock.calls.length > 0)).toBe(false); // fallback NON usato
  });

  it('resetRisposte: senza batch() → fallback ai delete singoli', async () => {
    fakeDb.batch = undefined; // stesso oggetto condiviso dal modulo
    apiRef.resetRisposte('c1');
    await waitFor(() => expect(docDeleteSpies.some((s) => s.mock.calls.length > 0)).toBe(true));
    expect(commitMock).not.toHaveBeenCalled();
    fakeDb.batch = () => ({
      delete: (ref: any) => fakeDb._ops.delete.push(ref),
      set: (ref: any, data: any, opts: any) => fakeDb._ops.set.push({ ref, data, opts }),
      commit: commitMock,
    });
  });

  it('valutaAperteProfAI: N update → UN commit atomico con merge-set', async () => {
    (window as any).callGroqJSON = vi.fn().mockResolvedValue({
      voto: 0.8,
      punti_forza: 'ok',
      lacune: 'poco',
      suggerimento: 'studiare',
    });
    const card = {
      id: 'c1',
      quizDomande: [
        { tipo: 'aperta', testo: 'Spiega X' },
        { tipo: 'multipla', testo: 'Scelta', corretta: '0', opzioni: ['A', 'B'] },
      ],
    };
    const ris = [
      { studente: 'Luca', risposte: { 0: 'risposta libera', 1: '0' }, aiValutato: false, aiScores: {} },
      { studente: 'Anna', risposte: { 0: 'altra risposta', 1: '1' }, aiValutato: false, aiScores: {} },
    ];
    apiRef.valutaAperteProfAI(card, ris);
    await waitFor(() => expect(commitMock).toHaveBeenCalledTimes(1));
    expect(fakeDb._ops.set.length).toBe(2); // 2 studenti → 2 op nel batch
    fakeDb._ops.set.forEach((op: any) => {
      expect(op.opts && op.opts.merge).toBe(true); // merge-set ≡ update
      expect(op.data.aiValutato).toBe(true);
      expect(op.data.punteggio).toBeTruthy();
    });
    // Il punteggio include il voto AI della risposta aperta (0.8)
    const luca = fakeDb._ops.set.find((op: any) => String(op.ref._id).includes('Luca'));
    expect(luca.data.aiScores[0] && luca.data.aiScores[0].voto).toBe(0.8);
    expect(docUpdateSpies.some((s) => s.mock.calls.length > 0)).toBe(false); // fallback NON usato
  });
});
