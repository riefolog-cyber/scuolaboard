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
// LIMITE CONOSCIUTO: il pattern copre `isLight ?`, `$.isLight ?` e i confronti
// stretti `isLight === true ?` / `=== false ?`. Non copre `==`, `!==`, parentesi
// o altre variabili (`tema === 'light' ?`). Se una entra nel codice si aggiorna
// il pattern nello stesso commit insieme al caso sintetico.
import { describe, it, expect } from 'vitest';

// Pattern usato dal conteggio qui sotto: lo si congela con un caso sintetico,
// altrimenti una regex sbagliata farebbe passare sempre il test principale.
const TERNARIO = /\bisLight\b(?:\s*===\s*(?:true|false)\s*)?\s+\?/g;
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
    expect(Object.keys(FILE).sort()).toEqual([
      'AppLayout.tsx',
      'CardDetail.tsx',
      'CardGrid.tsx',
      'CardItem.tsx',
      'CommentsSection.tsx',
      'Diagnostica.tsx',
      'FilterBar.tsx',
      'Header.tsx',
      'PartecipazionePanel.tsx',
    ]);
  });

  it('il conteggio resta quello atteso (di norma zero)', function () {
    Object.keys(FILE).forEach(function (nome) {
      var n = (FILE[nome].match(TERNARIO) || []).length;
      expect(n, nome + ': usare un token --sb-* invece del ternario').toBe(ECCEZIONI[nome] || 0);
    });
  });

  it('la guardia riconosce davvero le forme che deve bloccare', function () {
    // Qui si congelano le forme che il pattern DICHIARA di vedere (compreso il
    // confronto esplicito a true), così non può rompersi in silenzio.
    expect(('color: isLight ? "bianco" : "nero"'.match(TERNARIO) || []).length).toBe(1);
    expect(('color: $.isLight ? "bianco" : "nero"'.match(TERNARIO) || []).length).toBe(1);
    expect(('color: isLight\n  ? "bianco"\n  : "nero"'.match(TERNARIO) || []).length).toBe(1);
    expect(('color: isLight === true ? "bianco" : "nero"'.match(TERNARIO) || []).length).toBe(1);
    // Il flag `g` deve contare TUTTE le occorrenze, non solo la prima.
    expect(('a: isLight ? 1 : 2; b: $.isLight ? 3 : 4'.match(TERNARIO) || []).length).toBe(2);
    // Limiti noti congelati: se la regex si allargasse senza motivo, questi
    // casi diventerebbero rossi e costringerebbero a riconsiderare il pattern.
    expect('x?: boolean'.match(TERNARIO)).toBeNull(); // proprietà TS opzionale
    expect(('!isLight ? 1 : 2'.match(TERNARIO) || []).length).toBe(1); // negazione comunque intercettata
    expect(('isLight === false ? 1 : 2'.match(TERNARIO) || []).length).toBe(1);
    expect('tema === "light" ? 1 : 2'.match(TERNARIO)).toBeNull();
  });

  it('la griglia usa i token per superficie e bordi (non colori fissi)', function () {
    // CardGrid è il posto in cui i token sono nati: se qualcuno torna a un
    // colore fisso per bordo/superficie, il tema chiaro sbaglia quella card.
    expect(cardGridRaw).toContain("var(--sb-line)");
    expect(cardGridRaw).toContain("var(--sb-surface)");
  });
});
