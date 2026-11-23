// Diagnostica.test.tsx — il pannello esiste solo con SB_DEBUG e ciò che si copia è mascherato.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Diagnostica from './Diagnostica.tsx';
import { avviaDiagnostica, azzera } from './diagnostica.ts';

beforeEach(function () {
  azzera();
  avviaDiagnostica();
});

afterEach(function () {
  delete (window as any).SB_DEBUG;
  vi.restoreAllMocks();
});

describe('Diagnostica · pannello', function () {
  it('senza SB_DEBUG non monta nulla (nessun pulsante, nessun dialog)', function () {
    var { container } = render(<Diagnostica isLight={false} />);
    expect(container.querySelector('button')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('con SB_DEBUG mostra gli errori, ma il testo copiato non contiene PII', function () {
    // Il canale che può portare dati fuori è `clipboard.writeText`, non il
    // textarea (che è solo il fallback manuale): spiare il primo è la prova.
    var scrivi = vi.fn().mockResolvedValue(undefined);
    var clipboardOriginale = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: scrivi } });
    try {
      (window as any).SB_DEBUG = true;
      window.dispatchEvent(
        new ErrorEvent('error', {
          message: 'Compito di Giulia troppo lungo: scrivi a mario.rossi@scuolaboard.it',
          error: new Error('Compito di Giulia troppo lungo: scrivi a mario.rossi@scuolaboard.it'),
        })
      );
      render(<Diagnostica isLight={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'Apri diagnostica' }));
      expect(screen.getByRole('dialog', { name: /Diagnostica di ScuolaBoard/ })).toBeTruthy();
      // L'errore registrato è visibile nel pannello locale, dove serve a capire.
      expect(screen.getByText(/mario\.rossi@scuolaboard\.it/)).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /Copia diagnostica/ }));
      expect(scrivi).toHaveBeenCalledTimes(1);
      var copiato = String(scrivi.mock.calls[0][0]);
      expect(copiato).not.toContain('mario.rossi@scuolaboard.it');
      expect(copiato).not.toContain('Giulia');
      expect(copiato).not.toContain('Compito di');
      expect(copiato).toContain('[errore] Error');
      expect(copiato).toContain('(testo omesso, vedi pannello)');
      expect(copiato).toContain('ScuolaBoard — diagnostica');
    } finally {
      if (clipboardOriginale) Object.defineProperty(navigator, 'clipboard', clipboardOriginale);
      else delete (navigator as any).clipboard;
    }
  });
});
