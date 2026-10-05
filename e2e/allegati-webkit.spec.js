// e2e/allegati-webkit.spec.js — l'allegato HTML su WebKit (il motore di Safari).
//
// DIFETTO SEGNALATO su iPhone: la preview si apriva ma restava VUOTA. Non era un
// problema di iPhone né di Safari — era che noi bloccavamo gli script (sandbox a zero
// permessi) e i file che si allegnano sono APP WEB, non pagine statiche. Questo file
// gira sul progetto Playwright 'webkit' (vedi playwright.config.js) ed è la guardia
// perché quel difetto restava invisibile: la CI eseguiva solo Chromium, e su Chromium
// il caso passava senza che nessuno si accorgesse che su Safari la preview sarebbe
// stata diversa.
//
// Locale serve `npx playwright install webkit`; la CI installa chromium + webkit.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const HARNESS = '/scuolaboard/e2e/harness.html';

// HTML con uno script che, SE ESEGUITO, cambia il titolo del documento e marca il
// <body>: distingue "mostrato" da "eseguito" su QUALSIASI motore.
const PAGINA_HTML =
  '<!doctype html><html><head><meta charset="utf-8"><title>doc</title></head><body>' +
  '<h1 id="titolo" style="color:#c00">Ripasso</h1>' +
  '<script>document.title="ESEGUITO";document.body.setAttribute("xss","1");</script></body></html>';

// Il motore è impostato dal progetto Playwright 'webkit' (vedi playwright.config.js):
// questo file non deve dichiararlo, altrimenti si scontra con il canale ereditato.
test.describe('Allegato HTML — WebKit (motore di Safari)', () => {
  async function apriCardConHtml(page) {
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
      ['data:text/html;base64,' + Buffer.from(PAGINA_HTML, 'utf8').toString('base64'), PAGINA_HTML.length]
    );
    await page.locator('#card-c1').getByText('Lezione su X').first().click();
    await page.getByRole('button', { name: '🌐 lezione.html' }).click();
    await expect(page.locator('[data-testid="anteprima-html"]')).toBeVisible({ timeout: 10000 });
  }

  test('la preview mostra il contenuto del file', async ({ page }) => {
    await apriCardConHtml(page);
    // Il contenuto deve essere VEDUTO: si attende `#titolo` DENTRO l'iframe, perché
    // è l'elemento dentro l'iframe a dimostrare il difetto.
    const dentro = page.frameLocator('[data-testid="anteprima-html"] iframe');
    await expect(dentro.locator('#titolo')).toHaveText('Ripasso', { timeout: 10000 });
  });

  // L'allegato vero in classe è spesso un file grosso, e srcDoc mette TUTTO l'HTML
  // in un attributo del DOM. Verificato anche a 300KB: si vede, su WebKit come su
  // Chrome. Resta qui come guardia, perché è il caso in cui un limite di parsing
  // si manifesterebbe (e tornerebbe bianco solo da una parte).
  // File che si costruisce con JavaScript: è la forma tipica di un allegato (un
  // quiz, una scheda interattiva) ed è il caso segnalato dall'utente — la preview si
  // apriva VUOTA perché la sandbox non permetteva gli script. Nessun dato personale
  // qui dentro: il file reale non viene committato (contiene nomi di persone vere).
  const PAGINA_JS =
    '<!doctype html><html><head><meta charset="utf-8"><title>doc</title></head><body>' +
    '<div id="solo-js" style="display:none">Mostrato dal file stesso</div>' +
    '<script>document.getElementById("solo-js").style.display="block";document.title="ESEGUITO";</script>' +
    '</body></html>';

  test('la preview mostra i file che si costruiscono con JavaScript (il caso iPhone)', async ({ page }) => {
    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });
    await page.evaluate(
      ([url, size]) => {
        window.__db._seed('cards', {
          c1: Object.assign({}, window.__db._get('cards', 'c1'), {
            allegati: [{ id: 'a1', name: 'quiz.html', type: 'text/html', size: size, url: url }],
          }),
        });
      },
      ['data:text/html;base64,' + Buffer.from(PAGINA_JS, 'utf8').toString('base64'), PAGINA_JS.length]
    );
    await page.locator('#card-c1').getByText('Lezione su X').first().click();
    await page.getByRole('button', { name: '🌐 quiz.html' }).click();

    const dentro = page.frameLocator('[data-testid="anteprima-html"] iframe');
    await expect(dentro.locator('#solo-js')).toBeVisible({ timeout: 10000 });
    expect(await dentro.locator('body').evaluate((b) => b.ownerDocument.title)).toBe('ESEGUITO');

    // E soprattutto: contenuto sì, ma senza accesso all'app. È l'invariante che
    // rende sicuro allow-scripts (senza allow-same-origin l'origine è opaca).
    const contenimento = await dentro.locator('body').evaluate(() => {
      const esito = { documento: 'BLOCCATO', storage: 'BLOCCATO', app: 'BLOCCATO' };
      try {
        esito.documento = 'LEGGERE:' + window.parent.document.title;
      } catch (e) {}
      try {
        window.localStorage.setItem('sb-prova', '1');
        esito.storage = window.localStorage.getItem('sb-prova') === '1' ? 'ACCESSO' : 'BLOCCATO';
      } catch (e) {}
      try {
        if (window.parent.SB || window.parent.db) esito.app = 'VEDE_APP';
      } catch (e) {}
      return esito;
    });
    expect(contenimento.documento, 'il file ha letto il DOM dell app').toBe('BLOCCATO');
    expect(contenimento.storage, 'il file ha scritto nel localStorage dell app').toBe('BLOCCATO');
    expect(contenimento.app, 'il file ha raggiunto SB/db della pagina').toBe('BLOCCATO');
  });

  test('lo script NON può uscire dalla sandbox: niente allow-same-origin', async ({ page }) => {
    await apriCardConHtml(page);
    const sandbox = await page.locator('[data-testid="anteprima-html"] iframe').getAttribute('sandbox');
    expect(sandbox).toBe('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
    expect(sandbox).not.toContain('allow-top-navigation');
    expect(sandbox).not.toContain('allow-popups');
  });

  // Risposta alla domanda che fanno gli studenti: "sul telefono posso svolgere il
  // quiz o solo leggerlo?". Dentro la sandbox i click arrivano e il file reagisce:
  // si risponde, si va avanti, si vedono le spiegazioni. Il sandbox blocca l'ORIGINE,
  // non l'interazione. Qui non c'è il file reale (contiene dati di persone vere) ma la
  // stessa forma: il contenuto e il click sono fatti da uno script.
  test('nel quiz si può rispondere: il click sul file funziona (non è solo lettura)', async ({ page }) => {
    const quiz =
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>quiz</title></head><body>' +
      '<div class="q" style="display:none">Domanda 1</div>' +
      '<div id="fb" style="display:none;margin-top:8px">Feedback: corretto!</div>' +
      '<button id="optA" class="opt">A</button>' +
      '<script>document.querySelector(".q").style.display="block";' +
      'document.getElementById("optA").addEventListener("click",()=>{document.getElementById("fb").style.display="block"});</script>' +
      '</body></html>';
    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });
    await page.evaluate(
      ([url, size]) => {
        window.__db._seed('cards', {
          c1: Object.assign({}, window.__db._get('cards', 'c1'), {
            allegati: [{ id: 'a1', name: 'quiz.html', type: 'text/html', size: size, url: url }],
          }),
        });
      },
      ['data:text/html;base64,' + Buffer.from(quiz, 'utf8').toString('base64'), quiz.length]
    );
    await page.locator('#card-c1').getByText('Lezione su X').first().click();
    await page.getByRole('button', { name: '🌐 quiz.html' }).click();

    const dentro = page.frameLocator('[data-testid="anteprima-html"] iframe');
    await dentro.locator('#optA').click({ timeout: 10000 });
    await expect(dentro.locator('#fb')).toBeVisible();
  });

  test('la preview mostra anche un file grosso (300KB)', async ({ page }) => {
    const grosso = PAGINA_HTML.replace('</body>', '<p>' + 'x'.repeat(300 * 1024) + '</p></body>');
    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });
    await page.evaluate(
      ([url, size]) => {
        window.__db._seed('cards', {
          c1: Object.assign({}, window.__db._get('cards', 'c1'), {
            allegati: [{ id: 'a1', name: 'grande.html', type: 'text/html', size: size, url: url }],
          }),
        });
      },
      ['data:text/html;base64,' + Buffer.from(grosso, 'utf8').toString('base64'), grosso.length]
    );
    await page.locator('#card-c1').getByText('Lezione su X').first().click();
    await page.getByRole('button', { name: '🌐 grande.html' }).click();
    const dentro = page.frameLocator('[data-testid="anteprima-html"] iframe');
    await expect(dentro.locator('#titolo')).toHaveText('Ripasso', { timeout: 10000 });
  });

  test('lo script del file NON può scrivere fuori dalla preview (il DOM resta intatto)', async ({ page }) => {
    await apriCardConHtml(page);
    const dentro = page.frameLocator('[data-testid="anteprima-html"] iframe');
    await dentro.locator('#titolo').waitFor({ state: 'attached', timeout: 10000 });
    // La pagina principale non deve avere cambiato nulla: niente navigazione, niente
    // DOM alterato, niente top-level redirect.
    expect(page.url()).toContain('harness.html');
    expect(await page.evaluate(() => !!document.querySelector('[data-testid="anteprima-html"] iframe'))).toBe(true);
  });

  test('il download salva davvero il file col nome giusto', async ({ page }) => {
    await apriCardConHtml(page);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.getByRole('link', { name: 'Scarica lezione.html' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('lezione.html');
    const percorso = await download.path();
    expect(percorso, 'nessun file scaricato').toBeTruthy();
    expect(readFileSync(percorso, 'utf8')).toContain('Ripasso');
  });
});