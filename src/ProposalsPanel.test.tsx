// ProposalsPanel.test.tsx — Tests for ProposalsPanel component
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

beforeEach(() => {
  window.SB = window.SB || {};
  window.SB.h = React.createElement;
  window.SB.Fragment = React.Fragment;
  window.fbDel = () => Promise.resolve();
});

import './ProposalsPanel.tsx';

function make$(overrides = {}) {
  return Object.assign(
    {
      isProf: false,
      simulaSt: false,
      cards: [],
      visible: [],
      preferiti: [],
      proposte: [],
      user: null,
      myName: () => 'Studente Test',
      appCard: () => {},
      setShowRifiutaModal: () => {},
      openCard: () => {},
      setShowBanner: () => {},
      setNewCardsBanner: () => {},
      markSeen: () => {},
      showBanner: false,
      newCardsBanner: [],
    },
    overrides
  );
}

describe('ProposalsPanel', () => {
  it('renders nothing when no relevant content', () => {
    var $ = make$();
    var { container } = render(React.createElement(window.SB.ProposalsPanel, { $ }));
    expect(container.innerHTML).toBe('');
  });

  it('shows pending proposals for professor', () => {
    var $ = make$({
      isProf: true,
      proposte: [{ id: 1, titolo: 'Mia proposta', autore: 'Studente', proposta: true }],
    });
    render(React.createElement(window.SB.ProposalsPanel, { $ }));
    expect(screen.getByText(/PROPOSTE IN ATTESA/)).toBeTruthy();
    expect(screen.getByText('Mia proposta')).toBeTruthy();
  });

  it('shows pending proposals for student author', () => {
    var $ = make$({
      isProf: false,
      user: { uid: '123' },
      cards: [{ id: 1, titolo: 'La mia proposta', autore: 'Studente Test', proposta: true }],
    });
    render(React.createElement(window.SB.ProposalsPanel, { $ }));
    expect(screen.getByText(/LE TUE PROPOSTE IN ATTESA/)).toBeTruthy();
    expect(screen.getByText('La mia proposta')).toBeTruthy();
  });

  it('shows rejected proposals for student', () => {
    var $ = make$({
      isProf: false,
      user: { uid: '123' },
      cards: [
        {
          id: 2,
          titolo: 'Proposta rifiutata',
          autore: 'Studente Test',
          proposta: 'rifiutata',
          motivazioneRifiuto: 'Non pertinente',
        },
      ],
    });
    render(React.createElement(window.SB.ProposalsPanel, { $ }));
    expect(screen.getByText(/PROPOSTE RIFIUTATE/)).toBeTruthy();
    expect(screen.getByText('Proposta rifiutata')).toBeTruthy();
    expect(screen.getByText(/Non pertinente/)).toBeTruthy();
  });

  it('shows favorites section for student with visible preferiti', () => {
    var $ = make$({
      isProf: false,
      preferiti: ['1'],
      visible: [{ id: 1, titolo: 'Card Preferita', tipo: 'domanda', classi: ['TUTTE'], commenti: [], likes: 0 }],
    });
    render(React.createElement(window.SB.ProposalsPanel, { $ }));
    expect(screen.getByText(/I TUOI PREFERITI/)).toBeTruthy();
    expect(screen.getByText('Card Preferita')).toBeTruthy();
  });

  it('shows new cards banner for student', () => {
    var $ = make$({
      isProf: false,
      showBanner: true,
      newCardsBanner: [{ id: 3, titolo: 'Nuova card!' }],
    });
    render(React.createElement(window.SB.ProposalsPanel, { $ }));
    expect(screen.getByText(/nuova card!/)).toBeTruthy();
    expect(screen.getByText('Nuova card!')).toBeTruthy();
  });

  it('renders nothing for professor with no pending proposals', () => {
    var $ = make$({ isProf: true, proposte: [] });
    var { container } = render(React.createElement(window.SB.ProposalsPanel, { $ }));
    expect(container.innerHTML).toBe('');
  });
});
