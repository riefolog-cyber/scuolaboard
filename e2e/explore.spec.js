// e2e/explore.spec.js — Esplorazione bug-hunting (sessione manuale di navigazione).
// 1) Build di produzione (http://localhost:4173/scuolaboard/): login + CSP in browser reale.
// 2) Harness con Firebase finto (dev server): navigazione completa bacheca/modali/quiz,
//    sia come prof che come studente. Ogni test raccoglie errori console, pageerror e
//    requestfailed e li verifica a fine flusso.
import { test, expect } from '@playwright/test';

const PROD = 'http://localhost:4173/scuolaboard/';
const HARNESS = '/scuolaboard/e2e/harness.html';

// Errori console considerati benigni (assenza di rete nella sandbox / noise noto).
const BENIGN_SUBSTR = [
  'Download the React DevTools',
  'favicon',
  'net::',
  'Failed to load resource',
  'ERR_',
  'WebSocket connection',
];

function collectErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('[console] ' + msg.text());
  });
  page.on('pageerror', (err) => errors.push('[pageerror] ' + err.message));
  page.on('requestfailed', (req) => {
    const url = req.url();
    // Servizi esterni che possono fallire offline (font, gstatic) — non sono bug
    // dell'app. NB: qrserver NON è più in whitelist: se il QR (img) è bloccato
    // dalla CSP, il test 1 lo intercetta come violazione CSP.
    if (url.includes('fonts.') || url.includes('gstatic')) return;
    errors.push('[requestfailed] ' + url + ' ' + (req.failure()?.errorText || ''));
  });
  return errors;
}

function fatalErrors(errors) {
  return errors.filter((e) => !BENIGN_SUBSTR.some((b) => e.includes(b)));
}

// Chiude la CardDetail cliccando il backdrop (overlay z-200) finché l'overlay
// non esce dal DOM. NB: isVisible() NON rileva l'occlusione — il FAB (z-100)
// resta "visibile" anche coperto dall'overlay z-200 — quindi il check sul
// z-200 è l'unico affidabile. I click a (10,150) cadono sempre sul backdrop:
// la card è una bottom-sheet centrata (maxWidth 560). Se una modale più alta
// (z-500/600) è rimasta aperta, il primo click ne chiude il backdrop.
async function closeCardDetail(page) {
  const cardDetail = page.locator('[style*="z-index: 200"]');
  for (let i = 0; i < 8; i++) {
    await page.mouse.click(10, 150);
    await page.waitForTimeout(150);
    if (!(await cardDetail.isVisible().catch(() => false))) return;
  }
  throw new Error('CardDetail non si è chiusa dopo i click sul backdrop');
}

// ── 1. Build di produzione (CSP reale in Chrome) ────────────────────────────
test('PROD 4173: la login carica, la meta CSP cè e non ci sono violazioni', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(PROD, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/SCUOLABOARD|SCUOLA/).first()).toBeVisible({ timeout: 15000 });

  // La meta CSP deve essere presente nella build
  const hasCsp = await page.evaluate(() => !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'));
  expect(hasCsp, 'meta CSP mancante nella build di produzione').toBe(true);

  // Guard di regressione QR: la meta CSP deve includere api.qrserver.com in img-src.
  // Il QR della modale è generato da quel servizio esterno — se manca dalla CSP,
  // il browser blocca l'immagine ('Refused to load the image...') e il QR è rotto.
  const cspContent = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  // Il dominio deve stare DENTRO la direttiva img-src (non solo altrove nella CSP)
  expect(cspContent, 'img-src deve includere api.qrserver.com (QR)').toMatch(
    /img-src[^;]*https:\/\/api\.qrserver\.com/
  );

  // Bottone login Google visibile
  await expect(page.getByRole('button', { name: /Accedi con Google/i }).first()).toBeVisible({ timeout: 10000 });

  // ZERO violazioni CSP (blocchi script/style/connect/font)
  const cspViolations = errors.filter((e) => e.toLowerCase().includes('content security policy'));
  expect(cspViolations, 'Violazioni CSP: ' + JSON.stringify(cspViolations)).toEqual([]);

  // Nessun errore JS non gestito
  const pageErrors = fatalErrors(errors).filter((e) => e.startsWith('[pageerror]'));
  expect(pageErrors, 'Page errors: ' + JSON.stringify(pageErrors)).toEqual([]);
});

test('PROD 4173 mobile (390px): nessun overflow orizzontale sulla login', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = collectErrors(page);
  await page.goto(PROD, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/SCUOLABOARD|SCUOLA/).first()).toBeVisible({ timeout: 15000 });

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, 'Overflow orizzontale di ' + overflow + 'px').toBeLessThanOrEqual(2);

  const pageErrors = fatalErrors(errors).filter((e) => e.startsWith('[pageerror]'));
  expect(pageErrors, 'Page errors: ' + JSON.stringify(pageErrors)).toEqual([]);
});

// ── 2. Harness prof — bacheca, CardDetail, commenti, AI ─────────────────────
test('HARNESS prof: bacheca, filtri, CardDetail, reazioni, toggle AI', async ({ page }) => {
  test.setTimeout(120000); // flusso concatenato: dev server + ~15 interazioni
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Proposta di Luca').first()).toBeVisible();
  await expect(page.getByText('Quiz sulle frazioni').first()).toBeVisible();
  await expect(page.getByText('⏳ PROPOSTE IN ATTESA').first()).toBeVisible();

  // Filtro per classe
  await page.getByRole('button', { name: '3AO' }).first().click();
  await expect(page.getByText('Quiz sulle frazioni').first()).toBeVisible({ timeout: 5000 });

  // Apre la CardDetail c1
  await page.getByText('Lezione su X').first().click();
  await expect(page.getByText('Non ho capito il punto 2').first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: '⚠️ Ammonisci' })).toBeVisible();

  // Like + reazione emoji
  await page.getByRole('button', { name: /👍/ }).first().click();
  await page.getByRole('button', { name: 'Reagisci 🤔' }).click();

  // Pannello AI — prof: la card del seed NON ha analisi pre-esistente, quindi
  // il toggle è "🤖 + AI" (non "▼ AI"). Su una card 'nota' è l'unico bottone 🤖
  // (niente sondaggio). Il click avvia l'analisi: la fetch al worker fallisce
  // offline ma in modo gestito (toast di errore, nessun crash).
  const aiBtn = page.getByRole('button', { name: /🤖/ }).first();
  await expect(aiBtn).toBeVisible({ timeout: 5000 });
  await aiBtn.click();
  await page.waitForTimeout(600);
  await expect(page.getByRole('button', { name: /🤖/ }).first()).toBeVisible();

  // Chiude la CardDetail e verifica che l'overlay (z-200) sia sparito
  await closeCardDetail(page);
  await expect(page.locator('[style*="z-index: 200"]')).not.toBeVisible();

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

// ── 3. Harness prof — modali Timer/Copia/QR + FAB crea card ─────────────────
test('HARNESS prof: Timer, Copia anno, QR, FAB nuova card', async ({ page }) => {
  test.setTimeout(120000); // flusso concatenato: 4 modali + FAB + attese db
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  // ── Timer dalla CardDetail ──
  await page.getByText('Lezione su X').first().click();
  await page.getByRole('button', { name: '⏰ Timer' }).click();
  await expect(page.getByText('Imposta scadenza card').first()).toBeVisible({ timeout: 5000 });
  const timerModal = page.locator('[style*="z-index: 400"]').filter({ hasText: 'Imposta scadenza card' }).first();
  await timerModal.locator('input[type="datetime-local"]').fill('2026-12-31T23:59');
  await timerModal.getByRole('button', { name: '⏰ Imposta' }).click();
  await expect(page.getByText('Imposta scadenza card').first()).not.toBeVisible({ timeout: 5000 });

  // La scadenza è salvata nel fake db
  await expect.poll(() => page.evaluate(() => !!window.__db._get('cards', 'c1')?.scadenza)).toBe(true);

  await closeCardDetail(page); // chiude CardDetail
  await expect(page.locator('[style*="z-index: 200"]')).not.toBeVisible();

  // ── Copia in altro anno (dalla card in griglia) ──
  await page.locator('#card-c1').getByRole('button', { name: 'Copia in altro anno' }).click();
  await expect(page.getByText('Copia in altro anno').first()).toBeVisible({ timeout: 5000 });
  const copiaModal = page.locator('[style*="z-index: 500"]').filter({ hasText: 'Copia in altro anno' }).first();
  await copiaModal.locator('select').selectOption('2027/2028');
  await copiaModal.getByRole('button', { name: 'Copia', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__db._all('cards').filter(([, c]) => c.annoScolastico === '2027/2028').length)
    )
    .toBe(1);

  // ── QR dalla Header ──
  await page.getByRole('button', { name: 'QR Code bacheca' }).click();
  const qrModal = page.locator('[style*="z-index: 500"]').filter({ hasText: 'QR Code Bacheca' }).first();
  await expect(qrModal).toBeVisible({ timeout: 5000 });
  await qrModal.getByRole('button', { name: 'Chiudi' }).click();
  await expect(qrModal).not.toBeVisible({ timeout: 5000 });

  // ── FAB → Nuova card ──
  // NB: il FAB è un bottone "+" con solo title (niente aria-label): l'accessible
  // name è "+", quindi getByRole({name}) non matcha → uso getByTitle.
  await page.getByTitle(/^Nuova card$/).click();
  await expect(page.getByRole('button', { name: '✅ Crea card' })).toBeVisible({ timeout: 5000 });
  await page.getByLabel('Titolo della card').fill('Card esplorazione E2E');
  await page.getByLabel('Testo della card').fill('Testo di prova');
  await page.getByRole('button', { name: '✅ Crea card' }).click();
  await expect(page.getByText('Card esplorazione E2E').first()).toBeVisible({ timeout: 5000 });

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

// ── 3b. Harness prof — Aggiungi classe dalla FilterBar ──────────────────────
// Regressione: "clicca + → digita → ✓" non salvava la classe perché gli
// handler (appHandlerCtx) leggevano ctx.newClasseInput da un oggetto hook
// STALE (closure su una render vecchia) → addClasseCustom riceveva sempre ''.
// Fix: getter su cardsHookRef.current (valore live). Questo test usa il
// browser reale + fake db per bloccare il bug alla radice.
test('HARNESS prof: aggiungi nuova classe dalla FilterBar (+ → digita → ✓)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  // FilterBar prof aperta di default ("🏫 FILTRA PER CLASSE")
  const barra = page.getByText('🏫 FILTRA PER CLASSE').first();
  await expect(barra).toBeVisible({ timeout: 5000 });

  // Clic su "+"
  await page.getByRole('button', { name: '+', exact: true }).first().click();

  // Digita il nome della classe (7ZZ non esiste nelle predefinite)
  const input = page.getByPlaceholder('es. 1AX');
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill('7ZZ');

  // Clic su "✓" (scoping alla riga dell'input: in pagina c'è un altro ✓)
  const rigaInput = page
    .locator('div')
    .filter({ has: page.getByPlaceholder('es. 1AX') })
    .last();
  await rigaInput.getByRole('button', { name: '✓', exact: true }).click();

  // La classe appare come chip filtro
  await expect(page.getByText('7ZZ', { exact: true }).first()).toBeVisible({ timeout: 5000 });

  // …e la scrittura su config è andata a buon fine nel fake db
  await expect
    .poll(() =>
      page.evaluate(() => {
        const c = window.__db._get('config', 'classi_custom_2026_2027');
        return c && c.lista;
      })
    )
    .toEqual(['7ZZ']);

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

// ── 4. Harness prof — Rifiuta, Ammonisci, EditAmm, quiz risultati ───────────
test('HARNESS prof: Rifiuta proposta, Ammonisci, EditAmm, quiz', async ({ page }) => {
  test.setTimeout(120000); // flusso concatenato: 4 modali + quiz + attese db
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  // ── Rifiuta proposta ──
  await page.getByRole('button', { name: '✕', exact: true }).click();
  await expect(page.getByText('Rifiuta proposta').first()).toBeVisible({ timeout: 5000 });
  const rifiutaModal = page.locator('[style*="z-index: 500"]').filter({ hasText: 'Rifiuta proposta' }).first();
  await rifiutaModal.getByPlaceholder('Es. Argomento già trattato, fuori tema…').fill('Fuori programma');
  await rifiutaModal.getByRole('button', { name: '❌ Rifiuta' }).click();
  await expect.poll(() => page.evaluate(() => window.__db._get('cards', 'p1')?.proposta)).toBe('rifiutata');

  // ── Ammonisci dal commento della card c1 ──
  await page.getByText('Lezione su X').first().click();
  await page.getByRole('button', { name: '⚠️ Ammonisci' }).click();
  await expect(page.getByText('Ammonisci studente').first()).toBeVisible({ timeout: 5000 });
  const ammModal = page.locator('[style*="z-index: 500"]').filter({ hasText: 'Ammonisci studente' }).first();
  await ammModal.getByPlaceholder('Scrivi la motivazione…').fill('Linguaggio inappropriato');
  await ammModal.getByRole('button', { name: '⚠️ Invia ammonizione' }).click();
  await expect.poll(() => page.evaluate(() => window.__db._get('ammonizioni', 'Luca Bianchi')?.lista?.length)).toBe(2);

  // ── EditAmm dal pannello ammonizioni ──
  await expect(page.getByText('⚠️ Ammoniti in questa card').first()).toBeVisible({ timeout: 5000 });
  const pannelloAmm = page.getByText('Ammoniti in questa card').locator('..');
  // .first(): dopo l'Ammonisci precedente ci sono 2 ammonizioni sulla card
  // (1 seed + 1 nuova) → 2 bottoni ✏️ con lo stesso aria-label.
  await pannelloAmm
    .getByRole('button', { name: /Modifica ammonizione/ })
    .first()
    .click();
  await expect(page.getByText('✏️ Modifica ammonizione').first()).toBeVisible({ timeout: 5000 });
  const editModal = page.locator('[style*="z-index: 600"]').filter({ hasText: 'Modifica ammonizione' }).first();
  await editModal.locator('#editamm-input').fill('Fuori tema (corretto)');
  await editModal.getByRole('button', { name: '✓ Salva modifica' }).click();
  await expect
    .poll(() => page.evaluate(() => window.__db._get('ammonizioni', 'Luca Bianchi')?.lista?.[0]?.modificata))
    .toBe(true);

  await closeCardDetail(page); // chiude CardDetail
  await expect(page.locator('[style*="z-index: 200"]')).not.toBeVisible();

  // ── Quiz: risultati + classifica + valutazione AI ──
  await page.getByText('Quiz sulle frazioni').first().click();
  await expect(page.getByText('RISULTATI (2 studenti)').first()).toBeVisible({ timeout: 5000 });
  const quizModal = page.locator('.modal-inner').filter({ hasText: 'RISULTATI (2 studenti)' }).first();
  await expect(quizModal.getByText('Giulia Verdi')).toBeVisible();
  await expect(quizModal.getByText('✓ valutato con AI')).toBeVisible();
  await expect(quizModal.getByText('90%')).toBeVisible();
  await expect(quizModal.getByRole('button', { name: /Valuta risposte aperte con AI/ })).toBeVisible();
  await expect(quizModal.getByRole('button', { name: '🗑️ Reset' })).toBeVisible();

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

// ── 5. Harness studente — vista studente ────────────────────────────────────
test('HARNESS studente: commento, profilo, proposta', async ({ page }) => {
  test.setTimeout(120000); // flusso concatenato: commento + profilo + proposta
  const errors = collectErrors(page);
  await page.goto(HARNESS + '?user=studente', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  // ── Commento sulla card ──
  await page.getByText('Lezione su X').first().click();
  await page.getByPlaceholder('Scrivi un commento…').fill('Bellissima lezione!');
  await page.getByRole('button', { name: 'Invia', exact: true }).click();
  await expect(page.getByText('Bellissima lezione!').first()).toBeVisible({ timeout: 5000 });
  await closeCardDetail(page);
  await expect(page.locator('[style*="z-index: 200"]')).not.toBeVisible();

  // ── Profilo studente ──
  await page.getByRole('button', { name: '📊 Il mio profilo' }).click();
  const profilo = page.locator('[style*="z-index: 400"]').filter({ hasText: 'Commenti scritti' }).first();
  await expect(profilo).toBeVisible({ timeout: 5000 });
  await profilo.getByRole('button', { name: 'Chiudi' }).click();
  await expect(profilo).not.toBeVisible({ timeout: 5000 });

  // ── FAB studente → proposta ──
  // (bottone "+" con solo title: vedi nota nel test prof)
  await page.getByTitle(/^Proponi card$/).click();
  await expect(page.getByRole('button', { name: '📤 Invia proposta' })).toBeVisible({ timeout: 5000 });
  await closeCardDetail(page); // chiude la modale
  await expect(page.locator('[style*="z-index: 200"]')).not.toBeVisible();

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});
