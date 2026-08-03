// @ts-nocheck — test di INTEGRAZIONE: valutazione quiz lato prof
// (valutaAperteProfAI con AI mockata + classifica + reset risposte).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

function mkQuizCard(id, over = {}) {
  return mkCard(
    id,
    Object.assign(
      {
        tipo: 'quiz',
        classi: ['3AO'],
        quizDomande: [
          { tipo: 'multipla', testo: 'Quanto fa 2+2?', opzioni: ['3', '4', '5'], corretta: '1' },
          { tipo: 'aperta', testo: 'Spiega perché 2+2=4' },
        ],
        quizTimer: 5,
      },
      over
    )
  );
}

function mkRisposta(id, studente, risposte, punteggio, over = {}) {
  return Object.assign(
    {
      cardId: id,
      studente: studente,
      risposte: risposte,
      punteggio: punteggio,
      tempoUsato: 0,
      data: '2026-09-01T10:00:00',
      aiValutato: false,
      aiScores: {},
    },
    over
  );
}

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

describe('Valutazione quiz lato prof', () => {
  it('valuta le risposte aperte con AI e aggiorna punteggi e aiScores', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { q1: mkQuizCard('q1', { titolo: 'Quiz con aperte' }) },
      quiz_risposte: {
        'q1_Luca Bianchi': mkRisposta(
          'q1',
          'Luca Bianchi',
          { 0: 1, 1: 'Perché due più due fa quattro' },
          { score: 1, totale: 2, pct: 50 }
        ),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });

    // Mock AI DOPO renderApp: il boot importa ai-services.ts che sovrascrive
    // window.callGroqJSON con la funzione vera al primo import. Impostato
    // prima verrebbe clobberato → la valutazione fallirebbe (fetch mockata).
    // Mock AI: voto 0.8 → multipla corretta (1) + aperta (0.8) = 1.8/2 = 90%
    window.callGroqJSON = vi.fn().mockResolvedValue({
      voto: 0.8,
      punti_forza: 'Ottima argomentazione',
      lacune: 'Manca un esempio',
      suggerimento: 'Aggiungi un esempio concreto',
    });
    fireEvent.click(await screen.findByText('Quiz con aperte', {}, { timeout: 4000 }));

    // Vista prof: RISULTATI + bottone valutazione
    await screen.findByText(/RISULTATI \(1 studenti\)/, {}, { timeout: 4000 });
    const valutaBtn = screen.getByRole('button', { name: /Valuta risposte aperte con AI/ });
    fireEvent.click(valutaBtn);

    await waitFor(() => {
      const doc = db._get('quiz_risposte', 'q1_Luca Bianchi');
      expect(doc).toBeTruthy();
      expect(doc.aiValutato).toBe(true);
      expect(doc.aiScores['1'].voto).toBe(0.8);
      expect(doc.punteggio.score).toBe(1.8);
      expect(doc.punteggio.pct).toBe(90);
    });

    // UI: il bottone passa a "✓ Tutte valutate" (regex: il bottone contiene
    // anche l'emoji 🤖 come nodo testo separato → matcher esatto fallirebbe)
    expect(await screen.findByText(/✓ Tutte valutate/, {}, { timeout: 4000 })).toBeTruthy();
  });

  it('ordina la classifica per percentuale decrescente', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { q1: mkQuizCard('q1', { titolo: 'Quiz classifica' }) },
      quiz_risposte: {
        'q1_Luca Bianchi': mkRisposta(
          'q1',
          'Luca Bianchi',
          { 0: 1 },
          { score: 1, totale: 2, pct: 50 },
          { aiValutato: true }
        ),
        'q1_Giulia Verdi': mkRisposta(
          'q1',
          'Giulia Verdi',
          { 0: 1 },
          { score: 1.8, totale: 2, pct: 90 },
          { aiValutato: true }
        ),
      },
    };
    await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Quiz classifica', {}, { timeout: 4000 }));
    await screen.findByText(/RISULTATI \(2 studenti\)/, {}, { timeout: 4000 });

    // La classifica ordina per pct decrescente: Giulia (90%) prima di Luca (50%)
    const pcts = screen.getAllByText(/^\d+%$/);
    expect(pcts[0].textContent).toBe('90%');
    expect(pcts[1].textContent).toBe('50%');
  });

  it('resetta le risposte al quiz', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { q1: mkQuizCard('q1', { titolo: 'Quiz reset' }) },
      quiz_risposte: {
        'q1_Luca Bianchi': mkRisposta(
          'q1',
          'Luca Bianchi',
          { 0: 1 },
          { score: 1.8, totale: 2, pct: 90 },
          { aiValutato: true }
        ),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Quiz reset', {}, { timeout: 4000 }));
    await screen.findByText(/RISULTATI \(1 studenti\)/, {}, { timeout: 4000 });

    fireEvent.click(screen.getByRole('button', { name: /Reset/ }));

    await waitFor(() => {
      expect(db._get('quiz_risposte', 'q1_Luca Bianchi')).toBeFalsy();
    });
  });
});
