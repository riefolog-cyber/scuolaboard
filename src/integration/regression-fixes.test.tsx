// @ts-nocheck — regression: bottone ✏️ (editCard) e notifiche (segna letto singolo)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

const notif = {
  id: 'n1',
  tipo: 'nuova_card',
  cardId: 'c1',
  titolo: 'Nuova card',
  msg: 'Mario ha pubblicato',
  createdAt: new Date().toISOString(),
  letta: false,
};

describe('regression: editCard dal CardItem', () => {
  it('il prof clicca ✏️ sulla card e si apre la modale di modifica', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card da modificare' }) } };
    await renderApp({ seed, user: PROF });

    fireEvent.click(await screen.findByText('Card da modificare', {}, { timeout: 4000 }));
    // Chiudi la CardDetail (altrimenti la modale si apre sopra)
    const edit = await screen.findByRole('button', { name: 'Modifica card' }, {}, { timeout: 4000 });
    fireEvent.click(edit);

    expect(await screen.findByText('✏️ Modifica card', {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe('regression: notifiche segna letto singolo', () => {
  it('segna letto singolo aggiorna solo quella notifica', async () => {
    const n2 = Object.assign({}, notif, { id: 'n2', titolo: 'Altra card', msg: 'Altro messaggio' });
    const seed = {
      users: { prof1: PROF_DOC },
      notifiche: { prof1: { lista: [notif, n2], aggiornato: new Date().toISOString() } },
    };
    const { db } = await renderApp({ seed, user: PROF });

    fireEvent.click(await screen.findByTitle('2 notifiche non lette'));
    fireEvent.click(await screen.findByText('Nuova card'));

    await waitFor(() => {
      const doc = db._get('notifiche', 'prof1');
      expect(doc.lista.find((x: any) => x.id === 'n1').letta).toBe(true);
      expect(doc.lista.find((x: any) => x.id === 'n2').letta).toBe(false);
    });
  });
});