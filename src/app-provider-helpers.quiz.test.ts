// Regressione: cambiare il tipo da 'quiz' a un altro tipo in modifica deve
// RIMUOVERE quizDomande, altrimenti il dettaglio/griglia non mostrano il quiz
// (gated da tipo === 'quiz') ma la modifica sì (gated solo su form.quizDomande).
import { describe, it, expect } from 'vitest';
import { buildEditCard, buildQuizDomande } from './app-provider-helpers.ts';

function mkForm(over: any) {
  return Object.assign(
    {
      titolo: 'Card',
      testo: '',
      opzioni: ['', ''],
      classi: [],
      links: [],
      immagini: [],
      allegati: [],
      copertina: null,
    },
    over
  );
}

describe('cambio tipo quiz → altro: quizDomande non devono restare orfane', () => {
  it('buildEditCard NON conserva quizDomande quando il nuovo form.tipo non è quiz', () => {
    const editMode: any = {
      id: 'c1',
      tipo: 'quiz',
      titolo: 'Vecchia card',
      testo: '',
      classi: ['3AI'],
      quizDomande: [{ tipo: 'multipla', testo: 'Quanto fa 2+2?', opzioni: ['3', '4', '5'], corretta: '1' }],
    };
    const form = mkForm({ tipo: 'domanda', titolo: 'Cambiata in domanda' });
    const quizDomande = buildQuizDomande(form);
    const c = buildEditCard(editMode, form, [], [], null, quizDomande);
    expect(c.tipo).toBe('domanda');
    expect(c.quizDomande).toBeFalsy();
    expect(c.quizTimer).toBeFalsy();
    // E il salvataggio normale continua a funzionare per una vera card quiz
    const formQuiz = mkForm({ tipo: 'quiz', quizDomande: [{ tipo: 'aperta', testo: 'Spiega' }] });
    const qd2 = buildQuizDomande(formQuiz);
    const c2 = buildEditCard(editMode, formQuiz, [], [], null, qd2);
    expect(c2.tipo).toBe('quiz');
    expect(c2.quizDomande).toHaveLength(1);
  });
});
