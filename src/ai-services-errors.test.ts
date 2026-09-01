// @ts-nocheck — test UNITARI dei rami errore di chiamaAI (ai-services.ts).
// chiamaAI non è esportata: si esercita tramite i global SB.callGroqText /
// SB.callGroqJSON (registrati all'import del modulo). Mock di fetch + auth
// (window.SB.auth.currentUser.getIdToken). Il throttle AI_THROTTLE_MS (5s)
// è condiviso a livello di modulo: uso vi.useFakeTimers + setSystemTime per
// controllare Date.now() senza attese reali.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestEnv, teardownTestEnv } from './integration/fixtures';
import './ai-services.ts'; // registra window.SB.callGroqText / callGroqJSON

// Tempo finto BASE. NB: _lastAiCall (throttle) è a livello di MODULO e non si
// resetta tra i test: ogni beforeEach deve usare un tempo SEMPRE maggiore del
// precedente (qui: base + contatore * 100s), altrimenti now-_lastAiCall=0 →
// la prima chiamata del test verrebbe bloccata dal throttle.
const T0 = 1000000;
let fakeTimeCounter = 0;

function authMock() {
  const getIdToken = vi.fn().mockResolvedValue('fake-token');
  window.SB.user = { role: 'prof' };
  window.SB.auth = { currentUser: { getIdToken: getIdToken } };
  return getIdToken;
}

function okResponse(content) {
  return {
    ok: true,
    status: 200,
    clone: () => ({ json: async () => ({}) }),
    json: async () => ({ success: true, data: { content: content } }),
  };
}

function errResponse(status, body) {
  return {
    ok: false,
    status: status,
    clone: () => ({ json: async () => body }),
    json: async () => body,
  };
}

beforeEach(() => {
  setupTestEnv();
  vi.useFakeTimers();
  fakeTimeCounter++;
  vi.setSystemTime(T0 + fakeTimeCounter * 100000);
});
afterEach(() => {
  vi.useRealTimers();
  teardownTestEnv();
});

describe('chiamaAI: rami di errore', () => {
  it('401 con codice recuperabile (AUTH_TOKEN_EXPIRED) → retry con refresh del token', async () => {
    const getIdToken = authMock();
    window.fetch = vi
      .fn()
      .mockResolvedValueOnce(errResponse(401, { code: 'AUTH_TOKEN_EXPIRED', error: 'expired' }))
      .mockResolvedValueOnce(okResponse('risposta finale'));
    const out = await window.SB.callGroqText(null, 'prompt');
    expect(out).toBe('risposta finale');
    // primo tentativo senza refresh, secondo con forceRefresh=true
    expect(getIdToken).toHaveBeenNthCalledWith(1, false);
    expect(getIdToken).toHaveBeenNthCalledWith(2, true);
    expect(window.fetch).toHaveBeenCalledTimes(2);
  });

  it('401 con codice NON recuperabile → nessun retry, errore dal body', async () => {
    authMock();
    // NB: il body DEVE avere `code` (non recuperabile): senza, shouldRetry
    // resta true (default) e il codice ritenta — comportamento corretto.
    window.fetch = vi.fn().mockResolvedValue(errResponse(401, { code: 'OTHER', error: 'Token non valido' }));
    await expect(window.SB.callGroqText(null, 'prompt')).rejects.toThrow('Token non valido');
    expect(window.fetch).toHaveBeenCalledTimes(1); // nessun secondo tentativo
  });

  it('429 (rate-limit worker) → errore dal body', async () => {
    authMock();
    window.fetch = vi.fn().mockResolvedValue(errResponse(429, { error: 'Troppe richieste. Riprova tra qualche secondo.' }));
    await expect(window.SB.callGroqText(null, 'prompt')).rejects.toThrow(/Troppe richieste/);
  });

  it('503 → errore dal body (o generico con status)', async () => {
    authMock();
    window.fetch = vi.fn().mockResolvedValue(errResponse(503, { error: 'Servizio momentaneamente non disponibile' }));
    await expect(window.SB.callGroqText(null, 'prompt')).rejects.toThrow(/non disponibile/);
  });

  it('risposta non-JSON → errore esplicito con status', async () => {
    authMock();
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      clone: () => ({ json: async () => { throw new Error('bad json'); } }),
      json: async () => { throw new Error('bad json'); },
    });
    await expect(window.SB.callGroqText(null, 'prompt')).rejects.toThrow(/Risposta del server non valida/);
  });

  it('data.success=false → "Risposta dell AI non riuscita"', async () => {
    authMock();
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      clone: () => ({ json: async () => ({ success: false }) }),
      json: async () => ({ success: false }),
    });
    await expect(window.SB.callGroqText(null, 'prompt')).rejects.toThrow(/Risposta dell'AI non riuscita/);
  });

  it('throttle: seconda chiamata entro 5s → bloccata; dopo 6s passa', async () => {
    authMock();
    window.fetch = vi.fn().mockResolvedValue(okResponse('ok'));
    await window.SB.callGroqText(null, 'prima');
    // entro i 5s → bloccata dal throttle
    await expect(window.SB.callGroqText(null, 'seconda')).rejects.toThrow(/Troppe richieste AI/);
    // oltre i 5s → passa (tempo corrente del test + 6s)
    vi.setSystemTime(Date.now() + 6000);
    const out = await window.SB.callGroqText(null, 'terza');
    expect(out).toBe('ok');
  });

  it('senza currentUser (logout) → errore login richiesto', async () => {
    window.SB.user = { role: 'prof' };
    window.SB.auth = { currentUser: null };
    window.fetch = vi.fn();
    await expect(window.SB.callGroqText(null, 'prompt')).rejects.toThrow(/login/);
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it('successo: ritorna il contenuto pulito', async () => {
    authMock();
    window.fetch = vi.fn().mockResolvedValue(okResponse('**testo** con markdown'));
    const out = await window.SB.callGroqText(null, 'prompt');
    expect(out).toContain('testo');
  });
});
