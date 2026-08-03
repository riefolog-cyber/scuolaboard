// focusTrap.test.tsx — Fase 8b: test unitari del componente FocusTrap
// (loop Tab first↔last e guard anti-conflitto tra trap separati).
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import FocusTrap from './focusTrap.tsx';

// Il progetto usa jsxFactory `h` (vite.config.js): i sorgenti definiscono
// sempre `var h = ...` prima di usare JSX. Lo stesso vale nei test.
var h = React.createElement;

// jsdom non calcola il layout: `offsetParent` è SEMPRE null → il filtro di
// visibilità di getFocusables scarterebbe tutti gli elementi e il trap non
// farebbe nulla. Stub: rendiamo offsetParent truthy per esercitare la logica.
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get: () => ({ offsetTop: 0 }),
  });
});
afterEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get: () => null,
  });
});

describe('FocusTrap', () => {
  it('mantiene il Tab dentro il contenitore (loop ultimo → primo)', () => {
    const { container } = render(
      <FocusTrap>
        <button>Uno</button>
        <button>Due</button>
        <button>Tre</button>
      </FocusTrap>
    );
    const [uno, _due, tre] = container.querySelectorAll('button');
    tre.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(uno);
  });

  it('con Shift+Tab torna dal primo all\'ultimo', () => {
    const { container } = render(
      <FocusTrap>
        <button>Uno</button>
        <button>Due</button>
        <button>Tre</button>
      </FocusTrap>
    );
    const [uno, _due, tre] = container.querySelectorAll('button');
    uno.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(tre);
  });

  it('non interferisce quando il focus è dentro un altro FocusTrap', () => {
    // Scenario reale: modale (trap aggregatore) aperta sopra la CardDetail
    // (trap separato). Il Tab dentro il secondo trap non deve essere catturato
    // dal primo (fix del conflitto segnalato in code review).
    const { container } = render(
      <div>
        <FocusTrap>
          <button>A1</button>
        </FocusTrap>
        <FocusTrap>
          <button>B1</button>
          <button>B2</button>
        </FocusTrap>
      </div>
    );
    const b2 = container.querySelectorAll('button')[2]; // ultimo del secondo trap
    b2.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    // Il secondo trap gestisce il loop (ultimo → primo): B2 → B1
    expect(document.activeElement).toBe(container.querySelectorAll('button')[1]);
  });
});
