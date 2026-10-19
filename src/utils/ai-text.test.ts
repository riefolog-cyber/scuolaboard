// Test della pseudonimizzazione (AGENTS.md regola 3): i nomi reali degli
// studenti NON devono mai raggiungere il modello. Queste funzioni erano senza
// copertura: ogni modifica qui è un cambio alla promessa fatta nella
// PrivacyModal, quindi il comportamento va congelato.
import { describe, it, expect } from 'vitest';
import { pseudonimizeComments, restoreNames } from './ai-text.ts';
import { escapeForPrompt } from './format.ts';

function pseudo(commenti: any[], risposte?: any) {
  return pseudonimizeComments(commenti, escapeForPrompt, risposte);
}

describe('pseudonimizeComments: identità degli autori', () => {
  it('sostituisce ogni autore con un alias stabile e riutilizza lo stesso per lo stesso nome', () => {
    const r = pseudo([
      { autore: 'Luca Bianchi', testo: 'ciao' },
      { autore: 'Anna Verdi', testo: 'ok' },
      { autore: 'Luca Bianchi', testo: 'di nuovo' },
    ]);
    expect(r.txt).toBe('Studente 1: ciao\nStudente 2: ok\nStudente 1: di nuovo');
    expect(r.mappaNomi).toEqual({ 'Studente 1': 'Luca Bianchi', 'Studente 2': 'Anna Verdi' });
  });

  it('il testo inviato non contiene nessuno dei nomi reali', () => {
    const r = pseudo([
      { autore: 'Luca Bianchi', testo: 'secondo me è giusto' },
      { autore: 'Anna Verdi', testo: 'non sono d accordo' },
    ]);
    expect(r.txt).not.toContain('Luca Bianchi');
    expect(r.txt).not.toContain('Anna Verdi');
  });

  it('un autore senza nome non diventa uno studente', () => {
    const r = pseudo([{ autore: '', testo: 'x' }]);
    expect(r.txt).toBe('Anonimo: x');
    expect(r.mappaNomi).toEqual({});
  });
});

describe('pseudonimizeComments: nomi citati dentro i testi', () => {
  it('maschera il nome di un autore citato in un commento precedente alla sua comparsa', () => {
    // Prima passata: raccoglie TUTTI gli autori. Se la raccolta avvenisse riga
    // per riga, "Anna Verdi" (autrice del commento successivo) resterebbe in
    // chiaro nel primo testo.
    const r = pseudo([
      { autore: 'Luca Bianchi', testo: 'secondo Anna Verdi è giusto' },
      { autore: 'Anna Verdi', testo: 'grazie' },
    ]);
    expect(r.txt.split('\n')[0]).toBe('Studente 1: secondo Studente 2 è giusto');
  });

  it('maschera nome o cognome usati da soli', () => {
    const r = pseudo([
      { autore: 'Luca Bianchi', testo: 'Bianchi ha ragione' },
      { autore: 'Anna Verdi', testo: 'Luca? no' },
    ]);
    expect(r.txt).toBe('Studente 1: Studente 1 ha ragione\nStudente 2: Studente 1? no');
  });

  it('il nome completo è mascherato anche in minuscolo', () => {
    const r = pseudo([{ autore: 'Luca Bianchi', testo: 'firmato luca bianchi' }]);
    expect(r.txt).toBe('Studente 1: firmato Studente 1');
  });

  it('un token in minuscolo non viene mascherato: "chiara" (aggettivo) non è "Chiara"', () => {
    // Limite voluto: il match sul singolo token è case-sensitive per non
    // riscrivere parole comuni italiane. Il nome completo resta coperto.
    const r = pseudo([{ autore: 'Chiara Neri', testo: 'una spiegazione chiara' }]);
    expect(r.txt).toBe('Studente 1: una spiegazione chiara');
  });

  it('non maschera il nome dentro un altra parola', () => {
    const r = pseudo([{ autore: 'Luca', testo: 'Lucano è un aggettivo' }]);
    expect(r.txt).toBe('Studente 1: Lucano è un aggettivo');
  });

  it('gestisce nomi accentati e con apostrofo (dove \\b ASCII fallirebbe)', () => {
    const r = pseudo([{ autore: "Niccolò D'Amico", testo: "Niccolò D'Amico ha detto che Niccolò ha ragione" }]);
    expect(r.txt).toBe('Studente 1: Studente 1 ha detto che Studente 1 ha ragione');
    expect(r.txt).not.toContain('Niccolò');
  });

  it('il docente resta "Prof" e la parola non viene mai mascherata', () => {
    // 'Prof' non è un nome di persona: SB.myName lo usa per i docenti. Se
    // finisse nella lista dei nomi, ogni "Prof" delle istruzioni diventerebbe
    // "Studente N" e i prompt sarebbero incomprensibili.
    const r = pseudo([
      { autore: 'Prof', testo: 'il Prof risponde a tutti' },
      { autore: 'Luca Bianchi', testo: 'ok' },
    ]);
    expect(r.txt).toBe('Prof: il Prof risponde a tutti\nStudente 1: ok');
    expect(r.mappaNomi).toEqual({ 'Studente 1': 'Luca Bianchi' });
  });
});

describe('pseudonimizeComments: risposte annidate', () => {
  it('include le risposte di card.commenti[i].risposte e pseudonimizza i loro autori', () => {
    const r = pseudo([
      {
        autore: 'Luca Bianchi',
        testo: 'domanda',
        risposte: [{ autore: 'Anna Verdi', testo: 'rispondo io, sono Anna Verdi' }],
      },
    ]);
    expect(r.txt).toBe('Studente 1: domanda\n  ↳ Studente 2: rispondo io, sono Studente 2');
    expect(r.mappaNomi).toEqual({ 'Studente 1': 'Luca Bianchi', 'Studente 2': 'Anna Verdi' });
  });

  it('continua a supportare il vecchio parametro rispostePerCommento', () => {
    const r = pseudo([{ autore: 'Luca Bianchi', testo: 'x' }], {
      0: [{ autore: 'Anna Verdi', testo: 'y' }],
    });
    expect(r.txt).toContain('↳ Studente 2: y');
  });

  it('un commento senza risposte non aggiunge righe vuote', () => {
    const r = pseudo([{ autore: 'Luca Bianchi', testo: 'x', risposte: [] }]);
    expect(r.txt).toBe('Studente 1: x');
  });
});

describe('pseudonimizeComments: escaping', () => {
  it('escapeForPrompt è applicato DOPO il mascheramento', () => {
    const r = pseudo([{ autore: 'Luca Bianchi', testo: "ha detto 'ciao'\nLuca" }]);
    expect(r.txt).toBe("Studente 1: ha detto \\'ciao\\'\\nStudente 1");
  });

  it('lista vuota o non array non lancia', () => {
    expect(pseudo([]).txt).toBe('');
    expect(pseudo(null as any).txt).toBe('');
  });
});

describe('restoreNames', () => {
  it('riporta i nomi veri, anche con varianti di maiuscole e "lo studente N"', () => {
    const mappa = { 'Studente 1': 'Luca Bianchi', 'Studente 2': 'anna verdi' };
    expect(restoreNames('Studente 1 e lo studente 2', mappa)).toBe('Luca Bianchi e Anna Verdi');
    expect(restoreNames('STUDENTE 1', mappa)).toBe('Luca Bianchi');
  });

  it('non confonde Studente 1 con Studente 10', () => {
    expect(restoreNames('Studente 10', { 'Studente 1': 'Luca' })).toBe('Studente 10');
  });

  it('rispetta i nomi che hanno già una maiuscola (De Luca, D Amico)', () => {
    expect(restoreNames('Studente 1', { 'Studente 1': 'De Luca' })).toBe('De Luca');
  });
});
