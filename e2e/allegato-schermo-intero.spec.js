// e2e/allegato-schermo-intero.spec.js — l'overlay copre TUTTA la finestra.
//
// Difetto segnalato e verificato a mano: su PC il pulsante ⛶ non dava lo
// schermo intero, ma un riquadro largo come la modale della card ("come se
// fossi sul cellulare"). Il motivo è che `position: fixed` è relativo alla
// viewport SOLO se nessun antenato ha un `transform`: `.modal-inner` ha una
// `animation: slideup` che lo muove, e un transform (anche di animazione)
// crea il containing block dei figli. `inset: 0` non bastava.
//
// La correzione è un portal su document.body.
//
// Questo test MISURA, e non può farlo il test unitario: jsdom non calcola
// layout né trasformazioni, quindi un test in jsdom passerebbe anche con
// l'overlay stretto. Qui si confronta la larghezza dell'overlay con la
// larghezza reale della finestra.
import { test, expect } from '@playwright/test';

const HARNESS = '/scuolaboard/e2e/harness.html';

const PAGINA =
  '<!doctype html><html><head><meta charset="utf-8"><title>doc</title></head>' +
  '<body style="margin:0"><h1 id="titolo">Ripasso</h1></body></html>';

// Stessa procedura di allegati-webkit.spec.js: si semina la card con
// l'allegato, si apre la card, si apre l'anteprima.
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

test.describe('Allegato a schermo intero — copre tutta la finestra', () => {
  test('l\'overlay è largo quanto la finestra, non quanto la modale', async ({ page }) => {
    await apriAnteprima(page);
    await page.getByRole('button', { name: 'Apri a schermo intero' }).click();

    const misura = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="anteprima-html"]');
      const r = el.getBoundingClientRect();
      return {
        overlay: Math.round(r.width),
        finestra: window.innerWidth,
        padre: el.parentElement ? el.parentElement.tagName : null,
        dentroModale: !!el.closest('.modal-inner'),
        altezza: Math.round(r.height),
        altezzaFinestra: window.innerHeight,
      };
    });

    // La finestra per intero: non il 560px della modale della card.
    expect(misura.dentroModale, 'l\'overlay è ancora dentro .modal-inner').toBe(false);
    expect(misura.padre).toBe('BODY');
    expect(misura.overlay).toBeGreaterThanOrEqual(misura.finestra - 2);
    expect(misura.altezza).toBeGreaterThanOrEqual(misura.altezzaFinestra - 2);
  });

  test('ESC non esce di colpo: chiede conferma, e «Resta nel quiz» torna indietro', async ({ page }) => {
    await apriAnteprima(page);
    await page.getByRole('button', { name: 'Apri a schermo intero' }).click();

    await page.keyboard.press('Escape');

    // La conferma compare: ESC non ha chiuso l'anteprima.
    await expect(page.locator('[data-testid="anteprima-conferma-uscita"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="anteprima-html"]')).toBeVisible();

    await page.getByRole('button', { name: 'Resta nel quiz' }).click();
    await expect(page.locator('[data-testid="anteprima-conferma-uscita"]')).toBeHidden();
    // L'overlay è ancora aperto: «torna indietro» non deve chiudere niente.
    await expect(page.locator('[data-testid="anteprima-html"]')).toBeVisible();
  });

  test('la conferma ha sempre una via d\'uscita (non è una gabbia)', async ({ page }) => {
    await apriAnteprima(page);
    await page.getByRole('button', { name: 'Apri a schermo intero' }).click();
    await page.keyboard.press('Escape');
    // Se il file non consegna mai, lo studente non deve restare intrappolato.
    await page.getByRole('button', { name: 'Esci comunque' }).click();
    await expect(page.locator('[data-testid="anteprima-conferma-uscita"]')).toBeHidden();
  });

  test('la sandbox non si allarga con l\'overlay', async ({ page }) => {
    await apriAnteprima(page);
    await page.getByRole('button', { name: 'Apri a schermo intero' }).click();
    const sandbox = await page.locator('[data-testid="anteprima-html"] iframe').getAttribute('sandbox');
    expect(sandbox).toBe('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });
});