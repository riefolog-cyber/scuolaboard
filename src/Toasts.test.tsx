// Toasts.test.jsx — Tests for Toast notifications
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import Toasts from './Toasts.tsx';

describe('Toasts', () => {
  let $: any;

  beforeEach(() => {
    $ = {
      toasts: [],
      undoDeleteCard: () => {},
    };
  });

  function renderToasts(props = {}) {
    const merged = Object.assign({}, $, props);
    return render(React.createElement(Toasts, { $: merged }));
  }

  it('renders nothing when toasts array is empty', () => {
    const { container } = renderToasts();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when toasts is null', () => {
    const { container } = renderToasts({ toasts: null });
    expect(container.firstChild).toBeNull();
  });

  it('renders a toast message', () => {
    renderToasts({ toasts: [{ id: 1, msg: 'Card eliminata', type: 'warn' }] });
    expect(screen.getByText(/Card eliminata/)).toBeInTheDocument();
  });

  it('renders correct icon for ok type', () => {
    renderToasts({ toasts: [{ id: 1, msg: 'Salvato!', type: 'ok' }] });
    expect(screen.getByText(/✅/)).toBeInTheDocument();
  });

  it('renders correct icon for err type', () => {
    renderToasts({ toasts: [{ id: 1, msg: 'Errore!', type: 'err' }] });
    expect(screen.getByText(/❌/)).toBeInTheDocument();
  });

  it('shows undo button when toast has undo=true', () => {
    renderToasts({ toasts: [{ id: 1, msg: 'Card eliminata', type: 'warn', undo: true }] });
    expect(screen.getByText('↩ Annulla')).toBeInTheDocument();
  });

  it('calls undoDeleteCard on undo click', () => {
    let undoCalled = false;
    renderToasts({
      toasts: [{ id: 1, msg: 'Card eliminata', type: 'warn', undo: true }],
      undoDeleteCard: () => {
        undoCalled = true;
      },
    });
    fireEvent.click(screen.getByText('↩ Annulla'));
    expect(undoCalled).toBe(true);
  });

  it('renders multiple toasts', () => {
    renderToasts({
      toasts: [
        { id: 1, msg: 'Primo', type: 'ok' },
        { id: 2, msg: 'Secondo', type: 'warn' },
      ],
    });
    expect(screen.getByText(/Primo/)).toBeInTheDocument();
    expect(screen.getByText(/Secondo/)).toBeInTheDocument();
  });
});
