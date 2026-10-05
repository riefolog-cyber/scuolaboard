import { describe, it, expect } from 'vitest';
import { indiceDi, rispostaGiusta, testoCorretta, testoRisposta } from './quiz-corretta.ts';

// I due formati di `corretta` (AGENTS.md regola 12): per `multipla` è l'indice 0-based
// COME STRINGA, per `verofalso` è il TESTO dell'opzione. La risposta dello studente è
// sempre l'indice (numero). Qui stanno congelati i casi che facevano litigare i pannelli.
const MULTIPLA = {
  tipo: 'multipla',
  opzioni: ['Prima', 'Seconda', 'Terza', 'Quarta'],
  corretta: '2', // indice 2 → "Terza"
};
const VEROFALSO = { tipo: 'verofalso', opzioni: ['Vero', 'Falso'], corretta: 'Falso' };

describe('rispostaGiusta — il caso che ha rotto il pannello docente', () => {
  // Numero contro stringa: il punteggio (String vs String) lo dava giusto, il pannello
  // prof (=== rigido) lo dava sbagliato. Lo stesso identico quiz, due veri.
  it('indice numerico dell studente contro indice stringa del quiz', () => {
    expect(rispostaGiusta(MULTIPLA, 2)).toBe(true);
    expect(rispostaGiusta(MULTIPLA, 1)).toBe(false);
  });

  it('lo stesso se la risposta è arrivata come stringa', () => {
    expect(rispostaGiusta(MULTIPLA, '2')).toBe(true);
    expect(rispostaGiusta(MULTIPLA, '0')).toBe(false);
  });

  it('indice 0 non viene trattato come "nessuna risposta"', () => {
    // Il caso limite di `== ''`: con `==` il numero 0 è falsy e sembrerebbe vuoto.
    const q = { tipo: 'multipla', opzioni: ['a', 'b'], corretta: '0' };
    expect(rispostaGiusta(q, 0)).toBe(true);
    expect(rispostaGiusta(q, 1)).toBe(false);
  });
});

describe('rispostaGiusta — vero/falso (corretta è il TESTO)', () => {
  it('indice dell opzione confrontato col testo della risposta giusta', () => {
    expect(rispostaGiusta(VEROFALSO, 1)).toBe(true); // ha scelto "Falso"
    expect(rispostaGiusta(VEROFALSO, 0)).toBe(false); // ha scelto "Vero"
  });

  it('prima il confronto diretto col testo (se la risposta è già il testo)', () => {
    expect(rispostaGiusta(VEROFALSO, 'Falso')).toBe(true);
  });
});

describe('rispostaGiusta — casi limite', () => {
  it('domanda senza risposta giusta: mai giusta (buildQuizDomande non controlla `corretta`)', () => {
    expect(rispostaGiusta({ opzioni: ['a', 'b'], corretta: '' }, 0)).toBe(false);
    expect(rispostaGiusta({ opzioni: ['a', 'b'] }, 0)).toBe(false);
    expect(rispostaGiusta({ opzioni: ['a', 'b'], corretta: null }, 1)).toBe(false);
  });

  it('risposta vuota → mai giusta', () => {
    expect(rispostaGiusta(MULTIPLA, null)).toBe(false);
    expect(rispostaGiusta(MULTIPLA, undefined)).toBe(false);
    expect(rispostaGiusta(MULTIPLA, '')).toBe(false);
  });

  it('risposta fuori scala → non crasha', () => {
    expect(rispostaGiusta(MULTIPLA, 99)).toBe(false);
    expect(rispostaGiusta(MULTIPLA, -1)).toBe(false);
    expect(rispostaGiusta(null, 0)).toBe(false);
  });

  it('opzioni mancanti ma indice coincidente → giusta (è il criterio del punteggio)', () => {
    // Non è un caso da "nascondere": se l'indice della risposta coincide con quello
    // della risposta giusta, la risposta è giusta. Se qui dicessimo false, il
    // punteggio e i segni del pannello tornerebbero a contraddirsi.
    expect(rispostaGiusta({ opzioni: null, corretta: '0' }, 0)).toBe(true);
    expect(rispostaGiusta({ opzioni: null, corretta: '0' }, 1)).toBe(false);
  });

  it('risposta salvata come TESTO dell opzione (dati più vecchi): riconosciuta', () => {
    expect(rispostaGiusta(MULTIPLA, 'Terza')).toBe(true);
    expect(rispostaGiusta(MULTIPLA, 'Prima')).toBe(false);
  });
});

describe('testoRisposta / testoCorretta — quello che il docente vede', () => {
  it('risolve l indice nel testo dell opzione', () => {
    expect(testoRisposta(MULTIPLA, 2)).toBe('Terza');
    expect(testoRisposta(VEROFALSO, 1)).toBe('Falso');
  });

  it('mostra la risposta giusta per entrambi i formati', () => {
    expect(testoCorretta(MULTIPLA)).toBe('Terza');
    expect(testoCorretta(VEROFALSO)).toBe('Falso');
  });

  it('risposta vuota o fuori scala → trattamento gentile, niente "undefined"', () => {
    expect(testoRisposta(MULTIPLA, '')).toBe('-');
    expect(testoRisposta(MULTIPLA, null)).toBe('-');
    expect(testoRisposta(MULTIPLA, 99)).toBe('99');
    expect(testoCorretta({ opzioni: ['a'], corretta: '' })).toBe('');
  });
});

describe('indiceDi', () => {
  it('accetta numeri, stringhe numeriche e rifiuta il resto', () => {
    expect(indiceDi(2)).toBe(2);
    expect(indiceDi('2')).toBe(2);
    expect(indiceDi('')).toBe(-1);
    expect(indiceDi('Terza')).toBe(-1);
    expect(indiceDi(null)).toBe(-1);
  });
});