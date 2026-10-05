// @ts-nocheck — test di INTEGRAZIONE: CardDetail in stato APERTO.
// Il smoke test (lazy-modals) monta CardDetail solo CHIUSA (showCard null →
// return null prima di tutto). Qui apriamo la card cliccando il titolo nella
// griglia e verifichiamo le AZIONI dal pannello: like, reazioni, commenti,
// rimozione scadenza, badge NASCOSTA/allegati, voto sondaggio (studente),
// chiusura. Le scritture si verificano sul db finto (window.db).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, STUD, PROF_DOC, STUD_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

// Clicca il titolo nella griglia e restituisce lo scope DENTRO la modale
// (.modal-inner): CardDetail è un overlay z-index 200, la griglia sotto ha
// bottoni con lo stesso testo (es. 👍 nella CardItem).
async function openCard(titolo) {
  fireEvent.click(await screen.findByText(titolo, {}, { timeout: 4000 }));
  const el = await waitFor(() => {
    const node = document.querySelector('.modal-inner');
    if (!node) throw new Error('CardDetail non aperta');
    return node;
  });
  return within(el);
}

describe('CardDetail — stato APERTO', () => {
  it('il prof fa like dalla card aperta (likes 0 → 1)', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card like' }) } };
    const { db } = await renderApp({ seed, user: PROF });

    const detail = await openCard('Card like');
    await detail.findByRole('button', { name: /👍/ }, {}, { timeout: 4000 });

    fireEvent.click(detail.getByRole('button', { name: /👍/ }));
    await waitFor(() => expect(db._get('cards', 'c1').likes).toBe(1));
  });

  it('il prof reagisce con un emoji (reazioni[emoji] contiene il suo nome)', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card reazione' }) } };
    const { db } = await renderApp({ seed, user: PROF });

    const detail = await openCard('Card reazione');
    fireEvent.click(await detail.findByRole('button', { name: 'Reagisci 🤔' }, {}, { timeout: 4000 }));

    await waitFor(() => {
      const re = db._get('cards', 'c1').reazioni;
      expect((re && re['🤔']) || []).toContain('Prof');
    });
  });

  it('il prof scrive un commento dal pannello', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card commento' }) } };
    const { db } = await renderApp({ seed, user: PROF });

    const detail = await openCard('Card commento');
    const ta = await detail.findByRole('textbox', { name: 'Scrivi un commento' }, {}, { timeout: 4000 });

    fireEvent.input(ta, { target: { value: 'Ottima lezione' } });
    fireEvent.click(detail.getByRole('button', { name: 'Invia' }));

    await waitFor(() => {
      const cm = db._get('cards', 'c1').commenti;
      expect(cm.length).toBe(1);
      expect(cm[0].testo).toBe('Ottima lezione');
      expect(cm[0].autore).toBe('Prof');
    });
  });

  it('il prof rimuove la scadenza dalla card aperta', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Card scadenza', scadenza: '2026-12-31T23:59' }) },
    };
    const { db } = await renderApp({ seed, user: PROF });

    const detail = await openCard('Card scadenza');
    // Il countdown è '⏰ <tempo>' — regex esclude il bottone '⏰ Timer'
    await detail.findByText(/⏰\s+\d/, {}, { timeout: 4000 });

    fireEvent.click(detail.getByRole('button', { name: 'Rimuovi scadenza' }));
    await waitFor(() => expect(db._get('cards', 'c1').scadenza).toBeFalsy());
  });

  it('card nascosta: badge NASCOSTA e allegati visibili al prof', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card nascosta',
          visibile: false,
          allegati: [{ url: 'https://x.it/dispensa', nome: 'dispensa.pdf' }],
        }),
      },
    };
    await renderApp({ seed, user: PROF });

    const detail = await openCard('Card nascosta');
    expect(await detail.findByText('NASCOSTA', {}, { timeout: 4000 })).toBeTruthy();
    expect(detail.getByText('📄 dispensa.pdf')).toBeTruthy();
  });

  it('allegato HTML: anteprima in iframe SABBIATO (contenimento) + download, non un link alla data URL', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card con html',
          allegati: [
            {
              id: 'a1',
              name: 'lezione.html',
              type: 'text/html',
              size: 120,
              url: 'data:text/html;base64,' + btoa('<h1 id="titolo">Ripasso</h1><script>1</script>'),
            },
            { id: 'a2', name: 'dispensa.pdf', type: 'application/pdf', size: 2048, url: 'data:application/pdf;base64,JVBER' },
          ],
        }),
      },
    };
    await renderApp({ seed, user: PROF });

    const detail = await openCard('Card con html');
    // Il PDF resta il link normale (nuova scheda); l'HTML NO: la sua riga è un
    // bottone di anteprima, perché un <a href="data:text/html..."> non aprirebbe.
    const pdf = detail.getByText('📄 dispensa.pdf').closest('a');
    expect(pdf.getAttribute('href')).toBe('data:application/pdf;base64,JVBER');
    expect(pdf.getAttribute('target')).toBe('_blank');

    fireEvent.click(await detail.findByRole('button', { name: '🌐 lezione.html' }, {}, { timeout: 4000 }));
    const frame = await waitFor(() => {
      const f = document.querySelector('[data-testid="anteprima-html"] iframe');
      if (!f) throw new Error('anteprima non aperta');
      return f;
    });
    // allow-scripts serve perché i file allegati sono app web (mostrano il contenuto
    // solo via JS). L'invariante che tiene fermo lo stored XSS NON è "niente script":
    // è che il file non abbia la nostra origine.
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-top-navigation');
    expect(frame.getAttribute('srcdoc')).toContain('Ripasso');
    expect(frame.getAttribute('src')).toBeNull();

    // Scarica: attributo download sul nome originale (l'unico modo per portarlo fuori)
    const scarica = document.querySelector('[data-testid="anteprima-html"] a');
    expect(scarica.getAttribute('download')).toBe('lezione.html');

    fireEvent.click(screen.getByRole('button', { name: 'Chiudi anteprima' }));
    await waitFor(() => expect(document.querySelector('[data-testid="anteprima-html"]')).toBeNull());
  });

  it('allegato con url javascript: (campo falsificabile a mano) → riga INERTE, non un link', async () => {
    // Le Firestore Rules non validano `allegati` (e prima del divieto lo studente
    // poteva scriverlo a mano in una proposta): un url del genere può arrivare
    // dal database, e chi apre la proposta per approvarla è il DOCENTE, con la sua
    // sessione Firebase in memoria. Senza allowlist, href={al.url} eseguirebbe codice.
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card con url malevolo',
          allegati: [
            { id: 'x1', nome: 'dispensa.pdf', type: 'application/pdf', url: 'javascript:fetch("//rubare")' },
            { id: 'x2', nome: 'nota.txt', type: 'text/plain', url: 'https://x.it/ok.txt' },
          ],
        }),
      },
    };
    await renderApp({ seed, user: PROF });

    const detail = await openCard('Card con url malevolo');
    // La riga pericolosa esiste ma non è cliccabile: nessun <a href="javascript:…">
    // e nessun pulsante che la apra.
    const malevola = await detail.findByTestId('allegato-non-cliccabile');
    expect(malevola.tagName).toBe('DIV');
    expect(malevola.getAttribute('href')).toBeNull();
    expect(malevola.textContent).toContain('dispensa.pdf');
    // Nel pannello non compare NESSUN link con protocollo eseguibile.
    detail.queryAllByRole('link').forEach((a) => {
      expect(String(a.getAttribute('href') || '').toLowerCase().startsWith('javascript:')).toBe(false);
    });
    expect(document.querySelectorAll('[data-testid="riga-allegato-html"]').length).toBe(0);

    // Il file legittimo invece resta il link normale.
    const buono = detail.getByText(/nota.txt/).closest('a');
    expect(buono.getAttribute('href')).toBe('https://x.it/ok.txt');
    expect(buono.getAttribute('target')).toBe('_blank');
  });

  it('lo studente non vede il pannello allegati nel compositore della proposta', async () => {
    // Con il gate mancante lo studente caricherebbe file che le Firestore Rules
    // rifiutano solo al salvataggio, perdendo anche il testo della proposta.
    // (Il gate è verificato in Modals.test.tsx: qui il compositore dello studente
    // chiede prima la classe, quindi il pannello non arriverebbe nemmeno al DOM.)
    const seed = { users: { stud1: STUD_DOC }, cards: {} };
    await renderApp({ seed, user: STUD });

    fireEvent.click(await screen.findByTitle('Proponi card', {}, { timeout: 4000 }));
    await waitFor(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
      expect(inputs.every((i) => i.accept.indexOf('.pdf') < 0)).toBe(true);
    });
  });

  it('il docente vede il pannello allegati con accept derivata dalla lista reale', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: {} };
    await renderApp({ seed, user: PROF });

    fireEvent.click(await screen.findByTitle('Nuova card', {}, { timeout: 4000 }));
    await screen.findByText('📎 ALLEGATI', {}, { timeout: 4000 });

    const input = Array.from(document.querySelectorAll('input[type="file"]')).find((i) => i.accept.indexOf('.pdf') >= 0);
    expect(input).toBeTruthy();
    // Le immagini sono accettate dal validatore: devono comparire anche qui.
    ['.html', '.htm', '.png', '.jpg', '.webp', '.pdf'].forEach((e) => expect(input.accept).toContain(e));
    // Lo SVG no: mai nel picker, mai accettato.
    expect(input.accept).not.toContain('.svg');
  });

  it('quiz generato dall IA: lo studente vede il badge "Supporto IA"', async () => {
    // Regola di trasparenza (AGENTS.md 3): il quiz è contenuto IA, quindi chi lo
    // sostiene deve poterlo vedere. Prima non c'era nessun badge sui quiz.
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Quiz IA',
          quizDomande: [
            { tipo: 'multipla', testo: 'Domanda IA', opzioni: ['a', 'b'], corretta: '0', ai: true },
            { tipo: 'multipla', testo: 'Domanda mia', opzioni: ['a', 'b'], corretta: '0' },
          ],
        }),
      },
    };
    await renderApp({ seed, user: STUD });
    fireEvent.click(await screen.findByText('Quiz IA', {}, { timeout: 4000 }));
    expect(await screen.findByText('Supporto IA – revisionato dal docente', {}, { timeout: 4000 })).toBeTruthy();
  });

  it('quiz scritto a mano: NESSUN badge (dichiarare IA sarebbe falso)', async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Quiz manuale',
          quizDomande: [{ tipo: 'multipla', testo: 'Domanda', opzioni: ['a', 'b'], corretta: '0' }],
        }),
      },
    };
    await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Quiz manuale', {}, { timeout: 4000 }));
    await screen.findByText(/QUIZ · 1 domande/, {}, { timeout: 4000 });
    expect(screen.queryByText('Supporto IA – revisionato dal docente')).toBeNull();
  });

  it('lo studente vota nel sondaggio dalla card aperta', async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Sondaggio',
          tipo: 'sondaggio',
          opzioni: [
            { id: 'o1', testo: 'Sì', voti: [] },
            { id: 'o2', testo: 'No', voti: [] },
          ],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: STUD });

    const detail = await openCard('Sondaggio');
    fireEvent.click(await detail.findByRole('button', { name: 'Vota Sì' }, {}, { timeout: 4000 }));

    await waitFor(() => {
      const opz = db._get('cards', 'c1').opzioni;
      expect(opz[0].voti).toContain('Luca Bianchi');
    });
  });

  it('lo studente mette like; se la card è sua vede ✏️ Modifica (isOwner)', async () => {
    const seed = {
      users: { stud1: STUD_DOC },
      cards: { c1: mkCard('c1', { titolo: 'Card studente', autore: 'Luca Bianchi' }) },
    };
    const { db } = await renderApp({ seed, user: STUD });

    const detail = await openCard('Card studente');
    fireEvent.click(await detail.findByRole('button', { name: /👍/ }, {}, { timeout: 4000 }));

    await waitFor(() => expect(db._get('cards', 'c1').likes).toBe(1));
    // isOwner: autore === myName(user) ('Luca Bianchi') e !isProf
    expect(detail.getAllByRole('button', { name: '✏️ Modifica' }).length).toBeGreaterThan(0);
  });

  it('regression: drag/click che parte DENTRO la card e finisce sul backdrop NON chiude il dettaglio', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card backdrop' }) } };
    await renderApp({ seed, user: PROF });

    await openCard('Card backdrop');
    const inner = document.querySelector('.modal-inner') as HTMLElement;
    const backdrop = inner.parentElement as HTMLElement;

    // pointerdown DENTRO la modale (es. selezione testo mentre si scrive) +
    // click che si risolve sul backdrop (antenato comune) → NON deve chiudere
    fireEvent.pointerDown(inner);
    fireEvent.click(backdrop);
    expect(document.querySelector('.modal-inner')).toBeTruthy();

    // click pulito sul backdrop (pointerdown + click) → chiude
    fireEvent.pointerDown(backdrop);
    fireEvent.click(backdrop);
    await waitFor(() => expect(document.querySelector('.modal-inner')).toBeNull());
  });

  it('chiude la card al click sulla X (overlay smontato)', async () => {
    const seed = { users: { prof1: PROF_DOC }, cards: { c1: mkCard('c1', { titolo: 'Card da chiudere' }) } };
    await renderApp({ seed, user: PROF });

    const detail = await openCard('Card da chiudere');
    fireEvent.click(detail.getByRole('button', { name: 'Chiudi card' }));

    await waitFor(() => expect(document.querySelector('.modal-inner')).toBeNull());
  });

  // Fix C1: il riassunto AI dei commenti era ricalcolato a OGNI click (e dopo
  // ogni reload), anche senza commenti nuovi. Ora viene PERSISTITO in
  // ai_results/{id}.sommario e riusato: la seconda apertura NON chiama l'AI.
  it('Riassumi: la prima volta chiama l AI e salva; la seconda NON la richiama', async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      clone: () => ({ json: async () => ({}) }),
      json: async () => ({ success: true, data: { content: 'riassunto persistito' } }),
    });
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card discussione',
          commenti: [
            { id: 'cm1', autore: 'Luca', testo: 'primo' },
            { id: 'cm2', autore: 'Anna', testo: 'secondo' },
          ],
        }),
      },
    };
    const { db } = await renderApp({ seed, user: PROF });
    const detail = await openCard('Card discussione');

    // 1) Primo click: chiama l'AI e PERSISTE il sommario con nCommenti
    fireEvent.click(await detail.findByRole('button', { name: '📝 Riassumi' }, {}, { timeout: 4000 }));
    expect(await screen.findByText(/riassunto persistito/, {}, { timeout: 6000 })).toBeTruthy();
    await waitFor(() => {
      const saved = db._get('ai_results', 'c1');
      expect(saved && saved.sommario).toBeTruthy();
      expect(saved.sommario.testo).toBe('riassunto persistito');
      expect(saved.sommario.nCommenti).toBe(2);
    });
    const callsDopoPrima = window.fetch.mock.calls.length;

    // 2) Chiudi la modale e riapri: risultato dalla cache, NESSUNA nuova chiamata AI
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    await waitFor(() => expect(screen.queryByText(/Riassunto discussione/)).toBeNull());
    fireEvent.click(detail.getByRole('button', { name: '📝 Riassumi' }));
    expect(await screen.findByText(/riassunto persistito/, {}, { timeout: 4000 })).toBeTruthy();
    expect(window.fetch).toHaveBeenCalledTimes(callsDopoPrima);
  });
});
