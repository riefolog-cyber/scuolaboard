// @ts-nocheck — test di integrazione: monta l'app vera con Firebase finto.
//
// PERCHÉ ESISTE: la misura dell'apertura parte dentro `openCard`
// (`AppProvider`), non nel call-site. I test di `utils/apertura-card.test.ts`
// provano il modulo (segna/chiudi/percentili), ma NON il collegamento: se
// qualcuno toglie `segnaApertura()` da `openCard`, quei test restano verdi e la
// Diagnostica mostra numeri vecchi.
//
// Si apre dalla vista ELENCO perché è il caso che il modulo non può coprire:
// lì non c'è `.card-wrap`, quindi una misura agganciata al click di `CardItem`
// non partirebbe mai. La griglia non serve a un secondo test: ogni test di
// integrazione che apre una card passa già da `openCard`.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';
import { azzeraApertura, campioniApertura } from '../utils/apertura-card.ts';

beforeEach(function () {
  setupTestEnv();
  azzeraApertura();
});
afterEach(teardownTestEnv);

describe('apertura della card · wiring con openCard', function () {
  it('aprire dalla vista ELENCO registra una misura', async function () {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card in elenco' }) } };
    await renderApp({ seed, user: PROF });

    // La prima findByText attende il boot (splash/login compresi): solo allora
    // il toggle delle viste esiste nel DOM.
    await screen.findByText('Card in elenco');
    fireEvent.click(screen.getByTitle('Elenco'));
    // Il nodo può essere stato rimpiazzato dal cambio vista (griglia → elenco).
    fireEvent.click(await screen.findByText('Card in elenco'));

    await waitFor(function () {
      if (!document.querySelector('.modal-inner')) throw new Error('CardDetail non aperta');
    });
    // Un campione chiuso implica anche durataApertura() non nullo: un solo assert.
    expect(campioniApertura()).toBe(1);
  });
});
