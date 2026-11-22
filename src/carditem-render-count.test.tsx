// @ts-nocheck — conta i render, non i tipi.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Conta i render EFFETTIVI, non i millisecondi (in jsdom i tempi sono rumore e
// un test sui tempi è flaky). Il wrapper conserva lo stesso comparator del
// componente reale: se il comparator scarta le props, React non esegue il
// wrapper, esattamente come in produzione.
const resi = vi.hoisted(function () {
  return [] as string[];
});

vi.mock('./CardItem.tsx', async function () {
  var actual = await vi.importActual('./CardItem.tsx');
  var ReactMod = await import('react');
  // Nessun figlio: il test misura il CONTRATTO del memo, e il comparator è
  // quello reale. Renderizzare anche il CardItem vero aggiungerebbe un secondo
  // `memo` (il componente è già memo) e 30 card in jsdom, senza informazione in
  // più: i render contati sarebbero gli stessi.
  var Conteggio = ReactMod.memo(function (props: any) {
    resi.push(String(props.c.id));
    return null;
  }, actual.cardItemAreEqual);
  return Object.assign({}, actual, { default: Conteggio });
});

import CardGrid from './CardGrid.tsx';

beforeEach(function () {
  vi.stubGlobal('FORM0', {
    tipo: 'domanda',
    titolo: '',
    testo: '',
    opzioni: ['', ''],
    classi: [],
    links: [],
    immagini: [],
    allegati: [],
    quizDomande: [],
  });
  resi.length = 0;
});

function make$(overrides: any) {
  return Object.assign(
    {
      cards: [],
      cardsLoaded: true,
      visible: [],
      visibleSorted: [],
      filterClasse: 'tutte',
      isProf: false,
      simulaSt: false,
      CLASSI_DEFAULT: [],
      CLASSI_LIST: [],
      classiCustom: [],
      classeColor: function () {
        return '#fb923c';
      },
      myLikes: { current: new Set() },
      seenRef: { current: new Set() },
      aiMap: {},
      preferiti: [],
      bulkMode: false,
      bulkSelected: [],
      setEditMode: function () {},
      setForm: function () {},
      setShowModal: function () {},
      setFilterClasse: function () {},
      openCard: function () {},
      toggleLike: function () {},
      toggleReazione: function () {},
      togglePreferito: function () {},
      toggleVisibile: function () {},
      editCard: function () {},
      delCardWithUndo: function () {},
      apriDuplica: function () {},
      apriCopiaAnno: function () {},
      showToast: function () {},
      setLikeHoverCard: function () {},
      likeHoverCard: null,
      likeAnimCard: null,
      setShowSommario: function () {},
      sommarioResult: {},
      riassuntiCommentiRun: function () {},
      setLightbox: function () {},
      badgeBg: function () {
        return '#6366f1';
      },
      tipoIcon: function () {
        return '';
      },
      timeAgo: function () {
        return '1h fa';
      },
      fmt: function () {
        return '';
      },
      fmtDT: function () {
        return '';
      },
      myName: function () {
        return 'Test';
      },
    },
    overrides
  );
}

function cards(n: number) {
  var out: any[] = [];
  for (var i = 1; i <= n; i++) {
    out.push({ id: 'c' + i, titolo: 'Card ' + i, tipo: 'domanda', classi: ['TUTTE'], commenti: [], likes: 0 });
  }
  return out;
}

describe('CardItem · numero di render per aggiornamento', function () {
  it('un aggiornamento che riusa gli oggetti non ri-renderizza nessuna card', function () {
    var base = cards(30);
    var base$ = make$({ cards: base, visibleSorted: base });
    var r = render(React.createElement(CardGrid, { $: base$ }));
    expect(resi.length).toBe(30); // mount
    resi.length = 0;

    // Nuovo `$` (come a ogni like) ma le stesse identità di card: il memo deve
    // scartare TUTTE le card. È il difetto che il mapping da snapshot
    // ricostruito riportava a 30.
    r.rerender(React.createElement(CardGrid, { $: Object.assign({}, base$, { cards: base, visibleSorted: base }) }));
    expect(resi.length).toBe(0);
  });

  it('una sola card cambiata ri-renderizza solo quella', function () {
    var base = cards(30);
    var base$ = make$({ cards: base, visibleSorted: base });
    var r = render(React.createElement(CardGrid, { $: base$ }));
    resi.length = 0;

    var dopo = base.slice();
    dopo[4] = Object.assign({}, base[4], { titolo: 'Card 5 aggiornata' });
    r.rerender(React.createElement(CardGrid, { $: Object.assign({}, base$, { cards: dopo, visibleSorted: dopo }) }));
    expect(resi).toEqual(['c5']);
  });

  it('se tutte le card sono nuove il memo non salva niente (il difetto di prima)', function () {
    var base = cards(10);
    var base$ = make$({ cards: base, visibleSorted: base });
    var r = render(React.createElement(CardGrid, { $: base$ }));
    resi.length = 0;

    var tutte = base.map(function (c) {
      return Object.assign({}, c);
    });
    r.rerender(React.createElement(CardGrid, { $: Object.assign({}, base$, { cards: tutte, visibleSorted: tutte }) }));
    expect(resi.length).toBe(10);
  });

  it('cambiare un campo NON confrontato non ri-renderizza nessuna card', function () {
    var base = cards(10);
    var base$ = make$({ cards: base, visibleSorted: base });
    var r = render(React.createElement(CardGrid, { $: base$ }));
    resi.length = 0;

    // `showToast` è tra CAMPI_NON_CONFRONTATI: se finisse tra i campi confrontati
    // con un confronto per identità, la griglia ri-renderizzerebbe a ogni toast.
    var dopo = Object.assign({}, base$, {
      cards: base,
      visibleSorted: base,
      showToast: function () {},
    });
    r.rerender(React.createElement(CardGrid, { $: dopo }));
    expect(resi.length).toBe(0);
  });

  it('cambiare il filtro classe ri-renderizza tutte le card (costo noto e voluto)', function () {
    var base = cards(10);
    var base$ = make$({ cards: base, visibleSorted: base });
    var r = render(React.createElement(CardGrid, { $: base$ }));
    resi.length = 0;

    // `filterClasse` è confrontato perché cambia il conteggio commenti per classe:
    // il ri-render è legittimo. Il test lo fissa come COSTO NOTO (10, non 0),
    // così un cambio futuro che lo rende più costoso (o che lo rompe) si vede.
    var dopo = Object.assign({}, base$, { cards: base, visibleSorted: base, filterClasse: '1A' });
    r.rerender(React.createElement(CardGrid, { $: dopo }));
    expect(resi.length).toBe(10);
  });
});
