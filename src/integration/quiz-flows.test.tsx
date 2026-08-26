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

  it('domanda APERTA: mostra la textarea e abilita Invia solo dopo aver scritto', async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        q1: mkQuizCard('q1', {
          titolo: 'Quiz con aperta',
          quizDomande: [
            { tipo: 'multipla', testo: 'Quanto fa 2+2?', opzioni: ['3', '4', '5'], corretta: '1' },
            { tipo: 'aperta', testo: 'Spiega perché 4', opzioni: [], corretta: '' },
          ],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Quiz con aperta', {}, { timeout: 4000 }));
    await screen.findByText(/QUIZ · 2 domande/, {}, { timeout: 4000 });

    // 1) C'è un campo di testo per la risposta aperta (textbox)
    // NOTA: getByRole('textbox') in jsdom non matcha sempre la <textarea>;
    // usiamo un selettore diretto più affidabile.
    const ta: any = document.querySelector('textarea');
    expect(ta).toBeTruthy();

    // 2) Invio resta disabilitato finché l'aperta non ha testo
    const inviaBtn = () => screen.getByRole('button', { name: 'Invia risposte' });
    expect(inviaBtn().disabled).toBe(true);

    // 3) Rispondo alla multipla, ma l'aperta è vuota → Invia resta disabilitato
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    expect(inviaBtn().disabled).toBe(true);

    // 4) Scrivo nell'aperta → Invia si abilita. Il campo usa onInput (non onChange).
    fireEvent.input(ta, { target: { value: 'Perché 3 + 1 fa 4' } });
    expect(inviaBtn().disabled).toBe(false);

    fireEvent.click(inviaBtn());

    // 5) Le risposte aperte vanno salvate (e il doc resta da valutare AI)
    await waitFor(() => {
      const doc = db._get('quiz_risposte', 'q1_Luca Bianchi');
      expect(doc).toBeTruthy();
      expect(doc.risposte[1]).toBe('Perché 3 + 1 fa 4');
      expect(doc.aiValutato).toBe(false);
    });
    expect(await screen.findByText('✅ Quiz completato', {}, { timeout: 4000 })).toBeTruthy();
  });

  it('al refresh (riapertura card) lo studente vede il quiz già completato, non riparte da zero', async () => {
    // Simula un refresh: il doc quiz_risposte ESISTE già per questo studente
    // (inviato in una sessione precedente). Il listener deve filtrare per
    // studente e trovare il proprio doc → mostra "Quiz completato".
    const seed = {
      users: { stud1: STUD_DOC },
      cards: { q1: mkQuizCard('q1', { titolo: 'Quiz già fatto' }) },
      quiz_risposte: {
        'q1_Luca Bianchi': {
          cardId: 'q1',
          studente: 'Luca Bianchi',
          risposte: { 0: 1, 1: 0 },
          punteggio: { score: 1, totale: 2, pct: 50 },
          aiValutato: true,
          data: new Date().toISOString(),
        },
      },
    };
    await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Quiz già fatto', {}, { timeout: 4000 }));

    // NON deve mostrare le domande da rispondere, ma il badge di completamento
    expect(await screen.findByText('✅ Quiz completato', {}, { timeout: 4000 })).toBeTruthy();
    expect(await screen.findByText('1/2', {}, { timeout: 4000 })).toBeTruthy();
    // Le domande interattive NON devono comparire (il quiz non riparte)
    expect(screen.queryByRole('button', { name: 'Invia risposte' })).toBeNull();
    // Lo studente vede l'esito (giusto/sbagliato) della domanda chiusa
    expect(screen.getAllByText(/La tua risposta:/).length).toBeGreaterThan(0);
  });

  it('dopo il completamento lo studente vede l\'esito giusto/sbagliato e la valutazione AI del prof', async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        q1: mkQuizCard('q1', {
          titolo: 'Quiz con esiti',
          quizDomande: [
            { tipo: 'multipla', testo: 'Quanto fa 2+2?', opzioni: ['3', '4', '5'], corretta: '1' },
            { tipo: 'aperta', testo: 'Spiega perché 4', opzioni: [], corretta: '' },
          ],
        }),
      },
      quiz_risposte: {
        'q1_Luca Bianchi': {
          cardId: 'q1',
          studente: 'Luca Bianchi',
          risposte: { 0: 1, 1: 'Perché 3 + 1 fa 4' },
          punteggio: { score: 1.8, totale: 2, pct: 90 },
          aiValutato: true,
          aiScores: { 1: { voto: 0.8, punti_forza: 'Chiaro', lacune: 'Nessuna', suggerimento: 'Continua così' } },
          data: new Date().toISOString(),
        },
      },
    };
    await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Quiz con esiti', {}, { timeout: 4000 }));

    await screen.findByText('✅ Quiz completato', {}, { timeout: 4000 });
    // Esito della domanda chiusa: la risposta "4" è corretta → ✅
    expect(await screen.findByText(/Quanto fa 2\+2\?/, {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getAllByText(/La tua risposta:/).length).toBeGreaterThan(0);
    // La valutazione AI del prof è visibile (punti di forza del feedback)
    expect(await screen.findByText(/Chiaro/, {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.queryByText(/attende la valutazione del prof/)).toBeNull();
  });
});
