// Guardia statica sull'ordine degli hook di `CardDetail`.
//
// PERCHÉ UN TEST STATICO E NON UN RENDER: il difetto che questo file previene è
// un `useEffect` dichiarato DOPO `if (!c) return null;`. Si manifesta solo quando
// il componente passa da un render senza card a uno con la card, e in quel caso
// React lancia «Rendered more hooks than during the previous render» — un errore
// che in produzione è un crash della modale, non un test rosso. Montare
// `CardDetail` con un `$` completo costa un mock enorme e coprirebbe solo il
// percorso che si decide di provare; qui la regola vale per ogni hook, presente
// e futuro, e costa zero.
//
// L'intervallo va da `function CardDetail__` a `export default`: la foglia
// `ScadenzaDetail` sta prima, quindi i suoi hook (incondizionati, senza early
// return) non entrano nel controllo. Se un giorno un altro componente venisse
// messo dentro l'intervallo, la guardia lo vedrebbe come parte di CardDetail__.
import { describe, it, expect } from 'vitest';
import raw from './CardDetail.tsx?raw';

// `useState<any>(` e `useRef<HTMLDivElement>(` hanno un generico fra nome e
// parentesi: la regex deve accettare `<` oltre a `(`.
var HOOK = /\buse[A-Z][A-Za-z]*\s*[<(]/g;

describe('CardDetail · ordine degli hook', function () {
  it('nessun hook dopo il return condizionale', function () {
    var inizio = raw.indexOf('function CardDetail__');
    var fine = raw.indexOf('export default CardDetail__');
    expect(inizio, 'componente non trovato').toBeGreaterThan(-1);
    expect(fine, 'export non trovato').toBeGreaterThan(inizio);

    var corpo = raw.slice(inizio, fine);
    var ritorno = corpo.indexOf('if (!c) return null;');
    expect(ritorno, 'early return non trovato').toBeGreaterThan(-1);

    var dopo = corpo.slice(ritorno);
    var hookDopo = dopo.match(HOOK) || [];
    expect(hookDopo, 'hook dichiarati dopo `if (!c) return null`: vanno spostati sopra').toEqual([]);
  });

  it('la guardia riconosce davvero un hook (non è vuota)', function () {
    // Guardia sulla guardia: se la regex si rompe, il test sopra passerebbe
    // sempre. Questi due esempi sono le forme presenti nel file.
    expect(('useState(1)'.match(HOOK) || []).length).toBe(1);
    expect(('useState<any>(null)'.match(HOOK) || []).length).toBe(1);
  });
});
