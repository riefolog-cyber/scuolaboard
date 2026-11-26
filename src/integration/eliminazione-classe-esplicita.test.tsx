// @ts-nocheck — test di INTEGRAZIONE: «togli dalla classe» su una card
// destinata a PIÙ classi esplicite.
//
// Il gesto passava sempre da `classiEscluse`: su una card «3A, 4B» filtrata
// sulla 3A il documento finiva con `classi: ["3A","4B"]` + `classiEscluse:
// ["3A"]`, cioè diceva che la 3A è destinataria proprio mentre la si toglieva.
// L'editor, risalvando, applica `escluseCoerenti` e l'esclusione sparisce: il
// gesto veniva annullato in silenzio. Qui si prova il flusso COMPLETO, perché
// il difetto stava nell'interfaccia fra il gesto e il documento.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

// Il filtro "🏫 CLASSE: ..." del prof: sceglie la classe su cui si opera.
function filtraPerClasse(classe) {
  fireEvent.click(screen.getByRole('button', { name: classe }));
}

describe('Togli da una classe una card destinata a più classi', () => {
  it('la classe esce da `classi` e NON finisce fra le escluse', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Matematica per 3A e 4B', classi: ['3AO', '4BO'] }) },
    };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('Matematica per 3A e 4B');

    filtraPerClasse('3AO');
    await screen.findByText('Matematica per 3A e 4B');

    fireEvent.click(screen.getByRole('button', { name: 'Altre azioni' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    expect(await screen.findByText(/Solo dalla classe 3A/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Solo dalla classe 3A/ }));

    await waitFor(() => {
      const salvata = db._get('cards', 'c1');
      expect(salvata, 'il documento NON deve essere cancellato').toBeTruthy();
      expect(salvata.classi).toEqual(['4BO']);
      expect(salvata.classiEscluse || []).toEqual([]);
    });
  });
});
