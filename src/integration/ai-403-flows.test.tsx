// @ts-nocheck — test di INTEGRAZIONE: gestione 403 del Worker AI.
// Quando il Cloudflare Worker risponde 403 (origine non autorizzata O accesso
// riservato ai docenti) include error + hint nel body. Il fix in ai-services.ts
// propaga l'hint nel messaggio d'errore, che arriva al toast: prima si vedeva
// solo il generico "Errore del server AI (status 403)" senza possibilità di
// capire la causa (es. dev server su porta fuori dalla whitelist ALLOWED_ORIGINS).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

describe('403 del Worker AI: il toast mostra la causa (hint)', () => {
  it('origine non autorizzata → messaggio con hint del worker', async () => {
    // Mock del Worker AI che risponde 403 come quello reale (body con hint)
    window.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      clone: () => ({
        json: async () => ({ error: 'Origine non autorizzata', allowedOrigins: 'x', hint: 'Aggiungi questa origine a ALLOWED_ORIGINS' }),
      }),
      json: async () => ({ error: 'Origine non autorizzata', hint: 'Aggiungi questa origine a ALLOWED_ORIGINS' }),
    });

    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card AI' }) } };
    const { db } = await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card AI', {}, { timeout: 8000 }));

    // Avvia l'analisi AI: il 403 deve trasformarsi in un messaggio leggibile
    fireEvent.click(await screen.findByRole('button', { name: /\+ AI/ }, { timeout: 8000 }));
    expect(await screen.findByText(/Origine non autorizzata/, {}, { timeout: 5000 })).toBeTruthy();
    expect(await screen.findByText(/ALLOWED_ORIGINS/, {}, { timeout: 5000 })).toBeTruthy();
    // Nessuna analisi salvata (la chiamata è fallita)
    expect(db._get('ai_results', 'c1')).toBeFalsy();
  });

  it('accesso riservato ai docenti → messaggio senza hint (caso role)', async () => {
    // Rate-limit client-side (AI_THROTTLE_MS, condiviso tra test dello stesso
    // file via _lastAiCall del modulo): attesa oltre i 5s prima della 2ª chiamata
    await new Promise((r) => setTimeout(r, 5200));
    // 403 per ruolo: il worker NON include hint in questo ramo
    window.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      clone: () => ({ json: async () => ({ error: 'Accesso AI riservato ai docenti.' }) }),
      json: async () => ({ error: 'Accesso AI riservato ai docenti.' }),
    });

    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card role' }) } };
    await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card role', {}, { timeout: 8000 }));
    fireEvent.click(await screen.findByRole('button', { name: /\+ AI/ }, { timeout: 8000 }));
    expect(await screen.findByText(/Accesso AI riservato ai docenti/, {}, { timeout: 5000 })).toBeTruthy();
  });
});
