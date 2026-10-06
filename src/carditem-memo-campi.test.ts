// carditem-memo-campi.test.ts — Il memo di CardItem non può perdere un campo
//
// `memo(CardItem__, cardItemAreEqual)` confronta solo i campi elencati in
// CAMPI_CARD_ITEM. Il guasto possibile è SILENZIOSO: domani leggi `$.qualcosa`
// dentro CardItem e non lo metti fra i campi confrontati → la card smette di
// aggiornarsi quando quel campo cambia. Nessun errore, nessun test rosso: si
// vede solo che "la card non reagisce". In questo repo è già successo tre volte,
// ogni volta nella stessa forma (corretto un call site, gli altri lasciati fuori).
//
// Qui si rende l'invariante verificabile: ogni `$.campo` letto in CardItem deve
// essere in una delle due liste, e le due liste sono importate dal modulo (non
// ricopiate qui) così il test non può divergere dal codice.
//
// Aggiungere una lettura in CardItem deve quindi essere un atto consapevole:
//   · la metti in CAMPI_CARD_ITEM se un cambio deve ri-renderizzare la card;
//   · la metti in CAMPI_NON_CONFRONTATI se è un handler stabile o una utility,
//     e devi poter spiegare perché non serve.

import { describe, it, expect } from 'vitest';
import srcCardItem from './CardItem.tsx?raw';
import { CAMPI_CARD_ITEM, CAMPI_NON_CONFRONTATI, cardItemAreEqual } from './CardItem.tsx';

/** Toglie i commenti: nel sorgente i miei stessi commenti citano `$.campo`. */
function senzaCommenti(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // `[^:]` evita di mangiare il `//` di un URL (https://...)
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function campiLetti(src: string): string[] {
  const fuori = new Set<string>();
  const re = /\$\.([A-Za-z_][A-Za-z0-9_]*)/g;
  let m;
  while ((m = re.exec(senzaCommenti(src)))) fuori.add(m[1]);
  return [...fuori].sort();
}

describe('memo di CardItem — i campi confrontati sono completi', () => {
  // I dati si calcolano dentro gli `it`, non nel corpo del describe: quello gira
  // durante la raccolta dei test, quando i binding del modulo importato possono
  // non essere ancora inizializzati (l'app ha moduli con dipendenze larghe).
  function conosciuti() {
    return new Set<string>([...CAMPI_CARD_ITEM, ...CAMPI_NON_CONFRONTATI]);
  }

  it('ogni campo di $ letto in CardItem è in una delle due liste', () => {
    var letti = campiLetti(srcCardItem);
    var dimenticati = letti.filter((c) => !conosciuti().has(c));
    expect(dimenticati).toEqual([]);
  });

  it('nessun campo è contemporaneamente nelle due liste', () => {
    var sovrapposti = CAMPI_CARD_ITEM.filter((c) => CAMPI_NON_CONFRONTATI.includes(c));
    expect(sovrapposti).toEqual([]);
  });

  it('nessuna lista ha duplicati', () => {
    function dup(l: string[]) {
      return l.filter((x, i) => l.indexOf(x) !== i);
    }
    expect(dup(CAMPI_CARD_ITEM)).toEqual([]);
    expect(dup(CAMPI_NON_CONFRONTATI)).toEqual([]);
  });

  it('la scansione trova i campi davvero (non vuota: altrimenti il test è inutile)', () => {
    // Se il pattern smettesse di corrispondere, il test sopra passerebbe sempre.
    var letti = campiLetti(srcCardItem);
    expect(letti.length).toBeGreaterThan(20);
    expect(letti).toContain('isProf');
    expect(letti).toContain('toggleLike');
  });
});

describe('memo di CardItem — comportamento del comparatore', () => {
  var base = {
    c: { id: 'c1', titolo: 'Card' },
    idx: 0,
    $: {
      isLight: false,
      isProf: true,
      simulaSt: false,
      bulkMode: false,
      bulkSelected: [],
      likeHoverCard: null,
      likeAnimCard: null,
      myLikes: new Set(),
      seenRef: new Set(),
      user: { uid: 'p1' },
      classiCustom: [],
      preferiti: [],
      aiMap: {},
      sommarioResult: null,
      // non confrontati
      openCard: () => {},
      toggleLike: () => {},
    },
  };

  function con(cambio: any) {
    return { c: base.c, idx: base.idx, $: Object.assign({}, base.$, cambio) };
  }

  it('ri-renderizza se cambia la card', () => {
    expect(cardItemAreEqual(base, { ...base, c: { id: 'c2' } })).toBe(false);
  });

  it('ri-renderizza se cambia idx (l\'animazione d\'entrata dipende dalla posizione)', () => {
    expect(cardItemAreEqual(base, { ...base, idx: 3 })).toBe(false);
  });

  it('ri-renderizza se cambia un campo confrontato', () => {
    expect(cardItemAreEqual(base, con({ isProf: false }))).toBe(false);
    expect(cardItemAreEqual(base, con({ user: { uid: 'p2' } }))).toBe(false);
  });

  it('NON ri-renderizza se cambia solo un campo non confrontato (è il punto del memo)', () => {
    // Se questo fallisce, ogni keystroke/azione ri-renderizzerebbe tutta la
    // griglia: il difetto opposto, cioè la perdita di ottimizzazione.
    expect(cardItemAreEqual(base, con({ openCard: () => {}, toggleLike: () => {} }))).toBe(true);
  });

  it('NON ri-renderizza se non cambia nulla', () => {
    expect(cardItemAreEqual(base, con({}))).toBe(true);
  });
});
