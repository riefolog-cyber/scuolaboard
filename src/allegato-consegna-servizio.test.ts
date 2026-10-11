// allegato-consegna-servizio.test.ts — cosa finisce davvero nel documento.
//
// Il rischio vero di questo modulo non è che scriva il record sbagliato, è che
// nel documento finisca qualcosa di VALUTABILE. Se domani il file .html riuscisse
// a mandare un punteggio e noi lo salvassimo qui, quello score entrerebbe nel
// sistema come se fosse legittimo. Quindi il test principale è una lista di
// chiavi PROIBITE, non un\'asserzione sul valore.

import { describe, it, expect } from 'vitest';
import { chiaveAllegato, giaCompletato, registraConsegna } from './allegato-consegna-servizio.ts';

/** Scritture catturate, con un esito forzabile per provare gli errori. */
function dbFinto(fallisce = false) {
  const scritte: any[] = [];
  return {
    scritte,
    collection(nome: string) {
      return {
        doc(id: string) {
          return {
            async set(dati: any, opts: any) {
              if (fallisce) throw Object.assign(new Error('no'), { code: 'permission-denied' });
              scritte.push({ collezione: nome, id, dati, opts });
            },
          };
        },
      };
    },
  };
}

describe('allegato-consegna-servizio: cosa scrive', () => {
  it('scrive un doc per studente, con la sola mappa delle consegne', async () => {
    const db = dbFinto();
    (window as any).db = db;
    await registraConsegna('u1', 'c1_0');
    expect(db.scritte).toHaveLength(1);
    expect(db.scritte[0].collezione).toBe('allegati_consegne');
    // L'id È l'uid: la regola può richiedere request.auth.uid == uid, quindi lo
    // studente non può scrivere la consegna di un compagno.
    expect(db.scritte[0].id).toBe('u1');
    expect(db.scritte[0].opts).toEqual({ merge: true });
  });

  it('nel documento NON finisce niente di valutabile', async () => {
    const db = dbFinto();
    (window as any).db = db;
    await registraConsegna('u1', 'c1_0');
    const dati = db.scritte[0].dati;

    // Le chiavi ammesse sono solo due: quando e quali allegati.
    expect(Object.keys(dati).sort()).toEqual(['aggiornato', 'consegne']);

    // E dentro la mappa solo la data: nessun punteggio, nessuna risposta.
    const chiavi = Object.keys(dati.consegne);
    expect(chiavi).toEqual(['c1_0']);
    expect(typeof dati.consegne.c1_0).toBe('string');
    // Una data ISO, non un numero che potrebbe essere un punteggio.
    expect(dati.consegne.c1_0).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Le parole che un voto porta con se, e che qui non devono esistere MAI.
    for (const vietata of ['punteggio', 'score', 'voto', 'risposte', 'esito', 'aiScores', 'aiValutato', 'valutazione']) {
      expect(JSON.stringify(dati)).not.toContain(vietata);
    }
  });
});

describe('allegato-consegna-servizio: non si rompe', () => {
  it('senza db non lancia (nessun errore in finestra)', async () => {
    delete (window as any).db;
    await expect(registraConsegna('u1', 'c1_0')).resolves.toBeUndefined();
  });

  it('se la scrittura è negata NON rifiuta (il chiamante non deve restare appeso)', async () => {
    (window as any).db = dbFinto(true);
    // Una consegna non registrata è un inconveniente, non un errore che ferma
    // l\'app: l\'allegato resta aperto e l\'ho visto comunque.
    await expect(registraConsegna('u1', 'c1_0')).resolves.toBeUndefined();
  });

  it('senza uid o senza chiave non scrive nulla (niente record vuoti)', async () => {
    const db = dbFinto();
    (window as any).db = db;
    await registraConsegna('', 'c1_0');
    await registraConsegna('u1', '');
    expect(db.scritte).toHaveLength(0);
  });
});

describe('allegato-consegna-servizio: chiavi e controllo', () => {
  it('la chiave distingue due allegati della stessa card', () => {
    expect(chiaveAllegato('c1', 0)).not.toBe(chiaveAllegato('c1', 1));
    expect(chiaveAllegato('c1', 0)).toBe(chiaveAllegato('c1', 0)); // stesso allegato, stessa chiave
  });

  it('la chiave distingue due card (non si condividono consegne)', () => {
    expect(chiaveAllegato('c1', 0)).not.toBe(chiaveAllegato('c2', 0));
  });

  it('giaCompletato risponde solo se la chiave c\'è davvero', () => {
    expect(giaCompletato({ c1_0: '2026-01-01' }, 'c1_0')).toBe(true);
    expect(giaCompletato({ c1_0: '2026-01-01' }, 'c1_1')).toBe(false);
    expect(giaCompletato({}, 'c1_0')).toBe(false);
  });
});