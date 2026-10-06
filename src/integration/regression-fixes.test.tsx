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

  // Stessa cosa sulla COPIA IN ALTRO ANNO. Il percorso di modifica aveva già il
  // test, quello della copia no: ed è così che il `.catch` mancante è rimasto
  // invisibile. `fbSave` (app-utils.tsx) mostra il toast d'errore e poi restituisce
  // la promise ORIGINALE, ancora rifiutata: un chiamante che fa solo `.then()`
  // lascia una promise derivata senza gestore, cioè un unhandled rejection.
  //
  // ⚠️ Qui la copertura è l'exit code di `vitest run`, non un'asserzione: unhandled
  // rejection ⇒ codice 1 anche con tutti i test verdi (è così che la CI è rimasta
  // rossa per un commit intero). In locale il verde sui test lo nasconde: se
  // questo test passa ma `npx vitest run` esce 1, la promisesono gestita.
  it('se Firestore nega la copia in altro anno, NON dice "copiata" e non genera rejection', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card origine' }) } };
    const { db } = await renderApp({ seed, user: PROF });

    fireEvent.click(await screen.findByText('Card origine', {}, { timeout: 4000 }));
    fireEvent.click(screen.getByRole('button', { name: 'Altre azioni' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Copia in altro anno' }, {}, { timeout: 4000 }));
    const modale = (await screen.findByText('Copia in altro anno', {}, { timeout: 4000 })).closest(
      '[style*="z-index: 500"]'
    ) as HTMLElement;
    fireEvent.change(modale.querySelector('select') as HTMLSelectElement, { target: { value: '2027/2028' } });

    db._failWrites('cards');
    fireEvent.click(screen.getByRole('button', { name: /^Copia$/ }));

    // Il messaggio di SUCCESSO non deve comparire e nessuna card deve essere stata
    // scritta: con la scrittura negata l'errore lo segnala fbSave (toast rosso).
    await waitFor(() => expect(screen.queryByText(/Card copiata nell'anno/)).toBeNull());
    expect(db._all('cards').filter((c: any) => c.annoScolastico === '2027/2028').length).toBe(0);
  });

  // Il caso più grave della stessa classe: il COMMENTO dello studente.
  // Prima il toast "Commento inviato ✓" e l'azzeramento del campo erano due righe
  // SINCRONE dopo la catena delle promise: partivano insieme al click e dicevano
  // "inviato" anche quando le Rules negavano la scrittura. Il campo si svuotava,
  // l'overlay ottimistico veniva potato al primo snapshot e il commento spariva
  // senza traccia. È il difetto già corretto sul percorso di modifica card, mai
  // applicato a commenti e risposte.
  //
  // Nota sul perché il test serve: `fake-firestore` NON applica le Rules, quindi
  // qui la negazione va simulata con `_failWrites`.
  it('se Firestore nega il commento, NON dice "inviato" e lascia il testo', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card letta' }) } };
    const { db } = await renderApp({ seed, user: PROF });

    fireEvent.click(await screen.findByText('Card letta', {}, { timeout: 4000 }));
    const ta = (await screen.findByRole('textbox', { name: 'Scrivi un commento' }, {}, { timeout: 4000 })) as HTMLTextAreaElement;
    fireEvent.input(ta, { target: { value: 'Domanda sulla lezione' } });

    db._failWrites('cards');
    fireEvent.click(screen.getByRole('button', { name: 'Invia' }));
    await new Promise((r) => setTimeout(r, 150));

    // Il messaggio di SUCCESSO non deve comparire…
    expect(screen.queryByText(/Commento inviato/)).toBeNull();
    // …e il testo deve restare, così lo studente può riprovare.
    expect(ta.value).toBe('Domanda sulla lezione');
    // Nessun commento salvato.
    expect(db._get('cards', 'c1').commenti.length).toBe(0);
  });
});

// Errore transitorio di rete: la bachecha NON deve svuotarsi.
// Prima l'handler di errore della listener faceva `snapshot = []`: perdeva il
// segnale e la griglia passava da "card visibili" a "Nessun contenuto visibile"
// senza che l'utente avesse fatto nulla. È quello che rendeva le card
// "scomparse" spegnendo la rete. Ora si conserva l'ultimo snapshot valido e si
// avvisa l'utente una volta per episodio.
describe('regression: errore di rete non svuota la bacheca', () => {
  it('le card restano visibili e l utente viene avvisato', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Card A' }), c2: mkCard('c2', { titolo: 'Card B' }) },
    };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('Card A', {}, { timeout: 4000 });
    expect(screen.getByText('Card B')).toBeTruthy();

    db._failReads('cards', 'unavailable');
    await new Promise((r) => setTimeout(r, 120));

    // Le card NON spariscono: meglio dati un po' datati che bacheca vuota.
    expect(screen.queryByText('Card A')).toBeTruthy();
    expect(screen.queryByText('Card B')).toBeTruthy();
    // E l'utente sa cosa sta succedendo (una volta sola).
    expect(screen.getAllByText(/Connessione assente|Impossibile leggere le card/).length).toBeGreaterThan(0);

    db._allowReads('cards');
  });

  it('dopo la riconnessione l avviso non si ripete', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card A' }) } };
    const { db } = await renderApp({ seed, user: PROF });
    await screen.findByText('Card A', {}, { timeout: 4000 });

    db._failReads('cards', 'unavailable');
    await new Promise((r) => setTimeout(r, 100));
    const primo = screen.getAllByText(/Connessione assente|Impossibile leggere le card/).length;

    // Un secondo errore dello stesso episodio non aggiunge altri messaggi.
    db._failReads('cards', 'unavailable');
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getAllByText(/Connessione assente|Impossibile leggere le card/).length).toBe(primo);
    expect(primo).toBeGreaterThan(0);

    db._allowReads('cards');
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