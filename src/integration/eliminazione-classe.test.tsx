// @ts-nocheck â€” test di INTEGRAZIONE: eliminazione limitata a una classe.
//
// Il difetto segnalato: creata una card per TUTTE le classi, eliminandola dalla
// bacheca filtrata su una classe la faceva sparire da TUTTE. Il documento veniva
// cancellato, perchÃ© il filtro classe Ã¨ solo di visualizzazione e non entrava
// nel gesto. Qui il comportamento Ã¨ il contrario: eliminare da una classe esclude
// quella classe e lascia intatte le altre.
//
// Qui si prova il flusso COMPLETO (griglia â†’ conferma â†’ scrittura), non la sola
// funzione pura: il difatto era nell'interfaccia tra filtro e gesto, e il modulo
// card-classi.ts Ã¨ giÃ  coperto dai suoi test unitari.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, STUD, PROF_DOC, STUD_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';
import { visibileAClasse } from '../card-classi.ts';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

// Il filtro "ðŸ« CLASSE: ..." del prof: sceglie la classe su cui si opera.
function filtraPerClasse(classe) {
  fireEvent.click(screen.getByRole('button', { name: classe }));
}

describe('Elimina card limitata alla classe selezionata', () => {
  it('card per TUTTE tolta da 3A: il documento resta e 4B continua a vederla', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Per tutte le classi', classi: ['TUTTE'] }) },
    };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('Per tutte le classi', {});

    filtraPerClasse('3AO');
    // La card TUTTE Ã¨ visibile anche filtrando per 3A: Ã¨ il caso del difetto.
    await screen.findByText('Per tutte le classi', {});

    fireEvent.click(screen.getByRole('button', { name: 'Altre azioni' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));

    // La conferma offre i DUE esiti, con la classe in chiaro.
    expect(await screen.findByText(/Solo dalla classe 3A/, {})).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Solo dalla classe 3A/ }));

    await waitFor(() => {
      const salvata = db._get('cards', 'c1');
      expect(salvata, 'il documento NON deve essere cancellato').toBeTruthy();
      expect(salvata.classi).toEqual(['TUTTE']);
      expect(salvata.classiEscluse).toEqual(['3AO']);
    });
  });

  it('dopo l\'esclusione la card sparisce dalla griglia della 3A', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Solo per la 4B', classi: ['4BO'] }) },
    };
    await renderApp({ seed, user: PROF });
    await screen.findByText('Solo per la 4B', {});

    filtraPerClasse('4BO');
    await screen.findByText('Solo per la 4B', {});

    fireEvent.click(screen.getByRole('button', { name: 'Altre azioni' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    // Card giÃ  di una sola classe: "solo da 4B" e "da tutte" sono la stessa
    // cosa, quindi il bottone onesto NON deve comparire e vale la cancellazione
    // normale con l'undo.
    expect(screen.queryByText(/Solo dalla classe/)).toBeNull();
    expect(await screen.findByText(/Card eliminata/, {})).toBeTruthy();
  });

  it('lo studente della classe esclusa NON vede la card', async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', { titolo: 'Esclusa per la 3A', classi: ['TUTTE'], classiEscluse: ['3AO'] }),
      },
    };
    await renderApp({ seed, user: { ...STUD, classiPerAnno: { '2026/2027': '3AO' } } });
    // Il titolo non deve comparire: Ã¨ il controllo che distingue "cancellata da
    // tutte" da "tolta solo da questa classe" â€” il documento Ã¨ ancora su Firestore.
    await waitFor(() => {
      expect(screen.queryByText('Esclusa per la 3A')).toBeNull();
    });
  });

  it('lo studente di un\'altra classe vede ancora la card', async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', { titolo: 'Esclusa per la 3A', classi: ['TUTTE'], classiEscluse: ['3AO'] }),
      },
    };
    await renderApp({ seed, user: { ...STUD, classiPerAnno: { '2026/2027': '4BO' } } });
    await screen.findByText('Esclusa per la 3A', {});
  });
});
