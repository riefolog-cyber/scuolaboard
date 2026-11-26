// ai-quiz-anteprima.test.tsx — l'anteprima del quiz IA non deve esplodere e deve
// dire QUANTO si perderà.
//
// Due difetti veri, entrambi invisibili a occhio:
//  - `d.opzioni.map` su una domanda `multipla` generata senza opzioni lanciava al
//    RENDER: l'ErrorBoundary sostituiva l'app con «Qualcosa è andato storto» e la
//    modale (con le domande già generate) spariva;
//  - gli scarti si calcolavano leggendo `aqg.scartate` dal render precedente e
//    finivano in un campo (`avviso`) che nessuno mostrava: il docente importava
//    meno domande di quelle generate senza saperlo mai.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AiQuizGenModal from './modals/AiQuizGenModal.tsx';

function aqgCon(over: any) {
  return Object.assign(
    {
      testo: 'testo della lezione',
      loading: false,
      err: '',
      numDom: 2,
      tipo: 'multipla',
      anteprima: [],
      regenIdx: null,
      scartate: [],
    },
    over
  );
}

function mostra(aqg: any) {
  return render(
    <AiQuizGenModal
      showAiQuizGen={true}
      aqg={aqg}
      setAqg={function () {}}
      setShowAiQuizGen={function () {}}
    />
  );
}

describe('anteprima del quiz generato dall IA', function () {
  it('una domanda multipla senza opzioni non fa esplodere il render', function () {
    // Il modello può rispondere `tipo: "multipla"` senza `opzioni`.
    mostra(aqgCon({ anteprima: [{ tipo: 'multipla', testo: 'Domanda senza opzioni' }] }));
    expect(screen.getByText('Domanda senza opzioni')).toBeTruthy();
  });

  it('le domande scartate si vedono nell anteprima, con il motivo', function () {
    mostra(
      aqgCon({
        anteprima: [{ tipo: 'multipla', testo: 'Valida', opzioni: ['A', 'B'], corretta: '0' }],
        scartate: [{ indice: 2, motivo: 'nessuna opzione segnata come corretta' }],
      })
    );
    var banner = screen.getByRole('status');
    expect(banner.textContent).toContain('1 domanda non sarà importata');
    expect(banner.textContent).toContain('nessuna opzione segnata come corretta');
  });

  it('senza scarti il banner non compare', function () {
    mostra(aqgCon({ anteprima: [{ tipo: 'aperta', testo: 'Domanda aperta' }] }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('se nessuna domanda è importabile il pulsante non promette l aggiunta', function () {
    // Tutte le domande generate sono state scartate: il pulsante diceva «Aggiungi
    // 0 domande al quiz» e restava premibile, cioè invitava a un gesto che
    // `aiConfirmaQuiz` rifiuta (mette un errore e non chiude la modale). Il
    // conteggio onesto non basta se poi il pulsante resta armato.
    mostra(
      aqgCon({
        anteprima: [{ tipo: 'multipla', testo: 'Senza risposta', opzioni: ['A', 'B'] }],
        scartate: [{ indice: 1, motivo: 'nessuna opzione segnata come corretta' }],
      })
    );
    var bottone = screen.getByRole('button', { name: /Nessuna domanda importabile/ });
    expect(bottone.hasAttribute('disabled')).toBe(true);
  });

  it('con una domanda importabile il pulsante dice quante ne entrano e resta attivo', function () {
    mostra(
      aqgCon({
        anteprima: [
          { tipo: 'multipla', testo: 'Valida', opzioni: ['A', 'B'], corretta: '0' },
          { tipo: 'multipla', testo: 'Senza risposta', opzioni: ['A', 'B'] },
        ],
        scartate: [{ indice: 2, motivo: 'nessuna opzione segnata come corretta' }],
      })
    );
    var bottone = screen.getByRole('button', { name: /Aggiungi 1 domanda al quiz/ });
    expect(bottone.hasAttribute('disabled')).toBe(false);
  });
});
