// @ts-nocheck — integrazione: AVVISI DI CLASSE affidabili.
//
// Il fan-out delle notifiche in-app lo fa il browser del docente subito dopo la
// pubblicazione. Se la scheda si chiude a metà (o cade la rete) alcuni studenti
// non ricevevano nulla, senza alcun modo di accorgersene. Ora la card nasce con
// `avvisiPendenti: true` e il flag torna `false` SOLO a fan-out concluso: alla
// prima riapertura di un client docente gli invii rimasti in sospeso vengono
// completati. Le card pubblicate prima di questo intervento (senza flag) non
// devono essere ri-annunciate.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, STUD, STUD_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';
// Il guard "un solo fan-out per card" vive nel modulo avvisi-classe: tra un test
// e l'altro va azzerato, altrimenti una card con un id riusato non verrebbe
// annunciata la seconda volta.
import { azzeraAnnunciTentati } from '../avvisi-classe.ts';

beforeEach(() => {
  setupTestEnv();
  azzeraAnnunciTentati();
});
afterEach(teardownTestEnv);

// Secondo studente, così possiamo verificare il fan-out senza confonderci con
// l'utente loggato (il fan-out esclude l'autore).
const STUD2 = { uid: 'stud2', email: 'anna.verdi@ferrarisfermiclass.it', displayName: 'Anna Verdi' };
const STUD2_DOC = {
  role: 'studente',
  nome: 'Anna',
  cognome: 'Verdi',
  displayName: 'Anna Verdi',
  classiPerAnno: { '2026/2027': '3AI' },
};

describe('avvisi di classe: recupero degli invii interrotti', () => {
  it('alla riapertura del docente la card pendente viene annunciata e il flag si chiude', async () => {
    const cardId = Date.now() - 60 * 1000; // pubblicata un minuto fa
    const seed = {
      users: { prof1: PROF_DOC, stud1: STUD_DOC, stud2: STUD2_DOC },
      cards: { [cardId]: mkCard(cardId, { classi: ['3AI'], annoScolastico: '2026/2027', avvisiPendenti: true }) },
    };
    const { db } = await renderApp({ seed, user: PROF });

    // La notifica arriva allo studente della classe, con id deterministico:
    // un eventuale secondo annuncio non produrrà un doppio avviso.
    await waitFor(() => {
      const doc = db._get('notifiche', 'stud1');
      expect(doc && doc.lista && doc.lista.length).toBe(1);
      expect(doc.lista[0].id).toBe('nuova_card_' + cardId);
    });

    // Il flag si chiude: senza questo il recupero si ripeterebbe a ogni apertura.
    await waitFor(() => {
      expect(db._get('cards', String(cardId)).avvisiPendenti).toBe(false);
    });
  });

  it('una card senza flag (pubblicata prima dell intervento) NON viene ri-annunciata', async () => {
    const cardId = Date.now() - 60 * 1000;
    const seed = {
      users: { prof1: PROF_DOC, stud1: STUD_DOC, stud2: STUD2_DOC },
      cards: { [cardId]: mkCard(cardId, { classi: ['3AI'] }) },
    };
    const { db } = await renderApp({ seed, user: PROF });

    // Un attimo di margine: il recupero, se partisse, sarebbe già scattato.
    await new Promise((r) => setTimeout(r, 300));
    expect(db._get('notifiche', 'stud2')).toBeFalsy();
  });

  it('solo i docenti recuperano: lo studente non annuncia nulla', async () => {
    const cardId = Date.now() - 60 * 1000;
    const seed = {
      users: { stud1: STUD_DOC, stud2: STUD2_DOC },
      cards: { [cardId]: mkCard(cardId, { classi: ['3AI'], annoScolastico: '2026/2027', avvisiPendenti: true }) },
    };
    const { db } = await renderApp({ seed, user: STUD });

    await new Promise((r) => setTimeout(r, 300));
    expect(db._get('notifiche', 'stud2')).toBeFalsy();
    // La card resta pendente: la completerà un client docente.
    expect(db._get('cards', String(cardId)).avvisiPendenti).toBe(true);
  });
});

describe('avvisi di classe: pubblicazione dal FAB', () => {
  it('quando il docente pubblica, lo studente riceve l avviso e il flag si chiude', async () => {
    const seed = { users: { prof1: PROF_DOC, stud2: STUD2_DOC }, cards: {} };
    const { db } = await renderApp({ seed, user: PROF });

    fireEvent.click(await screen.findByTitle('Nuova card', {}, { timeout: 4000 }));
    fireEvent.input(screen.getByPlaceholderText('Es. Riflessione su…'), { target: { value: 'Verifica di domani' } });
    fireEvent.input(screen.getByPlaceholderText('Descrizione, spunti…'), { target: { value: 'contenuto' } });
    // Senza classi selezionate la card non è visibile a nessuno (stessa regola
    // di cards.ts): qui la pubblichiamo per tutte le classi.
    fireEvent.click(screen.getByText(/TUTTE LE CLASSI/));
    fireEvent.click(screen.getByText('✅ Crea card'));

    // Il docente vede la CONFERMA di quanti studenti ha avvisato (qui un solo
    // studente in classe): è la risposta alla sua azione, non un log. Va
    // verificata SUBITO: il toast dura 2,4s e le attese sul db vengono dopo.
    expect(await screen.findByText(/1 studente avvisato/, {}, { timeout: 4000 })).toBeTruthy();

    await waitFor(() => {
      const doc = db._get('notifiche', 'stud2');
      expect(doc && doc.lista && doc.lista.length).toBe(1);
      expect(doc.lista[0].tipo).toBe('nuova_card');
    });

    await waitFor(() => {
      const entry = db._all('cards').find(([, c]) => c.titolo === 'Verifica di domani');
      expect(entry).toBeTruthy();
      expect(entry[1].avvisiPendenti).toBe(false);
    });
  });
});

describe('avvisi di classe: proposta approvata dal docente', () => {
  it('approvare una proposta avvisa la classe e chiude il flag di invio', async () => {
    const seed = {
      users: { prof1: PROF_DOC, stud1: STUD_DOC, stud2: STUD2_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Proposta di Luca',
          autore: 'Luca Bianchi', // l'autore è lo studente, non il prof
          proposta: true,
          classi: ['3AI'],
          annoScolastico: '2026/2027',
        }),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });

    fireEvent.click(await screen.findByLabelText('Accetta proposta', {}, { timeout: 4000 }));

    // Il docente vede la conferma dell'annuncio (due studenti in 3AI; va
    // verificata subito, il toast dura 2,4s).
    expect(await screen.findByText(/2 studenti avvisati/, {}, { timeout: 4000 })).toBeTruthy();

    // La classe riceve l'annuncio come per una card nuova...
    await waitFor(() => {
      const doc = db._get('notifiche', 'stud2');
      expect(doc && doc.lista && doc.lista.length).toBe(1);
      expect(doc.lista[0].id).toBe('nuova_card_c1');
    });
    // ...e il flag si chiude, così il recupero non la riannuncia.
    await waitFor(() => {
      expect(db._get('cards', 'c1').avvisiPendenti).toBe(false);
    });
    // L'autore continua a ricevere l'esito della sua proposta.
    const autore = db._get('notifiche', 'stud1');
    expect(autore.lista.some((n) => n.tipo === 'proposta_esito')).toBe(true);
  });
});

describe('avvisi di classe: badge persistente sulla card (annuncio non partito)', () => {
  it('un invio interrotto dice sulla card CHI manca; "Riprova" avvisa solo quelli', async () => {
    const cardId = Date.now() - 10 * 60 * 1000; // pubblicata 10 minuti fa: il fan-out si è interrotto
    const seed = {
      users: { prof1: PROF_DOC, stud1: STUD_DOC, stud2: STUD2_DOC },
      cards: { [cardId]: mkCard(cardId, { classi: ['3AI'], annoScolastico: '2026/2027', avvisiPendenti: true }) },
    };
    // Il primo tentativo (recupero all'apertura) riesce a metà: Luca (stud1) ha
    // ricevuto l'avviso, Anna (stud2) no. Il secondo (pulsante "Riprova") riesce.
    const originale = (window as any).SB.notifyClasse;
    const fake = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        avvisati: 1,
        totale: 2,
        mancanti: [{ uid: 'stud2', nome: 'Anna Verdi' }],
      })
      .mockResolvedValue({ ok: true, avvisati: 1, totale: 1, mancanti: [] });
    (window as any).SB.notifyClasse = fake;
    try {
      const { db } = await renderApp({ seed, user: PROF });

      // Il badge non è un toast: resta sulla card e dice CHI non ha ricevuto
      // l'avviso (elenco scritto sulla card dal tentativo fallito).
      const badge = await screen.findByText(/mancano Anna Verdi/, {}, { timeout: 4000 });
      expect(badge).toBeTruthy();
      expect(db._get('cards', String(cardId)).avvisiPendenti).toBe(true);
      expect(db._get('cards', String(cardId)).avvisiMancanti).toEqual([{ uid: 'stud2', nome: 'Anna Verdi' }]);

      fireEvent.click(screen.getByLabelText('Riprova avviso'));

      // Il rilancio è MIRATO: si avvisa solo chi era rimasto indietro.
      await waitFor(() => {
        expect(fake).toHaveBeenCalledTimes(2);
      });
      expect(fake.mock.calls[1][0].soloUid).toEqual(['stud2']);
      expect(await screen.findByText(/1 studente avvisato/, {}, { timeout: 4000 })).toBeTruthy();

      // ...e a invio concluso la coda si chiude e l'elenco dei mancanti si azzera.
      await waitFor(() => {
        expect(db._get('cards', String(cardId)).avvisiPendenti).toBe(false);
        expect(db._get('cards', String(cardId)).avvisiMancanti).toBeNull();
      });
      expect(screen.queryByText(/mancano /)).toBeNull();
    } finally {
      (window as any).SB.notifyClasse = originale;
    }
  });
});

describe('avvisi di classe: indicatore in alto con "Riprova tutti"', () => {
  it('conta le card in sospeso e le riprova tutte in una volta', async () => {
    // Due card pubblicate e mai annunciate. All'apertura il recupero tenta
    // entrambe e fallisce; poi il docente preme "Riprova tutti" e riesce.
    const c1 = Date.now() - 20 * 60 * 1000;
    const c2 = Date.now() - 10 * 60 * 1000;
    const seed = {
      users: { prof1: PROF_DOC, stud1: STUD_DOC, stud2: STUD2_DOC },
      cards: {
        [c1]: mkCard(c1, { classi: ['3AI'], annoScolastico: '2026/2027', avvisiPendenti: true }),
        [c2]: mkCard(c2, { classi: ['3AI'], annoScolastico: '2026/2027', avvisiPendenti: true }),
      },
    };
    const originale = (window as any).SB.notifyClasse;
    const fake = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, avvisati: 0, totale: 2 })
      .mockResolvedValueOnce({ ok: false, avvisati: 0, totale: 2 })
      .mockResolvedValue({ ok: true, avvisati: 2, totale: 2 });
    (window as any).SB.notifyClasse = fake;
    try {
      const { db } = await renderApp({ seed, user: PROF });

      // L'indicatore sta nella fascia in alto e non è un toast: resta finché il
      // problema non è risolto.
      const indicatore = await screen.findByText(/2 avvisi in sospeso/, {}, { timeout: 4000 });
      expect(indicatore).toBeTruthy();
      expect(document.querySelector('.annunci-sospesi')).toBeTruthy();

      fireEvent.click(screen.getByLabelText('Riprova tutti gli avvisi'));

      // Un solo esito aggregato per entrambe le card.
      expect(await screen.findByText(/4 studenti avvisati/, {}, { timeout: 4000 })).toBeTruthy();
      await waitFor(() => {
        expect(db._get('cards', String(c1)).avvisiPendenti).toBe(false);
        expect(db._get('cards', String(c2)).avvisiPendenti).toBe(false);
      });
      expect(document.querySelector('.annunci-sospesi')).toBeNull();
    } finally {
      (window as any).SB.notifyClasse = originale;
    }
  });
});

// ── COMMENTI: i compagni di classe vengono avvisati ──────────────────────
// Il commento di uno studente è una notizia per la classe, non solo per i
// prof: il fan-out usa tipo 'risposta' + cmId del commento, così l'id
// deterministico (risposta_<cardId>_<cmId>) è DISTINTO per ogni intervento e
// non collide con l'annuncio della card (nuova_card_<cardId>).
describe('avvisi di classe: commento di uno studente', () => {
  it('il commento avvisa i compagni di classe (e i prof), non chi lo scrive', async () => {
    const seed = {
      users: { prof1: PROF_DOC, stud1: STUD_DOC, stud2: STUD2_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Uscita didattica', classi: ['3AI'], annoScolastico: '2026/2027' }) },
    };
    const { db } = await renderApp({ seed, user: STUD });

    fireEvent.click(await screen.findByText('Uscita didattica', {}, { timeout: 4000 }));
    const input = await screen.findByPlaceholderText('Scrivi un commento…', {}, { timeout: 4000 });
    fireEvent.input(input, { target: { value: 'Che posto fantastico!' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('Che posto fantastico!', {}, { timeout: 4000 });

    // Il compagno riceve l'avviso, con l'id del SUO commento.
    await waitFor(() => {
      const doc = db._get('notifiche', 'stud2');
      expect(doc && doc.lista && doc.lista.length).toBe(1);
      const n = doc.lista[0];
      expect(n.tipo).toBe('risposta');
      expect(String(n.id).indexOf('risposta_c1_')).toBe(0);
      expect(String(n.msg).indexOf('ha commentato')).toBeGreaterThanOrEqual(0);
    });
    // L'autore non si avvisa da solo; i prof ricevono il loro avviso dedicato.
    expect(db._get('notifiche', 'stud1')).toBeFalsy();
    await waitFor(() => {
      const prof = db._get('notifiche', 'prof1');
      expect(prof && prof.lista && prof.lista.some((n) => n.tipo === 'risposta')).toBe(true);
    });
  });

  it('un secondo commento sulla stessa card arriva a sua volta (no collisione con l annuncio)', async () => {
    // Regressione del bug segnalato: prima del fix ogni commento riusava
    // l'id nuova_card_<cardId>, così il primo commento "spariva" nella dedupe
    // con l'annuncio della pubblicazione e i compagni non ricevevano nulla.
    const seed = {
      users: { prof1: PROF_DOC, stud1: STUD_DOC, stud2: STUD2_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Uscita didattica',
          classi: ['3AI'],
          annoScolastico: '2026/2027',
          commenti: [{ id: 1, autore: 'Luca Bianchi', testo: 'Che posto fantastico!', data: '2026-09-01', risposte: [] }],
        }),
      },
      notifiche: {
        stud1: {
          lista: [
            {
              id: 'nuova_card_c1',
              tipo: 'nuova_card',
              cardId: 'c1',
              titolo: 'Uscita didattica',
              msg: 'Nuova card per la tua classe',
              createdAt: new Date().toISOString(),
              letta: true,
            },
          ],
          aggiornato: new Date().toISOString(),
        },
      },
    };
    const { db } = await renderApp({ seed, user: STUD2 });

    fireEvent.click(await screen.findByText('Uscita didattica', {}, { timeout: 4000 }));
    const input = await screen.findByPlaceholderText('Scrivi un commento…', {}, { timeout: 4000 });
    fireEvent.input(input, { target: { value: 'Io vengo!' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('Io vengo!', {}, { timeout: 4000 });

    // Luca ha già l'annuncio della card in lista: il nuovo avviso deve
    // AFFIANCARLO (id diverso), non essere inghiottito dalla dedupe.
    await waitFor(() => {
      const doc = db._get('notifiche', 'stud1');
      expect(doc && doc.lista && doc.lista.length).toBe(2);
    });
    const ids = db._get('notifiche', 'stud1').lista.map((n) => n.id);
    expect(ids[0]).toBe('nuova_card_c1');
    expect(String(ids[1]).indexOf('risposta_c1_')).toBe(0);
    // Chi commenta non si avvisa da solo.
    expect(db._get('notifiche', 'stud2')).toBeFalsy();
  });

  it("il messaggio porta l'ANTEPRIMA del commento, non solo l'autore", async () => {
    // Così chi riceve capisce subito SE vale l'apertura: «Luca ha commentato:
    // Che posto fantastico!». Un commento lungo viene accorciato al confine
    // di parola con «…»; un commento multilinea non rompe la riga dell'elenco.
    const testoLungo =
      'Il posto è meraviglioso, ma ricordate che il bus parte alle sette in punto e chi arriva tardi resta a terra';
    const seed = {
      users: { prof1: PROF_DOC, stud1: STUD_DOC, stud2: STUD2_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Uscita didattica', classi: ['3AI'], annoScolastico: '2026/2027' }) },
    };
    const { db } = await renderApp({ seed, user: STUD });

    fireEvent.click(await screen.findByText('Uscita didattica', {}, { timeout: 4000 }));
    const input = await screen.findByPlaceholderText('Scrivi un commento…', {}, { timeout: 4000 });
    fireEvent.input(input, { target: { value: testoLungo } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText(/Il posto è meraviglioso/, {}, { timeout: 4000 });

    await waitFor(() => {
      const doc = db._get('notifiche', 'stud2');
      expect(doc && doc.lista && doc.lista.length).toBe(1);
      const msg = doc.lista[0].msg;
      expect(String(msg).indexOf('Luca Bianchi ha commentato: ')).toBe(0);
      expect(msg.length).toBeLessThanOrEqual('Luca Bianchi ha commentato: '.length + 61);
      expect(msg.endsWith('…')).toBe(true);
      expect(String(msg).indexOf('  ') < 0).toBe(true); // nessun doppio spazio
    });
  });
});

describe('avvisi di classe: nessun avviso doppio nella lista', () => {
  it('due notifiche con lo stesso id vengono mostrate una volta sola', async () => {
    // Scenario reale: il fan-out riparte perché la marcatura non era riuscita,
    // quindi la stessa notifica (id deterministico) finisce due volte nel doc.
    const notif = {
      id: 'nuova_card_42',
      tipo: 'nuova_card',
      cardId: '42',
      titolo: 'Compiti per domani',
      msg: 'Nuova card per la tua classe',
      createdAt: new Date().toISOString(),
      letta: false,
    };
    const seed = {
      users: { prof1: PROF_DOC },
      notifiche: { prof1: { lista: [notif, Object.assign({}, notif)], aggiornato: new Date().toISOString() } },
    };
    await renderApp({ seed, user: PROF });

    // Il contatore delle non lette è 1, non 2.
    fireEvent.click(await screen.findByTitle('1 notifiche non lette'));
    const voci = await screen.findAllByText('Compiti per domani');
    expect(voci).toHaveLength(1);
  });
});
