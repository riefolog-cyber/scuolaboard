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
    // La ✏️ sta nel menu "⋯" della card (la fila di azioni a riposo resta corta):
    // la modale di modifica deve aprirsi anche con la CardDetail aperta.
    fireEvent.click(screen.getByRole('button', { name: 'Altre azioni' }));
    const edit = await screen.findByRole('button', { name: 'Modifica card' }, {}, { timeout: 4000 });
    fireEvent.click(edit);

    expect(await screen.findByText('✏️ Modifica card', {}, { timeout: 4000 })).toBeTruthy();
  });

  // Il toast di successo usciva PRIMA della promessa di scrittura e la modale si
  // chiudeva comunque: con le Rules che negano la scrittura l'utente leggeva
  // "Card aggiornata ✓" e le modifiche sparivano. È la ragione per cui il divieto di
  // modifica allo studente (che le Rules negavano) non si è mai visto.
  it('se Firestore nega la scrittura, NON dice "aggiornata" e lascia la modale aperta', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card negata' }) } };
    const { db } = await renderApp({ seed, user: PROF });

    fireEvent.click(await screen.findByText('Card negata', {}, { timeout: 4000 }));
    fireEvent.click(screen.getByRole('button', { name: 'Altre azioni' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Modifica card' }, {}, { timeout: 4000 }));
    await screen.findByText('✏️ Modifica card', {}, { timeout: 4000 });

    db._failWrites('cards');
    fireEvent.click(screen.getByRole('button', { name: /Salva/ }));

    // L'errore lo segnala fbErrTxt (la rete di sicurezza in fbSave): qui conta che
    // il messaggio di SUCCESSO non compaia e che il documento non sia cambiato.
    await waitFor(() => expect(db._get('cards', 'c1').titolo).toBe('Card negata'));
    expect(screen.queryByText(/Card aggiornata/)).toBeNull();
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