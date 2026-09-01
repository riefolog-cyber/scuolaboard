// SommarioModal.test.tsx — regressione: il componente usava `React` nudo
// (righe useState/useEffect) senza importarlo. Il refactor UMD→ES ha rimosso
// window.React → ReferenceError "React is not defined" al primo render
// (lazy-loaded, quindi il crash appariva solo al click su "📝 Riassumi").
// Il test monta il componente VERO e verifica che non esploda e che renda
// il contenuto atteso.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SommarioModal from './SommarioModal.tsx';

function mk$(overrides: any = {}) {
  return Object.assign(
    {
      isLight: false,
      showSommario: 'c1',
      cards: [
        {
          id: 'c1',
          titolo: 'Lezione su X',
          commenti: [{ id: 'cm1', autore: 'A', testo: 'ciao', data: '2026-08-01' }],
        },
      ],
      sommarioResult: {},
      sommarioLoading: null,
      setShowSommario: () => {},
      riassuntiCommentiRun: () => {},
    },
    overrides
  );
}

describe('SommarioModal', () => {
  it('rende il titolo della card e i commenti senza crash', () => {
    render(React.createElement(SommarioModal, { $: mk$() }));
    expect(screen.getByText(/Riassunto discussione/)).toBeTruthy();
    expect(screen.getByText(/Lezione su X/)).toBeTruthy();
    expect(screen.getByText(/1 commenti/)).toBeTruthy();
  });

  it('mostra il risultato del riassunto quando presente', () => {
    render(
      React.createElement(SommarioModal, {
        $: mk$({ sommarioResult: { c1: 'Il riassunto generato dall AI' } }),
      })
    );
    expect(screen.getByText(/Il riassunto generato dall AI/)).toBeTruthy();
  });

  it('mostra lo spinner durante l analisi', () => {
    render(
      React.createElement(SommarioModal, {
        $: mk$({ sommarioLoading: 'c1' }),
      })
    );
    expect(screen.getByText(/Analisi in corso/)).toBeTruthy();
  });

  it('ritorna null senza card aperta', () => {
    const { container } = render(React.createElement(SommarioModal, { $: mk$({ showSommario: null }) }));
    expect(container.innerHTML).toBe('');
  });
});
