// CardItem.test.jsx — Tests for CardItem component
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import './CardItem.tsx';

describe('CardItem', () => {
  let $: any, card: any;

  beforeEach(() => {
    $ = {
      user: { nome: 'Mario', uid: '123' },
      isProf: true,
      simulaSt: false,
      myLikes: { current: new Set() },
      aiMap: {},
      seenRef: { current: new Set() },
      likeHoverCard: null,
      setLikeHoverCard: vi.fn(),
      likeAnimCard: null,
      setLikeAnimCard: vi.fn(),
      badgeBg: (t: any) => (t === 'nota' ? '#6366f1' : '#22c55e'),
      tipoIcon: () => '📌',
      timeAgo: () => '2g fa',
      myName: (u: any) => (u && u.nome ? u.nome : 'Anonimo'),
      CLASSI_DEFAULT: ['1A', '2A', '3A'],
      classiCustom: [],
      classeColor: () => '#6366f1',
      fmt: () => '30/07/2026',
      preferiti: [],
      openCard: vi.fn(),
      onDragStart: vi.fn(),
      onDragEnd: vi.fn(),
      onDragOver: vi.fn(),
      onDragLeave: vi.fn(),
      onDrop: vi.fn(),
      toggleLike: vi.fn(),
      toggleReazione: vi.fn(),
      togglePreferito: vi.fn(),
      toggleVisibile: vi.fn(),
      setLightbox: vi.fn(),
      setShowSommario: vi.fn(),
      sommarioResult: {},
      riassuntiCommentiRun: vi.fn(),
      showToast: vi.fn(),
      editCard: vi.fn(),
      delCardWithUndo: vi.fn(),
      apriDuplica: vi.fn(),
      apriCopiaAnno: vi.fn(),
    };

    card = {
      id: 'c1',
      tipo: 'nota',
      titolo: 'Lezione di matematica',
      testo: 'Oggi abbiamo studiato le equazioni',
      autore: 'Prof',
      data: '2026-07-30',
      classi: ['3A'],
      commenti: [
        { id: 'cm1', autore: 'Studente1', testo: 'Molto interessante!', data: '2026-07-30' },
        { id: 'cm2', autore: 'Studente2', testo: 'Ho una domanda', data: '2026-07-30' },
      ],
      likes: 5,
      likesBy: ['Studente1', 'Studente2'],
      reazioni: { '🤔': ['Studente1'], '💡': [], '🔥': ['Studente2'] },
      visibile: true,
    };
  });

  function renderCard(overrides = {}, propOverrides = {}) {
    const c = Object.assign({}, card, overrides);
    const merged$ = Object.assign({}, $, propOverrides);
    return render(React.createElement(window.SB.CardItem, { $: merged$, c: c }));
  }

  // ── Rendering tests ──
  it('renders card title', () => {
    renderCard();
    expect(screen.getByText('Lezione di matematica')).toBeInTheDocument();
  });

  it('renders card text preview', () => {
    renderCard();
    expect(screen.getByText('Oggi abbiamo studiato le equazioni')).toBeInTheDocument();
  });

  it('renders card type badge', () => {
    renderCard();
    expect(screen.getByText(/NOTA/)).toBeInTheDocument();
  });

  it('renders class badges', () => {
    renderCard();
    expect(screen.getByText('3A')).toBeInTheDocument();
  });

  it('shows NASCOSTA badge when hidden', () => {
    renderCard({ visibile: false });
    expect(screen.getByText(/NASCOSTA/)).toBeInTheDocument();
  });

  it('renders like count', () => {
    renderCard();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders comment count', () => {
    renderCard();
    expect(screen.getByText('2')).toBeInTheDocument(); // commenti.length
  });

  it('renders time ago', () => {
    renderCard();
    expect(screen.getByText('2g fa')).toBeInTheDocument();
  });

  // ── Interaction tests ──
  it('calls openCard on card click', () => {
    const open = vi.fn();
    renderCard({}, { openCard: open });
    fireEvent.click(screen.getByText('Lezione di matematica'));
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });

  // ── Drag & drop wiring ──
  it('wire up drag & drop handlers on the card wrap', () => {
    const onDragStart = vi.fn();
    const onDragOver = vi.fn();
    const onDrop = vi.fn();
    renderCard({}, { onDragStart, onDragOver, onDrop });
    const wrap = document.getElementById('card-c1');
    expect(wrap).not.toBeNull();
    fireEvent.dragStart(wrap as HTMLElement);
    fireEvent.dragOver(wrap as HTMLElement);
    fireEvent.drop(wrap as HTMLElement);
    expect(onDragStart).toHaveBeenCalledWith(expect.anything(), 'c1');
    expect(onDragOver).toHaveBeenCalledWith(expect.anything(), 'c1');
    expect(onDrop).toHaveBeenCalledWith(expect.anything(), 'c1');
  });

  it('calls toggleLike on like button click', () => {
    const toggle = vi.fn();
    renderCard({}, { toggleLike: toggle });
    fireEvent.click(screen.getByText('👍'));
    expect(toggle).toHaveBeenCalledWith('c1');
  });

  it('renders reaction buttons', () => {
    renderCard();
    expect(screen.getByText('🤔')).toBeInTheDocument();
    expect(screen.getByText('💡')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('calls toggleReazione on reaction click', () => {
    const toggleR = vi.fn();
    renderCard({}, { toggleReazione: toggleR });
    fireEvent.click(screen.getByText('🤔'));
    expect(toggleR).toHaveBeenCalledWith('c1', '🤔');
  });

  it('renders edit button for prof', () => {
    renderCard({}, { isProf: true, simulaSt: false });
    expect(screen.getByText('✏️')).toBeInTheDocument();
  });

  it('renders delete button for prof', () => {
    renderCard({}, { isProf: true, simulaSt: false });
    expect(screen.getByText('🗑️')).toBeInTheDocument();
  });

  it('does not show edit button for students', () => {
    renderCard({}, { isProf: false, simulaSt: false });
    expect(screen.queryByText('✏️')).toBeNull();
  });

  it('toggles visibility without opening the card', () => {
    const open = vi.fn();
    const toggle = vi.fn();
    renderCard({}, { openCard: open, toggleVisibile: toggle });
    fireEvent.click(screen.getByRole('button', { name: 'Nascondi' }));
    expect(toggle).toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('shows the visibility toggle as a real button for prof', () => {
    renderCard({}, { isProf: true, simulaSt: false });
    expect(screen.getByRole('button', { name: 'Nascondi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nascondi' }).tagName).toBe('BUTTON');
  });

  // ── Sondaggio / Quiz rendering ──
  it('renders poll bars for sondaggio cards', () => {
    renderCard({
      tipo: 'sondaggio',
      opzioni: [
        { id: 'o1', testo: 'Opzione A', voti: ['Studente1', 'Studente2'] },
        { id: 'o2', testo: 'Opzione B', voti: ['Studente3'] },
      ],
    });
    expect(screen.getByText('Opzione A')).toBeInTheDocument();
    expect(screen.getByText('Opzione B')).toBeInTheDocument();
  });

  it('renders quiz info for quiz cards', () => {
    renderCard({
      tipo: 'quiz',
      quizDomande: [{ testo: 'Domanda 1' }, { testo: 'Domanda 2' }, { testo: 'Domanda 3' }],
      quizTimer: 10,
    });
    expect(screen.getByText(/3 domande/)).toBeInTheDocument();
    expect(screen.getByText(/10 min/)).toBeInTheDocument();
  });

  it('mostra il chip quiz anche se tipo NON è "quiz" ma quizDomande esiste (reintegro card orfane)', () => {
    renderCard({
      tipo: 'domanda',
      quizDomande: [{ testo: 'Domanda 1' }, { testo: 'Domanda 2' }],
      quizTimer: 10,
    });
    expect(screen.getByText(/2 domande/)).toBeInTheDocument();
  });
});
