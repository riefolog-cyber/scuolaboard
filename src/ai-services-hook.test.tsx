// @ts-nocheck — test del hook useAI (src/ai-services.ts): i flussi UI che
// usano le chiamate AI (runAI, runCardAI, runCardQ, aiGenerateQuiz,
// aiRigenDomanda, aiConfirmaQuiz, riassuntiCommentiRun, aiAnalisiSondaggio).
// Il modulo cattura window.SB.* ALL'IMPORT → setup in beforeAll con import
// dinamico. Il throttle AI_THROTTLE_MS (5s) è a livello di modulo: Date.now
// viene mockato con valori strettamente crescenti (ogni lettura +10s) così
// le chiamate successive dello stesso test non vengono bloccate.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

const USER = { role: 'prof' };
let apiRef: any = null;
let useAI: any = null;
let fakeNow = 1000000;
let dbUpdateMock: any;
let dbSetMock: any;

function AIProbe({ u }: any) {
  const ai = useAI(u);
  apiRef = ai;
  return null;
}

function makeSb() {
  // I mock di db vengono creati UNA volta: collection()/doc() restituiscono
  // oggetti nuovi a ogni chiamata, quindi i vi.fn() vanno condivisi per poter
  // fare asserzioni dal test.
  dbUpdateMock = vi.fn().mockResolvedValue({});
  dbSetMock = vi.fn().mockResolvedValue({});
  window.SB = {
    db: {
      collection: (name: string) => ({
        get: () => Promise.resolve({ forEach: () => {} }),
        doc: (id: string) => ({
          update: dbUpdateMock,
          set: dbSetMock,
        }),
      }),
    },
    escapeForPrompt: (s: any) => String(s ?? ''),
    showToast: vi.fn(),
    user: { role: 'prof' },
    auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue('fake-token') } },
    LS: {
      aiCache: { get: () => null, set: vi.fn(), rm: vi.fn() },
      aiCacheAt: { get: () => null, set: vi.fn(), rm: vi.fn() },
    },
  };
  window.db = window.SB.db;
}

function mockJson(data: any) {
  window.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    clone: () => ({ json: async () => ({}) }),
    json: async () => ({ success: true, data: { content: JSON.stringify(data) } }),
  });
}

function mockText(text: string) {
  window.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    clone: () => ({ json: async () => ({}) }),
    json: async () => ({ success: true, data: { content: text } }),
  });
}

function mockErr(status: number, body: any) {
  window.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    clone: () => ({ json: async () => body }),
    json: async () => body,
  });
}

function mkCard(id: string, over: any = {}) {
  return Object.assign({ id, titolo: 'T', testo: 'x', commenti: [], classi: ['1A'], tipo: 'nota', likes: 0 }, over);
}

beforeAll(async () => {
  makeSb();
  const mod: any = await import('./ai-services.ts');
  useAI = mod.useAI;
});

beforeEach(() => {
  fakeNow += 60000;
  // Ogni lettura di Date.now() avanza di 10s: il throttle (5s) non blocca
  // mai le chiamate successive dello stesso test.
  vi.spyOn(Date, 'now').mockImplementation(() => {
    fakeNow += 10000;
    return fakeNow;
  });
  // fetch fresco per ogni test: senza, i mock dei test precedenti accumulano
  // chiamate e mockResolvedValueOnce vengono consumati da altri test.
  window.fetch = vi.fn();
  render(React.createElement(AIProbe, { u: USER }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAI — flussi di analisi', () => {
  it('runAI (tutte le card) → aiResult con riepilogo', async () => {
    mockJson({ riepilogo: 'Riepilogo OK', dibattito: 'Dibattito', punti_chiave: ['p1'] });
    apiRef.runAI([mkCard('c1'), mkCard('c2')]);
    await waitFor(() => expect(apiRef.aiResult && apiRef.aiResult.riepilogo).toBe('Riepilogo OK'));
    expect(apiRef.aiRunning).toBe(false);
  });

  it('runAI: nessuna card → errore e toast', async () => {
    apiRef.runAI([]);
    await waitFor(() => expect(apiRef.aiErr).toContain('Nessuna card trovata'));
    expect(window.SB.showToast).toHaveBeenCalledWith('Nessuna card trovata per l\'analisi.', 'warn');
  });

  it('runAI: errore server → messaggio amichevole (503)', async () => {
    mockErr(503, { error: 'Servizio momentaneamente non disponibile' });
    apiRef.runAI([mkCard('c1')]);
    await waitFor(() => expect(apiRef.aiErr).toContain('non disponibile'));
  });

  it('runAI: suddivisa per classe → un risultato per classe', async () => {
    apiRef.setAiTarget('suddivisa');
    await waitFor(() => expect(apiRef.aiTarget).toBe('suddivisa'));
    window.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        clone: () => ({ json: async () => ({}) }),
        json: async () => ({ success: true, data: { content: JSON.stringify({ riepilogo: '1A' }) } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        clone: () => ({ json: async () => ({}) }),
        json: async () => ({ success: true, data: { content: JSON.stringify({ riepilogo: '1B' }) } }),
      });
    apiRef.runAI([mkCard('c1', { classi: ['1A'] }), mkCard('c2', { classi: ['1B'] })]);
    await waitFor(() => expect(apiRef.aiResult && apiRef.aiResult['1A']).toBeTruthy());
    expect(apiRef.aiResult['1B'].riepilogo).toBe('1B');
  });
});

describe('useAI — card AI e domande libere', () => {
  it('runCardAI: successo → salva su db e chiama refreshCallback', async () => {
    mockJson({ sintesi: 'S', dinamica: 'D', spunto: 'P', domande_stimolo: ['q1'] });
    const refresh = vi.fn();
    const card = mkCard('c1', { commenti: [{ id: 'cm1', autore: 'Luca', testo: 'ciao' }] });
    apiRef.runCardAI(card, [card], refresh);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(dbSetMock).toHaveBeenCalled(); // _aiSave su ai_results
  });

  it('runCardAI: errore → cardAiErr impostato', async () => {
    mockErr(500, { error: 'boom' });
    const card = mkCard('c1');
    apiRef.runCardAI(card, [card], null);
    await waitFor(() => expect(apiRef.cardAiErr).toBeTruthy());
    expect(apiRef.cardAiErr).toContain('boom');
  });

  it('runCardQ: aggiunge la domanda alla lista dell aiMap', async () => {
    mockText('risposta chiara');
    apiRef.setCardQ('Che cos\'è X?');
    // setCardQ non aggiorna apiRef in modo sincrono: serve un re-render
    await waitFor(() => expect(apiRef.cardQ).toBe('Che cos\'è X?'));
    const showCard = mkCard('c1');
    apiRef.runCardQ(showCard);
    await waitFor(() => expect(apiRef.aiMap['c1'] && apiRef.aiMap['c1'].domande).toHaveLength(1));
    expect(apiRef.aiMap['c1'].domande[0].q).toBe('Che cos\'è X?');
    expect(apiRef.aiMap['c1'].domande[0].risposta).toBe('risposta chiara');
  });
});

describe('useAI — quiz generato', () => {
  it('aiGenerateQuiz: anteprima con le domande', async () => {
    mockJson({ domande: [{ testo: 'q1' }, { testo: 'q2' }] });
    apiRef.setAqg((p: any) => ({ ...p, testo: 'testo lezione', numDom: 2, tipo: 'multipla' }));
    await waitFor(() => expect(apiRef.aqg.testo).toBe('testo lezione'));
    apiRef.aiGenerateQuiz();
    await waitFor(() => expect(apiRef.aqg.anteprima).toHaveLength(2));
    expect(apiRef.aqg.anteprima[0].testo).toBe('q1');
  });

  it('aiGenerateQuiz: risposta senza domande → errore', async () => {
    mockJson({ domande: [] });
    apiRef.setAqg((p: any) => ({ ...p, testo: 'testo', numDom: 2, tipo: 'multipla' }));
    await waitFor(() => expect(apiRef.aqg.testo).toBe('testo'));
    apiRef.aiGenerateQuiz();
    await waitFor(() => expect(apiRef.aqg.err).toContain('non ha generato'));
  });

  it('aiRigenDomanda: sostituisce la domanda e resetta regenIdx', async () => {
    mockJson({ domande: [{ testo: 'nuova' }] });
    apiRef.setAqg((p: any) => ({ ...p, testo: 'testo', tipo: 'multipla', anteprima: [{ testo: 'vecchia' }] }));
    await waitFor(() => expect(apiRef.aqg.anteprima).toHaveLength(1));
    apiRef.aiRigenDomanda(0);
    await waitFor(() => expect(apiRef.aqg.anteprima[0].testo).toBe('nuova'));
    expect(apiRef.aqg.regenIdx).toBeNull();
  });

  it('aiConfirmaQuiz: importa le domande nel form e resetta lo stato', async () => {
    apiRef.setAqg((p: any) => ({ ...p, anteprima: [{ testo: 'q1' }] }));
    await waitFor(() => expect(apiRef.aqg.anteprima).toHaveLength(1));
    const setForm = vi.fn();
    apiRef.aiConfirmaQuiz(setForm);
    const updater = setForm.mock.calls[0][0];
    const next = updater({ quizDomande: [] });
    expect(next.tipo).toBe('quiz');
    expect(next.quizDomande).toHaveLength(1);
    expect(apiRef.showAiQuizGen).toBe(false);
    await waitFor(() => expect(apiRef.aqg.anteprima).toBeNull());
  });
});

describe('useAI — sommario e sondaggio', () => {
  it('riassuntiCommentiRun: meno di 2 commenti → messaggio senza chiamata AI', async () => {
    apiRef.riassuntiCommentiRun({ id: 'c1', commenti: [{ id: 'cm1' }] });
    await waitFor(() => expect(apiRef.sommarioResult['c1']).toContain('Commenti insufficienti'));
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it('riassuntiCommentiRun: 2+ commenti → riassunto (pseudonimizzato)', async () => {
    mockText('riassunto della discussione');
    apiRef.riassuntiCommentiRun({
      id: 'c1',
      commenti: [
        { id: 'cm1', autore: 'Luca', testo: 'a' },
        { id: 'cm2', autore: 'Anna', testo: 'b' },
      ],
    });
    await waitFor(() => expect(apiRef.sommarioResult['c1']).toContain('riassunto'));
  });

  it('aiAnalisiSondaggio: nessun voto → messaggio', async () => {
    apiRef.aiAnalisiSondaggio({ id: 'c1', opzioni: [{ voti: [] }] });
    await waitFor(() => expect(apiRef.sondaggioAiResult['c1']).toContain('Nessun voto'));
  });

  it('aiAnalisiSondaggio: con voti → analisi', async () => {
    mockText('analisi sondaggio');
    apiRef.aiAnalisiSondaggio({ id: 'c1', titolo: 'S', opzioni: [{ testo: 'A', voti: ['x', 'y'] }] });
    await waitFor(() => expect(apiRef.sondaggioAiResult['c1']).toContain('analisi'));
  });
});
