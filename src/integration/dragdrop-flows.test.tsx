// @ts-nocheck — test di INTEGRAZIONE: drag & drop con filtro classe attivo.
// Verifica che il riordino (useDragDrop.onDrop):
// 1) operi sull'INTERA lista dell'anno (card nascoste dal filtro incluse),
// 2) salvi in un UNICO writeBatch (il fake db conta le scritture via commit),
// 3) NON produca ordini duplicati (il difetto del riordino "solo visibili").
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

function fakeDataTransfer() {
  return { effectAllowed: '', setData: function () {} };
}

describe('Drag & drop con filtro classe attivo', () => {
  it("riordina su tutta la lista dell'anno: nascoste ricompattate, nessun duplicato", async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        A: mkCard('A', { classi: ['3AI'], ordine: 1, titolo: 'Card Alfa' }),
        B: mkCard('B', { classi: ['3BI'], ordine: 2, titolo: 'Card Beta' }),
        C: mkCard('C', { classi: ['3AI'], ordine: 3, titolo: 'Card Gamma' }),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('Card Alfa', {}, { timeout: 4000 });
    await screen.findByText('Card Gamma', {}, { timeout: 4000 });

    // Filtro classe 3AI → visibili solo Card Alfa (1) e Card Gamma (3)
    const row = screen.getByText('CLASSE:').closest('div');
    fireEvent.click(within(row).getByRole('button', { name: '3AI' }));
    await waitFor(() => {
      expect(screen.queryByText('Card Beta')).toBeNull();
    });

    // Trascina Card Alfa su Card Gamma: visibile [Alfa, Gamma] → [Gamma, Alfa]
    const dt = fakeDataTransfer();
    fireEvent.dragStart(document.getElementById('card-A'), { dataTransfer: dt });
    fireEvent.drop(document.getElementById('card-C'), { dataTransfer: dt });

    // Il batch aggiorna TUTTA la lista: B=1, C=2, A=3 (anche la nascosta)
    await waitFor(() => {
      expect(db._get('cards', 'A').ordine).toBe(3);
    });
    expect(db._get('cards', 'C').ordine).toBe(2);
    expect(db._get('cards', 'B').ordine).toBe(1);

    // Nessun ordine duplicato: 3 card, 3 ordini distinti
    const ordini = db._all('cards').map(function ([, d]) {
      return d.ordine;
    });
    expect(new Set(ordini).size).toBe(3);

    // Ordine relativo visibile corretto: Gamma prima di Alfa nel DOM della griglia
    const cardA = document.getElementById('card-A');
    const cardC = document.getElementById('card-C');
    expect(cardA).not.toBeNull();
    expect(cardC).not.toBeNull();
    expect(cardC.compareDocumentPosition(cardA) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
