// PrintModal.test.tsx — Tests for the print/PDF preview modal
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

import PrintModal from './PrintModal.tsx';

function mkCards() {
  return [
    {
      id: 'c1',
      titolo: 'Le frazioni',
      tipo: 'info',
      testo: 'Ripasso delle frazioni equivalenti.',
      classi: ['3A'],
      likes: 5,
      commenti: [{ id: 'x' }, { id: 'y' }],
      autore: 'Prof. Bianchi',
    },
    {
      id: 'c2',
      titolo: 'Quiz su Roma',
      tipo: 'quiz',
      classi: ['3A'],
      quizDomande: [{ testo: 'Anno?' }, { testo: 'Chi?' }],
    },
  ];
}

function renderModal(props = {}) {
  const base = {
    showStampa: true,
    setShowStampa: vi.fn(),
    visibleSorted: mkCards(),
    cards: [],
    annoScolastico: '2026/2027',
    filterClasse: '3A',
    isProf: true,
    simulaSt: false,
    tipoIcon: (t: string) => (t === 'quiz' ? '🧩' : '📌'),
  };
  return render(React.createElement(PrintModal, Object.assign({}, base, props)));
}

describe('PrintModal', () => {
  beforeEach(() => {
    vi.spyOn(window, 'print').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = renderModal({ showStampa: false });
    expect(container.firstChild).toBeNull();
  });

  it('shows the paper preview with the visible cards', () => {
    renderModal();
    expect(screen.getByText('ANTEPRIMA STAMPA')).toBeInTheDocument();
    expect(screen.getByText(/2 card/)).toBeInTheDocument();
    expect(screen.getByText(/Le frazioni/)).toBeInTheDocument();
    expect(screen.getByText(/Quiz su Roma/)).toBeInTheDocument();
  });

  it('prints via window.print', () => {
    renderModal();
    fireEvent.click(screen.getByText(/Stampa \/ Salva PDF/));
    expect(window.print).toHaveBeenCalled();
  });

  it('closes via ✕ and via the backdrop', () => {
    const setShowStampa = vi.fn();
    const { container } = renderModal({ setShowStampa });
    fireEvent.click(screen.getByLabelText('Chiudi anteprima stampa'));
    expect(setShowStampa).toHaveBeenCalledWith(false);
    // backdrop (primo figlio fixed)
    fireEvent.click(container.firstChild!);
    expect(setShowStampa).toHaveBeenCalledWith(false);
  });

  it('shows the empty state when there are no cards', () => {
    renderModal({ visibleSorted: [] });
    expect(screen.getByText('Nessuna card da stampare.')).toBeInTheDocument();
  });

  it('lists the active filters in the header and preview', () => {
    renderModal();
    // filtro classe mostrato sia nell'intestazione UI sia nell'anteprima
    expect(screen.getAllByText(/classe 3A/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/classe 3A/).length).toBe(2);
  });
});