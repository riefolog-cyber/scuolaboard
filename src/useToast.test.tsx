// useToast.test.tsx — la durata dei toast viene dalla config dell'app.
//
// PERCHÉ: il vecchio codice usava un letterale 2400 e `||`, quindi `0` diventava
// 2400 (e un `setTimeout(0)` chiudeva subito). Ora `0` significa "nessuna
// auto-chiusura": va congelato, insieme al fallback su valori invalidi.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import useToast from './hooks/useToast.ts';
import { MAX_TOAST } from './utils/toast.ts';

function Sonda() {
  var $ = useToast();
  return (
    <div>
      <button onClick={() => $.showToast('ciao')}>mostra</button>
      {/* Chiude il PRIMO toast: serve a verificare che la chiusura manuale
          fermi il timer di auto-chiusura (una ✕ che lascia il timer in volo
          aggiornerebbe lo stato di un toast che non c'è più). */}
      <button onClick={() => $.toasts.length && $.chiudiToast($.toasts[0].id)}>chiudi</button>
      <span data-testid="conteggio">{$.toasts.length}</span>
      <span data-testid="ids">{$.toasts.map((t) => t.id).join(',')}</span>
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

  it('due toast nello stesso istante hanno id diversi', function () {
    (window as any).SB_CONFIG = { TOAST_TIMEOUT_MS: 0 };
    render(<Sonda />);
    fireEvent.click(screen.getByText('mostra'));
    fireEvent.click(screen.getByText('mostra'));
    // I timer finti congelano anche `Date.now()`: è proprio il caso in cui due
    // id presi da `Date.now()` coincidevano. Con lo stesso id React segnalava
    // chiavi duplicate e la chiusura di uno portava via anche l'altro.
    var ids = (screen.getByTestId('ids').textContent || '').split(',');
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('chiudiToast toglie il toast e spegne il suo timer', function () {
    (window as any).SB_CONFIG = { TOAST_TIMEOUT_MS: 2400 };
    render(<Sonda />);
    // Conteggio RELATIVO: i timer interni di React non ci interessano, la
    // differenza sì (uno in più per il toast, zero dopo la chiusura).
    var prima = vi.getTimerCount();
    fireEvent.click(screen.getByText('mostra'));
    expect(vi.getTimerCount()).toBe(prima + 1);
    fireEvent.click(screen.getByText('chiudi'));
    expect(compteggio()).toBe('0');
    expect(vi.getTimerCount()).toBe(prima);
  });

  it('smontando il componente i timer dei toast non restano appesi', function () {
    // Il timer orfano aggiornava lo stato di un componente che non c'era più
    // (logout, cambio account): senza errore, ma il residuo si somma.
    (window as any).SB_CONFIG = { TOAST_TIMEOUT_MS: 2400 };
    var r = render(<Sonda />);
    var prima = vi.getTimerCount();
    fireEvent.click(screen.getByText('mostra'));
    expect(vi.getTimerCount()).toBe(prima + 1);
    r.unmount();
    expect(vi.getTimerCount()).toBe(prima);
  });

  it('oltre il tetto restano i più recenti (MAX_TOAST)', function () {
    (window as any).SB_CONFIG = { TOAST_TIMEOUT_MS: 0 };
    render(<Sonda />);
    for (var i = 0; i < MAX_TOAST + 3; i++) fireEvent.click(screen.getByText('mostra'));
    expect(compteggio()).toBe(String(MAX_TOAST));
  });
});
