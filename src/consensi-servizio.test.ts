// consensi-servizio.test.ts — l'accettazione dell'informativa è una PROVA, non una
// preferenza di lettura: prima viveva solo in localStorage e svaniva cambiando
// browser. Qui si fissa il contratto con Firestore:
//   1) il documento ha esattamente i tre campi ammessi dalle regole, e nessun
//      dato accessorio (IP, user agent: non servono e sarebbero dati in più);
//   2) `accettato` è `true` e c'è una data: senza, non è un consenso;
//   3) nessuna funzione lancia — un Firestore che non risponde non deve impedire
//      l'uso dell'app, e la lettura non deve fidarsi di un documento malformato.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFakeDb } from './integration/fake-firestore.ts';
import {
  salvaConsenso,
  leggiConsenso,
  leggiConsensoEntro,
  CONSENSO_VERSIONE,
  CAMPI_CONSENSO,
} from './consensi-servizio.ts';

const UID = 'studente-1';
let db: any;

beforeEach(() => {
  db = createFakeDb();
  window.db = db;
});

afterEach(() => {
  // Il db finto è condiviso fra i file di test: si ripristina il mock neutro.
  window.db = undefined as any;
  vi.restoreAllMocks();
});

describe('salvaConsenso', () => {
  it('scrive in consensi/{uid} ESATTAMENTE i campi delle Rules', async () => {
    const esito = await salvaConsenso(UID);
    expect(esito.ok).toBe(true);

    const doc = db._get('consensi', UID);
    expect(doc).toBeTruthy();
    expect(Object.keys(doc).sort()).toEqual([...CAMPI_CONSENSO].sort());
    expect(doc.accettato).toBe(true);
    expect(doc.versione).toBe(CONSENSO_VERSIONE);
    expect(typeof doc.ts).toBe('number');
    expect(doc.ts).toBeGreaterThan(0);
  });

  it('registra la versione indicata (serve a sapere QUALE testo è stato accettato)', async () => {
    await salvaConsenso(UID, 'informativa-2');
    expect(db._get('consensi', UID).versione).toBe('informativa-2');
  });

  it('rifiuta di scrivere senza id: un consenso senza destinatario non esiste', async () => {
    expect(await salvaConsenso('')).toEqual({ ok: false });
    expect(db._all('consensi')).toHaveLength(0);
  });

  it('senza db non lancia e riferisce il fallimento', async () => {
    window.db = undefined as any;
    expect(await salvaConsenso(UID)).toEqual({ ok: false });
  });

  it('una scrittura negata non lancia: ok false e nessun dato inventato', async () => {
    // Il fake non applica le Rules: `_failWrites` è l'unico modo di simulare un
    // rifiuto (permission-denied) e verificare che il client non menta.
    db._failWrites('consensi');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const esito = await salvaConsenso(UID);
    expect(esito.ok).toBe(false);
    expect(db._all('consensi')).toHaveLength(0);
    // Nei log finisce solo il codice dell'errore, mai l'uid.
    const riga = String(warn.mock.calls[0] ? warn.mock.calls[0].join(' ') : '');
    expect(riga).not.toContain(UID);
  });
});

describe('leggiConsenso', () => {
  it("null quando non c'è nulla di registrato", async () => {
    expect(await leggiConsenso(UID)).toBeNull();
  });

  it('restituisce versione e data di un consenso valido (altro browser)', async () => {
    db._seed('consensi', { [UID]: { versione: 'informativa-1', accettato: true, ts: 1234 } });
    expect(await leggiConsenso(UID)).toEqual({ versione: 'informativa-1', ts: 1234 });
  });

  it('un documento senza accettato:true NON è una prova', async () => {
    // Può esistere solo per un errore di scrittura (le Rules lo vietano): la
    // lettura non deve fidarsi di ciò che trova.
    db._seed('consensi', { [UID]: { versione: 'informativa-1', ts: 1234 } });
    expect(await leggiConsenso(UID)).toBeNull();
  });

  it('una lettura che fallisce torna null, senza lanciare', async () => {
    // Il fake non fa fallire doc().get(): serve un db che solleva, come Firestore
    // quando la rete non risponde. La lettura deve degradare a null (quindi alla
    // modale), mai propagare l'errore all'avvio.
    window.db = {
      collection: () => ({
        doc: () => ({
          get: async () => {
            throw Object.assign(new Error('rete'), { code: 'unavailable' });
          },
        }),
      }),
    };
    expect(await leggiConsenso(UID)).toBeNull();
  });

  it('senza db torna null', async () => {
    window.db = undefined as any;
    expect(await leggiConsenso(UID)).toBeNull();
  });
});

describe('leggiConsensoEntro: il tetto di tempo che non diventa un consenso presunto', () => {
  it("se il consenso c'è risponde subito (nessuna attesa del tetto)", async () => {
    db._seed('consensi', { [UID]: { versione: 'informativa-1', accettato: true, ts: 1234 } });
    expect(await leggiConsensoEntro(UID, 60000)).toEqual({ versione: 'informativa-1', ts: 1234 });
  });

  it('se Firestore non risponde entro il tetto torna null (la modale si apre, non resta appesa)', async () => {
    // Caso reale: rete assente all'avvio. Firestore può impiegare molto prima di
    // rispondere (o di rispondere dalla cache): senza tetto l'informativa non
    // comparirebbe e la bacheca resterebbe utilizzabile nel frattempo.
    window.db = {
      collection: () => ({
        doc: () => ({
          get: () => new Promise(() => {}),
        }),
      }),
    } as any;
    expect(await leggiConsensoEntro(UID, 5)).toBeNull();
  });

  it('senza db torna null subito', async () => {
    window.db = undefined as any;
    expect(await leggiConsensoEntro(UID, 60000)).toBeNull();
  });
});
