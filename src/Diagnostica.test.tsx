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

  it('con SB_DEBUG mostra gli errori e il testo copiato non contiene la PII', function () {
    (window as any).SB_DEBUG = true;
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'scrivi a mario.rossi@scuolaboard.it',
        error: new Error('scrivi a mario.rossi@scuolaboard.it'),
      })
    );
    render(<Diagnostica isLight={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apri diagnostica' }));
    expect(screen.getByRole('dialog', { name: /Diagnostica di ScuolaBoard/ })).toBeTruthy();
    // L'errore registrato è visibile nel pannello.
    expect(screen.getByText(/mario\.rossi@scuolaboard\.it/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Copia diagnostica/ }));
    var textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    // In uscita (testo copiabile) l'indirizzo è mascherato: è l'unico canale
    // da cui il contenuto può lasciare il dispositivo.
    expect(textarea.value).toContain('[EMAIL_1]');
    expect(textarea.value).not.toContain('mario.rossi@scuolaboard.it');
    expect(textarea.value).toContain('ScuolaBoard — diagnostica');
  });
});
