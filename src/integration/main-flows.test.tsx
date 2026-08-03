// @ts-nocheck — test di INTEGRAZIONE: monta l'app VERA (AppProvider + AppLayout
// + modali) con Firebase finto in memoria. Verifica i flussi principali.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, STUD, PROF_DOC, STUD_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

// ── FLUSSI PRINCIPALI (prof) ──────────────────────────────────────────────
describe('Flussi principali — prof', () => {
  it('mostra la bacheca con le card dopo il login prof', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Card uno' }), c2: mkCard('c2', { titolo: 'Card due' }) },
    };
    await renderApp({ seed, user: PROF });
    expect(await screen.findByText('Card uno', {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText('Card due')).toBeTruthy();
  });

  it('crea una card dal FAB e la salva su Firestore', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: {} };
    const { db } = await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByTitle('Nuova card', {}, { timeout: 4000 }));
    fireEvent.input(screen.getByPlaceholderText('Es. Riflessione su…'), { target: { value: 'Nuova card test' } });
    fireEvent.input(screen.getByPlaceholderText('Descrizione, spunti…'), { target: { value: 'contenuto' } });
    fireEvent.click(screen.getByText('✅ Crea card'));
    expect(await screen.findByText('Nuova card test', {}, { timeout: 4000 })).toBeTruthy();
    await waitFor(() => {
      const found = db._all('cards').find(([, c]) => c.titolo === 'Nuova card test');
      expect(found).toBeTruthy();
    });
  });

  it('aggiunge un commento a una card', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card uno' }) } };
    const { db } = await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card uno', {}, { timeout: 4000 }));
    const input = await screen.findByPlaceholderText('Scrivi un commento…', {}, { timeout: 4000 });
    fireEvent.input(input, { target: { value: 'Ottima lezione!' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText('Ottima lezione!', {}, { timeout: 4000 })).toBeTruthy();
    await waitFor(() => {
      const c1 = db._get('cards', 'c1');
      expect(c1.commenti.length).toBe(1);
    });
  });

  it('mette like a una card', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card uno' }) } };
    const { db } = await renderApp({ seed, user: PROF });
    // Il bottone like ha aria-label="Aggiungi like" (accessibile name), non 👍
    const likeBtn = await screen.findByRole('button', { name: /like/i }, { timeout: 4000 });
    fireEvent.click(likeBtn);
    await waitFor(() => {
      expect(db._get('cards', 'c1').likes).toBe(1);
    });
  });

  it('filtra le card per classe', async () => {
    // NB: le classi reali dell'app sono tipo '3AO'/'4AO' (CLASSI_DEFAULT)
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', { titolo: 'Card TUTTE', classi: ['TUTTE'] }),
        c2: mkCard('c2', { titolo: 'Card 3AO', classi: ['3AO'] }),
        c3: mkCard('c3', { titolo: 'Card 4AO', classi: ['4AO'] }),
      },
    };
    await renderApp({ seed, user: PROF });
    await screen.findByText('Card TUTTE', {}, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: '3AO' }));
    expect(screen.getByText('Card 3AO')).toBeTruthy();
    expect(screen.getByText('Card TUTTE')).toBeTruthy(); // TUTTE resta sempre visibile
    expect(screen.queryByText('Card 4AO')).toBeNull();
  });
});

// ── VISTA STUDENTE + GATING AI ────────────────────────────────────────────
describe('Vista studente', () => {
  it('lo studente vede solo le card della sua classe', async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', { titolo: 'Card TUTTE', classi: ['TUTTE'] }),
        c2: mkCard('c2', { titolo: 'Card 3AI', classi: ['3AI'] }),
        c3: mkCard('c3', { titolo: 'Card 4AI', classi: ['4AI'] }),
      },
    };
    await renderApp({ seed, user: STUD });
    await screen.findByText('Card TUTTE', {}, { timeout: 4000 });
    expect(screen.getByText('Card 3AI')).toBeTruthy();
    expect(screen.queryByText('Card 4AI')).toBeNull();
  });

  it("lo studente NON puo' avviare l'analisi AI (gating)", async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Card uno', classi: ['3AI'] }) },
    };
    await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Card uno', {}, { timeout: 4000 }));
    await screen.findByPlaceholderText('Scrivi un commento…', {}, { timeout: 4000 });
    // Nessun pulsante "+ AI" per lo studente
    expect(screen.queryByText('🤖 + AI')).toBeNull();
    // E nessuna chiamata di rete verso il worker AI
    expect(window.fetch).not.toHaveBeenCalled();
  });
});
