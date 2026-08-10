// scripts/verify-upload.mjs — verifica numerica dell'upload immagini in Chrome
// reale (harness E2E con Firebase finto): carica img-5mb.png e img-2mb.png,
// legge il contatore KB della modale, le dimensioni/peso finali dal fake db e
// gli errori console. Stampa un report JSON a fine esecuzione.
// Uso: node scripts/verify-upload.mjs  (richiede il dev server su :5173)
import { chromium } from 'playwright';

const HARNESS = 'http://localhost:5173/scuolaboard/e2e/harness.html';
const IMGS = {
  'TEST img 5MB': 'C:/Users/Gianni/Desktop/scuolaboard/test-images/img-5mb.png',
  'TEST img 2MB': 'C:/Users/Gianni/Desktop/scuolaboard/test-images/img-2mb.png',
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

const report = { consoleErrors: [], cards: {} };

try {
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await page.getByText('Lezione su X').first().waitFor({ timeout: 15000 });

  for (const [titolo, filePath] of Object.entries(IMGS)) {
    // Apre la NuovaCardModal
    await page.getByTitle('Nuova card').click();
    await page.getByPlaceholder('Es. Riflessione su…').fill(titolo);

    // Input file della galleria (accept image/* + multiple)
    const inputs = page.locator('input[type="file"]');
    const gallery = inputs.filter({ has: page.locator('[multiple]') }).filter({
      has: page.locator('[accept*="image/"]'),
    });
    const count = await inputs.count();
    let galleryIdx = -1;
    for (let i = 0; i < count; i++) {
      const accept = (await inputs.nth(i).getAttribute('accept')) || '';
      const multiple = (await inputs.nth(i).getAttribute('multiple')) !== null;
      if (accept.includes('image/') && multiple) {
        galleryIdx = i;
        break;
      }
    }
    if (galleryIdx < 0) throw new Error('Input galleria non trovato');

    await inputs.nth(galleryIdx).setInputFiles(filePath);

    // Attende la fine della compressione: il contatore KB accanto a IMMAGINI
    // cambia da 'Max ~250KB…' a 'NNN KB' e compare la thumbnail.
    await page
      .locator('text=/^\\d+ KB/')
      .first()
      .waitFor({ timeout: 15000 });
    const kbCounter = (await page.locator('text=/^\\d+ KB/').first().textContent()).trim();

    const troppoGrande = await page.getByText('Immagine troppo grande').count();
    const thumbnail = await page.locator('img[alt=""]').count(); // miniatura galleria

    // Salva la card
    await page.getByText('✅ Crea card').click();

    // Legge dal fake db: peso finale (base64) + dimensioni reali in pixel
    const info = await page
      .waitForFunction(
        (t) => {
          const c = window.__db._all('cards').find(([, x]) => x.titolo === t);
          return c && c[1] && c[1].immagini && c[1].immagini.length ? true : false;
        },
        titolo,
        { timeout: 10000 }
      )
      .then(() =>
        page.evaluate((t) => {
          const c = window.__db._all('cards').find(([, x]) => x.titolo === t);
          const url = c[1].immagini[0].url;
          const kb = Math.round((url.length * 0.75) / 1024);
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () =>
              resolve({ kb, dims: img.naturalWidth + 'x' + img.naturalHeight, fmt: url.slice(0, 22) });
            img.onerror = () => resolve({ kb, dims: 'ERRORE DECODE', fmt: url.slice(0, 22) });
            img.src = url;
          });
        }, titolo)
      );

    report.cards[titolo] = {
      kbCounterModale: kbCounter,
      toastTroppoGrande: troppoGrande > 0,
      thumbnailPresente: thumbnail > 0,
      kbFinaliDb: info.kb,
      dimensioniFinaliPx: info.dims,
      formato: info.fmt,
    };

    // Chiude la CardDetail se si è aperta dopo il salvataggio e torna alla bacheca
    await page.keyboard.press('Escape').catch(() => {});
    await page.getByTitle('Nuova card').first().waitFor({ timeout: 5000 });
  }
} catch (e) {
  report.errore = String(e && e.message || e);
} finally {
  report.consoleErrors = consoleErrors.filter(
    (e) => !e.includes('Download the React DevTools') && !e.includes('favicon')
  );
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
