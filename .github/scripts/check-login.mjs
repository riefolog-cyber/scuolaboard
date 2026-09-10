// check-login.mjs — monitor giornaliero del login di produzione (GitHub Actions).
// Carica la pagina live, verifica che il bottone "Accedi con Google" sia
// visibile, clicca e controlla che si apra il POPUP verso il flusso Google
// (handler Firebase con authType=signInViaPopup, che poi reindirizza a
// accounts.google.com). Esce con codice != 0 se qualcosa non va: il workflow
// fallisce e apre un issue di avviso (senza duplicati).
//
// Uso locale: node .github/scripts/check-login.mjs  (usa il Chrome di sistema)
import { chromium } from 'playwright';

const URL = 'https://riefolog-cyber.github.io/scuolaboard/';
const PROBLEMI = [];

async function main() {
  // In locale usa il Chrome di sistema (nessun download); in CI il Chromium
  // bundle installato da `npx playwright install`.
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.CI ? undefined : 'chrome',
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'it-IT' });

  page.on('pageerror', (e) => PROBLEMI.push('[pageerror] ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|net::|Failed to load resource/.test(m.text())) {
      PROBLEMI.push('[console] ' + m.text());
    }
  });

  // 1) La pagina carica e il bottone login compare entro 20s
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page
      .getByRole('button', { name: /Accedi con Google/i })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 });
    console.log('OK login caricata, bottone visibile');
  } catch (e) {
    console.error('KO la login non carica:', e.message);
    await page.screenshot({ path: 'login-non-carica.png' }).catch(() => {});
    await browser.close();
    process.exit(1);
  }

  // 2) Il clic apre il popup del flusso Google (non un redirect nella stessa scheda)
  try {
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 20000 }),
      page.getByRole('button', { name: /Accedi con Google/i }).first().click(),
    ]);
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    const url = popup.url();
    const ok = /authType=signInViaPopup|accounts\.google\.com/.test(url);
    console.log('OK popup aperto verso:', url.slice(0, 120) + (ok ? '' : ' ⚠️ indirizzo inatteso'));
    if (!ok) PROBLEMI.push('[popup] indirizzo inatteso: ' + url.slice(0, 200));
    await popup.close().catch(() => {});
  } catch (e) {
    console.error('KO popup non aperto:', e.message);
    PROBLEMI.push('[popup] ' + e.message);
  }

  // 3) L'app resta stabile sulla login (nessun crash dopo il click)
  await page.waitForTimeout(800);
  const ancoraLogin = await page.getByRole('button', { name: /Accedi con Google/i }).count();
  if (!ancoraLogin) PROBLEMI.push("[app] l'app non è più sulla login dopo il click");

  await page.screenshot({ path: 'login-monitor.png', fullPage: false }).catch(() => {});
  await browser.close();

  if (PROBLEMI.length) {
    console.error('PROBLEMI RILEVATI:');
    PROBLEMI.forEach((p) => console.error(' -', p));
    process.exit(1);
  }
  console.log('✅ Login di produzione OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});