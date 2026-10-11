// allegato-consegna.test.ts — il "l'ho finito" dell'allegato HTML.
//
// Tre cose da non confondere, perché il confine è il punto:
//
//  1. il MESSAGGIO è riconoscibile (forma giusta) — verificabile qui;
//  2. il messaggio è AUTENTICO — NON è verificabile e non lo è: l'allegato gira
//     a origine opaca, il canale è il postMessage, e lo studente può inviarlo a
//     mano. Nessun test può renderlo autentico, quindi nessun test deve fingere
//     il contrario;
//  3. la REGISTRAZIONE non è un voto — verificabile, ed è la garanzia che conta:
//     nel documento non finisce niente di valutabile, quindi nessun impatto su
//     voti, punteggi o IA può derivarne per sbaglio.

import { describe, it, expect } from 'vitest';
import { MESSAGGIO_CONSEGNA, isMessaggioAllegatoCompletato, messaggioConsegna } from './allegato-consegna.ts';

describe('allegato-consegna: riconoscere il messaggio', () => {
  it('il messaggio del file è riconosciuto', () => {
    expect(isMessaggioAllegatoCompletato(messaggioConsegna())).toBe(true);
  });

  it('il messaggio con dettagli è riconosciuto, e i dettagli sono facoltativi', () => {
    expect(isMessaggioAllegatoCompletato(messaggioConsegna({ allegato: 2, esito: 'ok' }))).toBe(true);
  });

  it('altri messaggi NON sono consegna (non deve scattare su qualsiasi postMessage)', () => {
    // Il requisito vero: l'app riceve postMessage da svariate fonti. Se il
    // riconoscimento fosse troppo largo, una notifica interna o un messaggio di
    // un riquadro figlio chiuderebbero l'allegato come "completato".
    expect(isMessaggioAllegatoCompletato({ sb: 'altra-cosa' })).toBe(false);
    expect(isMessaggioAllegatoCompletato({})).toBe(false);
    expect(isMessaggioAllegatoCompletato('allegato-completato')).toBe(false); // stringa, non oggetto
    expect(isMessaggioAllegatoCompletato(null)).toBe(false);
    expect(isMessaggioAllegatoCompletato(undefined)).toBe(false);
    expect(isMessaggioAllegatoCompletato([1, 2])).toBe(false); // array
  });

  it('campi di forma sbagliata vengono respinti', () => {
    // `allegato` dev\'essere numerico: un allegato non ha "id 1,2,3".
    expect(isMessaggioAllegatoCompletato({ sb: MESSAGGIO_CONSEGNA, allegato: 'due' })).toBe(false);
    // `esito` vale solo "ok": un esito diverso non è una consegna riuscita.
    expect(isMessaggioAllegatoCompletato({ sb: MESSAGGIO_CONSEGNA, esito: 'fallito' })).toBe(false);
  });

  it('non controlla l\'origine — e non potrebbe (l\'allegato è a origine opaca)', () => {
    // È il limite che rende il messaggio non autentico. Lo fissiamo perché è la
    // ragione per cui questo modulo NON deve mai diventare la base di un voto:
    // un domani, se qualcuno aggiunge qui un controllo "fidati dell\'origine",
    // penserebbe di aver messo una sicurezza che lì non esiste.
    expect(isMessaggioAllegatoCompletato({ sb: MESSAGGIO_CONSEGNA })).toBe(true);
  });
});

describe('allegato-consegna: il file che vuole dichiarare fine', () => {
  it('il messaggio si costruisce con l\'helper (è ciò che il file .html deve fare)', () => {
    // Il docente che scrive il quiz .html usa questa forma:
    //   parent.postMessage({ sb: "allegato-completato" }, "*")
    // Il secondo argomento "*" è l\'unico possibile: l\'app non ha un\'origine
    // stabile da dichiarare, e il messaggio è comunque in sola lettura.
    const m = messaggioConsegna();
    expect(m.sb).toBe('allegato-completato');
    expect(m.sb).toBe(MESSAGGIO_CONSEGNA);
  });
});