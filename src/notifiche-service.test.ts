// notifiche-service.test.ts — ESITO del fan-out in-app.
//
// Contratto che regge la recuperabilità degli annunci:
//  - `avvisati` è il numero di studenti che hanno ricevuto l'avviso (0 = nessuno
//    da avvisare, che NON è un errore);
//  - `mancanti` dice CHI non l'ha ricevuto (uid + nome): è ciò che il docente
//    vede sulla card e ciò che rende mirata la riprova (`soloUid`);
//  - `ok: false` significa "non tutti gli avvisi sono partiti" (query fallita o
//    push rifiutato): chi chiama NON deve chiudere la coda d'annuncio, altrimenti
//    gli studenti rimasti senza avviso non verrebbero mai più raggiunti;
//  - `notifyClasse` non rifiuta mai (i chiamanti storici non hanno `.catch`).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { notifyClasse, notifyUser } from './notifiche-service.ts';

type Studente = {
  uid: string;
  nome?: string;
  cognome?: string;
  displayName?: string;
  classe?: string;
  classiPerAnno?: Record<string, string>;
};

// Fake minimo di Firestore: solo ciò che serve al fan-out (users.where().get(),
// notifiche/{uid}.set()). `failQuery` / `failPush` / `failPushUid` permettono di
// simulare i modi in cui un annuncio può non partire.
function fakeDb(studenti: Studente[], opts: { failQuery?: boolean; failPush?: boolean; failPushUid?: string } = {}) {
  const scritti: Record<string, any[]> = {};
  const db: any = {
    _scritti: scritti,
    collection(name: string) {
      if (name === 'users') {
        return {
          where: () => ({
            get: () =>
              opts.failQuery
                ? Promise.reject(Object.assign(new Error('rete giù'), { code: 'unavailable' }))
                : Promise.resolve({
                    forEach(cb: any) {
                      studenti.forEach((s) => cb({ id: s.uid, data: () => s }));
                    },
                  }),
          }),
        };
      }
      // notifiche
      return {
        doc: (uid: string) => ({
          set(payload: any) {
            if (opts.failPush || opts.failPushUid === uid)
              return Promise.reject(Object.assign(new Error('no'), { code: 'permission-denied' }));
            scritti[uid] = (scritti[uid] || []).concat([payload]);
            return Promise.resolve();
          },
          get: () => Promise.resolve({ exists: false, data: () => ({}) }),
        }),
      };
    },
  };
  return db;
}

function setupWindow(db: any) {
  (window as any).db = db;
  (window as any).firebase = { firestore: { FieldValue: { arrayUnion: (v: any) => ({ __arrayUnion: v }) } } };
}

const STUDENTI: Studente[] = [
  { uid: 's1', nome: 'Anna', cognome: 'Verdi', classe: '3AI' },
  { uid: 's2', displayName: 'Luca Bianchi', classiPerAnno: { '2026/2027': '3AI' } },
  { uid: 's3', nome: 'Ivo', cognome: 'Rossi', classe: '4BO' },
];

beforeEach(() => {
  setupWindow(fakeDb(STUDENTI));
});
afterEach(() => {
  delete (window as any).db;
});

describe('notifyClasse: esito del fan-out', () => {
  it('avvisa solo gli studenti della classe e riporta quanti sono', async () => {
    const esito = await notifyClasse({
      classi: ['3AI'],
      annoScolastico: '2026/2027',
      cardId: 'c1',
      titolo: 'Compiti',
      msg: 'Nuova card',
    });
    expect(esito).toEqual({ ok: true, avvisati: 2, totale: 2, mancanti: [] });
    const db: any = (window as any).db;
    expect(Object.keys(db._scritti).sort()).toEqual(['s1', 's2']);
  });

  it('TUTTE raggiunge anche lo studente senza classe', async () => {
    const db = fakeDb([{ uid: 's1' }, { uid: 's2', classe: '4BO' }]);
    setupWindow(db);
    const esito = await notifyClasse({
      classi: ['TUTTE'],
      annoScolastico: '2026/2027',
      cardId: 'c1',
      titolo: 'X',
      msg: 'Y',
    });
    expect(esito).toEqual({ ok: true, avvisati: 2, totale: 2, mancanti: [] });
  });

  it('esclude l autore (excludeUid)', async () => {
    const esito = await notifyClasse({
      classi: ['3AI'],
      annoScolastico: '2026/2027',
      cardId: 'c1',
      titolo: 'X',
      msg: 'Y',
      excludeUid: 's1',
    });
    expect(esito).toEqual({ ok: true, avvisati: 1, totale: 1, mancanti: [] });
  });

  it('nessuno studente corrisponde → ok, zero avvisati (non è un errore)', async () => {
    const esito = await notifyClasse({
      classi: ['5ZZ'],
      annoScolastico: '2026/2027',
      cardId: 'c1',
      titolo: 'X',
      msg: 'Y',
    });
    expect(esito).toEqual({ ok: true, avvisati: 0, totale: 0, mancanti: [] });
  });

  it('id deterministico: un secondo giro sulla stessa card usa lo stesso id', async () => {
    const db = fakeDb(STUDENTI);
    setupWindow(db);
    await notifyClasse({ classi: ['3AI'], annoScolastico: '2026/2027', cardId: 'c1', titolo: 'X', msg: 'Y' });
    const scritto = db._scritti['s1'][0].lista.__arrayUnion;
    expect(scritto.id).toBe('nuova_card_c1');
  });

  it('query degli studenti fallita → ok:false, così la coda resta aperta', async () => {
    setupWindow(fakeDb(STUDENTI, { failQuery: true }));
    await expect(
      notifyClasse({ classi: ['3AI'], annoScolastico: '2026/2027', cardId: 'c1', titolo: 'X', msg: 'Y' })
    ).resolves.toEqual({ ok: false, avvisati: 0, totale: 0, mancanti: [] });
  });

  it('push rifiutato per tutti → ok:false, destinatari noti ma tutti mancanti', async () => {
    setupWindow(fakeDb(STUDENTI, { failPush: true }));
    const esito = await notifyClasse({
      classi: ['3AI'],
      annoScolastico: '2026/2027',
      cardId: 'c1',
      titolo: 'X',
      msg: 'Y',
    });
    expect(esito).toEqual({
      ok: false,
      avvisati: 0,
      totale: 2,
      mancanti: [
        { uid: 's1', nome: 'Anna Verdi' },
        { uid: 's2', nome: 'Luca Bianchi' },
      ],
    });
  });

  it('push rifiutato per UNO studente → il mancante è nominato, non solo contato', async () => {
    setupWindow(fakeDb(STUDENTI, { failPushUid: 's2' }));
    const esito = await notifyClasse({
      classi: ['3AI'],
      annoScolastico: '2026/2027',
      cardId: 'c1',
      titolo: 'X',
      msg: 'Y',
    });
    expect(esito.ok).toBe(false);
    expect(esito.avvisati).toBe(1);
    expect(esito.mancanti).toEqual([{ uid: 's2', nome: 'Luca Bianchi' }]);
  });

  it('senza window.db non lancia: ok:false', async () => {
    delete (window as any).db;
    await expect(
      notifyClasse({ classi: ['3AI'], annoScolastico: '2026/2027', cardId: 'c1', titolo: 'X', msg: 'Y' })
    ).resolves.toEqual({ ok: false, avvisati: 0, totale: 0, mancanti: [] });
  });
});

describe('notifyClasse: riprova MIRATA (soloUid)', () => {
  it('avvisa soltanto gli studenti indicati', async () => {
    const db = fakeDb(STUDENTI);
    setupWindow(db);
    const esito = await notifyClasse({
      classi: ['3AI'],
      annoScolastico: '2026/2027',
      cardId: 'c1',
      titolo: 'X',
      msg: 'Y',
      soloUid: ['s3'], // è in 4BO: con la riprova mirata conta comunque
    });
    expect(esito).toEqual({ ok: true, avvisati: 1, totale: 1, mancanti: [] });
    expect(Object.keys(db._scritti)).toEqual(['s3']);
  });

  it('un id che non è più uno studente viene ignorato (nessun crash)', async () => {
    const esito = await notifyClasse({
      classi: ['3AI'],
      annoScolastico: '2026/2027',
      cardId: 'c1',
      titolo: 'X',
      msg: 'Y',
      soloUid: ['sparito'],
    });
    expect(esito).toEqual({ ok: true, avvisati: 0, totale: 0, mancanti: [] });
  });

  it('se uno dei mirati fallisce, resta lui solo nell elenco dei mancanti', async () => {
    setupWindow(fakeDb(STUDENTI, { failPushUid: 's3' }));
    const esito = await notifyClasse({
      classi: ['3AI'],
      annoScolastico: '2026/2027',
      cardId: 'c1',
      titolo: 'X',
      msg: 'Y',
      soloUid: ['s1', 's3'],
    });
    expect(esito).toEqual({
      ok: false,
      avvisati: 1,
      totale: 2,
      mancanti: [{ uid: 's3', nome: 'Ivo Rossi' }],
    });
  });
});

describe('notifyUser: esito della singola scrittura', () => {
  it('risolve true quando la notifica è scritta', async () => {
    await expect(notifyUser('s1', { tipo: 'nuova_card', cardId: 'c1', titolo: 'X', msg: 'Y' })).resolves.toBe(true);
  });

  it('risolve false quando la scrittura non riesce (nessun rifiuto propagato)', async () => {
    setupWindow(fakeDb(STUDENTI, { failPush: true }));
    await expect(notifyUser('s1', { tipo: 'nuova_card', cardId: 'c1', titolo: 'X', msg: 'Y' })).resolves.toBe(false);
  });
});

describe('notifyClasse: mai un rifiuto (chiamanti storici senza .catch)', () => {
  it('anche con il database rotto il risultato è un esito, non un errore', async () => {
    setupWindow({
      collection() {
        throw new Error('db esploso');
      },
    });
    const esito = await notifyClasse({
      classi: ['3AI'],
      annoScolastico: '2026/2027',
      cardId: 'c1',
      titolo: 'X',
      msg: 'Y',
    });
    expect(esito).toEqual({ ok: false, avvisati: 0, totale: 0, mancanti: [] });
  });
});

// Solo per capire se il fallimento stampa la diagnostica in console.
describe('diagnostica', () => {
  it('un fan-out incompleto lascia una traccia in console', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setupWindow(fakeDb(STUDENTI, { failPush: true }));
    await notifyClasse({ classi: ['3AI'], annoScolastico: '2026/2027', cardId: 'c9', titolo: 'X', msg: 'Y' });
    expect(warn.mock.calls.some((c) => String(c[0]).indexOf('fan-out incompleto') >= 0)).toBe(true);
    warn.mockRestore();
  });
});
