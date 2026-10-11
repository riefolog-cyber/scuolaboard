// allegato-schermo-intero-casi.js — i CASI condivisi dai due motori.
//
// Perché un modulo e non due file uguali: i due progetti Playwright girano
// file diversi (`*webkit.spec.js` solo su webkit, gli altri solo su chromium),
// quindi per provare l'overlay su entrambi i motori servono due file. Copiarli
// è l'inizio della divergenza, che in questo repository ha già prodotto due
// bug reali (la visibilità per classe calcolata in cinque copie, e la coda
// d'annuncio scritta a mano in tre punti invece che in uno).
//
// I casi sono qui dentro e i due file sono tre righe di richiamo, quindi il
// comportamento verificato è lo stesso sui due motori: se un domani si
// aggiunge un caso, vale per entrambi, e non si può dimenticare Safari.

const PAGINA =
  '<!doctype html><html><head><meta charset="utf-8"><title>doc</title></head>' +
  '<body style="margin:0"><h1 id="titolo">Ripasso</h1></body></html>';

const HARNESS = '/scuolaboard/e2e/harness.html';

/**
 * Definisce i casi dell'allegato a schermo intero.
 * Va chiamata dentro un `test.describe`, che ogni motore etichetta col suo.
 */
export function casiAllegatoSchermoIntero(test, expect) {
  async function apriAnteprima(page) {
    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });
    await page.evaluate(
      ([url, size]) => {
        window.__db._seed('cards', {
          c1: Object.assign({}, window.__db._get('cards', 'c1'), {
            allegati: [{ id: 'a1', name: 'lezione.html', type: 'text/html', size: size, url: url }],
          }),
        });
      },
      ['data:text/html;base64,' + Buffer.from(PAGINA, 'utf8').toString('base64'), PAGINA.length]
    );
    await page.locator('#card-c1').getByText('Lezione su X').first().click();
    await page.getByRole('button', { name: '🌐 lezione.html' }).click();
    await expect(page.locator('[data-testid="anteprima-html"]')).toBeVisible({ timeout: 10000 });
  }

  // ── Il difetto: l'overlay restava largo come la modale della card ─────────
  //
  // `position: fixed` è relativo alla finestra SOLO se nessun antenato ha un
  // `transform`, e `.modal-inner` ne ha uno (la sua `animation: slideup`):
  // `inset: 0` misurava la modale (560px), non lo schermo. Su PC si vedeva un
  // riquadro stretto, "come se fossi sul cellulare". Risolto con un portal su
  // document.body.
  //
  // Questo caso MISURA e non può stare in un test unitario: jsdom non calcola
  // layout né trasformazioni, quindi lì passerebbe anche con l'overlay stretto.
  test('l\'overlay è largo quanto la finestra, non quanto la modale', async ({ page }) => {
    await apriAnteprima(page);
    await page.getByRole('button', { name: 'Apri a schermo intero' }).click();

    const m = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="anteprima-html"]');
      const r = el.getBoundingClientRect();
      return {
        overlay: Math.round(r.width),
        finestra: window.innerWidth,
        altezza: Math.round(r.height),
        altezzaFinestra: window.innerHeight,
        dentroModale: !!el.closest('.modal-inner'),
        padre: el.parentElement ? el.parentElement.tagName : null,
      };
    });

    expect(m.dentroModale, 'l\'overlay è ancora dentro .modal-inner').toBe(false);
    expect(m.padre).toBe('BODY');
    expect(m.overlay).toBeGreaterThanOrEqual(m.finestra - 2);
    expect(m.altezza).toBeGreaterThanOrEqual(m.altezzaFinestra - 2);
  });

  // ── ESC non esce di colpo ────────────────────────────────────────────────
  //
  // Due difetti in fila, per due motivi diversi:
  //  1. col fullscreen del browser ESC esce sempre (è il tasto che il browser
  //     si riserva): da qui l'overlay nostro al posto di `requestFullscreen`,
  //     che su iPhone peraltro non esiste;
  //  2. anche con l'overlay, `AppProvider` ha un gestore ESC globale che
  //     chiude la card, registrato prima del nostro e quindi in bubbling
  //     chiudeva tutto senza mostrare la conferma: l'overlay intercetta in
  //     FASE DI CATTURA.
  //
  // Nota: su un telefono non c'è il tasto Esc. Qui lo si simula per provare la
  // regola; sul telefono l'uscita è il pulsante, che passa dalla stessa
  // conferma.
  test('ESC non esce di colpo: chiede conferma, e «Resta nel quiz» torna indietro', async ({ page }) => {
    await apriAnteprima(page);
    await page.getByRole('button', { name: 'Apri a schermo intero' }).click();

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="anteprima-conferma-uscita"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="anteprima-html"]')).toBeVisible();

    await page.getByRole('button', { name: 'Resta nel quiz' }).click();
    await expect(page.locator('[data-testid="anteprima-conferma-uscita"]')).toBeHidden();
    await expect(page.locator('[data-testid="anteprima-html"]')).toBeVisible();
  });

  // Se il file è rotto e non consegna mai, lo studente non deve restare
  // intrappolato: una gabbia non è un quiz. Per questo esiste «Esci comunque».
  test('la conferma ha sempre una via d\'uscita (non è una gabbia)', async ({ page }) => {
    await apriAnteprima(page);
    await page.getByRole('button', { name: 'Apri a schermo intero' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Esci comunque' }).click();
    await expect(page.locator('[data-testid="anteprima-conferma-uscita"]')).toBeHidden();
  });

  // L'overlay è una questione di STILE: non può aggiungere permessi all'iframe,
  // altrimenti il file avrebbe la nostra origine (stored XSS).
  test('la sandbox non si allarga con l\'overlay', async ({ page }) => {
    await apriAnteprima(page);
    await page.getByRole('button', { name: 'Apri a schermo intero' }).click();
    const sandbox = await page.locator('[data-testid="anteprima-html"] iframe').getAttribute('sandbox');
    expect(sandbox).toBe('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });
}