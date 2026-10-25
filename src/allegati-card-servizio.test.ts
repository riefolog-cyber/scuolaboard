// allegati-card-servizio.test.ts — il contenuto degli allegati vive in
// `cards/{cardId}/allegati/{fileId}`, un documento per file.
//
// Perché conta: un documento Firestore è limitato a 1 MiB e una card con
// copertina + due PDF lo superava (caso reale: 961KB). Questo servizio è l'unico
// punto che parla con la sottocollezione, quindi qui si fissano le tre cose che
// il resto dell'app dà per scontate:
//   1) il documento allegato ha ESATTAMENTE i campi ammessi dalle Rules;
//   2) la card riceve solo metadati (mai il base64);
//   3) copiare/eliminare non lascia riferimenti rotti.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFakeDb } from './integration/fake-firestore.ts';
import {
  CAMPI_ALLEGATO,
  metadati,
  salvaAllegati,
  caricaAllegati,
  eliminaAllegati,
  eliminaTuttiAllegati,
  copiaAllegati,
  motivoErrore,
} from './allegati-card-servizio.ts';

const PDF_URL = 'data:application/pdf;base64,' + 'A'.repeat(1024);

function pdf(id: string, name = 'dispensa.pdf') {
  return { id: id, name: name, type: 'application/pdf', size: 700, url: PDF_URL };
}

let db: any;

beforeEach(() => {
  db = createFakeDb();
  window.db = db;
});

afterEach(() => {
  // Il db finto è condiviso fra i test: si ripristina il mock neutro di
  // test-setup per non lasciare sottocollezioni appese agli altri file.
  window.db = undefined as any;
});

describe('metadati: quello che resta nella card', () => {
  it('toglie il contenuto e normalizza nome → name', () => {
    const m = metadati({ id: 'f1', nome: 'vecchio.pdf', type: 'application/pdf', size: 123, url: PDF_URL });
    expect(m).toEqual({ id: 'f1', name: 'vecchio.pdf', type: 'application/pdf', size: 123 });
    expect(m).not.toHaveProperty('url');
  });

  it('un allegato senza id resta senza id inventato (il guard misura solo la dimensione)', () => {
    expect(metadati({ name: 'a.pdf' }).id).toBe('');
  });

  it('null/undefined non crashano', () => {
    expect(metadati(null)).toEqual({ id: '', name: '', type: '', size: 0 });
  });
});

describe('salvaAllegati', () => {
  it('scrive un documento per file con ESATTAMENTE i campi delle Rules', async () => {
    const esito = await salvaAllegati('c1', [pdf('f1'), pdf('f2', 'b.pdf')]);
    expect(esito.ok).toBe(true);
    // La card riceve solo metadati: nessun base64.
    expect(esito.allegati).toEqual([
      { id: 'f1', name: 'dispensa.pdf', type: 'application/pdf', size: 700 },
      { id: 'f2', name: 'b.pdf', type: 'application/pdf', size: 700 },
    ]);
    const docs = db._all('cards/c1/allegati');
    expect(docs).toHaveLength(2);
    expect(Object.keys(docs[0][1]).sort()).toEqual([...CAMPI_ALLEGATO].sort());
    expect(docs[0][1].url).toBe(PDF_URL);
  });

  it('genera un id quando manca (allegato legacy senza id)', async () => {
    const esito = await salvaAllegati('c1', [{ name: 'x.pdf', type: 'application/pdf', size: 1, url: PDF_URL }]);
    expect(esito.ok).toBe(true);
    expect(esito.allegati[0].id).toBeTruthy();
    expect(db._all('cards/c1/allegati')).toHaveLength(1);
  });

  it('un allegato già migrato (senza url) NON viene riscritto', async () => {
    const esito = await salvaAllegati('c1', [{ id: 'f1', name: 'a.pdf', type: 'application/pdf', size: 10 }]);
    expect(esito.ok).toBe(true);
    expect(esito.allegati).toEqual([{ id: 'f1', name: 'a.pdf', type: 'application/pdf', size: 10 }]);
    expect(db._all('cards/c1/allegati')).toHaveLength(0);
  });

  it('lista vuota: ok senza toccare il db (il caso della maggior parte delle card)', async () => {
    const esito = await salvaAllegati('c1', []);
    expect(esito).toEqual({ ok: true, allegati: [] });
    expect(db._all('cards/c1/allegati')).toHaveLength(0);
  });

  it('una scrittura negata dalle Rules è un esito esplicito, non una card muta', async () => {
    db._failWrites('cards/c1/allegati');
    const esito = await salvaAllegati('c1', [pdf('f1')]);
    expect(esito.ok).toBe(false);
    expect(esito.errore).toBeTruthy();
    // Il motivo arriva al toast: senza, il docente legge solo "Riprova".
    expect(esito.motivo).toMatch(/permesso negato/);
  });

  it('client senza sottocollezioni: il motivo lo dice (regressione 25/10/2026)', async () => {
    // Lo shim compat non esponeva `.collection()` sui DocumentReference: il
    // salvataggio falliva PRIMA di Firestore, quindi nessuna traccia nelle Rules
    // né nella rete. Il toast deve distinguerlo da una regola o dalla rete.
    window.db = {
      collection: function () {
        return { doc: function () { return { set: async function () {} }; } };
      },
    } as any;
    const esito = await salvaAllegati('c1', [pdf('f1')]);
    expect(esito.ok).toBe(false);
    expect(esito.motivo).toMatch(/sottocollezioni/);
  });
});

describe('caricaAllegati', () => {
  it('restituisce contenuto e metadati dei file', async () => {
    await salvaAllegati('c1', [pdf('f1')]);
    const docs = await caricaAllegati('c1');
    expect(docs).toHaveLength(1);
    expect(docs[0]).toEqual({
      id: 'f1',
      name: 'dispensa.pdf',
      type: 'application/pdf',
      size: 700,
      url: PDF_URL,
    });
  });

  it('card senza allegati: lista vuota (non un errore)', async () => {
    expect(await caricaAllegati('vuota')).toEqual([]);
  });

  it('un db che esplode restituisce lista vuota invece di lanciare', async () => {
    // Caso reale: db mancante o ref non costruibile (mock neutro, rete giù).
    // `caricaAllegati` non deve mai propagare l'errore: chi la chiama è
    // CardDetail, che sta già renderizzando la card.
    window.db = {
      collection: function () {
        throw new Error('rete giù');
      },
    } as any;
    expect(await caricaAllegati('c1')).toEqual([]);
  });
});

describe('eliminaAllegati / eliminaTuttiAllegati', () => {
  it('elimina solo gli id indicati', async () => {
    await salvaAllegati('c1', [pdf('f1'), pdf('f2', 'b.pdf')]);
    await eliminaAllegati('c1', ['f1']);
    const rimasti = db._all('cards/c1/allegati').map(([id]: [string, any]) => id);
    expect(rimasti).toEqual(['f2']);
  });

  it('eliminaTuttiAllegati svuota la sottocollezione (Firestore non fa cascade)', async () => {
    await salvaAllegati('c1', [pdf('f1'), pdf('f2', 'b.pdf')]);
    await eliminaTuttiAllegati('c1');
    expect(db._all('cards/c1/allegati')).toHaveLength(0);
  });

  it('eliminaTuttiAllegati su una card senza file non lancia', async () => {
    await expect(eliminaTuttiAllegati('mai-esistita')).resolves.toBeUndefined();
  });
});

describe('copiaAllegati (duplica / copia in altro anno)', () => {
  it('copia i file: la copia è INDIPENDENTE dalla sorgente', async () => {
    await salvaAllegati('sorgente', [pdf('f1')]);
    const esito = await copiaAllegati('sorgente', 'destinazione', [
      { id: 'f1', name: 'dispensa.pdf', type: 'application/pdf', size: 700 },
    ]);
    expect(esito.ok).toBe(true);
    expect(db._all('cards/destinazione/allegati')).toHaveLength(1);

    // Cancellare la sorgente NON deve rompere la copia (è il motivo per cui si
    // copia invece di condividere il documento).
    await eliminaTuttiAllegati('sorgente');
    expect(db._all('cards/sorgente/allegati')).toHaveLength(0);
    const copia = await caricaAllegati('destinazione');
    expect(copia).toHaveLength(1);
    expect(copia[0].url).toBe(PDF_URL);
  });

  it('card LEGACY con url inline: gli allegati si copiano lo stesso', async () => {
    // Nessuna migrazione forzata: la card vecchia non ha documenti nella
    // sottocollezione, il contenuto è ancora dentro `allegati`.
    const esito = await copiaAllegati('vecchia', 'nuova', [{ id: 'f1', name: 'a.pdf', url: PDF_URL }]);
    expect(esito.ok).toBe(true);
    expect(esito.allegati).toHaveLength(1);
    expect(db._all('cards/nuova/allegati')).toHaveLength(1);
  });

  it('sorgente senza allegati: copia ok e vuota', async () => {
    expect(await copiaAllegati('a', 'b', [])).toEqual({ ok: true, allegati: [] });
  });

  it('sorgente con allegati ma contenuto illeggibile: esito parziale dichiarato', async () => {
    // La card dichiara un file, ma non c'è né inline né nella sottocollezione:
    // meglio dire che la copia è incompleta che salvare una riga muta.
    const esito = await copiaAllegati('a', 'b', [{ id: 'f1', name: 'a.pdf' }]);
    expect(esito.ok).toBe(false);
    expect(esito.allegati).toEqual([]);
  });
});

describe('motivoErrore: la causa nel toast', () => {
  it('traduce i codici Firestore in una frase breve, senza dettagli tecnici', () => {
    expect(motivoErrore({ code: 'permission-denied' })).toMatch(/permesso negato/);
    expect(motivoErrore({ code: 'unavailable' })).toMatch(/rete assente/);
    expect(motivoErrore({ code: 'resource-exhausted' })).toMatch(/quota/);
    expect(motivoErrore({ code: 'unauthenticated' })).toMatch(/login/);
    // Codice sconosciuto: si mostra il codice (serve a chi diagnosta), non un vuoto.
    expect(motivoErrore({ code: 'boh' })).toBe('errore Firestore (boh)');
    expect(motivoErrore(null)).toBe('errore sconosciuto');
  });
});
