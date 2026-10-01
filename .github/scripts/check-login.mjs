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

// Il login non è mai stato rotto "a metà": o non parte proprio, oppure è un
// glitch (rete lenta del runner, popup che non si apre in tempo). Dichiarare
// fallito un login sano costa un'email all'insegnante e un issue aperto da
// chiudere a mano, quindi si ritenta prima di urlare: gli screenshot restano
// quelli dell'ULTIMO tentativo, così l'allegato del run racconta davvero la
// situazione che ha fatto fallire il controllo.
const TENTATIVI = 3;
const PAUSA_TRA_TENTATIVI_MS = 20000;

// Un tentativo: ritorna i problemi trovati (vuoto = login OK) e lascia sempre
// il browser chiuso, così un tentativo fallito non blocca il successivo.
async function eseguiControllo(cattura) {
  const PROBLEMI = [];
  // In locale usa il Chrome di sistema (nessun download); in CI il Chromium
  // bundle installato da `npx playwright install`.
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.CI ? undefined : 'chrome',
  });
  try {
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
      // va in PROBLEMI, non solo in console: è la lista che decide se il
      // tentativo è riuscito (prima qui si usciva subito dal processo)
      PROBLEMI.push('[caricamento] ' + e.message);
      if (cattura) await page.screenshot({ path: 'login-non-carica.png' }).catch(() => {});
      return PROBLEMI;
    }

    // 2) Il clic apre il popup del flusso Google (non un redirect nella stessa scheda)
    try {
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 20000 }),
        page
          .getByRole('button', { name: /Accedi con Google/i })
          .first()
          .click(),
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

    if (cattura) await page.screenshot({ path: 'login-monitor.png', fullPage: false }).catch(() => {});

    return PROBLEMI;
  } finally {
    await browser.close().catch(() => {});
  }
}

async function main() {
  for (let tentativo = 1; tentativo <= TENTATIVI; tentativo++) {
    const ultimo = tentativo === TENTATIVI;
    console.log(`Tentativo ${tentativo}/${TENTATIVI}${ultimo ? '' : ' (non decisivo)'}`);
    const problemi = await eseguiControllo(ultimo);
    if (!problemi.length) {
      console.log('✅ Login di produzione OK');
      return;
    }
    console.error(`KO al tentativo ${tentativo}/${TENTATIVI}:`);
    problemi.forEach((p) => console.error(' -', p));
    if (!ultimo) {
      console.log(`Attesa di ${PAUSA_TRA_TENTATIVI_MS / 1000}s, poi si riprova.`);
      await new Promise((r) => setTimeout(r, PAUSA_TRA_TENTATIVI_MS));
    }
  }
  console.error(`❌ Login di produzione KO dopo ${TENTATIVI} tentativi.`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
