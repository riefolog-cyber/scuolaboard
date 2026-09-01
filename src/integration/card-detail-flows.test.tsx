// @ts-nocheck — test di INTEGRAZIONE: CardDetail in stato APERTO.
// Il smoke test (lazy-modals) monta CardDetail solo CHIUSA (showCard null →
// return null prima di tutto). Qui apriamo la card cliccando il titolo nella
// griglia e verifichiamo le AZIONI dal pannello: like, reazioni, commenti,
// rimozione scadenza, badge NASCOSTA/allegati, voto sondaggio (studente),
// chiusura. Le scritture si verificano sul db finto (window.db).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, STUD, PROF_DOC, STUD_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

// Clicca il titolo nella griglia e restituisce lo scope DENTRO la modale
// (.modal-inner): CardDetail è un overlay z-index 200, la griglia sotto ha
// bottoni con lo stesso testo (es. 👍 nella CardItem).
async function openCard(titolo) {
  fireEvent.click(await screen.findByText(titolo, {}, { timeout: 4000 }));
  const el = await waitFor(() => {
    const node = document.querySelector('.modal-inner');
    if (!node) throw new Error('CardDetail non aperta');
    return node;
  });
  return within(el);
}

describe('CardDetail — stato APERTO', () => {
  it('il prof fa like dalla card aperta (likes 0 → 1)', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card like' }) } };
    const { db } = await renderApp({ seed, user: PROF });

    const detail = await openCard('Card like');
    await detail.findByRole('button', { name: /👍/ }, {}, { timeout: 4000 });

    fireEvent.click(detail.getByRole('button', { name: /👍/ }));
    await waitFor(() => expect(db._get('cards', 'c1').likes).toBe(1));
  });

  it('il prof reagisce con un emoji (reazioni[emoji] contiene il suo nome)', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card reazione' }) } };
    const { db } = await renderApp({ seed, user: PROF });

    const detail = await openCard('Card reazione');
    fireEvent.click(await detail.findByRole('button', { name: 'Reagisci 🤔' }, {}, { timeout: 4000 }));

    await waitFor(() => {
      const re = db._get('cards', 'c1').reazioni;
      expect((re && re['🤔']) || []).toContain('Prof');
    });
  });

  it('il prof scrive un commento dal pannello', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card commento' }) } };
    const { db } = await renderApp({ seed, user: PROF });

    const detail = await openCard('Card commento');
    const ta = await detail.findByRole('textbox', { name: 'Scrivi un commento' }, {}, { timeout: 4000 });

    fireEvent.input(ta, { target: { value: 'Ottima lezione' } });
    fireEvent.click(detail.getByRole('button', { name: 'Invia' }));

    await waitFor(() => {
      const cm = db._get('cards', 'c1').commenti;
      expect(cm.length).toBe(1);
      expect(cm[0].testo).toBe('Ottima lezione');
      expect(cm[0].autore).toBe('Prof');
    });
  });

  it('il prof rimuove la scadenza dalla card aperta', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Card scadenza', scadenza: '2026-12-31T23:59' }) },
    };
    const { db } = await renderApp({ seed, user: PROF });

    const detail = await openCard('Card scadenza');
    // Il countdown è '⏰ <tempo>' — regex esclude il bottone '⏰ Timer'
    await detail.findByText(/⏰\s+\d/, {}, { timeout: 4000 });

    fireEvent.click(detail.getByRole('button', { name: 'Rimuovi scadenza' }));
    await waitFor(() => expect(db._get('cards', 'c1').scadenza).toBeFalsy());
  });

  it('card nascosta: badge NASCOSTA e allegati visibili al prof', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card nascosta',
          visibile: false,
          allegati: [{ url: 'https://x.it/dispensa', nome: 'dispensa.pdf' }],
        }),
      },
    };
    await renderApp({ seed, user: PROF });

    const detail = await openCard('Card nascosta');
    expect(await detail.findByText('NASCOSTA', {}, { timeout: 4000 })).toBeTruthy();
    expect(detail.getByText('📄 dispensa.pdf')).toBeTruthy();
  });

  it('lo studente vota nel sondaggio dalla card aperta', async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Sondaggio',
          tipo: 'sondaggio',
          opzioni: [
            { id: 'o1', testo: 'Sì', voti: [] },
            { id: 'o2', testo: 'No', voti: [] },
          ],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: STUD });

    const detail = await openCard('Sondaggio');
    fireEvent.click(await detail.findByRole('button', { name: 'Vota Sì' }, {}, { timeout: 4000 }));

    await waitFor(() => {
      const opz = db._get('cards', 'c1').opzioni;
      expect(opz[0].voti).toContain('Luca Bianchi');
    });
  });

  it('lo studente mette like; se la card è sua vede ✏️ Modifica (isOwner)', async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Card studente', autore: 'Luca Bianchi' }) },
    };
    const { db } = await renderApp({ seed, user: STUD });

    const detail = await openCard('Card studente');
    fireEvent.click(await detail.findByRole('button', { name: /👍/ }, {}, { timeout: 4000 }));

    await waitFor(() => expect(db._get('cards', 'c1').likes).toBe(1));
    // isOwner: autore === myName(user) ('Luca Bianchi') e !isProf
    expect(detail.getAllByRole('button', { name: '✏️ Modifica' }).length).toBeGreaterThan(0);
  });

  it('chiude la card al click sulla X (overlay smontato)', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card da chiudere' }) } };
    await renderApp({ seed, user: PROF });

    const detail = await openCard('Card da chiudere');
    fireEvent.click(detail.getByRole('button', { name: 'Chiudi card' }));

    await waitFor(() => expect(document.querySelector('.modal-inner')).toBeNull());
  });

  // Fix C1: il riassunto AI dei commenti era ricalcolato a OGNI click (e dopo
  // ogni reload), anche senza commenti nuovi. Ora viene PERSISTITO in
  // ai_results/{id}.sommario e riusato: la seconda apertura NON chiama l'AI.
  it('Riassumi: la prima volta chiama l AI e salva; la seconda NON la richiama', async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      clone: () => ({ json: async () => ({}) }),
      json: async () => ({ success: true, data: { content: 'riassunto persistito' } }),
    });
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card discussione',
          commenti: [
            { id: 'cm1', autore: 'Luca', testo: 'primo' },
            { id: 'cm2', autore: 'Anna', testo: 'secondo' },
          ],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    const detail = await openCard('Card discussione');

    // 1) Primo click: chiama l'AI e PERSISTE il sommario con nCommenti
    fireEvent.click(await detail.findByRole('button', { name: '📝 Riassumi' }, {}, { timeout: 4000 }));
    expect(await screen.findByText(/riassunto persistito/, {}, { timeout: 6000 })).toBeTruthy();
    await waitFor(() => {
      const saved = db._get('ai_results', 'c1');
      expect(saved && saved.sommario).toBeTruthy();
      expect(saved.sommario.testo).toBe('riassunto persistito');
      expect(saved.sommario.nCommenti).toBe(2);
    });
    const callsDopoPrima = window.fetch.mock.calls.length;

    // 2) Chiudi la modale e riapri: risultato dalla cache, NESSUNA nuova chiamata AI
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    await waitFor(() => expect(screen.queryByText(/Riassunto discussione/)).toBeNull());
    fireEvent.click(detail.getByRole('button', { name: '📝 Riassumi' }));
    expect(await screen.findByText(/riassunto persistito/, {}, { timeout: 4000 })).toBeTruthy();
    expect(window.fetch).toHaveBeenCalledTimes(callsDopoPrima);
  });
});
