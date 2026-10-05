// @ts-nocheck — test di INTEGRAZIONE: upload immagini nella NuovaCardModal
// (compressImage mockata + fake db: la card salvata contiene le immagini).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from './harness';
import { PROF, PROF_DOC, mkCard, setupTestEnv, teardownTestEnv } from './fixtures';

beforeEach(setupTestEnv);
afterEach(teardownTestEnv);

describe('Upload immagini (prof)', () => {
  it('carica un immagine nella card: compressImage chiamata e url salvato', async () => {
    // AppProvider legge window.compressImage a CALL-TIME → possiamo mockarla
    // dopo il boot (il boot reale la sovrascrive con quella vera di app-utils).
    const compressMock = vi.fn().mockResolvedValue('data:image/png;base64,FAKEIMG');
    const { db } = await renderApp({ seed: { users: { prof1: PROF_DOC }, cards: {} }, user: PROF });
    window.compressImage = compressMock;

    fireEvent.click(await screen.findByTitle('Nuova card', {}, { timeout: 4000 }));
    fireEvent.input(screen.getByPlaceholderText('Es. Riflessione su…'), {
      target: { value: 'Card con foto' },
    });

    // Input file della galleria immagini: accept image/* + multiple (è il
    // secondo input file della modale: [copertina, gallery, allegati]).
    const inputs = document.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    const galleryInput = Array.from(inputs).find((i) => i.accept.indexOf('image/*') >= 0 && i.multiple);
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    fireEvent.change(galleryInput, { target: { files: [file] } });

    // compressImage è stata chiamata con il file
    await waitFor(() => {
      expect(compressMock).toHaveBeenCalledTimes(1);
    });

    // La card viene creata e contiene l'immagine con l'url restituito dal mock
    fireEvent.click(screen.getByText('✅ Crea card'));
    await waitFor(() => {
      const found = db._all('cards').find(([, c]) => c.titolo === 'Card con foto');
      expect(found).toBeTruthy();
      expect(found[1].immagini.length).toBe(1);
      expect(found[1].immagini[0].url).toBe('data:image/png;base64,FAKEIMG');
    });
  });

  it('rifiuta i file non-immagine senza chiamare compressImage', async () => {
    const compressMock = vi.fn().mockResolvedValue('data:image/png;base64,FAKEIMG');
    const { db } = await renderApp({ seed: { users: { prof1: PROF_DOC }, cards: {} }, user: PROF });
    window.compressImage = compressMock;

    fireEvent.click(await screen.findByTitle('Nuova card', {}, { timeout: 4000 }));
    fireEvent.input(screen.getByPlaceholderText('Es. Riflessione su…'), {
      target: { value: 'Card senza foto' },
    });

    const inputs = document.querySelectorAll('input[type="file"]');
    const galleryInput = Array.from(inputs).find((i) => i.accept.indexOf('image/*') >= 0 && i.multiple);
    const file = new File(['x'], 'nota.txt', { type: 'text/plain' });
    fireEvent.change(galleryInput, { target: { files: [file] } });

    // Nessuna chiamata a compressImage, nessuna immagine salvata
    await new Promise((r) => setTimeout(r, 50));
    expect(compressMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('✅ Crea card'));
    await waitFor(() => {
      const found = db._all('cards').find(([, c]) => c.titolo === 'Card senza foto');
      expect(found).toBeTruthy();
      expect(found[1].immagini).toEqual([]);
    });
  });

  it('rifiuta le immagini oltre il limite sorgente (12MB) senza chiamare compressImage', async () => {
    const compressMock = vi.fn().mockResolvedValue('data:image/png;base64,FAKEIMG');
    const { db } = await renderApp({ seed: { users: { prof1: PROF_DOC }, cards: {} }, user: PROF });
    window.compressImage = compressMock;

    fireEvent.click(await screen.findByTitle('Nuova card', {}, { timeout: 4000 }));
    fireEvent.input(screen.getByPlaceholderText('Es. Riflessione su…'), {
      target: { value: 'Card foto enorme' },
    });

    const inputs = document.querySelectorAll('input[type="file"]');
    const galleryInput = Array.from(inputs).find((i) => i.accept.indexOf('image/*') >= 0 && i.multiple);
    // 13 MiB > limite sorgente IMG_MAX_BYTES (12 MiB)
    const big = new File([new ArrayBuffer(13 * 1024 * 1024)], 'foto.png', { type: 'image/png' });
    fireEvent.change(galleryInput, { target: { files: [big] } });

    // Nessuna chiamata a compressImage, nessuna immagine salvata
    await new Promise((r) => setTimeout(r, 50));
    expect(compressMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('✅ Crea card'));
    await waitFor(() => {
      const found = db._all('cards').find(([, c]) => c.titolo === 'Card foto enorme');
      expect(found).toBeTruthy();
      expect(found[1].immagini).toEqual([]);
    });
  });

  // Regressione: in CardDetail la galleria usava `src={img}` con img = oggetto
  // {id,url,didascalia} → renderizzava "[object Object]" e l'immagine (con la
  // sua didascalia) non si vedeva quando la card aveva anche una copertina.
  it("mostra la seconda immagine con didascalia nel dettaglio quando c'è già una copertina", async () => {
    const seed = {
      users: { prof1: PROF_DOC },
      cards: {
        c1: mkCard('c1', {
          titolo: 'Card con copertina e galleria',
          copertina: 'data:image/png;base64,COPERTINA',
          immagini: [{ id: 'img1', url: 'data:image/png;base64,IMMAGINE2', didascalia: 'Seconda immagine' }],
        }),
      },
    };
    await renderApp({ seed, user: PROF });
    fireEvent.click(await screen.findByText('Card con copertina e galleria', {}, { timeout: 4000 }));

    // La didascalia della galleria è visibile sotto la miniatura
    expect(await screen.findByText('Seconda immagine', {}, { timeout: 4000 })).toBeTruthy();

    // L'immagine galleria usa img.url (non l'oggetto intero)
    const galleryImg = screen.getAllByRole('img').find((i) => i.getAttribute('alt') === 'Seconda immagine');
    expect(galleryImg).toBeTruthy();
    expect(galleryImg.getAttribute('src')).toBe('data:image/png;base64,IMMAGINE2');
  });
});

// L'import da JSON/HTML porta le domande fino alla CARD SALVATA, non solo nel form:
// e' l'unico modo per accorgersi che una domanda importata venga pero' scartata da
// buildQuizDomande al momento del salvataggio (il lavoro del docente perso in silenzio).
describe('Import quiz da file (docente)', () => {
  function scegliTipoQuiz() {
    // Il tipo di card è un BOTTONE (🧩 quiz), non un select: sceglierlo monta il
    // QuizBuilder, con i bottoni "Genera con AI" e "Importa da JSON/HTML".
    fireEvent.click(screen.getByRole('button', { name: /quiz/i }));
  }

  function scriviTitolo(t: string) {
    fireEvent.input(screen.getByPlaceholderText('Es. Riflessione su…'), { target: { value: t } });
  }

  function carica(nome: string, contenuto: string, tipo: string) {
    const file = new File([contenuto], nome, { type: tipo });
    fireEvent.change(screen.getByLabelText('Importa quiz da file JSON o HTML'), { target: { files: [file] } });
  }

  it('importa un .json con 2 domande e le salva nella card con le risposte corrette', async () => {
    const { db } = await renderApp({ seed: { users: { prof1: PROF_DOC }, cards: {} }, user: PROF });
    fireEvent.click(await screen.findByTitle('Nuova card', {}, { timeout: 4000 }));
    scriviTitolo('Quiz importato');
    scegliTipoQuiz();

    carica(
      'quiz.json',
      JSON.stringify({
        domande: [
          { question: 'Domanda uno?', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] },
          { question: 'Domanda due?', options: [{ text: 'C', isCorrect: false }, { text: 'D', isCorrect: true }] },
        ],
      }),
      'application/json'
    );

    await waitFor(() => expect(screen.getByText(/domande importate/)).toBeTruthy(), { timeout: 5000 });
    // Le domande sono visibili nel pannello di editing.
    expect(screen.getByDisplayValue('Domanda uno?')).toBeTruthy();
    expect(screen.getByDisplayValue('Domanda due?')).toBeTruthy();

    fireEvent.click(screen.getByText('✅ Crea card'));
    await waitFor(() => {
      const found = db._all('cards').find(([, c]) => c.titolo === 'Quiz importato');
      expect(found).toBeTruthy();
      expect(found[1].quizDomande).toHaveLength(2);
      // corretta e' l'INDICE come stringa: e' il formato che QuizBuilder e useQuiz usano.
      expect(found[1].quizDomande.map((d) => d.corretta)).toEqual(['0', '1']);
      expect(found[1].quizDomande[0].opzioni).toEqual(['A', 'B']);
      // Importato != generato dall'IA: nessun badge, nessun flag.
      expect(found[1].quizDomande[0].ai).toBeUndefined();
    });
  });

  it('un file non valido spiega il motivo e NON aggiunge domande', async () => {
    const { db } = await renderApp({ seed: { users: { prof1: PROF_DOC }, cards: {} }, user: PROF });
    fireEvent.click(await screen.findByTitle('Nuova card', {}, { timeout: 4000 }));
    scriviTitolo('Quiz rotto');
    scegliTipoQuiz();

    carica('rotto.json', '{ non e json', 'application/json');

    await waitFor(() => expect(screen.getByText(/JSON non valido/)).toBeTruthy(), { timeout: 5000 });
    expect(screen.queryByText(/domande importate/)).toBeNull();

    fireEvent.click(screen.getByText('✅ Crea card'));
    await waitFor(() => {
      const found = db._all('cards').find(([, c]) => c.titolo === 'Quiz rotto');
      expect(found).toBeTruthy();
      // Nessuna domanda aggiunta: il file rotto non puo creare un quiz vuoto.
      expect(found[1].quizDomande).toBeUndefined();
    });
  });

  it('importa da un file HTML (quizData dentro lo script) come quello segnalato', async () => {
    const { db } = await renderApp({ seed: { users: { prof1: PROF_DOC }, cards: {} }, user: PROF });
    fireEvent.click(await screen.findByTitle('Nuova card', {}, { timeout: 4000 }));
    scriviTitolo('Da html');
    scegliTipoQuiz();

    carica(
      'quiz.html',
      '<!doctype html><html><body><div class="q" style="display:none">Domanda</div><script>quizData=[' +
        '{"question":"Perche rispondere peggiora le cose?","hint":"un aiuto",' +
        '"options":[{"label":"A","text":"Copia","isCorrect":false},{"label":"B","text":"Ignorare","isCorrect":true}]}' +
        ']</script></body></html>',
      'text/html'
    );

    await waitFor(() => expect(screen.getByText(/domande importate/)).toBeTruthy(), { timeout: 5000 });
    expect(screen.getByText(/lette dal file HTML/)).toBeTruthy();

    fireEvent.click(screen.getByText('✅ Crea card'));
    await waitFor(() => {
      const found = db._all('cards').find(([, c]) => c.titolo === 'Da html');
      expect(found).toBeTruthy();
      expect(found[1].quizDomande).toHaveLength(1);
      expect(found[1].quizDomande[0].opzioni).toEqual(['Copia', 'Ignorare']);
      expect(found[1].quizDomande[0].corretta).toBe('1');
      expect(found[1].quizDomande[0].hint).toBe('un aiuto');
    });
  });
});