// allegato-consegna-vista.test.ts — «non ripeterlo» vale davvero.
//
// Il difetto che questo test copre: la consegna veniva REGISTRATA ma non
// mai RILASCIATA. `leggiConsegne` e `giaCompletato` erano funzioni senza
// chiamanti: si scriveva il record e nessuno lo leggeva, quindi l'allegato
// finito tornava riproposto come prima. Il sintomo per l'utente è la cosa
// peggiore — sembra funzionare, perché si registra — ma non cambia niente.
//
// Da notare: i test precedenti passavano TUTTI. Non perché il difetto non ci
// fosse, ma perché verificavano i pezzi giusti (la scrittura, la forma del
// messaggio, l'uscita dall'overlay) senza mai chiedersi se qualcuno leggesse
// il risultato.

import { describe, it, expect } from 'vitest';
import { chiaveAllegato, giaCompletato, leggiConsegne } from './allegato-consegna-servizio.ts';

/** Firestore finto che restituisce un documento di consegne. */
function dbCon(consegne: Record<string, string> | null) {
  return {
    collection: () => ({
      doc: () => ({
        get: () =>
          Promise.resolve({
            exists: consegne != null,
            data: () => ({ consegne }),
          }),
      }),
    }),
  };
}

describe('consegne allegati: la lettura c\'era, ma non la usava nessuno', () => {
  it('leggiConsegne restituisce la mappa dal documento', async () => {
    (window as any).db = dbCon({ 'c1_0': '2026-10-11T09:00:00.000Z' });
    expect(await leggiConsegne('u1')).toEqual({ 'c1_0': '2026-10-11T09:00:00.000Z' });
  });

  it('uno studente senza consegne riceve una mappa vuota, non undefined', async () => {
    // Se tornasse undefined, `giaCompletato` dovrebbe gestire il caso e
    // ogni chiamante dovrebbe ricordarsene: meglio che non succeda mai.
    (window as any).db = dbCon(null);
    expect(await leggiConsegne('u1')).toEqual({});
  });

  it('senza db non lancia (nessun errore in finestra)', async () => {
    delete (window as any).db;
    expect(await leggiConsegne('u1')).toEqual({});
  });
});

describe('consegne allegati: decidere che cosa è ancora riapribile', () => {
  const consegne = { 'c1_0': '2026-10-11T09:00:00.000Z', 'c9_2': '2026-10-11T10:00:00.000Z' };

  it('l\'allegato consegnato è riconosciuto', () => {
    expect(giaCompletato(consegne, chiaveAllegato('c1', 0))).toBe(true);
  });

  it('un allegato DIVERSO della stessa card è ancora riapribile', () => {
    // Due allegati sulla stessa card sono due compiti: aver fatto il primo non
    // può chiudere il secondo.
    expect(giaCompletato(consegne, chiaveAllegato('c1', 1))).toBe(false);
  });

  it('lo stesso allegato su una card DIVERSA è ancora riapribile', () => {
    // La chiave è card+indice proprio perché l'indice si ricicla: senza il
    // id della card, il primo allegato della card 2 sembrerebbe già fatto.
    expect(giaCompletato(consegne, chiaveAllegato('c2', 0))).toBe(false);
  });

  it('nessuna consegna: tutto riapribile', () => {
    expect(giaCompletato({}, 'c1_0')).toBe(false);
  });

  it('chiave vuota: non è mai "completato"', () => {
    // Difesa contro il caso in cui manca l'indice: senza, `undefined` come
    // chiave potrebbe dare un falso positivo e bloccare un allegato a caso.
    expect(giaCompletato(consegne, '')).toBe(false);
    expect(giaCompletato(consegne, undefined as any)).toBe(false);
  });
});