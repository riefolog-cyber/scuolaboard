// Countdown.test.tsx — countdown isolato (D1).
// Dopo il refactor il tick di 1s NON ri-renderizza più l'intera app: ogni
// Countdown ha il proprio interval. Qui testiamo la logica pura di
// formattazione (countdownStr) e che il componente renda il testo giusto
// senza dipendere da un tick globale.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Countdown, { countdownStr } from './Countdown.tsx';

describe('countdownStr (logica pura)', () => {
  var now = new Date('2026-09-01T12:00:00Z').getTime();

  it('scadenza passata → "Scaduta" e expired=true', () => {
    var r = countdownStr(new Date('2026-08-01T00:00:00Z').toISOString(), now);
    expect(r.expired).toBe(true);
    expect(r.str).toBe('Scaduta');
  });

  it('scadenza futura entro 1 min → secondi', () => {
    var r = countdownStr(new Date(now + 45000).toISOString(), now);
    expect(r.expired).toBe(false);
    expect(r.str).toMatch(/\d+s$/);
  });

  it('scadenza futura entro 1 ora → minuti e secondi', () => {
    var r = countdownStr(new Date(now + 5 * 60000 + 30000).toISOString(), now);
    expect(r.str).toMatch(/5m 30s$/);
  });

  it('scadenza entro 24h → ore e minuti', () => {
    var r = countdownStr(new Date(now + 2 * 3600000 + 5 * 60000).toISOString(), now);
    expect(r.str).toMatch(/2h 5m$/);
  });

  it('scadenza oltre 24h → giorni e ore', () => {
    var r = countdownStr(new Date(now + 3 * 86400000 + 2 * 3600000).toISOString(), now);
    expect(r.str).toMatch(/3g 2h$/);
  });
});

describe('Countdown (componente)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders "Scaduta" per una scadenza nel passato', () => {
    render(React.createElement(Countdown, { scadenza: '2020-01-01T00:00:00Z' }));
    expect(screen.getByText(/Scaduta/)).toBeTruthy();
  });

  it('renders un countdown futuro (es. entro un ora)', () => {
    // +30 minuti da adesso → formato "Xm Ys"
    var future = new Date(Date.now() + 30 * 60000).toISOString();
    render(React.createElement(Countdown, { scadenza: future }));
    expect(screen.getByText(/⏰ \d+m \d+s/)).toBeTruthy();
  });

  it('senza scadenza mostra stato statico "Scaduta" senza avviare timer', () => {
    // countdownStr(null) → epoch → ms<=0 → expired; il componente NON parte
    // nessun interval (useCountdown esce su !scadenza), quindi il valore resta
    // quello iniziale — in pratica CardItem renderizza Countdown solo quando
    // c.scadenza è presente, quindi questo è un comportamento difensivo.
    render(React.createElement(Countdown, { scadenza: null }));
    expect(screen.getByText(/Scaduta/)).toBeTruthy();
  });
});
