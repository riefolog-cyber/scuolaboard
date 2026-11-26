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

  // Il confronto era con 'TUTTE' maiuscolo mentre `filterClasse` vale 'tutte' /
  // '_solo' / il nome della classe: il foglio stampava «classe tutte» e, nella
  // vista solo prof, «classe _solo» — un identificatore interno su un documento
  // che finisce in mano agli studenti.
  it('«tutte le classi» si legge così, non come «classe tutte»', () => {
    renderModal({ filterClasse: 'tutte' });
    expect(screen.getAllByText(/tutte le classi/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain('classe tutte');
  });

  it('la vista solo prof non stampa l\'identificatore «_solo»', () => {
    renderModal({ filterClasse: '_solo' });
    expect(screen.getAllByText(/solo prof/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain('_solo');
  });

  it('la destinazione stampata mostra le esclusioni, non il segnaposto TUTTE', () => {
    const cards = [
      { id: 'e1', titolo: 'Gita', tipo: 'info', testo: 'x', classi: ['TUTTE'], classiEscluse: ['3AO'] },
      { id: 'e2', titolo: 'Solo docenti', tipo: 'nota', testo: 'y', classi: [] },
    ];
    const { container } = renderModal({ visibleSorted: cards, filterClasse: '3AO' });
    expect(container.textContent).toContain('Tutte le classi tranne 3AO');
    expect(container.textContent).toContain('Solo prof');
    expect(container.textContent).not.toContain('TUTTE');
  });

  // Il foglio finisce in classe: le proposte non approvate e le card nascoste
  // sono proprio quelle che l'app non mostra agli studenti.
  it('proposte e card nascoste restano fuori dal foglio', () => {
    const cards = [
      { id: 'p1', titolo: 'Card pubblicata', tipo: 'nota', testo: 'x', classi: ['TUTTE'] },
      { id: 'p2', titolo: 'Proposta in attesa', tipo: 'domanda', testo: 'y', classi: ['TUTTE'], proposta: true },
      { id: 'p3', titolo: 'Card nascosta', tipo: 'nota', testo: 'z', classi: ['TUTTE'], visibile: false },
    ];
    const { container } = renderModal({ visibleSorted: cards, filterClasse: 'tutte' });
    expect(container.textContent).not.toContain('Proposta in attesa');
    expect(container.textContent).not.toContain('Card nascosta');
    expect(container.textContent).toContain('2 card fuori dal foglio');
  });
});