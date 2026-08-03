// @ts-nocheck — test di INTEGRAZIONE: eliminazione dell'analisi AI del prof
// dalla card (bottone 🗑️ Elimina analisi nel pannello AI della CardDetail).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, STUD, STUD_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

describe('Eliminazione analisi AI (prof)', () => {
  it('rimuove aiAnalisi dalla card e cancella il doc ai_results', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card con analisi',
          aiAnalisi: {
            sintesi: 'Sintesi del tema',
            dinamica: 'Posizioni degli studenti',
            spunto: 'Un azione per il prof',
            domande_stimolo: ['Domanda 1', 'Domanda 2', 'Domanda 3'],
            data: '2026-09-01T10:00:00',
            cardTitolo: 'Card con analisi',
          },
        }),
      },
      ai_results: {
        c1: {
          analisi: {
            sintesi: 'Sintesi del tema',
            dinamica: 'Posizioni degli studenti',
            spunto: 'Un azione per il prof',
            domande_stimolo: ['Domanda 1', 'Domanda 2', 'Domanda 3'],
            data: '2026-09-01T10:00:00',
            cardTitolo: 'Card con analisi',
          },
        },
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card con analisi', {}, { timeout: 4000 }));

    // Apre il pannello AI (bottone "🤖 ▼ AI") e clicca "🗑️ Elimina analisi".
    // NB: CardDetail è lazy-loaded → findByRole (async), non getByRole.
    // NB: /AI/ da solo matcha anche "🤖 Fai una domanda all'AI" → usiamo /▼ AI/.
    fireEvent.click(await screen.findByRole('button', { name: /▼ AI/ }, { timeout: 4000 }));
    await screen.findByText('↻ Rigenera', {}, { timeout: 4000 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: '🗑️ Elimina analisi' }));

    // La card perde aiAnalisi e il doc ai_results viene cancellato
    await waitFor(() => {
      const card = db._get('cards', 'c1');
      expect(card.aiAnalisi).toBeFalsy();
      expect(db._get('ai_results', 'c1')).toBeFalsy();
    });

    // La UI: il pannello AI si chiude (non mostra più la sintesi)
    await waitFor(() => {
      expect(screen.queryByText('Sintesi del tema')).toBeNull();
    });
  });

  it('non elimina nulla se l\'utente annulla il confirm', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card con analisi 2',
          aiAnalisi: { sintesi: 'Da tenere', data: '2026-09-01T10:00:00' },
        }),
      },
      ai_results: { c1: { analisi: { sintesi: 'Da tenere' } } },
    };
    const { db } = await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card con analisi 2', {}, { timeout: 4000 }));

    fireEvent.click(await screen.findByRole('button', { name: /▼ AI/ }, { timeout: 4000 }));
    await screen.findByText('↻ Rigenera', {}, { timeout: 4000 });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: '🗑️ Elimina analisi' }));

    // Nessun cambiamento: l'analisi resta (il handler torna subito su confirm=false)
    expect(db._get('cards', 'c1').aiAnalisi.sintesi).toBe('Da tenere');
    expect(db._get('ai_results', 'c1').analisi.sintesi).toBe('Da tenere');
  });

  it('elimina la cronologia delle domande all\'AI preservando l\'analisi', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card con domande AI',
          aiAnalisi: { sintesi: 'Sintesi del tema', data: '2026-09-01T10:00:00' },
        }),
      },
      ai_results: {
        c1: {
          analisi: { sintesi: 'Sintesi del tema', data: '2026-09-01T10:00:00' },
          domande: [
            { id: 1, q: 'Spiega il teorema?', risposta: 'Il teorema afferma…', data: '2026-09-01T10:00:00' },
            { id: 2, q: 'Che cos\'è una frazione?', risposta: 'Un numero…', data: '2026-09-01T10:00:00' },
          ],
        },
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card con domande AI', {}, { timeout: 4000 }));

    // Apre il riquadro "Fai una domanda all'AI" (CardDetail è lazy → findByRole)
    fireEvent.click(
      await screen.findByRole('button', { name: /Fai una domanda all'AI/ }, { timeout: 4000 })
    );
    // Le domande già salvate sono visibili nel riquadro.
    // NB: la domanda è renderizzata come "❓ <testo>" → match parziale (regex).
    await screen.findByText(/Spiega il teorema/, {}, { timeout: 4000 });

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: '🗑️ Elimina domande' }));

    // Le domande spariscono, ma l'analisi nel doc ai_results resta intatta
    await waitFor(() => {
      const doc = db._get('ai_results', 'c1');
      expect(doc.domande).toEqual([]);
      expect(doc.analisi.sintesi).toBe('Sintesi del tema');
    });
    await waitFor(() => {
      expect(screen.queryByText(/Spiega il teorema/)).toBeNull();
    });
  });

  it('non elimina le domande all\'AI se l\'utente annulla il confirm', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card con domande AI 2',
          aiAnalisi: { sintesi: 'Sintesi del tema', data: '2026-09-01T10:00:00' },
        }),
      },
      ai_results: {
        c1: {
          analisi: { sintesi: 'Sintesi del tema' },
          domande: [{ id: 1, q: 'Domanda da tenere?', risposta: 'Risposta', data: '2026-09-01T10:00:00' }],
        },
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card con domande AI 2', {}, { timeout: 4000 }));

    fireEvent.click(
      await screen.findByRole('button', { name: /Fai una domanda all'AI/ }, { timeout: 4000 })
    );
    await screen.findByText(/Domanda da tenere/, {}, { timeout: 4000 });

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: '🗑️ Elimina domande' }));

    // Nessun cambiamento: le domande restano
    expect(db._get('ai_results', 'c1').domande.length).toBe(1);
    expect(screen.getByText(/Domanda da tenere/)).toBeTruthy();
  });
});

describe('REGRESSIONE crash: runCardAI non deve mai portare aiMap a undefined', () => {
  it('dopo aver generato un\'analisi, aprire "Fai una domanda all\'AI" non crasha', async () => {
    // BUG REALE: runCardAI chiamava refreshCallback() senza argomenti → il
    // wrapper faceva setAiMap(undefined) → aiMap=undefined → aprendo il pannello
    // "Fai una domanda all'AI" (che legge $.aiMap[cardId]) l'app esplodeva con
    // "Cannot read properties of undefined (reading '<cardId>')".
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Card da analizzare' }) },
    };
    // Mock del Worker AI: chiamaAI → fetch(WORKER_URL) → risposta JSON valida.
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      clone: () => ({ json: async () => ({}) }),
      json: async () => ({
        success: true,
        data: {
          content: JSON.stringify({
            sintesi: 'Sintesi nuova generata',
            dinamica: 'Dinamica del confronto',
            spunto: 'Spunto didattico',
            domande_stimolo: ['Domanda stimolo'],
          }),
        },
      }),
    });
    const { db } = await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card da analizzare', {}, { timeout: 4000 }));

    // Avvia l'analisi AI (bottone "🤖 + AI": la card non ha ancora analisi)
    fireEvent.click(await screen.findByRole('button', { name: /\+ AI/ }, { timeout: 4000 }));
    // Attende il completamento (la sintesi appare nel pannello AI)
    await screen.findByText(/Sintesi nuova generata/, {}, { timeout: 5000 });

    // Ora apre il riquadro "Fai una domanda all'AI": con il bug qui avveniva
    // il crash (aiMap=undefined); con il fix aiMap resta un oggetto.
    fireEvent.click(screen.getByRole('button', { name: /Fai una domanda all'AI/ }));
    expect(screen.getByPlaceholderText(/Fai una domanda all'AI su questa lezione/)).toBeTruthy();

    // L'analisi è stata persistita nel doc ai_results
    await waitFor(() => {
      expect(db._get('ai_results', 'c1')).toBeTruthy();
    });
  });
});

describe('Pannello AI: spunti per riflettere (domande_stimolo)', () => {
  it('il prof vede gli spunti generati dall\'AI, con l\'indicazione che sono visibili agli studenti', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card con spunti',
          aiAnalisi: {
            sintesi: 'Sintesi del tema',
            dinamica: 'Dinamica del confronto',
            spunto: 'Un azione per il prof',
            domande_stimolo: ['Domanda stimolo 1', 'Domanda stimolo 2'],
            data: '2026-09-01T10:00:00',
            cardTitolo: 'Card con spunti',
          },
        }),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card con spunti', {}, { timeout: 4000 }));

    // Apre il pannello AI del prof (bottone "🤖 ▼ AI")
    fireEvent.click(await screen.findByRole('button', { name: /▼ AI/ }, { timeout: 4000 }));
    await screen.findByText('↻ Rigenera', {}, { timeout: 4000 });

    // Gli spunti (prima visibili SOLO agli studenti) ora compaiono anche al prof
    expect(screen.getByText('Domanda stimolo 1')).toBeTruthy();
    expect(screen.getByText('Domanda stimolo 2')).toBeTruthy();
    expect(screen.getByText(/visibili agli studenti/)).toBeTruthy();
  });

  it('lo studente vede l\'analisi completa (sintesi, dinamica, spunto, spunti) come il prof', async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card con spunti',
          classi: ['3AI'],
          aiAnalisi: {
            sintesi: 'Sintesi del tema',
            dinamica: 'Dinamica del confronto',
            spunto: 'Un azione per il prof',
            domande_stimolo: ['Domanda stimolo 1'],
            data: '2026-09-01T10:00:00',
            cardTitolo: 'Card con spunti',
          },
        }),
      },
    };
    const { db } = await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Card con spunti', {}, { timeout: 4000 }));

    // Lo studente apre il pannello con "🤖 ▼ Analisi AI"
    fireEvent.click(await screen.findByRole('button', { name: /Analisi AI/ }, { timeout: 4000 }));

    // L'analisi è completa: lo studente vede tutte e 4 le sezioni come il prof
    expect(screen.getByText(/Sintesi del tema/)).toBeTruthy();
    expect(screen.getByText(/Dinamica del confronto/)).toBeTruthy();
    expect(screen.getByText(/Un azione per il prof/)).toBeTruthy();
    expect(screen.getByText('Domanda stimolo 1')).toBeTruthy();
    // Ma NON i controlli riservati al prof
    expect(screen.queryByText('↻ Rigenera')).toBeNull();
    expect(screen.queryByText('🗑️ Elimina analisi')).toBeNull();
  });
});
