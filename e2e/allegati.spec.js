// e2e/allegati.spec.js — l'allegato HTML in Chrome REALE.
//
// I test in jsdom (src/) provano che il codice c'è: attributo `download` presente,
// `sandbox=""` presente. Quello che NON possono provare è se Chrome salva davvero il
// file e se dentro l'iframe lo script del file gira o no — due fatti che sono
// esattamente le due cose che interessano. Qui si verifica nel browser vero.
//
// Usa e2e/harness.html (app VERA, Firebase finto). L'allegato viene iniettato a
// runtime con window.__db._seed(), che notifica i listener: nessuna modifica al seed
// condiviso con le altre spec.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const HARNESS = '/scuolaboard/e2e/harness.html';

// HTML con uno script che, SE ESEGUITO, cambierebbe il titolo del documento
// dentro l'iframe: è il segnale che distingue "mostrato" da "eseguito".
const PAGINA_HTML =
  '<!doctype html><html><head><title>doc</title></head><body><h1 id="titolo">Ripasso</h1>' +
  '<script>document.title="ESEGUITO";document.body.setAttribute("xss","1");</script></body></html>';

function dataUrl(testo) {
  return 'data:text/html;base64,' + Buffer.from(testo, 'utf8').toString('base64');
}

// Apre la card c1 con un allegato HTML e restituisce la pagina pronta.
async function apriCardConHtml(page) {
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 10000 });
  await page.evaluate(
    ([url, size]) => {
      window.__db._seed('cards', {
        c1: Object.assign({}, window.__db._get('cards', 'c1'), {
          allegati: [{ id: 'a1', name: 'lezione.html', type: 'text/html', size: size, url: url }],
        }),
      });
    },
    [dataUrl(PAGINA_HTML), PAGINA_HTML.length]
  );
  await page.locator('#card-c1').getByText('Lezione su X').first().click();
  await expect(page.getByRole('button', { name: '🌐 lezione.html' })).toBeVisible({ timeout: 5000 });
}

test.describe('Allegati (Chrome reale)', () => {
  test('HTML: anteprima renderizzata ma script NON eseguito (sandbox="")', async ({ page }) => {
    await apriCardConHtml(page);
    await page.getByRole('button', { name: '🌐 lezione.html' }).click();

    const frame = page.locator('[data-testid="anteprima-html"] iframe');
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute('sandbox', '');

    // Il contenuto è realmente renderizzato…
    const dentro = page.frameLocator('[data-testid="anteprima-html"] iframe');
    await expect(dentro.locator('#titolo')).toHaveText('Ripasso');

    // …ma lo script NON è stato eseguito: questo è il punto dell'intera faccenda.
    const eseguito = await dentro.locator('body').evaluate((b) => ({
      titolo: b.ownerDocument.title,
      xss: b.getAttribute('xss'),
    }));
    expect(eseguito.titolo, 'lo script del file è stato eseguito dentro la iframe').toBe('doc');
    expect(eseguito.xss, 'lo script del file è stato eseguito dentro la iframe').toBeNull();
  });

  test('HTML: il click su Scarica salva davvero il file con il nome giusto', async ({ page }) => {
    await apriCardConHtml(page);
    await page.getByRole('button', { name: '🌐 lezione.html' }).click();

    // L'evento download è la prova: se l'attributo non funzionasse, il click
    // navigherebbe (e i browser moderni bloccherebbero la navigazione verso data:).
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.getByRole('link', { name: 'Scarica lezione.html' }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('lezione.html');
    const percorso = await download.path();
    expect(percorso, 'nessun file scaricato').toBeTruthy();
    const contenuto = readFileSync(percorso, 'utf8');
    expect(contenuto).toContain('Ripasso');
    // Il file scaricato è INTERO: lo script c'è, semplicemente non viene eseguito
    // quando lo si apre dal disco. È il comportamento atteso, non un difetto.
    expect(contenuto).toContain('<script>');
  });

  test('HTML: la riga è un bottone di anteprima, nessun link che NAVIGA alla data URL', async ({ page }) => {
    await apriCardConHtml(page);
    // L'unico <a> verso la data URL è quello di DOWNLOAD: senza `download` sarebbe
    // una navigazione, che Chrome e Firefox bloccano (aprirebbe una pagina bianca).
    await expect(page.locator('a[href^="data:text/html"]:not([download])')).toHaveCount(0);
    // Il bottone di anteprima c'è, l'ancora di download è etichettata per il download.
    await expect(page.getByRole('button', { name: '🌐 lezione.html' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Scarica lezione.html' })).toHaveAttribute('download', 'lezione.html');
  });

  test('url javascript: (campo falsificabile a mano) resta inerte', async ({ page }) => {
    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => {
      window.__db._seed('cards', {
        c1: Object.assign({}, window.__db._get('cards', 'c1'), {
          allegati: [{ id: 'x1', nome: 'dispensa.pdf', type: 'application/pdf', url: 'javascript:window.__PWNED=1' }],
        }),
      });
    });
    await page.locator('#card-c1').getByText('Lezione su X').first().click();

    const riga = page.locator('[data-testid="allegato-non-cliccabile"]');
    await expect(riga).toBeVisible();
    await expect(riga).toContainText('dispensa.pdf');
    // Nessun link eseguibile, nessun bottone: la riga non si può cliccare.
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
    await riga.click({ force: true });
    expect(await page.evaluate(() => window.__PWNED === 1), 'javascript: eseguito dal click').toBe(false);
  });
});