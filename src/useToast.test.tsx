// useToast.test.tsx — la durata dei toast viene dalla config dell'app.
//
// PERCHÉ: il vecchio codice usava un letterale 2400 e `||`, quindi `0` diventava
// 2400 (e un `setTimeout(0)` chiudeva subito). Ora `0` significa "nessuna
// auto-chiusura": va congelato, insieme al fallback su valori invalidi.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import useToast from './hooks/useToast.ts';

function Sonda() {
  var $ = useToast();
  return (
    <div>
      <button onClick={() => $.showToast('ciao')}>mostra</button>
      <span data-testid="conteggio">{$.toasts.length}</span>
    </div>
  );
}

function compteggio(): string {
  return screen.getByTestId('conteggio').textContent || '';
}

describe('useToast · durata da SB_CONFIG.TOAST_TIMEOUT_MS', function () {
  beforeEach(function () {
    vi.useFakeTimers();
  });
  afterEach(function () {
    vi.useRealTimers();
    delete (window as any).SB_CONFIG;
  });

  it('0 = nessun timer, il toast resta', function () {
    (window as any).SB_CONFIG = { TOAST_TIMEOUT_MS: 0 };
    render(<Sonda />);
    fireEvent.click(screen.getByText('mostra'));
    expect(compteggio()).toBe('1');
    act(function () {
      vi.advanceTimersByTime(60000);
    });
    expect(compteggio()).toBe('1');
  });

  it('2400 = chiusura dopo la durata configurata', function () {
    (window as any).SB_CONFIG = { TOAST_TIMEOUT_MS: 2400 };
    render(<Sonda />);
    fireEvent.click(screen.getByText('mostra'));
    act(function () {
      vi.advanceTimersByTime(2399);
    });
    expect(compteggio()).toBe('1');
    act(function () {
      vi.advanceTimersByTime(1);
    });
    expect(compteggio()).toBe('0');
  });

  it('valori invalidi (NaN, Infinity, negativo) usano il fallback 2400', function () {
    [NaN, Infinity, -5].forEach(function (durata) {
      (window as any).SB_CONFIG = { TOAST_TIMEOUT_MS: durata };
      var r = render(<Sonda />);
      fireEvent.click(screen.getByText('mostra'));
      act(function () {
        vi.advanceTimersByTime(2399);
      });
      expect(compteggio()).toBe('1');
      act(function () {
        vi.advanceTimersByTime(1);
      });
      expect(compteggio()).toBe('0');
      r.unmount();
    });
  });
});
