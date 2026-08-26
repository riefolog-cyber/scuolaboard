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
