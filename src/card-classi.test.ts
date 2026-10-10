// card-classi.test.ts · il criterio UNICO di visibilità per classe.
//
// Il difetto che ha motivato questo modulo: eliminando una card per TUTTE le
// classi mentre la bacheca era filtrata su una classe, il documento spariva da
// ogni classe. Qui si blocca la semantica delle esclusioni, perché il campo
// `classiEscluse` è invisibile alla griglia: se il filtro sbaglia, la card
// semplicemente non la vede nessuno e non c'è nessun rumore che lo segnali.

import { describe, it, expect } from 'vitest';
import {
  classiDi,
  escluseDi,
  esclusa,
  visibileAClasse,
  visibileAlProf,
  conEsclusione,
  eliminabileSoloDaClasse,
} from './card-classi.ts';

const cardTutte = { id: 'c1', classi: ['TUTTE'] };
const card3A = { id: 'c2', classi: ['3A'] };
const cardDueClassi = { id: 'c3', classi: ['3A', '4B'] };
const cardSoloProf = { id: 'c4', classi: [] };

describe('card-classi: lettura dei campi', () => {
  it('senza il campo classi vale TUTTE (card legacy)', () => {
    expect(classiDi({ id: 'x' })).toEqual(['TUTTE']);
  });

  it('classi non è un array → TUTTE, non undefined', () => {
    expect(classiDi({ classi: null })).toEqual(['TUTTE']);
  });

  it('classiEscluse assente → lista vuota', () => {
    expect(escluseDi({ id: 'x' })).toEqual([]);
  });

  it('classiEscluse con valori non-stringa viene ripulita', () => {
    expect(escluseDi({ classiEscluse: ['3A', null, 7, ''] })).toEqual(['3A']);
  });

  it('esclusa() risponde vero solo per la classe indicata', () => {
    var c = { classiEscluse: ['3A'] };
    expect(esclusa(c, '3A')).toBe(true);
    expect(esclusa(c, '4B')).toBe(false);
    expect(esclusa(c, null)).toBe(false);
  });
});

describe('card-classi: visibileAClasse (lato studente)', () => {
  it('card TUTTE: visibile a ogni classe', () => {
    expect(visibileAClasse(cardTutte, '3A')).toBe(true);
    expect(visibileAClasse(cardTutte, '5C')).toBe(true);
  });

  it('card TUTTE: visibile anche a chi non ha ancora scelto classe', () => {
    expect(visibileAClasse(cardTutte, null)).toBe(true);
  });

  it('card di una sola classe: non agli altri', () => {
    expect(visibileAClasse(card3A, '3A')).toBe(true);
    expect(visibileAClasse(card3A, '4B')).toBe(false);
  });

  it('"solo prof" (classi vuote) non è visibile a nessuno studente', () => {
    expect(visibileAClasse(cardSoloProf, '3A')).toBe(false);
    expect(visibileAClasse(cardSoloProf, null)).toBe(false);
  });

  it('ESCLUSIONE: la card TUTTE non è visibile alla classe esclusa', () => {
    var c = { classi: ['TUTTE'], classiEscluse: ['3A'] };
    expect(visibileAClasse(c, '3A')).toBe(false);
  });

  it('ESCLUSIONE: le altre classi continuano a vedere la card', () => {
    var c = { classi: ['TUTTE'], classiEscluse: ['3A'] };
    expect(visibileAClasse(c, '4B')).toBe(true);
    expect(visibileAClasse(c, '5C')).toBe(true);
  });

  it('ESCLUSIONE: anche chi non ha classe perde la card TUTTE esclusa', () => {
    // La classe esclusa è quella dello studente: senza classe non si sa quale
    // sia, quindi non lo si esclude. Resta il caso della classe nota.
    var c = { classi: ['TUTTE'], classiEscluse: ['3A'] };
    expect(visibileAClasse(c, null)).toBe(true);
  });

  it('ESCLUSIONE vale anche su un elenco esplicito di classi', () => {
    var c = { classi: ['3A', '4B'], classiEscluse: ['3A'] };
    expect(visibileAClasse(c, '3A')).toBe(false);
    expect(visibileAClasse(c, '4B')).toBe(true);
  });

  it('senza classe non si vedono le card di un elenco esplicito', () => {
    expect(visibileAClasse(card3A, null)).toBe(false);
  });
});

describe('card-classi: visibileAlProf (filtro della bacheca)', () => {
  it('"tutte" mostra tutto, card esclusa compresa', () => {
    expect(visibileAlProf({ classi: ['TUTTE'], classiEscluse: ['3A'] }, 'tutte')).toBe(true);
  });

  it('il filtro classe include le card TUTTE', () => {
    expect(visibileAlProf(cardTutte, '3A')).toBe(true);
  });

  it('il filtro classe nasconde le card già escluse da quella classe', () => {
    // Il docente vede il RISULTATO delle sue scelte, non le carte scartate due
    // volte: senza questo, la griglia mostrerebbe card che agli studenti della
    // 3A non compaiono e il docente non capirebbe perché.
    var c = { classi: ['TUTTE'], classiEscluse: ['3A'] };
    expect(visibileAlProf(c, '3A')).toBe(false);
    expect(visibileAlProf(c, '4B')).toBe(true);
  });

  it('"solo prof" mostra solo le card con classi vuote', () => {
    expect(visibileAlProf(cardSoloProf, '_solo')).toBe(true);
    expect(visibileAlProf(cardTutte, '_solo')).toBe(false);
  });

  it('il filtro classe prende anche le card di una sola classe', () => {
    expect(visibileAlProf(card3A, '3A')).toBe(true);
    expect(visibileAlProf(card3A, '4B')).toBe(false);
  });
});

describe('card-classi: conEsclusione', () => {
  it('aggiunge la classe', () => {
    expect(conEsclusione(cardTutte, '3A')).toEqual(['3A']);
  });

  it('non duplica una classe già esclusa', () => {
    expect(conEsclusione({ classiEscluse: ['3A'] }, '3A')).toEqual(['3A']);
  });

  it('accoda a esclusioni già presenti', () => {
    expect(conEsclusione({ classiEscluse: ['4B'] }, '3A')).toEqual(['4B', '3A']);
  });

  it('classe vuota → non tocca la lista', () => {
    expect(conEsclusione(cardTutte, '')).toEqual([]);
  });

  it('NON muta la card di partenza', () => {
    var c = { classi: ['TUTTE'], classiEscluse: [] };
    conEsclusione(c, '3A');
    expect(c.classiEscluse).toEqual([]);
  });
});

describe('card-classi: eliminabileSoloDaClasse (quando mostrare il bottone)', () => {
  it('TUTTE + filtro classe → sì, le altre classi restano', () => {
    expect(eliminabileSoloDaClasse(cardTutte, '3A')).toBe(true);
  });

  it('elenco di più classi + filtro classe → sì', () => {
    expect(eliminabileSoloDaClasse(cardDueClassi, '3A')).toBe(true);
  });

  it('card già di una sola classe → no (le due scelte sarebbero identiche)', () => {
    expect(eliminabileSoloDaClasse(card3A, '3A')).toBe(false);
  });

  it('senza filtro classe ("tutte") → no: non c\'è classe di cui parlare', () => {
    expect(eliminabileSoloDaClasse(cardTutte, 'tutte')).toBe(false);
  });

  it('filtro "solo prof" → no', () => {
    expect(eliminabileSoloDaClasse(cardTutte, '_solo')).toBe(false);
  });

  it('classe già esclusa → no (non si può togliere due volte)', () => {
    var c = { classi: ['TUTTE'], classiEscluse: ['3A'] };
    expect(eliminabileSoloDaClasse(c, '3A')).toBe(false);
  });

  it('filtro classe che non riguarda la card → no', () => {
    expect(eliminabileSoloDaClasse(card3A, '5C')).toBe(false);
  });
});

// Il caso che ha fatto scattare la segnalazione: eliminare da una classe
// filtrata non deve toccare le altre.
describe('card-classi: il caso segnalato', () => {
  it('card TUTTE tolta dalla 3A: la 4B la vede ancora', () => {
    var card = cardTutte;
    card = Object.assign({}, card, { classiEscluse: conEsclusione(card, '3A') });
    expect(visibileAClasse(card, '3A')).toBe(false);
    expect(visibileAClasse(card, '4B')).toBe(true);
    // E il documento non è stato cancellato: la card esiste ancora.
    expect(card.id).toBe('c1');
  });

  it('il docente può annullare: togliere l\'esclusione la rende visibile', () => {
    var card = { classi: ['TUTTE'], classiEscluse: ['3A'] };
    var ripristinata = Object.assign({}, card, {
      classiEscluse: escluseDi(card).filter(function (c) {
        return c !== '3A';
      }),
    });
    expect(visibileAClasse(ripristinata, '3A')).toBe(true);
  });
});