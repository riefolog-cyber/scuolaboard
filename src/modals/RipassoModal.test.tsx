// RipassoModal.test.tsx — Tests for the flashcard review modal
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import RipassoModal from './RipassoModal.tsx';

function mkCards() {
  return [
    {
      id: 'c1',
      titolo: 'Matematica',
      tipo: 'quiz',
      quizDomande: [
        { tipo: 'multipla', testo: 'Quanto fa 2+2?', opzioni: ['3', '4', '5'], corretta: '1' },
        { tipo: 'vf', testo: 'La Terra è piatta', opzioni: ['Vero', 'Falso'], corretta: 'Falso' },
        { tipo: 'aperta', testo: 'Spiega cos’è una funzione', corretta: '' },
      ],
    },
    {
      id: 'c2',
      titolo: 'Storia',
      tipo: 'info',
      quizDomande: [{ tipo: 'multipla', testo: 'Anno della caduta di Roma?', opzioni: ['476', '1492'], corretta: '0' }],
    },
  ];
}

function renderModal(props = {}) {
  const base = {
    showRipasso: true,
    setShowRipasso: vi.fn(),
    visibleSorted: mkCards(),
    cards: [],
    isLight: false,
  };
  return render(React.createElement(RipassoModal, Object.assign({}, base, props)));
}

describe('RipassoModal', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  it('renders nothing when closed', () => {
    const { container } = renderModal({ showRipasso: false });
    expect(container.firstChild).toBeNull();
  });

  it('builds the deck from quiz questions with an exact answer, skipping open questions', () => {
    renderModal();
    expect(screen.getByText('MODALITÀ RIPASSO')).toBeInTheDocument();
    // 3 domande con risposta (2 di c1 + 1 di c2); la aperta senza corretta è esclusa
    expect(screen.getByText(/3 flashcard/)).toBeInTheDocument();
    expect(screen.getByText('Quanto fa 2+2?')).toBeInTheDocument();
  });

  it('shows the answer on flip and toggles back', () => {
    renderModal();
    // Primo mazzo non mescolato: prima domanda di c1
    fireEvent.click(screen.getByText('Quanto fa 2+2?'));
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('RISPOSTA')).toBeInTheDocument();
    // Flip di nuovo → torna la domanda
    fireEvent.click(screen.getByText('4'));
    expect(screen.getByText('Quanto fa 2+2?')).toBeInTheDocument();
  });

  it('navigates to the next flashcard and completes the deck', () => {
    renderModal();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Flashcard successiva'));
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('La Terra è piatta')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Flashcard successiva'));
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByText('Anno della caduta di Roma?')).toBeInTheDocument();
    // Ultima card: si completa girandola (il bottone successiva è disabilitato)
    fireEvent.click(screen.getByText('Anno della caduta di Roma?'));
    expect(screen.getByText('🎉 Ripasso completato!')).toBeInTheDocument();
  });

  it('goes back with the previous button', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('Flashcard successiva'));
    fireEvent.click(screen.getByLabelText('Flashcard precedente'));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('Quanto fa 2+2?')).toBeInTheDocument();
  });

  it('shows vero/falso answers by text', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('Flashcard successiva'));
    fireEvent.click(screen.getByText('La Terra è piatta'));
    expect(screen.getByText('Falso')).toBeInTheDocument();
  });

  it('shows the empty state when there are no flashcards', () => {
    renderModal({
      visibleSorted: [{ id: 'c1', titolo: 'Solo testo', tipo: 'info', quizDomande: [] }],
    });
    expect(screen.getByText('Nessuna flashcard disponibile')).toBeInTheDocument();
  });

  it('closes via the ✕ button', () => {
    const setShowRipasso = vi.fn();
    renderModal({ setShowRipasso });
    fireEvent.click(screen.getByLabelText('Chiudi ripasso'));
    expect(setShowRipasso).toHaveBeenCalledWith(false);
  });

  it('restarts from the first flashcard', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('Flashcard successiva'));
    fireEvent.click(screen.getByText('↺ Ricomincia'));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });
});