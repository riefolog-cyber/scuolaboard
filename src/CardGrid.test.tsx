// CardGrid.test.tsx — Tests for CardGrid component
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock window globals needed by CardGrid and CardItem
beforeEach(() => {
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
});

import CardItem from './CardItem.tsx';
import CardGrid from './CardGrid.tsx';

describe('CardGrid', () => {
  function make$(overrides = {}) {
    return Object.assign(
      {
        cards: [],
        visible: [],
        visibleSorted: [],
        filterClasse: 'tutte',
        isProf: true,
        simulaSt: false,
        CLASSI_DEFAULT: [],
        CLASSI_LIST: [],
        classiCustom: [],
        classeColor: () => '#fb923c',
        myLikes: { current: new Set() },
        seenRef: { current: new Set() },
        aiMap: {},
        preferiti: [],
        bulkMode: false,
        bulkSelected: [],
        setEditMode: () => {},
        setForm: () => {},
        setShowModal: () => {},
        setFilterClasse: () => {},
        openCard: () => {},
        toggleLike: () => {},
        toggleReazione: () => {},
        togglePreferito: () => {},
        toggleVisibile: () => {},
        editCard: () => {},
        delCardWithUndo: () => {},
        apriDuplica: () => {},
        apriCopiaAnno: () => {},
        showToast: () => {},
        setLikeHoverCard: () => {},
        likeHoverCard: null,
        likeAnimCard: null,
        setShowSommario: () => {},
        sommarioResult: {},
        riassuntiCommentiRun: () => {},
        setLightbox: () => {},
        badgeBg: () => '#6366f1',
        tipoIcon: () => '',
        timeAgo: () => '1h fa',
        fmt: () => '',
        fmtDT: () => '',
        myName: () => 'Test',
      },
      overrides
    );
  }

  it('renders skeleton when cards array is empty', () => {
    var $ = make$({ cards: [] });
    var { container } = render(React.createElement(CardGrid, { $ }));
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('renders empty state when visibleSorted is empty but cards exist', () => {
    var $ = make$({
      cards: [{ id: 1, titolo: 'Test', tipo: 'domanda', classi: ['TUTTE'], commenti: [], likes: 0 }],
      visibleSorted: [],
    });
    render(React.createElement(CardGrid, { $ }));
    expect(screen.getByText('Nessun contenuto visibile')).toBeTruthy();
  });

  it('renders empty state with filter message when filter is active', () => {
    var $ = make$({
      cards: [{ id: 1, titolo: 'Test', tipo: 'domanda', classi: ['1A'], commenti: [], likes: 0 }],
      visibleSorted: [],
      filterClasse: '1A',
    });
    render(React.createElement(CardGrid, { $ }));
    expect(screen.getByText(/Nessuna card per la classe/)).toBeTruthy();
  });

  it('renders cards when visibleSorted has items', () => {
    var card = {
      id: 1,
      titolo: 'Mia Card',
      tipo: 'domanda',
      classi: ['TUTTE'],
      commenti: [],
      likes: 0,
      likesBy: [],
      reazioni: {},
      autore: 'Prof',
      data: new Date().toISOString(),
      testo: 'Testo esempio',
      visibile: true,
    };
    var $ = make$({
      cards: [card],
      visible: [card],
      visibleSorted: [card],
    });
    render(React.createElement(CardGrid, { $ }));
    expect(screen.getByText('Mia Card')).toBeTruthy();
  });

  it('renders add first card button for professor in empty state', () => {
    var $ = make$({
      cards: [{ id: 1, titolo: 'Test', tipo: 'domanda', classi: ['TUTTE'], commenti: [], likes: 0 }],
      visibleSorted: [],
      isProf: true,
      simulaSt: false,
    });
    render(React.createElement(CardGrid, { $ }));
    expect(screen.getByText(/Aggiungi la prima card/)).toBeTruthy();
  });
});
