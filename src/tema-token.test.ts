// Test statico: i file già migrati ai token dei temi non devono tornare ai
// ternari `isLight ? … : …`.
//
// PERCHÉ: la migrazione è stata fatta a mano in tre passaggi e un grep normale
// non vede il ternario spezzato su più righe (era rimasto il gradiente della
// maniglia, e le bolle dei commenti). Senza questo guardiano, la prossima card
// scritta di fretta reintroduce il tema scuro dentro una superficie chiara, e
// nessun test jsdom se ne accorge (non fa layout, l'harness E2E monta senza CSS).
//
// Legge i file come testo con `?raw` (come rules-anni-consistency.test.ts):
// nessuna API di Node, nessun @types/node da aggiungere.
//
// LIMITE CONOSCIUTO: cerca la forma `isLight ?`, non le sue riscritture
// (`$.isLight === false ?`, `tema === 'light' ?`). Non è una svista: le altre
// forme non sono mai state usate qui, e allargare il pattern senza un caso reale
// produrrebbe solo falsi positivi. Se una riscrittura entra nel codice, si
// aggiunge il pattern nello stesso commit.
import { describe, it, expect } from 'vitest';

// Pattern usato dal conteggio qui sotto: lo si congela con un caso sintetico,
// altrimenti una regex sbagliata farebbe passare sempre il test principale.
const TERNARIO = /isLight\s*\?/g;
import cardItemRaw from './CardItem.tsx?raw';
import cardDetailRaw from './CardDetail.tsx?raw';
import commentsRaw from './carddetail/CommentsSection.tsx?raw';
import partecipazioneRaw from './carddetail/PartecipazionePanel.tsx?raw';
import filterBarRaw from './FilterBar.tsx?raw';
import cardGridRaw from './CardGrid.tsx?raw';
import diagnosticaRaw from './Diagnostica.tsx?raw';
import appLayoutRaw from './AppLayout.tsx?raw';
import headerRaw from './Header.tsx?raw';

// Unica eccezione ammessa: l'ambra del testo di ammonizione è un colore di
// AVVISO, non una superficie del tema (spiegato nel file).
var ECCEZIONI: Record<string, number> = {
  'CommentsSection.tsx': 1,
};

var FILE: Record<string, string> = {
  'CardItem.tsx': cardItemRaw,
  'CardDetail.tsx': cardDetailRaw,
  'CommentsSection.tsx': commentsRaw,
  'PartecipazionePanel.tsx': partecipazioneRaw,
  'FilterBar.tsx': filterBarRaw,
  'CardGrid.tsx': cardGridRaw,
  'Diagnostica.tsx': diagnosticaRaw,
  'AppLayout.tsx': appLayoutRaw,
  'Header.tsx': headerRaw,
};

describe('temi · nessun nuovo ternario isLight nei file migrati', function () {
  it('la lista dei file sorvegliati non si è ristretta', function () {
    // Se qualcuno togliesse un file da FILE, un ternario lì dentro passerebbe
    // inosservato e il tema sbagliato non sarebbe visto da nessun test.
    expect(Object.keys(FILE).length, 'file di tema tolto dalla guardia').toBeGreaterThanOrEqual(9);
    expect(Object.keys(FILE)).toContain('AppLayout.tsx');
    expect(Object.keys(FILE)).toContain('Diagnostica.tsx');
    expect(Object.keys(FILE)).toContain('Header.tsx');
  });

  it('il conteggio resta quello atteso (di norma zero)', function () {
    Object.keys(FILE).forEach(function (nome) {
      var n = (FILE[nome].match(TERNARIO) || []).length;
      expect(n, nome + ': usare un token --sb-* invece del ternario').toBe(ECCEZIONI[nome] || 0);
    });
  });

  it('la guardia riconosce davvero le forme che deve bloccare', function () {
    // Il limite noto (isLight === true ?) resta fuori: qui si congelano le forme
    // che il pattern DICHIARA di vedere, così non può rompersi in silenzio.
    expect(('color: isLight ? "bianco" : "nero"'.match(TERNARIO) || []).length).toBe(1);
    expect(('color: $.isLight ? "bianco" : "nero"'.match(TERNARIO) || []).length).toBe(1);
    expect(('color: isLight\n  ? "bianco"\n  : "nero"'.match(TERNARIO) || []).length).toBe(1);
  });

  it('la griglia usa i token per superficie e bordi (non colori fissi)', function () {
    // CardGrid è il posto in cui i token sono nati: se qualcuno torna a un
    // colore fisso per bordo/superficie, il tema chiaro sbaglia quella card.
    expect(cardGridRaw).toContain("var(--sb-line)");
    expect(cardGridRaw).toContain("var(--sb-surface)");
  });
});
