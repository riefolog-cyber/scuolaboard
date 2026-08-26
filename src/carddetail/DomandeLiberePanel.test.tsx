// DomandeLiberePanel.test.tsx — Regressione: la CardDetail NON deve crashare
// quando $.aiMap è undefined (bug reale: refreshCallback() passava undefined a
// setAiMap → aiMap = undefined → "Cannot read properties of undefined (reading
// '<cardId>')" in DomandeLiberePanel).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import DomandeLiberePanel from './DomandeLiberePanel.tsx';

describe('DomandeLiberePanel', () => {
  let $: any;
  let card: any;

  beforeEach(() => {
    $ = {
      isProf: true,
      simulaSt: false,
      aiMap: undefined, // ← condizione del crash reale
      cardQOpen: { c1: true },
      cardQ: '',
      setCardQ: vi.fn(),
      cardQLoad: false,
      setCardQOpen: vi.fn(),
      runCardQ: vi.fn(),
      cardQErr: '',
      eliminaDomandeAI: vi.fn(),
    };
    card = { id: 'c1', titolo: 'Lezione X' };
  });

  function renderPanel(overrides = {}) {
    return render(
      React.createElement(DomandeLiberePanel, {
        $: Object.assign({}, $, overrides),
        c: card,
      })
    );
  }

  it('NON crasha con aiMap undefined e pannello aperto (regressione crash)', () => {
    // Prima del fix questo render esplodeva con
    // TypeError: Cannot read properties of undefined (reading 'c1')
    renderPanel();
    expect(screen.getByPlaceholderText(/Fai una domanda all'AI su questa lezione/)).toBeTruthy();
  });

  it("con aiMap undefined non mostra la cronologia DOMANDE ALL'AI", () => {
    renderPanel();
    expect(screen.queryByText(/DOMANDE ALL'AI/)).toBeNull();
  });

  it('mostra la cronologia delle domande quando aiMap ha la voce della card', () => {
    renderPanel({
      aiMap: {
        c1: {
          domande: [
            { id: 1, q: "Cos'è una variabile?", risposta: 'Un contenitore' },
            { id: 2, q: 'A cosa serve?', risposta: 'A memorizzare' },
          ],
        },
      },
    });
    expect(screen.getByText(/DOMANDE ALL'AI \(2\)/)).toBeTruthy();
    expect(screen.getByText(/Cos'è una variabile\?/)).toBeTruthy();
    expect(screen.getByText(/A cosa serve\?/)).toBeTruthy();
  });

  it("mostra il bottone 'Fai una domanda all'AI' quando il pannello è chiuso", () => {
    renderPanel({ cardQOpen: {} });
    expect(screen.getByText(/Fai una domanda all'AI/)).toBeTruthy();
  });
});
