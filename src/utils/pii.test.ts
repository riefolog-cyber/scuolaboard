// Test del mascheramento delle PII strutturate (email, CF, IBAN, telefoni).
// Sono dati che oggi finiscono al modello così come sono: qui si congela sia
// cosa viene coperto sia cosa NON deve essere toccato (numeri delle lezioni,
// date, risposte ai quiz), perché un falso positivo rende il prompt inutile.
import { describe, it, expect } from 'vitest';
import { mascheraPII, ripristinaPII } from './pii.ts';

describe('mascheraPII: email', () => {
  it('sostituisce un indirizzo con un segnaposto tipizzato', () => {
    const r = mascheraPII('Scrivi a mario.rossi@gmail.com per info');
    expect(r.txt).toBe('Scrivi a [EMAIL_1] per info');
    expect(r.mappa).toEqual({ '[EMAIL_1]': 'mario.rossi@gmail.com' });
  });

  it('la stessa email ripetuta riceve lo stesso segnaposto', () => {
    const r = mascheraPII('a@b.it e ancora a@b.it');
    expect(r.txt).toBe('[EMAIL_1] e ancora [EMAIL_1]');
  });

  it('email diverse ricevono segnaposto diversi', () => {
    const r = mascheraPII('a@b.it e c@d.it');
    expect(r.txt).toBe('[EMAIL_1] e [EMAIL_2]');
  });

  it('copre maiuscole e simboli ammessi nella parte locale', () => {
    const r = mascheraPII('contatto: Mario.Rossi+scuola@Gmail.COM');
    expect(r.txt).toBe('contatto: [EMAIL_1]');
    expect(r.mappa['[EMAIL_1]']).toBe('Mario.Rossi+scuola@Gmail.COM');
  });
});

describe('mascheraPII: identificatori italiani', () => {
  it('maschera il codice fiscale', () => {
    const r = mascheraPII('Il Sig. Rossi, C.F. RSSMRA85H12F205Y, è presente');
    expect(r.txt).toBe('Il Sig. Rossi, C.F. [CF_1], è presente');
    expect(r.mappa['[CF_1]']).toBe('RSSMRA85H12F205Y');
  });

  it('maschera un IBAN italiano', () => {
    const r = mascheraPII('Bonifico su IT60X0542811101000000123456 grazie');
    expect(r.txt).toBe('Bonifico su [IBAN_1] grazie');
    expect(r.mappa['[IBAN_1]']).toBe('IT60X0542811101000000123456');
  });

  it("l'IBAN non viene poi spezzato dal codice fiscale", () => {
    // L'ordine delle regole conta: IBAN prima di CF.
    const r = mascheraPII('IT60X0542811101000000123456');
    expect(r.txt).toBe('[IBAN_1]');
  });
});

describe('mascheraPII: telefoni', () => {
  it('maschera cellulare e fisso con separatori', () => {
    const r = mascheraPII('Chiama 333 123 4567 oppure 051/123456');
    expect(r.txt).toBe('Chiama [TEL_1] oppure [TEL_2]');
  });

  it('maschera il prefisso internazionale', () => {
    const r = mascheraPII('Tel: +39 333 123 4567');
    expect(r.txt).toBe('Tel: [TEL_1]');
  });

  it('maschera il cellulare scritto attaccato', () => {
    const r = mascheraPII('scrivi al 3331234567');
    expect(r.txt).toBe('scrivi al [TEL_1]');
  });
});

describe('mascheraPII: falsi positivi', () => {
  it('non tocca date, orari, numeri di lezione e risultati', () => {
    const testo = 'Il 12/05/2026 alle 10:30 abbiamo fatto 3 + 1 = 4 e 12345678 punti';
    expect(mascheraPII(testo).txt).toBe(testo);
  });

  it('non taglia un numero dentro una sequenza più lunga', () => {
    const testo = 'ID pratica 12333123456789';
    expect(mascheraPII(testo).txt).toBe(testo);
  });

  it('limite dichiarato: il fisso tutto attaccato non viene riconosciuto', () => {
    // Il test congela la scelta, non un difetto dimenticato: allargare la
    // regola a qualunque sequenza di cifre romperebbe i numeri delle lezioni.
    const testo = 'numero 051123456';
    expect(mascheraPII(testo).txt).toBe(testo);
  });

  it('non tocca una parola che contiene una sequenza simile a un CF', () => {
    const testo = 'RSSMRA85H12F205 (senza lettera finale) non è un CF';
    expect(mascheraPII(testo).txt).toBe(testo);
  });
});

describe('ripristinaPII', () => {
  it('rimette i valori veri', () => {
    const r = mascheraPII('scrivi a a@b.it, CF RSSMRA85H12F205Y');
    expect(ripristinaPII(r.txt, r.mappa)).toBe('scrivi a a@b.it, CF RSSMRA85H12F205Y');
  });

  it('gestisce i segnaposto con numeri a più cifre (EMAIL_10 prima di EMAIL_1)', () => {
    const mappa = { '[EMAIL_1]': 'uno@x.it', '[EMAIL_10]': 'dieci@x.it' };
    expect(ripristinaPII('[EMAIL_10] e [EMAIL_1]', mappa)).toBe('dieci@x.it e uno@x.it');
  });

  it('ripristina anche il token senza parentesi quadre', () => {
    expect(ripristinaPII('scrivi a EMAIL_1', { '[EMAIL_1]': 'a@b.it' })).toBe('scrivi a a@b.it');
  });

  it('senza mappa (nessuna PII trovata) il testo resta identico', () => {
    expect(ripristinaPII('niente da fare', {})).toBe('niente da fare');
  });
});

describe('mascheraPII: testo vuoto o nullo', () => {
  it('non lancia e non inventa segnaposto', () => {
    expect(mascheraPII('').mappa).toEqual({});
    expect(mascheraPII(null as any).txt).toBe('');
  });
});
