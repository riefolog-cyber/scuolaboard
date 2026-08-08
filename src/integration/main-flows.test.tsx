// @ts-nocheck — test di INTEGRAZIONE: monta l'app VERA (AppProvider + AppLayout
// + modali) con Firebase finto in memoria. Verifica i flussi principali.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, STUD, PROF_DOC, STUD_DOC, mkCard, modalRoot, setupTestEnv, teardownTestEnv } from './fixtures';

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

// ── MODIFICA ED ELIMINA IL PROPRIO COMMENTO ──────────────────────────────
// Il nome canonico dell'utente studente è myName() = safeDocId(displayName),
// che preserva gli spazi → 'Luca Bianchi' (stesso valore usato da addCom).
describe('Modifica ed elimina il proprio commento', () => {
  it("lo studente modifica il proprio commento (non quello altrui)", async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card uno',
          classi: ['3AI'],
          commenti: [
            { id: 1, autore: 'Luca Bianchi', testo: 'Commento originale', data: '2026-09-01', risposte: [] },
            { id: 2, autore: 'Marco Verdi', testo: 'Commento di un altro', data: '2026-09-01', risposte: [] },
          ],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Card uno', {}, { timeout: 4000 }));
    await screen.findByText('Commento originale', {}, { timeout: 4000 });
    expect(screen.getByText('Commento di un altro')).toBeTruthy();

    // Solo il commento PROPRIO ha i pulsanti modifica/elimina
    expect(screen.getAllByRole('button', { name: 'Modifica commento' }).length).toBe(1);
    expect(screen.getAllByRole('button', { name: 'Elimina commento' }).length).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Modifica commento' }));
    const ta = await screen.findByDisplayValue('Commento originale');
    fireEvent.input(ta, { target: { value: 'Commento modificato!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva commento' }));

    expect(await screen.findByText('Commento modificato!', {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.queryByText('Commento originale')).toBeNull();
    await waitFor(() => {
      const c1 = db._get('cards', 'c1');
      expect(c1.commenti[0].testo).toBe('Commento modificato!');
      expect(c1.commenti[0].modificato).toBe(true);
      // Il commento dell'altro studente resta intatto
      expect(c1.commenti[1].testo).toBe('Commento di un altro');
    });
  });

  it("lo studente elimina il proprio commento con conferma", async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card uno',
          classi: ['3AI'],
          commenti: [{ id: 1, autore: 'Luca Bianchi', testo: 'Da eliminare', data: '2026-09-01', risposte: [] }],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Card uno', {}, { timeout: 4000 }));
    await screen.findByText('Da eliminare', {}, { timeout: 4000 });

    fireEvent.click(screen.getByRole('button', { name: 'Elimina commento' }));
    // Modale di conferma (stesso titolo dell'aria-label: l'h3, non un bottone)
    await screen.findByText('Elimina commento', {}, { timeout: 4000 });
    const modal = modalRoot('Elimina commento');
    fireEvent.click(within(modal).getByRole('button', { name: '🗑️ Elimina' }));

    await waitFor(() => {
      expect(db._get('cards', 'c1').commenti.length).toBe(0);
    });
    expect(screen.queryByText('Da eliminare')).toBeNull();
  });

  it("il prof può modificare qualsiasi commento (moderazione)", async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card uno',
          commenti: [
            { id: 1, autore: 'Prof', testo: 'Avviso prof', data: '2026-09-01', risposte: [] },
            { id: 2, autore: 'Luca Bianchi', testo: 'Commento studente', data: '2026-09-01', risposte: [] },
          ],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card uno', {}, { timeout: 4000 }));
    await screen.findByText('Avviso prof', {}, { timeout: 4000 });
    expect(screen.getByText('Commento studente')).toBeTruthy();

    // Il prof vede i pulsanti su TUTTI i commenti (propri e degli studenti)
    expect(screen.getAllByRole('button', { name: 'Modifica commento' }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: 'Elimina commento' }).length).toBe(2);

    // Modifica il commento dello STUDENTE
    const editBtns = screen.getAllByRole('button', { name: 'Modifica commento' });
    fireEvent.click(editBtns[1]);
    const ta = await screen.findByDisplayValue('Commento studente');
    fireEvent.input(ta, { target: { value: 'Commento corretto dal prof' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva commento' }));

    expect(await screen.findByText('Commento corretto dal prof', {}, { timeout: 4000 })).toBeTruthy();
    await waitFor(() => {
      const c1 = db._get('cards', 'c1');
      expect(c1.commenti[1].testo).toBe('Commento corretto dal prof');
      expect(c1.commenti[1].modificato).toBe(true);
    });
  });

  // NB: dopo una modifica/eliminazione la CardDetail si aggiorna grazie
  // all'effetto deep-link di AppProvider (?card= nell'URL + deepLinkDone che
  // resta false finché le card non cambiano) che richiama setShowCard con la
  // card fresca dallo snapshot. Se in futuro quel meccanismo cambiasse, questi
  // test (e 'aggiunge un commento') andrebbero rivisti.
});

// ── RISPONDI AI COMMENTI (thread nidificati) ──────────────────────────────
describe('Rispondi ai commenti', () => {
  it("lo studente risponde a un commento e la risposta appare nel thread", async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card uno',
          classi: ['3AI'],
          commenti: [{ id: 1, autore: 'Marco Verdi', testo: 'Bella lezione', data: '2026-09-01', risposte: [] }],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Card uno', {}, { timeout: 4000 }));
    await screen.findByText('Bella lezione', {}, { timeout: 4000 });

    fireEvent.click(screen.getByRole('button', { name: 'Rispondi' }));
    const ta = await screen.findByPlaceholderText('Scrivi una risposta…');
    fireEvent.input(ta, { target: { value: "Sono d'accordo!" } });
    fireEvent.click(screen.getByRole('button', { name: 'Invia risposta' }));

    // La risposta appare nel thread e viene salvata su Firestore con testo
    // integro (niente backslash davanti all'apostrofo)
    expect(await screen.findByText("Sono d'accordo!", {}, { timeout: 4000 })).toBeTruthy();
    await waitFor(() => {
      const c1 = db._get('cards', 'c1');
      expect(c1.commenti[0].risposte.length).toBe(1);
      expect(c1.commenti[0].risposte[0].autore).toBe('Luca Bianchi');
      expect(c1.commenti[0].risposte[0].testo).toBe("Sono d'accordo!");
    });
  });

  it("lo studente elimina la propria risposta (non quella altrui) con conferma", async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card uno',
          classi: ['3AI'],
          commenti: [
            {
              id: 1,
              autore: 'Marco Verdi',
              testo: 'Bella lezione',
              data: '2026-09-01',
              risposte: [
                { id: 11, autore: 'Luca Bianchi', testo: 'La mia risposta', data: '2026-09-01', risposte: [] },
                { id: 12, autore: 'Altro Studente', testo: 'Risposta altrui', data: '2026-09-01', risposte: [] },
              ],
            },
          ],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Card uno', {}, { timeout: 4000 }));
    await screen.findByText('La mia risposta', {}, { timeout: 4000 });
    expect(screen.getByText('Risposta altrui')).toBeTruthy();

    // Solo la risposta propria ha il pulsante elimina (1 su 2)
    expect(screen.getAllByRole('button', { name: 'Elimina commento' }).length).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Elimina commento' }));
    await screen.findByText('Elimina risposta', {}, { timeout: 4000 });
    const modal = modalRoot('Elimina risposta');
    fireEvent.click(within(modal).getByRole('button', { name: '🗑️ Elimina' }));

    await waitFor(() => {
      const risposte = db._get('cards', 'c1').commenti[0].risposte;
      expect(risposte.length).toBe(1);
      expect(risposte[0].testo).toBe('Risposta altrui');
    });
    expect(screen.queryByText('La mia risposta')).toBeNull();
  });

  it("lo studente modifica la propria risposta", async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card uno',
          classi: ['3AI'],
          commenti: [
            {
              id: 1,
              autore: 'Marco Verdi',
              testo: 'Bella lezione',
              data: '2026-09-01',
              risposte: [
                { id: 11, autore: 'Luca Bianchi', testo: 'La mia risposta', data: '2026-09-01', risposte: [] },
              ],
            },
          ],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Card uno', {}, { timeout: 4000 }));
    await screen.findByText('La mia risposta', {}, { timeout: 4000 });

    fireEvent.click(screen.getByRole('button', { name: 'Modifica commento' }));
    const ta = await screen.findByDisplayValue('La mia risposta');
    fireEvent.input(ta, { target: { value: 'Risposta aggiornata' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva commento' }));

    expect(await screen.findByText('Risposta aggiornata', {}, { timeout: 4000 })).toBeTruthy();
    await waitFor(() => {
      const risp = db._get('cards', 'c1').commenti[0].risposte[0];
      expect(risp.testo).toBe('Risposta aggiornata');
      expect(risp.modificato).toBe(true);
    });
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
