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
  escluseCoerenti,
  etichettaClassi,
  etichettaEsclusioni,
  senzaClasse,
  citaClasse,
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
    // Il cast serve per DIRE che è voluto: il tipo `Card` vieta `null`, ma
    // Firestore può restituire un campo sporco e la difesa qui dentro
    // esiste per quello. Senza il cast il test non compilerebbe e la
    // difesa sembrerebbe superflua; con il cast la prova resta onesta.
    const sporca = { classi: null } as unknown as Parameters<typeof classiDi>[0];
    expect(classiDi(sporca)).toEqual(['TUTTE']);
  });

  it('classiEscluse assente → lista vuota', () => {
    expect(escluseDi({ id: 'x' })).toEqual([]);
  });

  it('classiEscluse con valori non-stringa viene ripulita', () => {
    // Come sopra: il tipo vieta i non-stringa, il codice li ripulisce
    // perché un array sporco non deve far fallire il confronto in silenzio.
    const sporca = { classiEscluse: ['3A', null, 7, ''] } as unknown as Parameters<
      typeof escluseDi
    >[0];
    expect(escluseDi(sporca)).toEqual(['3A']);
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

  it('elenco con la stessa classe ripetuta → no (svuoterebbe le classi: card «solo prof»)', () => {
    // `classi: ['3A', '3A'] conta due voci ma una sola classe: togliere la 3A
    // lascerebbe `classi: []`, cioè la card visibile al solo docente — un gesto
    // che nessuno ha chiesto e che non si annulla dalla griglia.
    expect(eliminabileSoloDaClasse({ classi: ['3A', '3A'] }, '3A')).toBe(false);
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

// L'etichetta della destinazione è parte del criterio: se la bacheca dice una
// cosa e `visibileAClasse` ne fa un'altra, il docente non ha modo di accorgersi
// di aver tolto la card a una classe (lo stato è invisibile nella griglia).
describe('card-classi: etichetta della destinazione', function () {
  it('card per tutte le classi', function () {
    expect(etichettaClassi({ classi: ['TUTTE'] })).toBe('Tutte le classi');
  });

  it('«tutte tranne 3A» non si presenta come «tutte le classi»', function () {
    expect(etichettaClassi({ classi: ['TUTTE'], classiEscluse: ['3A'] })).toBe('Tutte le classi tranne 3A');
  });

  it('più esclusioni restano leggibili', function () {
    expect(etichettaClassi({ classi: ['TUTTE'], classiEscluse: ['3A', '4B'] })).toBe(
      'Tutte le classi tranne 3A, 4B'
    );
  });

  it('elenco esplicito di classi', function () {
    expect(etichettaClassi(cardDueClassi)).toBe('3A, 4B');
  });

  it('card senza classi: «Solo prof», non il vuoto', function () {
    expect(etichettaClassi(cardSoloProf)).toBe('Solo prof');
  });

  it('«solo prof» con un\'esclusione: non annuncia «tranne 3A», che non toglie niente', function () {
    expect(etichettaClassi({ classi: [], classiEscluse: ['3A'] })).toBe('Solo prof');
  });

  it('card legacy senza il campo: vale per tutte', function () {
    expect(etichettaClassi({ id: 'legacy' })).toBe('Tutte le classi');
  });

  // `classi: ['3A', '3A']` arriva da un import o da una scrittura a mano: è
  // UNA classe. Mostrarla due volte farebbe credere a due destinatari, e sulla
  // stampa il docente deciderebbe in base a un dato sbagliato.
  it('lo stesso nome ripetuto si mostra una volta sola', function () {
    expect(etichettaClassi({ classi: ['3A', '3A'] })).toBe('3A');
  });

  it('esclusioni ripetute: una sola volta', function () {
    expect(etichettaClassi({ classi: ['TUTTE'], classiEscluse: ['3A', '3A'] })).toBe(
      'Tutte le classi tranne 3A'
    );
  });

  // `classi` sporco (import o scrittura a mano): le voci non-stringa o vuote
  // facevano stampare «3A, » con la virgola appesa, e un elenco di sole voci
  // invalide lasciava l'etichetta VUOTA mentre la card non era visibile a
  // nessuno. Ora si scartano, come già fa `escluseDi`.
  it('voci non-stringa o vuote: scartate, etichetta pulita', function () {
    const sporche = ['3A', null, '', 5] as unknown as string[];
    expect(classiDi({ classi: sporche })).toEqual(['3A']);
    expect(etichettaClassi({ classi: sporche })).toBe('3A');
  });

  it('solo voci invalide: nessuna classe destinataria, etichetta «Solo prof»', function () {
    const sporche = [null, ''] as unknown as string[];
    expect(classiDi({ classi: sporche })).toEqual([]);
    expect(etichettaClassi({ classi: sporche })).toBe('Solo prof');
    expect(visibileAlProf({ classi: sporche }, '_solo')).toBe(true);
    expect(visibileAClasse({ classi: sporche }, '3A')).toBe(false);
  });
});

// Scrivere una classe in `classi` e contemporaneamente fra le escluse era
// possibile in tre click («togli dalla 3A», poi modifica e scegli SOLO la 3A):
// il documento salvava entrambe le cose, `visibileAClasse` dava ragione
// all'esclusione e la card spariva a tutti gli studenti, in silenzio.
describe('card-classi: esclusioni coerenti alla scrittura', function () {
  it('una classe elencata esplicitamente non resta anche esclusa', function () {
    expect(escluseCoerenti(['3A'], ['3A'])).toEqual([]);
  });

  it('le altre esclusioni restano', function () {
    expect(escluseCoerenti(['3A'], ['3A', '4B'])).toEqual(['4B']);
  });

  it('TUTTE non è un elenco: le esclusioni valgono tutte', function () {
    expect(escluseCoerenti(['TUTTE'], ['3A'])).toEqual(['3A']);
  });

  it('campo classi assente (legacy) = TUTTE', function () {
    expect(escluseCoerenti(undefined, ['3A'])).toEqual(['3A']);
  });

  it('valori sporchi vengono scartati, non salvati', function () {
    const sporche = ['3A', 5, null, ''] as unknown as string[];
    expect(escluseCoerenti(['4B'], sporche)).toEqual(['3A']);
  });

  it('la stessa esclusione ripetuta si salva una volta sola', function () {
    expect(escluseCoerenti(['TUTTE'], ['3A', '3A'])).toEqual(['3A']);
  });
});

// Il chip della bacheca non può portare la frase intera: qui la forma breve,
// così card e dettaglio dicono esattamente lo stesso «tranne …».
describe('card-classi: etichetta breve delle esclusioni', function () {
  it('senza esclusioni è vuota, non «tranne »', function () {
    expect(etichettaEsclusioni(cardTutte)).toBe('');
  });

  it('elenca le classi tolte', function () {
    expect(etichettaEsclusioni({ classi: ['TUTTE'], classiEscluse: ['3A'] })).toBe('tranne 3A');
  });

  it('più classi, separate', function () {
    expect(etichettaEsclusioni({ classi: ['TUTTE'], classiEscluse: ['3A', '4B'] })).toBe('tranne 3A, 4B');
  });

  it('card «solo prof»: senza destinatari l\'esclusione non ha effetto, niente chip', function () {
    expect(etichettaEsclusioni({ classi: [], classiEscluse: ['3A'] })).toBe('');
  });

  it('esclusioni ripetute: una sola volta anche nel chip', function () {
    expect(etichettaEsclusioni({ classi: ['TUTTE'], classiEscluse: ['3A', '3A'] })).toBe('tranne 3A');
  });
});

// Scrittura del gesto «togli da questa classe»: con una classe ESPLICITA si
// toglie dall'elenco (altrimenti il documento direbbe «3A, 4B tranne 3A» e
// l'editor, risalvando, applicherebbe escluseCoerenti annullando il gesto).
describe('card-classi: scrittura «togli da questa classe»', function () {
  it("card per TUTTE: l'esclusione è il gesto giusto", function () {
    expect(senzaClasse(cardTutte, '3A')).toEqual({ classi: ['TUTTE'], classiEscluse: ['3A'] });
  });

  it('le esclusioni già presenti restano, senza duplicati', function () {
    expect(senzaClasse({ classi: ['TUTTE'], classiEscluse: ['4B'] }, '3A')).toEqual({
      classi: ['TUTTE'],
      classiEscluse: ['4B', '3A'],
    });
    expect(senzaClasse({ classi: ['TUTTE'], classiEscluse: ['3A'] }, '3A')).toEqual({
      classi: ['TUTTE'],
      classiEscluse: ['3A'],
    });
  });

  it("classe esplicita: esce dall'elenco e NON entra nelle escluse", function () {
    expect(senzaClasse(cardDueClassi, '3A')).toEqual({ classi: ['4B'], classiEscluse: [] });
  });

  it(
    "documento legacy incoerente (3A sia in elenco sia esclusa): dopo il gesto l'esclusione sparisce",
    function () {
      // Scritto dalla versione precedente di `senzaClasse`: l'esclusione nomina una
      // classe che sta ANCHE nell'elenco esplicito. Togliendo la 4B resterebbe
      // «3A tranne 3A» e `visibileAClasse` farebbe vincere l'esclusione: la card
      // non la vedrebbe più NESSUNO, senza errore e senza che nessuna schermata
      // lo dica. La scrittura riallinea, non eredita la contraddizione.
      expect(senzaClasse({ classi: ['3A', '4B'], classiEscluse: ['3A'] }, '4B')).toEqual({
        classi: ['3A'],
        classiEscluse: [],
      });
    }
  );

  it("le esclusioni che non toccano l'elenco restano", function () {
    expect(senzaClasse({ classi: ['3A', '4B'], classiEscluse: ['5C'] }, '4B')).toEqual({
      classi: ['3A'],
      classiEscluse: ['5C'],
    });
    // Esclusione che nomina l'altra classe rimasta: vince l'elenco anche lei.
    expect(senzaClasse({ classi: ['3A', '4B'], classiEscluse: ['3A', '4B'] }, '3A')).toEqual({
      classi: ['4B'],
      classiEscluse: [],
    });
  });

  it('non muta la card originale', function () {
    const card = { classi: ['3A', '4B'] };
    senzaClasse(card, '3A');
    expect(card.classi).toEqual(['3A', '4B']);
  });
});
describe('citaClasse', function () {
  it("conta la classe presente nell'elenco esplicito", function () {
    expect(citaClasse({ classi: ['3A', '4B'] }, '3A')).toBe(true);
  });

  it('conta anche la classe ESCLUSA: il nome resta nel documento, e senza contarlo sparirebbe senza avviso', function () {
    expect(citaClasse(cardTutte, '3A')).toBe(false);
    expect(citaClasse({ classi: ['TUTTE'], classiEscluse: ['3A'] }, '3A')).toBe(true);
  });

  it('non conta le altre classi ne le card legacy senza classi', function () {
    expect(citaClasse({ classi: ['3A'] }, '4B')).toBe(false);
    expect(citaClasse({ id: 'legacy' }, '3A')).toBe(false);
  });

  it('una classe vuota non corrisponde a niente', function () {
    expect(citaClasse({ classi: ['3A'] }, '')).toBe(false);
  });
});
