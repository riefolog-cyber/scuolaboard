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
      chiudiToast: () => {},
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

  it('il toast con undo NON ha la ✕: l unica uscita è Annulla', () => {
    // WCAG 2.2.1 chiede un modo per chiudere ciò che RESTA; questo toast lo
    // chiude sempre il controllore dell'undo a 5s. Con la ✕ sarebbe un falso
    // dilemma: chiuderlo senza annullare cancellerebbe la card senza più poterla
    // revocare, e chiuderla annullando contraddirebbe il ✕ di ogni altro toast.
    renderToasts({ toasts: [{ id: 1, msg: 'Card eliminata', type: 'warn', undo: true }] });
    expect(screen.queryByRole('button', { name: 'Chiudi notifica' })).toBeNull();
    expect(screen.getByRole('button', { name: '↩ Annulla' })).toBeInTheDocument();
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

  it('chiude il toast dal pulsante ✕ (con TOAST_TIMEOUT_MS = 0 è l unico modo)', () => {
    const chiusi: number[] = [];
    renderToasts({
      toasts: [{ id: 42, msg: 'Errore di salvataggio', type: 'err' }],
      chiudiToast: (id: number) => {
        chiusi.push(id);
      },
    });
    // Una ✕ senza nome accessibile sarebbe un bottone muto per lo screen reader.
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi notifica' }));
    expect(chiusi).toEqual([42]);
  });

  it('il pulsante Annulla rimanda l id della SUA card', () => {
    const annullati: number[] = [];
    renderToasts({
      toasts: [
        { id: 7, msg: 'Card eliminata', type: 'warn', undo: true },
        { id: 8, msg: 'Card eliminata', type: 'warn', undo: true },
      ],
      undoDeleteCard: (id: number) => {
        annullati.push(id);
      },
    });
    fireEvent.click(screen.getAllByRole('button', { name: '↩ Annulla' })[0]);
    expect(annullati).toEqual([7]);
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
