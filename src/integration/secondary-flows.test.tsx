// @ts-nocheck — test di INTEGRAZIONE: flussi secondari (duplica, copia anno,
// elimina+undo, proposte, AI gating prof, gestione studenti).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, STUD, PROF_DOC, STUD_DOC, mkCard, modalRoot, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

// ── DUPLICA CARD ──────────────────────────────────────────────────────────
describe('Duplica card (prof)', () => {
  it('apre la DuplicaModal, seleziona una classe e crea la copia', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Lezione su X' }) } };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('Lezione su X', {}, { timeout: 4000 });

    // Apre la modal (bottone 📋 nella card)
    const duplicaBtn = screen.getAllByRole('button').find((b) => b.textContent === '📋');
    fireEvent.click(duplicaBtn);

    await screen.findByText('Duplica card', {}, { timeout: 4000 });
    const modal = modalRoot('Duplica card');
    // Scoping alla modale: la chip '3AO' esiste anche in FilterBar
    fireEvent.click(within(modal).getByRole('button', { name: '3AO' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Duplica in 1 classe' }));

    await waitFor(() => {
      const copie = db._all('cards').filter(([, c]) => c.titolo === 'Lezione su X [3AO]');
      expect(copie.length).toBe(1);
      const copia = copie[0][1];
      expect(copia.classi).toEqual(['3AO']);
      expect(copia.commenti).toEqual([]);
      expect(copia.likes).toBe(0);
      expect(copia.id).not.toBe('c1');
    });
  });
});

// ── COPIA IN ALTRO ANNO ───────────────────────────────────────────────────
describe('Copia in altro anno (prof)', () => {
  it('crea la copia nascosta nell anno selezionato, senza commenti e voti', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Lezione su Y' }) } };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('Lezione su Y', {}, { timeout: 4000 });

    fireEvent.click(screen.getByRole('button', { name: 'Copia in altro anno' }));
    await screen.findByText('Copia in altro anno', {}, { timeout: 4000 });
    const modal = modalRoot('Copia in altro anno');

    // Scoping alla modale: la Header ha un altro <select> per l'anno scolastico
    const select = within(modal).getByRole('combobox');
    fireEvent.change(select, { target: { value: '2027/2028' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Copia' }));

    await waitFor(() => {
      const copie = db._all('cards').filter(([, c]) => c.annoScolastico === '2027/2028');
      expect(copie.length).toBe(1);
      const copia = copie[0][1];
      expect(copia.visibile).toBe(false);
      expect(copia.commenti).toEqual([]);
      expect(copia.likes).toBe(0);
      expect(copia.id).not.toBe('c1');
    });
  });
});

// ── ELIMINA + UNDO ────────────────────────────────────────────────────────
describe('Elimina card con undo (prof)', () => {
  it('mostra il toast e al clic su "Annulla" la card resta', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Da eliminare' }) } };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('Da eliminare', {}, { timeout: 4000 });

    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    // Il toast contiene icona + messaggio + bottone undo: match parziale
    expect(await screen.findByText(/Card eliminata/, {}, { timeout: 4000 })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '↩ Annulla' }));
    await waitFor(() => {
      expect(db._get('cards', 'c1')).toBeTruthy(); // la card esiste ancora
    });
  });

  // Bug B4: il setTimeout da 5s della cancellazione era ORFANO — se il
  // componente smontava prima dello scadere (es. logout/refresh), il timer
  // girava comunque e fbDel partiva DOPO lo smontaggio (cancellazione
  // "spettrale" di una card che l'utente aveva deciso di tenere).
  it('smontando l app prima dei 5s la card NON viene cancellata dopo (timer pulito)', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Da non cancellare' }) } };
    const { db, unmount } = await renderApp({ seed, user: PROF });
    await screen.findByText('Da non cancellare', {}, { timeout: 4000 });

    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    await screen.findByText(/Card eliminata/, {}, { timeout: 4000 });

    // Smonta SUBITO (prima dello scadere dei 5s): il cleanup deve fare
    // clearTimeout sul ref del timer di undo.
    unmount();

    // Aspetta PIÙ dei 5s del timer originale: senza il fix B4 fbDel
    // verrebbe eseguito qui e la card sparirebbe dal db.
    await new Promise((r) => setTimeout(r, 5600));
    expect(db._get('cards', 'c1')).toBeTruthy(); // ancora presente: timer annullato
  }, 15000);
});

// ── PROPOSTE STUDENTE → PROF ──────────────────────────────────────────────
describe('Proposte studente → approva/rifiuta (prof)', () => {
  it('lo studente invia una proposta che finisce in attesa', async () => {
    const seed = { users: { stud1: STUD_DOC }, cards: {} };
    const { db } = await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByTitle('Proponi card', {}, { timeout: 4000 }));
    fireEvent.input(screen.getByPlaceholderText('Es. Riflessione su…'), { target: { value: 'Proposta studente' } });
    fireEvent.input(screen.getByPlaceholderText('Descrizione, spunti…'), { target: { value: 'contenuto proposta' } });
    fireEvent.click(screen.getByText('📤 Invia proposta'));

    await waitFor(() => {
      const prop = db._all('cards').find(([, c]) => c.titolo === 'Proposta studente');
      expect(prop).toBeTruthy();
      expect(prop[1].proposta).toBe(true);
    });
  });

  it('il prof approva una proposta in attesa (diventa card pubblica)', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        p1: mkCard('p1', { titolo: 'Proposta di Luca', autore: 'Luca Bianchi', proposta: true }),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('⏳ PROPOSTE IN ATTESA', {}, { timeout: 4000 });
    // La proposta appare sia nel pannello sia nella griglia: match multiplo
    await screen.findAllByText('Proposta di Luca', {}, { timeout: 4000 });

    // Il bottone ✓ approva
    const approveBtn = screen.getAllByRole('button').find((b) => b.textContent.trim() === '✓');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      const c = db._get('cards', 'p1');
      expect(c.proposta).toBe(false);
    });
  });

  it('il prof rifiuta una proposta con motivazione', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        p1: mkCard('p1', { titolo: 'Proposta da bocciare', autore: 'Luca Bianchi', proposta: true }),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('⏳ PROPOSTE IN ATTESA', {}, { timeout: 4000 });

    const rejectBtn = screen.getAllByRole('button').find((b) => b.textContent.trim() === '✕');
    fireEvent.click(rejectBtn);

    await screen.findByText('Rifiuta proposta', {}, { timeout: 4000 });
    fireEvent.input(screen.getByPlaceholderText('Es. Argomento già trattato, fuori tema…'), {
      target: { value: 'Fuori programma' },
    });
    fireEvent.click(screen.getByRole('button', { name: '❌ Rifiuta' }));

    await waitFor(() => {
      const c = db._get('cards', 'p1');
      expect(c.proposta).toBe('rifiutata');
      expect(c.motivazioneRifiuto).toBe('Fuori programma');
    });
  });
});

// ── AI: solo prof ─────────────────────────────────────────────────────────
describe('Gating AI (solo prof)', () => {
  it("il prof vede il bottone '🤖 + AI' nella card", async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card AI prof' }) } };
    await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card AI prof', {}, { timeout: 4000 }));
    await screen.findByText('🤖 + AI', {}, { timeout: 4000 });
  });
});

// ── GESTIONE STUDENTI ─────────────────────────────────────────────────────
describe('Gestione studenti (prof)', () => {
  it('carica e visualizza gli studenti registrati', async () => {
    const seed = {
      users: {
        prof1: PROF_DOC,
        stud1: STUD_DOC,
        stud2: {
          role: 'studente',
          nome: 'Giulia',
          cognome: 'Verdi',
          // Classe scelta per l'ANNO CORRENTE: deve comparire nell'elenco
          classiPerAnno: { '2026/2027': '3AI' },
          displayName: 'Giulia Verdi',
        },
        stud3: {
          role: 'studente',
          nome: 'Marco',
          cognome: 'Neri',
          // Solo campo legacy piatto `classe` (anno scorso), NESSUNA classe
          // per l'anno corrente → NON deve comparire nell'elenco
          classe: '4BI',
          displayName: 'Marco Neri',
        },
        stud4: {
          role: 'studente',
          nome: 'Sara',
          cognome: 'Russo',
          // Stato prodotto da rimuoviStudente: classiPerAnno[anno] = null
          // (rimozione persistita) → NON deve ricomparire al reload
          classiPerAnno: { '2026/2027': null },
          displayName: 'Sara Russo',
        },
      },
      cards: {},
    };
    await renderApp({ seed, user: PROF });

    // Attende il caricamento dell'app (auth prof) prima di cliccare la tab 👥
    // (Fase 8b: il bottone ora ha aria-label "Gestione studenti" invece del solo emoji)
    const tabStudenti = await screen.findByRole('button', { name: /Gestione studenti/ }, {}, { timeout: 4000 });
    fireEvent.click(tabStudenti);
    expect(await screen.findByText('👥 Gestione Studenti', {}, { timeout: 4000 })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Carica studenti/ }));
    expect(await screen.findByText('Luca Bianchi', {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText('Giulia Verdi')).toBeTruthy();
    // Lo studente con la sola classe legacy dello scorso anno è escluso
    expect(screen.queryByText('Marco Neri')).toBeNull();
    // …e anche lo studente rimosso (classiPerAnno[anno] = null)
    expect(screen.queryByText('Sara Russo')).toBeNull();
  });

  it('mostra gli studenti legacy quando si seleziona l anno 2025/2026', async () => {
    const seed = {
      users: {
        prof1: PROF_DOC,
        // Studente del vecchio sistema: SOLO campo piatto `classe`, nessun
        // classiPerAnno → appartiene all'anno legacy (2025/2026)
        stud1: { role: 'studente', nome: 'Marco', cognome: 'Neri', classe: '4BI', displayName: 'Marco Neri' },
      },
      cards: {},
    };
    await renderApp({ seed, user: PROF });

    // Cambia anno scolastico a 2025/2026 dal menu dell'Header
    fireEvent.click(await screen.findByRole('button', { name: /2026\/2027/ }, {}, { timeout: 4000 }));
    fireEvent.click(await screen.findByRole('button', { name: '2025/2026' }, {}, { timeout: 4000 }));

    const tabStudenti = await screen.findByRole('button', { name: /Gestione studenti/ }, {}, { timeout: 4000 });
    fireEvent.click(tabStudenti);
    fireEvent.click(screen.getByRole('button', { name: /Carica studenti/ }));

    // Lo studente legacy compare nell'anno vecchio
    expect(await screen.findByText('Marco Neri', {}, { timeout: 4000 })).toBeTruthy();
  });

  it('ordina gli studenti per cognome (A→Z) e mostra numeri progressivi per classe', async () => {
    // Cognomi in ordine NON alfabetico nel seed: l'ordinamento deve rimetterli a posto
    const seed = {
      users: {
        prof1: PROF_DOC,
        stud1: {
          role: 'studente',
          nome: 'Luca',
          cognome: 'Bianchi',
          classiPerAnno: { '2026/2027': '3AI' },
          displayName: 'Luca Bianchi',
        },
        stud2: {
          role: 'studente',
          nome: 'Giulia',
          cognome: 'Verdi',
          classiPerAnno: { '2026/2027': '3AI' },
          displayName: 'Giulia Verdi',
        },
        stud3: {
          role: 'studente',
          nome: 'Anna',
          cognome: 'Rossi',
          classiPerAnno: { '2026/2027': '3AI' },
          displayName: 'Anna Rossi',
        },
      },
      cards: {},
    };
    await renderApp({ seed, user: PROF });

    const tabStudenti = await screen.findByRole('button', { name: /Gestione studenti/ }, {}, { timeout: 4000 });
    fireEvent.click(tabStudenti);
    fireEvent.click(screen.getByRole('button', { name: /Carica studenti/ }));

    await screen.findByText('Luca Bianchi', {}, { timeout: 4000 });

    // Ordinamento per cognome: Bianchi < Rossi < Verdi (posizione nel DOM,
    // jsdom non calcola il layout quindi getBoundingClientRect darebbe tutto 0)
    const elBianchi = screen.getByText('Luca Bianchi');
    const elRossi = screen.getByText('Anna Rossi');
    const elVerdi = screen.getByText('Giulia Verdi');
    const following = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    expect(following(elBianchi, elRossi)).toBe(true);
    expect(following(elRossi, elVerdi)).toBe(true);

    // Numeri progressivi 1, 2, 3 (avatar con il numero, non la lettera)
    [1, 2, 3].forEach((n) => {
      expect(screen.getByText(String(n))).toBeTruthy();
    });
    // La lettera iniziale non deve comparire come avatar
    expect(screen.queryByText('L')).toBeNull();
  });

  it('mostra il bottone Esporta CSV solo dopo il caricamento degli studenti', async () => {
    const seed = {
      users: {
        prof1: PROF_DOC,
        stud1: {
          role: 'studente',
          nome: 'Luca',
          cognome: 'Bianchi',
          classiPerAnno: { '2026/2027': '3AI' },
          displayName: 'Luca Bianchi',
        },
      },
      cards: {},
    };
    await renderApp({ seed, user: PROF });

    const tabStudenti = await screen.findByRole('button', { name: /Gestione studenti/ }, {}, { timeout: 4000 });
    fireEvent.click(tabStudenti);

    // Prima del caricamento il bottone di esportazione non deve esistere
    expect(screen.queryByRole('button', { name: /Esporta CSV/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Carica studenti/ }));
    await screen.findByText('Luca Bianchi', {}, { timeout: 4000 });

    // Dopo il caricamento compare il bottone Esporta CSV
    expect(screen.getByRole('button', { name: /Esporta CSV/ })).toBeTruthy();
  });
});
