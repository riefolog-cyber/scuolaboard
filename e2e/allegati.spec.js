// e2e/allegati.spec.js — l'allegato HTML in Chrome REALE.
//
// I test in jsdom (src/) provano che il codice c'è: attributo `download` presente,
// il contenimento della sandbox presente. Quello che NON possono provare è se Chrome salva davvero il
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

// Pagina che mostra il contenuto SOLO via JavaScript: è la forma tipica di un file
// allegato (un quiz, una scheda interattiva) e il motivo per cui l'iframe deve poter
// eseguire script. Con la sandbox a zero permessi restava VUOTO — riprodotto con il
// file reale segnalato dall'utente (Chrome e WebKit: 0 elementi visibili su entrambi).
const PAGINA_JS =
  '<!doctype html><html><head><meta charset="utf-8"><title>doc</title></head><body>' +
  '<div id="solo-js" style="display:none">Mostrato dal file stesso</div>' +
  '<script>document.getElementById("solo-js").style.display="block";document.title="ESEGUITO";</script>' +
  '</body></html>';

// Dal dentro dell'iframe si prova a reachedere l'app. Tutto deve essere BLOCCATO:
// è questa la garanzia che tiene fermo lo stored XSS ora che gli script girano.
async function verificaContenimento(dentro) {
  return dentro.locator('body').evaluate(() => {
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
}

function raccoglieErrori(page) {
  const errori = [];
  page.on('pageerror', (e) => errori.push('PAGEERROR: ' + e.message));
  return errori;
}

test.describe('Allegati (Chrome reale)', () => {
  test('HTML: la preview mostra anche i file che si costruiscono con JavaScript', async ({ page }) => {
    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 10000 });
    await page.evaluate(
      ([url, size]) => {
        window.__db._seed('cards', {
          c1: Object.assign({}, window.__db._get('cards', 'c1'), {
            allegati: [{ id: 'a1', name: 'quiz.html', type: 'text/html', size: size, url: url }],
          }),
        });
      },
      [dataUrl(PAGINA_JS), PAGINA_JS.length]
    );
    await page.locator('#card-c1').getByText('Lezione su X').first().click();
    await page.getByRole('button', { name: '🌐 quiz.html' }).click();

    const dentro = page.frameLocator('[data-testid="anteprima-html"] iframe');
    // Il contenuto c'è, ma solo perché il file lo ha costruito: questo è il
    // comportamento atteso e il motivo di allow-scripts.
    await expect(dentro.locator('#solo-js')).toBeVisible({ timeout: 10000 });
    expect(await dentro.locator('body').evaluate((b) => b.ownerDocument.title)).toBe('ESEGUITO');
  });

  test('HTML: i script girano ma NON possono toccare l app né la sessione', async ({ page }) => {
    const errori = raccoglieErrori(page);
    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 10000 });
    await page.evaluate(
      ([url, size]) => {
        window.__db._seed('cards', {
          c1: Object.assign({}, window.__db._get('cards', 'c1'), {
            allegati: [{ id: 'a1', name: 'quiz.html', type: 'text/html', size: size, url: url }],
          }),
        });
      },
      [dataUrl(PAGINA_JS), PAGINA_JS.length]
    );
    await page.locator('#card-c1').getByText('Lezione su X').first().click();
    await page.getByRole('button', { name: '🌐 quiz.html' }).click();
    await expect(page.frameLocator('[data-testid="anteprima-html"] iframe').locator('#solo-js')).toBeVisible({
      timeout: 10000,
    });

    const contenimento = await verificaContenimento(page.frameLocator('[data-testid="anteprima-html"] iframe'));
    // Lo script è partito (ESEGUITO), eppure non vede né l'app né il suo storage:
    // è questo che rende sicuro allow-scripts senza allow-same-origin.
    expect(contenimento.documento, 'il file ha letto il DOM dell app').toBe('BLOCCATO');
    expect(contenimento.storage, 'il file ha scritto nel localStorage dell app').toBe('BLOCCATO');
    expect(contenimento.app, 'il file ha raggiunto SB/db della pagina').toBe('BLOCCATO');
    // Nessun errore non gestito sulla pagina principale.
    expect(errori.filter((e) => !e.includes('favicon'))).toEqual([]);
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
    // Il file scaricato è INTERO: lo script c'è, e quando lo si apre dal disco
    // (o da un'app che lo rende) gira normalmente. È il comportamento atteso.
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