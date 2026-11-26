// cloud.test.ts · ScuolaBoard · il cloud di una classe è "quello che quella
// classe vede e scrive".
//
// PERCHÉ questo file esiste: il filtro per classe era `(c.classi || []).includes(nome)`,
// cioè un SECONDO criterio di visibilità rispetto a `card-classi.ts`. Sbagliava in tre
// modi, tutti silenziosi (nessun errore: solo numeri sbagliati nel riquadro del
// docente): una card per TUTTE non compariva in nessun cloud di classe, una card tolta
// alla 3A continuava a contare come roba della 3A, una card legacy senza `classi` (che
// vale per tutte) spariva. In più i commenti non erano filtrati per classe, quindi il
// cloud della 3A conteneva anche quello che aveva scritto la 3B sulla stessa card.
import { describe, it, expect } from 'vitest';
import { buildWordCloud, collectCloudStats } from './cloud.ts';

/** Parole del cloud, nell'ordine in cui escono. */
function parole(cards: any[], target: string): string[] {
  return buildWordCloud(cards, target).map(function (e: any) {
    return e[0];
  });
}

describe('cloud per classe · selezione delle card', function () {
  it('una card per TUTTE entra nel cloud della classe', function () {
    var card = { id: 'a', classi: ['TUTTE'], commenti: [{ classe: '3A', testo: 'tramonto' }] };
    expect(parole([card], 'classe_3A')).toContain('tramonto');
  });

  it('una card tolta alla classe non entra nel SUO cloud, ma resta in quello delle altre', function () {
    var card = {
      id: 'b',
      classi: ['3A', '3B'],
      classiEscluse: ['3A'],
      commenti: [{ classe: '3B', testo: 'bicicletta' }],
    };
    expect(parole([card], 'classe_3A')).toEqual([]);
    expect(parole([card], 'classe_3B')).toContain('bicicletta');
  });

  it('una card legacy senza classi vale per tutte: entra nel cloud della classe', function () {
    var card = { id: 'c', commenti: [{ testo: 'telescopio' }] };
    expect(parole([card], 'classe_3A')).toContain('telescopio');
  });

  it('le proposte non contano in nessun cloud', function () {
    var card = { id: 'p', proposta: true, classi: ['TUTTE'], commenti: [{ testo: 'tramonto' }] };
    expect(parole([card], 'tutte')).toEqual([]);
    expect(parole([card], 'classe_3A')).toEqual([]);
  });
});

describe('cloud per classe · quali commenti contano', function () {
  // La card è per TUTTE (la vedono entrambe le classi) ma i commenti sono
  // discussioni di classe: nel cloud della 3A finiscono la 3A e i commenti
  // legacy senza classe, non la 3B. Per 'tutte' restano tutti, come prima.
  var card = {
    id: 'd',
    classi: ['TUTTE'],
    commenti: [
      { classe: '3A', autore: 'S1', testo: 'algebra', risposte: [{ autore: 'S2', testo: 'geometria' }] },
      { classe: '3B', autore: 'S3', testo: 'bicicletta' },
      { autore: 'S4', testo: 'telescopio' },
    ],
  };

  it('il cloud della 3A non contiene i commenti della 3B', function () {
    var p = parole([card], 'classe_3A');
    expect(p).toContain('algebra');
    expect(p).toContain('telescopio'); // legacy: visibile a tutti
    expect(p).not.toContain('bicicletta');
  });

  it("'tutte' tiene tutti i commenti della bacheca", function () {
    var p = parole([card], 'tutte');
    expect(p).toContain('algebra');
    expect(p).toContain('bicicletta');
    expect(p).toContain('telescopio');
  });

  it('le statistiche contano solo i commenti della classe', function () {
    expect(collectCloudStats([card], 'classe_3A')).toEqual({
      cardCount: 1,
      commentCount: 3,
      studentCount: 3,
    });
    expect(collectCloudStats([card], 'tutte')).toEqual({
      cardCount: 1,
      commentCount: 4,
      studentCount: 4,
    });
  });
});

// Dato sporco: un elemento nullo in `commenti` non deve spegnere il riquadro
// (prima `cm.testo` su null era un TypeError e la modale non si apriva più).
describe('cloud · tolleranza ai dati sporchi', function () {
  it('commento nullo ignorato, il resto conta', function () {
    var card = {
      id: 'z',
      classi: ['TUTTE'],
      commenti: [null, { classe: '3B', testo: 'bicicletta', risposte: 'sporche' }],
    };
    expect(function () {
      buildWordCloud([card], 'tutte');
    }).not.toThrow();
    expect(collectCloudStats([card], 'tutte')).toEqual({ cardCount: 1, commentCount: 1, studentCount: 0 });
  });
});
