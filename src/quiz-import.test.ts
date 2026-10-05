import { describe, it, expect } from 'vitest';
import { importaQuizDaTesto } from './quiz-import.ts';

describe('import quiz da JSON — formato del generatore IA', () => {
  it('accetta {domande:[…]} con multipla e indice come stringa', () => {
    const esito = importaQuizDaTesto(
      JSON.stringify({
        domande: [
          { tipo: 'multipla', testo: 'Domanda 1', opzioni: ['a', 'b', 'c'], corretta: '1' },
          { tipo: 'multipla', testo: 'Domanda 2', opzioni: ['x', 'y'], corretta: '0' },
        ],
      })
    );
    expect(esito.errore).toBeUndefined();
    expect(esito.domande).toHaveLength(2);
    expect(esito.domande[0]).toEqual({ tipo: 'multipla', testo: 'Domanda 1', opzioni: ['a', 'b', 'c'], hint: '', corretta: '1' });
    expect(esito.scartate).toEqual([]);
  });

  it('accetta l\'alias {questions:[…]} e un array nudo', () => {
    expect(importaQuizDaTesto(JSON.stringify([{ question: 'Q', options: ['a', 'b'], correct: 0 }])).domande).toHaveLength(1);
    expect(importaQuizDaTesto(JSON.stringify({ questions: [{ question: 'Q', options: ['a', 'b'], correct: 0 }] })).domande)
      .toHaveLength(1);
  });

  it('l\'indice è 0-based come nel formato dell\'app (1 = seconda opzione)', () => {
    const esito = importaQuizDaTesto(JSON.stringify({ domande: [{ testo: 'Q', opzioni: ['a', 'b', 'c'], corretta: '1' }] }));
    expect(esito.domande[0].corretta).toBe('1');
    const zero = importaQuizDaTesto(JSON.stringify({ domande: [{ testo: 'Q', opzioni: ['a', 'b'], corretta: 0 }] }));
    expect(zero.domande[0].corretta).toBe('0');
  });

  it('se il numero è fuori scala 0-based prova la 1-based (opzioni numerate da 1)', () => {
    // 4 opzioni, corretta: 4 → con la 0-based non esiste, con la 1-based è l'ultima.
    const esito = importaQuizDaTesto(JSON.stringify({ domande: [{ testo: 'Q', opzioni: ['a', 'b', 'c', 'd'], corretta: 4 }] }));
    expect(esito.domande[0].corretta).toBe('3');
  });

  it('riconosce la risposta corretta indicata col TESTO dell\'opzione', () => {
    const esito = importaQuizDaTesto(JSON.stringify({ domande: [{ testo: 'Q', opzioni: ['Sì', 'No'], corretta: 'No' }] }));
    expect(esito.domande[0].corretta).toBe('1');
  });
});

describe('import quiz — formato del file HTML dell\'utente', () => {
  // Struttura vera di quel file: quizData con question/hint/options[{label,text,isCorrect,rationale}]
  const html = [
    '<!doctype html><html><body>',
    '<div class="q" style="display:none">Domanda</div>',
    '<script>',
    'const quizData = [{"question":"Perché?","hint":"un aiuto","options":[',
    '{"label":"A","text":"Prima","isCorrect":true,"rationale":"motivo A"},',
    '{"label":"B","text":"Seconda","isCorrect":false,"rationale":"motivo B"}]}];',
    'function init(){}',
    '</script></body></html>',
  ].join('\n');

  it('estrae le domande dal file HTML e le converte in multipla', () => {
    const esito = importaQuizDaTesto(html);
    expect(esito.errore).toBeUndefined();
    expect(esito.domande).toHaveLength(1);
    expect(esito.domande[0]).toEqual({
      tipo: 'multipla',
      testo: 'Perché?',
      opzioni: ['Prima', 'Seconda'],
      hint: 'un aiuto',
      corretta: '0',
    });
  });

  it('regge le parentesi quadre dentro i testi (le formule [x]² non confontono il parser)', () => {
    const conFormula = '<script>quizData=[{"question":"Calcola [x]² + [y]","options":[{"text":"a","isCorrect":true},{"text":"b","isCorrect":false}]}]</script>';
    const esito = importaQuizDaTesto(conFormula);
    expect(esito.domande[0].testo).toBe('Calcola [x]² + [y]');
    expect(esito.domande[0].corretta).toBe('0');
  });

  it('regge gli apici escaped dentro le stringhe', () => {
    const conEscape = '<script>quizData=[{"question":"Cosa dice \\"x\\"?","options":[{"text":"a","isCorrect":true},{"text":"b","isCorrect":false}]}]</script>';
    const esito = importaQuizDaTesto(conEscape);
    expect(esito.domande).toHaveLength(1);
    expect(esito.domande[0].opzioni).toEqual(['a', 'b']);
  });

  it('HTML senza array di domande → errore spiegato, non un\'eccezione', () => {
    const esito = importaQuizDaTesto('<html><body><p>ciao</p></body></html>');
    expect(esito.domande).toEqual([]);
    expect(esito.errore).toMatch(/Nell HTML non ho trovato/);
  });
});

describe('import quiz — tipi riconosciuti', () => {
  it('due opzioni Vero/Falso diventano una domanda vero/falso (corretta = testo)', () => {
    const esito = importaQuizDaTesto(JSON.stringify({ domande: [{ testo: 'Il cielo è verde?', opzioni: ['Vero', 'Falso'], corretta: 'Falso' }] }));
    expect(esito.domande[0].tipo).toBe('verofalso');
    expect(esito.domande[0].corretta).toBe('Falso');
  });

  it('senza opzioni diventa una domanda aperta (valutata dall\'IA)', () => {
    const esito = importaQuizDaTesto(JSON.stringify({ domande: [{ testo: 'Descrivi il fenomeno', rationale: 'spiegazione utile' }] }));
    expect(esito.domande[0].tipo).toBe('aperta');
    expect(esito.domande[0].hint).toBe('spiegazione utile');
  });

  it('scarta e SEGNA le domande non importabili invece di perderle in silenzio', () => {
    const esito = importaQuizDaTesto(
      JSON.stringify({
        domande: [
          { testo: 'Buona', opzioni: ['a', 'b'], corretta: '0' },
          { opzioni: ['a', 'b'], corretta: '0' },
          { testo: 'Senza corretta', opzioni: ['a', 'b'] },
          { testo: 'Una sola opzione', opzioni: ['a'] },
        ],
      })
    );
    expect(esito.domande).toHaveLength(1);
    expect(esito.scartate).toHaveLength(3);
    expect(esito.scartate[0].motivo).toMatch(/testo della domanda/);
    expect(esito.scartate[1].motivo).toMatch(/corretta/);
    expect(esito.scartate[2].motivo).toMatch(/una sola opzione|sola opzione/);
    // L'indice riportato è 1-based: è quello che l'insegnante vede nel file.
    expect(esito.scartate[0].indice).toBe(2);
  });

  it('un file valido ma senza nulla di importabile spiega il motivo', () => {
    const esito = importaQuizDaTesto(JSON.stringify({ domande: [{ opzioni: [] }, { niente: true }] }));
    expect(esito.domande).toEqual([]);
    expect(esito.errore).toMatch(/Nessuna domanda importabile/);
  });
});

describe('import quiz — input non valido', () => {
  it('JSON malformato → errore, mai un\'eccezione', () => {
    const esito = importaQuizDaTesto('{ domande: [ ');
    expect(esito.domande).toEqual([]);
    expect(esito.errore).toMatch(/JSON non valido/);
  });

  it('JSON valido ma di altra cosa → errore che dice cosa ci si aspetta', () => {
    const esito = importaQuizDaTesto(JSON.stringify({ foo: 'bar' }));
    expect(esito.errore).toMatch(/nessuna lista di domande/);
  });

  it('file vuoto', () => {
    expect(importaQuizDaTesto('').errore).toBe('File vuoto');
    expect(importaQuizDaTesto(undefined as any).errore).toBe('File vuoto');
  });

  it('non mette MAI il flag ai: un quiz importato non è generato dall\'IA', () => {
    const esito = importaQuizDaTesto(JSON.stringify({ domande: [{ testo: 'Q', opzioni: ['a', 'b'], corretta: '0' }] }));
    expect(esito.domande[0].ai).toBeUndefined();
  });
});

describe('import quiz — compatibilità con il QuizBuilder', () => {
  it('le domande importate sono già nel formato che buildQuizDomande accetta', () => {
    // Replica la validazione di app-provider-helpers.buildQuizDomande: se una domanda
    // importata fosse scartata al salvataggio, l'insegnante perderebbe il lavoro senza
    // accorgersene (l'import ha detto "N domande importate").
    const esito = importaQuizDaTesto(
      '<script>quizData=[{"question":"Q1","options":[{"text":"a","isCorrect":true},{"text":"b","isCorrect":false}]},' +
        '{"question":"Q2","options":[{"text":"c","isCorrect":false},{"text":"d","isCorrect":true}]}]</script>'
    );
    esito.domande.forEach(function (d: any) {
      expect(d.testo.trim()).not.toBe('');
      if (d.tipo === 'multipla') {
        expect((d.opzioni || []).filter(Boolean).length).toBeGreaterThanOrEqual(2);
      }
    });
    expect(esito.domande.map((d: any) => d.corretta)).toEqual(['0', '1']);
  });
});