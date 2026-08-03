// @ts-nocheck — test di INTEGRAZIONE: flusso quiz interattivo (studente).
// Verifica: compilazione risposte, invio su quiz_risposte, calcolo punteggio,
// display "Quiz completato" e quiz a tempo (timer).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { STUD, STUD_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

function mkQuizCard(id, over = {}) {
  return mkCard(
    id,
    Object.assign(
      {
        tipo: 'quiz',
        classi: ['3AI'],
        quizDomande: [
          { tipo: 'multipla', testo: 'Quanto fa 2+2?', opzioni: ['3', '4', '5'], corretta: '1' },
          { tipo: 'multipla', testo: "Capitale d'Italia?", opzioni: ['Roma', 'Milano'], corretta: '0' },
        ],
        quizTimer: 5,
      },
      over
    )
  );
}

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

describe('Quiz interattivo (studente)', () => {
  it('mostra il quiz a tempo con il timer', async () => {
    const seed = { users: { stud1: STUD_DOC }, cards: { q1: mkQuizCard('q1', { titolo: 'Quiz di prova' }) } };
    await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Quiz di prova', {}, { timeout: 4000 }));
    // Header quiz + timer visibili. Il chip "⏱ 5 min" esiste sia nella griglia
    // sia nel dettaglio → getAllByText (getByText fallirebbe con elementi multipli).
    expect(await screen.findByText(/QUIZ · 2 domande/, {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getAllByText(/⏱ 5 min/).length).toBeGreaterThan(0);
  });

  it('risponde a tutte le domande e invia: punteggio salvato e "Quiz completato"', async () => {
    const seed = { users: { stud1: STUD_DOC }, cards: { q1: mkQuizCard('q1', { titolo: 'Quiz di prova' }) } };
    const { db } = await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Quiz di prova', {}, { timeout: 4000 }));
    await screen.findByText(/QUIZ · 2 domande/, {}, { timeout: 4000 });

    // Il bottone Invia è disabilitato finché non risponde a tutto
    const inviaBtn = screen.getByRole('button', { name: 'Invia risposte' });
    expect(inviaBtn.disabled).toBe(true);

    // Risponde: domanda 1 → "4" (indice 1, corretta), domanda 2 → "Milano" (indice 1, sbagliata)
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Milano' }));
    expect(screen.getByRole('button', { name: 'Invia risposte' }).disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Invia risposte' }));

    await waitFor(() => {
      const doc = db._get('quiz_risposte', 'q1_Luca Bianchi');
      expect(doc).toBeTruthy();
      expect(doc.studente).toBe('Luca Bianchi');
      expect(doc.cardId).toBe('q1');
      expect(doc.risposte).toEqual({ 0: 1, 1: 1 });
      expect(doc.punteggio.score).toBe(1);
      expect(doc.punteggio.totale).toBe(2);
      expect(doc.punteggio.pct).toBe(50);
      expect(doc.aiValutato).toBe(true);
    });

    // Il display passa a "Quiz completato" con il punteggio.
    // NB: "Punteggio: " e "1/2" sono nodi testo separati (il <strong> è figlio)
    // → getByText matcha SOLO i nodi testo diretti: cerchiamo il testo del <strong>.
    expect(await screen.findByText('✅ Quiz completato', {}, { timeout: 4000 })).toBeTruthy();
    // findByText (non getByText): aspetta il flush degli update React evitando il warning act()
    expect(await screen.findByText('1/2', {}, { timeout: 4000 })).toBeTruthy();
  });

  it('assegna il punteggio pieno con tutte le risposte corrette', async () => {
    const seed = { users: { stud1: STUD_DOC }, cards: { q1: mkQuizCard('q1', { titolo: 'Quiz facile' }) } };
    const { db } = await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Quiz facile', {}, { timeout: 4000 }));
    await screen.findByText(/QUIZ · 2 domande/, {}, { timeout: 4000 });

    fireEvent.click(screen.getByRole('button', { name: '4' })); // corretta
    fireEvent.click(screen.getByRole('button', { name: 'Roma' })); // corretta
    fireEvent.click(screen.getByRole('button', { name: 'Invia risposte' }));

    await waitFor(() => {
      const doc = db._get('quiz_risposte', 'q1_Luca Bianchi');
      expect(doc.punteggio.score).toBe(2);
      expect(doc.punteggio.pct).toBe(100);
    });
    expect(await screen.findByText('✅ Quiz completato', {}, { timeout: 4000 })).toBeTruthy();
    // findByText (non getByText): aspetta il flush degli update React evitando il warning act()
    expect(await screen.findByText('2/2', {}, { timeout: 4000 })).toBeTruthy();
  });
});
