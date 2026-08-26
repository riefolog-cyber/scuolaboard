// @ts-nocheck — REGRESSIONE: la CardDetail aperta (via deep link ?card=...)
// deve restare sincronizzata con lo snapshot Firestore. Prima del fix,
// deepLinkDone=true bloccava l'aggiornamento di showCard: una card aggiornata
// mentre il dettaglio era aperto restava STALE (es. quizDomande aggiunte con
// Modifica da un'altra scheda non comparivano mai nel dettaglio, pur essendo
// visibili nella griglia e nella modale di modifica).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

const CARD_ID = '1783268191554_217d5';

function mkCardSenzaQuiz(id, over = {}) {
  return mkCard(id, Object.assign({ tipo: 'domanda', classi: ['3AI'] }, over));
}

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

describe('REGRESSIONE: CardDetail sincronizzata con lo snapshot Firestore', () => {
  it('mostra il quiz nel dettaglio aperto via deep link dopo l\'aggiornamento della card', async () => {
    history.replaceState(null, '', '/?card=' + CARD_ID);
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { [CARD_ID]: mkCardSenzaQuiz(CARD_ID, { titolo: 'Card aggiornata' }) },
    };
    const { db } = await renderApp({ seed, user: PROF });

    // Il deep link apre la card automaticamente
    await screen.findByText('Card aggiornata', {}, { timeout: 4000 });
    await waitFor(() => {
      expect(screen.queryAllByText('Card aggiornata').length).toBeGreaterThan(0);
    });

    // La card viene aggiornata su Firestore (es. da un'altra scheda):
    // tipo -> quiz + quizDomande aggiunte
    const doc = db._get('cards', CARD_ID);
    db._seed('cards', {
      [CARD_ID]: Object.assign({}, doc, {
        tipo: 'quiz',
        quizDomande: [{ tipo: 'multipla', testo: 'Quanto fa 2+2?', opzioni: ['3', '4', '5'], corretta: '1' }],
      }),
    });

    // Il dettaglio APERTO deve mostrare i dati freschi: pannello quiz visibile
    expect(await screen.findByText(/QUIZ · 1 domande/, {}, { timeout: 4000 })).toBeTruthy();
  });
});
