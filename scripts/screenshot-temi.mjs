// screenshot-temi.mjs — cattura visiva per la revisione manuale.
//
// PERCHÉ NON è un test: la suite E2E monta l'app SENZA src/styles.css, quindi
// hover dei badge, alone delle fissate, tema chiaro e token CSS non sono coperti
// da nulla. Un test a screenshot con baseline, però, dipende da font e
// antialiasing della macchina e produce diff rumorosi: qui si cattura e si
// guarda, non si confronta in CI.
//
// Uso (con il dev server su 5173):
//   node scripts/screenshot-temi.mjs
//   node scripts/screenshot-temi.mjs http://localhost:5173/scuolaboard/e2e/harness.html
//
// Il tema NON si imposta scrivendo solo data-theme: così il CSS gira chiaro ma
// gli stili inline che leggono `isLight` dallo stato React restano scuri, e lo
// screenshot mostra un ibrido che non esiste in produzione. Qui si preme il
// toggle dell'header e si VERIFICA l'allineamento: il titolo del pulsante dice
// la destinazione (il tema a cui si passa), quindi dopo il click deve proporre
// l'altro tema e `data-theme` deve concordare.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Path risolto rispetto a QUESTO file, non alla CWD: lanciato da un'altra
// cartella lo script deve continuare a trovare il foglio di stile.
const cssPath = fileURLToPath(new URL('../src/styles.css', import.meta.url));
const url = process.argv[2] || 'http://localhost:5173/scuolaboard/e2e/harness.html';
// Anche l'output segue il file, non la CWD: da `scripts/` le immagini non
// devono finire in `scripts/screenshots/`. `SB_SHOT_DIR` permette di sceglierne
// un'altra senza modificare lo script.
const out = process.env.SB_SHOT_DIR || fileURLToPath(new URL('../screenshots', import.meta.url));
fs.mkdirSync(out, { recursive: true });

// In locale il progetto usa il Chrome di sistema (vedi playwright.config), non il
// Chromium scaricato: `channel: 'chrome'` evita un `npx playwright install`.
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const viewport = { width: 1280, height: 900 };

/** Porta l'app nel tema richiesto e restituisce lo stato osservato. */
async function vaiAlTema(page, tema) {
  // Destinazione scritta sul pulsante: per andare in "light" serve "Tema chiaro".
  const destinazione = tema === 'light' ? 'Tema chiaro' : 'Tema scuro';
  const toggle = page.locator('[title="' + destinazione + '"]');
  if ((await toggle.count()) > 0) {
    await toggle.first().click();
  }
  // Il click cambia stato React e data-theme: si aspetta che il pulsante proponga
  // l'altro tema, che è la prova che `isLight` è cambiato davvero.
  const opposto = tema === 'light' ? 'Tema scuro' : 'Tema chiaro';
  await page.waitForFunction(
    (t) => {
      const el = document.querySelector('[title^="Tema"]');
      return !el || el.getAttribute('title') === t;
    },
    opposto,
    { timeout: 5000 }
  );
  return page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    toggle: (document.querySelector('[title^="Tema"]') || {}).getAttribute
      ? document.querySelector('[title^="Tema"]').getAttribute('title')
      : null,
  }));
}

for (const tema of ['light', 'dark']) {
  const page = await browser.newPage({ viewport, colorScheme: tema === 'light' ? 'light' : 'dark' });
  await page.goto(url, { waitUntil: 'networkidle' });
  // Il CSS non è caricato dall'harness: lo iniettiamo per vedere la resa vera.
  await page.addStyleTag({ path: cssPath });

  const stato = await vaiAlTema(page, tema);
  const atteso = tema === 'light' ? 'light' : 'dark';
  const okTema = atteso === 'light' ? stato.theme === 'light' : stato.theme !== 'light';
  if (!okTema) {
    throw new Error('tema non allineato: atteso ' + atteso + ', data-theme=' + stato.theme + ', toggle=' + stato.toggle);
  }
  await page.waitForTimeout(500);

  const file = out + '/bacheca-' + tema + '.png';
  await page.screenshot({ path: file, fullPage: false });
  console.log('scritto ' + file + ' (data-theme=' + stato.theme + ', toggle="' + stato.toggle + '")');

  // Vista elenco: qui vive `content-visibility` su `.list-row`, che la bacheca a
  // griglia non mostra. Si torna alla griglia prima del dettaglio.
  const elenco = page.locator('[title="Elenco"]');
  if ((await elenco.count()) > 0) {
    await elenco.first().click();
    await page.waitForTimeout(300);
    const fileElenco = out + '/elenco-' + tema + '.png';
    await page.screenshot({ path: fileElenco, fullPage: false });
    console.log('scritto ' + fileElenco);
    const griglia = page.locator('[title="Griglia"]');
    if ((await griglia.count()) > 0) await griglia.first().click();
    await page.waitForTimeout(300);
  }

  // Anche il DETTAGLIO: è dove vivono i token del pannello, della maniglia e del
  // pulsante di chiusura, e dove un ternario dimenticato fa sparire un testo
  // solo nel tema chiaro. CardDetail è lazy: si attende il contenuto vero.
  const card = page.locator('.card-wrap').first();
  if ((await card.count()) > 0) {
    await card.click();
    await page
      .locator('#cd-commenti')
      .first()
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(function () {});
    await page.waitForTimeout(700);
    const dettaglio = out + '/dettaglio-' + tema + '.png';
    await page.screenshot({ path: dettaglio, fullPage: false });
    console.log('scritto ' + dettaglio);
  }

  await page.close();
}

await browser.close();
