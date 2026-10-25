// @ts-nocheck — test di INTEGRAZIONE: il contenuto degli allegati vive in
// `cards/{cardId}/allegati/{fileId}`, non nel documento della card.
//
// Perché: un documento Firestore è limitato a 1 MiB e una card con copertina +
// due PDF lo superava ("Card troppo grande (961KB)", caso reale). Qui si verifica
// il percorso completo sul Firestore finto: upload → sottocollezione → card
// leggera → apertura → duplica → eliminazione.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, modalRoot, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

const PDF_URL = 'data:application/pdf;base64,JVBERi0xLjQK';

// Le azioni di gestione stanno dietro il toggle "Altre azioni" della card.
function apriAltreAzioni() {
  fireEvent.click(screen.getByRole('button', { name: 'Altre azioni' }));
}

async function openCard(titolo) {
  fireEvent.click(await screen.findByText(titolo, {}));
  const el = await waitFor(() => {
    const node = document.querySelector('.modal-inner');
    if (!node) throw new Error('CardDetail non aperta');
    return node;
  });
  return within(el);
}

describe('Allegati in sottocollezione', () => {
  it('caricare un PDF: il contenuto va nella sottocollezione e la card resta leggera', async () => {
    const { db } = await renderApp({ seed: { users: { prof1: PROF_DOC }, cards: {} }, user: PROF });

    fireEvent.click(await screen.findByTitle('Nuova card', {}));
    fireEvent.input(screen.getByPlaceholderText('Es. Riflessione su…'), {
      target: { value: 'Card con PDF' },
    });

    // L'input degli allegati è quello con `.pdf` nell'accept.
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    const allegatiInput = inputs.find((i) => i.accept.indexOf('.pdf') >= 0);
    const pdf = new File([new Uint8Array(300 * 1024)], 'dispensa.pdf', { type: 'application/pdf' });
    fireEvent.change(allegatiInput, { target: { files: [pdf] } });
    await waitFor(() => expect(screen.getByText('dispensa.pdf')).toBeTruthy());

    fireEvent.click(screen.getByText('✅ Crea card'));

    let card;
    await waitFor(() => {
      const found = db._all('cards').find(([, c]) => c.titolo === 'Card con PDF');
      expect(found).toBeTruthy();
      card = found[1];
    });

    // La card porta SOLO metadati: niente base64 nel documento.
    expect(card.allegati).toHaveLength(1);
    expect(card.allegati[0].name).toBe('dispensa.pdf');
    expect(card.allegati[0].type).toBe('application/pdf');
    expect(card.allegati[0].id).toBeTruthy();
    expect(card.allegati[0].url).toBeUndefined();
    // Il documento resta piccolo: è il punto del piano (prima 961KB e rifiutata).
    expect(JSON.stringify(card).length).toBeLessThan(5000);

    // Il contenuto è nel documento della sottocollezione, uno per file.
    const files = db._all('cards/' + String(card.id) + '/allegati');
    expect(files).toHaveLength(1);
    expect(files[0][1].url).toMatch(/^data:application\/pdf/);
  });

  it('aprendo la card il file viene letto e mostrato con il suo link', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card con allegato nuovo',
          // Metadati soltanto: come le scrive addCard.
          allegati: [{ id: 'f1', name: 'dispensa.pdf', type: 'application/pdf', size: 2048 }],
        }),
      },
      'cards/c1/allegati': {
        f1: { name: 'dispensa.pdf', type: 'application/pdf', size: 2048, url: PDF_URL },
      },
    };
    await renderApp({ seed, user: PROF });

    const detail = await openCard('Card con allegato nuovo');
    const link = await detail.findByText('📄 dispensa.pdf', {});
    // Il link si risolve solo dopo la query alla sottocollezione.
    await waitFor(() => expect(link.closest('a').getAttribute('href')).toBe(PDF_URL));
  });

  it('card LEGACY con url inline: si apre come prima e una LETTURA non scrive', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card vecchia',
          allegati: [{ url: PDF_URL, nome: 'vecchio.pdf' }],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });

    const detail = await openCard('Card vecchia');
    const link = await detail.findByText('📄 vecchio.pdf', {});
    expect(link.closest('a').getAttribute('href')).toBe(PDF_URL);
    // Nessuna migrazione forzata: la lettura non deve creare documenti.
    expect(db._all('cards/c1/allegati')).toHaveLength(0);
  });

  it('modificare una card LEGACY migra i file nella sottocollezione (migrazione lazy)', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card da migrare',
          allegati: [{ url: PDF_URL, nome: 'vecchio.pdf' }],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });

    const detail = await openCard('Card da migrare');
    fireEvent.click(await detail.findByRole('button', { name: /Modifica/ }));

    // La modale si apre in modifica con il titolo corrente.
    const titolo = await screen.findByPlaceholderText('Es. Riflessione su…', {});
    fireEvent.input(titolo, { target: { value: 'Card migrata' } });
    fireEvent.click(screen.getByText('💾 Salva modifiche'));

    await waitFor(() => {
      expect(db._get('cards', 'c1').titolo).toBe('Card migrata');
      // La card non porta più il base64: solo metadati con un id.
      expect(db._get('cards', 'c1').allegati[0].url).toBeUndefined();
      expect(db._get('cards', 'c1').allegati[0].id).toBeTruthy();
      // Il contenuto è stato spostato nella sottocollezione.
      expect(db._all('cards/c1/allegati')).toHaveLength(1);
      expect(db._all('cards/c1/allegati')[0][1].url).toBe(PDF_URL);
    });
  });

  it('duplicare una card copia i file (la copia è indipendente)', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Lezione con file',
          allegati: [{ id: 'f1', name: 'dispensa.pdf', type: 'application/pdf', size: 2048 }],
        }),
      },
      'cards/c1/allegati': {
        f1: { name: 'dispensa.pdf', type: 'application/pdf', size: 2048, url: PDF_URL },
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('Lezione con file', {});

    apriAltreAzioni();
    const duplicaBtn = screen.getAllByRole('button').find((b) => b.textContent === '📋');
    fireEvent.click(duplicaBtn);
    await screen.findByText('Duplica card', {});
    const modal = modalRoot('Duplica card');
    fireEvent.click(within(modal).getByRole('button', { name: '3AO' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Duplica in 1 classe' }));

    let copia;
    await waitFor(() => {
      const trovate = db._all('cards').filter(([, c]) => c.titolo === 'Lezione con file [3AO]');
      expect(trovate.length).toBe(1);
      copia = trovate[0][1];
    });

    // La copia ha i metadati e i suoi file, con un path proprio.
    expect(copia.allegati).toHaveLength(1);
    expect(copia.allegati[0].url).toBeUndefined();
    const filesCopia = db._all('cards/' + String(copia.id) + '/allegati');
    expect(filesCopia).toHaveLength(1);
    expect(filesCopia[0][1].url).toBe(PDF_URL);

    // Indipendenza: cancellare i file della sorgente non tocca la copia.
    db._seed('cards/c1/allegati', {});
    expect(db._all('cards/' + String(copia.id) + '/allegati')).toHaveLength(1);
  });

  it(
    'eliminare una card cancella anche i suoi allegati (Firestore non fa cascade)',
    async () => {
      const seed = {
        users: { prof1: PROF_DOC },
        cards: {
          c1: mkCard('c1', {
            titolo: 'Da eliminare con file',
            allegati: [{ id: 'f1', name: 'dispensa.pdf', type: 'application/pdf', size: 2048 }],
          }),
        },
        'cards/c1/allegati': {
          f1: { name: 'dispensa.pdf', type: 'application/pdf', size: 2048, url: PDF_URL },
        },
      };
      const { db } = await renderApp({ seed, user: PROF });
      await screen.findByText('Da eliminare con file', {});

      apriAltreAzioni();
      fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
      await screen.findByText(/Card eliminata/, {});

      // La cancellazione parte dopo i 5s dell'undo: il waitFor copre anche la
      // scrittura asincrona dei file, senza attese fisse.
      await waitFor(() => {
        expect(db._get('cards', 'c1')).toBeFalsy();
        expect(db._all('cards/c1/allegati')).toHaveLength(0);
      });
    },
    // 5s dell'undo + margine sul runner: sopra il testTimeout globale (15s) di
    // proposito, così un eventuale fallimento è l'assert, non un "timed out".
    20000
  );
});
