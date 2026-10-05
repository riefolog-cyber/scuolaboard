// @ts-nocheck — test di INTEGRAZIONE: valutazione quiz lato prof
// (valutaAperteProfAI con AI mockata + classifica + reset risposte).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, modalRoot, setupTestEnv, teardownTestEnv } from './fixtures';

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
      // Il voto dell'IA NON entra nel punteggio: è un riscontro, non un voto
      // (AGENTS.md regola 3, e la PrivacyModal lo promette agli studenti). Il
      // punteggio resta quello delle domande chiuse, già salvato dallo studente.
      expect(doc.punteggio.score).toBe(1);
      // resta com'era (totale 2 nel seed): la valutazione IA non riscrive il
      // punteggio, lo lascia com'è.
      expect(doc.punteggio.totale).toBe(2);
      expect(doc.aiErrori).toEqual([]);
    });

    // UI: il bottone passa a "✓ Tutte valutate" (regex: il bottone contiene
    // anche l'emoji 🤖 come nodo testo separato → matcher esatto fallirebbe)
    expect(await screen.findByText(/✓ Tutte valutate/, {}, { timeout: 4000 })).toBeTruthy();
  });

  // ── I segni per risposta devono dire la STESSA cosa del punteggio ────────────
  //
  // Bug segnalato dalla docente: punteggio 2/6 ma tutte le risposte marcate con la
  // X. Il motivo era che "questa risposta è giusta?" era scritto TRE volte con tre
  // criteri diversi (punteggio con String(), pannello prof con === rigido, pannello
  // studente senza il fallback sul testo). Il punteggio contava 2 risposte giuste e il
  // pannello le segnava tutte sbagliate: due schermate contraddittorie.
  it('i segni del pannello prof concordano con il punteggio (indice numero vs indice stringa)', async () => {
    const domande = [
      { tipo: 'multipla', testo: 'Q1', opzioni: ['a1', 'a2', 'a3', 'a4'], corretta: '0' },
      { tipo: 'multipla', testo: 'Q2', opzioni: ['b1', 'b2', 'b3', 'b4'], corretta: '3' },
      { tipo: 'multipla', testo: 'Q3', opzioni: ['c1', 'c2', 'c3', 'c4'], corretta: '2' },
    ];
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        q1: mkCard('q1', { titolo: 'Quiz concordanza', tipo: 'quiz', classi: ['3AO'], quizDomande: domande }),
      },
      // Le risposte arrivano dal modulo come INDICI numerici; `corretta` è l'indice
      // come stringa. È la situazione di tutti i quiz reali.
      quiz_risposte: {
        'q1_Luca Bianchi': mkRisposta('q1', 'Luca Bianchi', { 0: 1, 1: 3, 2: 2 }, { score: 2, totale: 3, pct: 67 }, { aiValutato: true }),
      },
    };
    await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Quiz concordanza', {}, { timeout: 4000 }));

    await screen.findByText(/RISULTATI \(1 studenti\)/, {}, { timeout: 4000 });
    expect(await screen.findByText('67%', {}, { timeout: 4000 })).toBeTruthy();

    // 2 giuste su 3 (Q2 e Q3): i segni devono dirlo. Prima del fix erano 3 ✗.
    const segni = document.querySelectorAll('[data-testid="segno-risposta"]');
    expect(segni.length).toBe(3);
    // Tre span per riga: il segno (✓/✗), "D1:" e il testo della risposta.
    expect(Array.from(segni).map((el) => el.textContent)).toEqual(['✗D1:a2', '✓D2:b4', '✓D3:c3']);
  });

  it('vero/falso: mostra il TESTO della risposta ("Falso"), non l’indice', async () => {
    // Secondo caso dello stesso bug: sui vero/falso `corretta` è il TESTO ('Falso') e la
    // risposta è l'indice 1. Prima il pannello mostrava "D1: 1" e il confronto falliva.
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        q1: mkCard('q1', {
          titolo: 'Quiz vero falso',
          tipo: 'quiz',
          classi: ['3AO'],
          quizDomande: [{ tipo: 'verofalso', testo: 'Il cielo è verde?', opzioni: ['Vero', 'Falso'], corretta: 'Falso' }],
        }),
      },
      quiz_risposte: {
        'q1_Luca Bianchi': mkRisposta('q1', 'Luca Bianchi', { 0: 1 }, { score: 1, totale: 1, pct: 100 }, { aiValutato: true }),
      },
    };
    await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Quiz vero falso', {}, { timeout: 4000 }));

    await screen.findByText(/RISULTATI \(1 studenti\)/, {}, { timeout: 4000 });
    // L'invariante è che la riga nomini la risposta per TESTO. Prima mostrava "D1: 1".
    const riga = document.querySelector('[data-testid="segno-risposta"]');
    expect(riga.textContent).toBe('✓D1:Falso');
    // E non deve comparire l'indice grezzo al posto del testo.
    expect(riga.textContent).not.toMatch(/D1:\s*1\s*$/);
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

    // Il reset ora chiede conferma tramite ConfirmDelModal (nessuna eliminazione
    // silenziosa): conferma col bottone rosso della modale.
    const modal = modalRoot('Reset risposte quiz');
    fireEvent.click(within(modal).getByRole('button', { name: '🗑️ Elimina' }));

    await waitFor(() => {
      expect(db._get('quiz_risposte', 'q1_Luca Bianchi')).toBeFalsy();
    });
  });
});
