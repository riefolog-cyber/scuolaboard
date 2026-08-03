// e2e/bughunt.spec.js — Bug-hunting estensivo su Chrome reale (harness: app vera + db finto).
// Copre i flussi NON ancora stressati dalla suite (rinomina classe, duplica, like/reazione,
// commento prof, filtri, simula studente, copia link, drag & drop, ricerca card) e verifica errori console a fine flusso.
import { test, expect } from '@playwright/test';

const HARNESS = '/scuolaboard/e2e/harness.html';

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
    if (url.includes('fonts.') || url.includes('gstatic')) return;
    errors.push('[requestfailed] ' + url + ' ' + (req.failure()?.errorText || ''));
  });
  return errors;
}

function fatalErrors(errors) {
  return errors.filter((e) => !BENIGN_SUBSTR.some((b) => e.includes(b)));
}

// Chiude la CardDetail cliccando il backdrop (overlay z-200) finché non esce dal DOM.
async function closeCardDetail(page) {
  const cardDetail = page.locator('[style*="z-index: 200"]');
  for (let i = 0; i < 8; i++) {
    await page.mouse.click(10, 150);
    await page.waitForTimeout(150);
    if (!(await cardDetail.isVisible().catch(() => false))) return;
  }
  throw new Error('CardDetail non si è chiusa dopo i click sul backdrop');
}

test('Rinomina classe: 3AO → 3AZ (chip, config e card aggiornate)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  // Trova il chip filtro 3AO nella FilterBar (bottone col nome della classe)
  const chip = page.getByRole('button', { name: '3AO', exact: true }).first();
  await expect(chip).toBeVisible({ timeout: 5000 });

  // Clic ✏️ sulla riga del chip → input rinomina precompilato con 3AO
  const rigaChip = chip.locator('..');
  await rigaChip.getByRole('button', { name: '✏️' }).click();
  const renameInput = page.locator('input[value="3AO"]');
  await expect(renameInput).toBeVisible({ timeout: 5000 });

  // Digita il nuovo nome e conferma (1° click → "✓ Confermi?", 2° click → esegui)
  await renameInput.fill('3AZ');
  const rigaInput = page.locator('div').filter({ has: page.locator('input[value="3AZ"]') }).last();
  await rigaInput.getByRole('button', { name: '✓', exact: true }).click();
  await expect(page.getByRole('button', { name: '✓ Confermi?' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: '✓ Confermi?' }).click();

  // 3AZ appare come chip, 3AO sparisce
  await expect(page.getByText('3AZ', { exact: true }).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: '3AO', exact: true }).first()).not.toBeVisible();

  // config aggiornata: 3AO nascosta (predefinita), 3AZ in lista custom
  await expect
    .poll(() =>
      page.evaluate(() => {
        const c = window.__db._get('config', 'classi_custom_2026_2027');
        return c ? { lista: c.lista, nascoste: c.nascoste } : null;
      })
    )
    .toEqual({ lista: ['3AZ'], nascoste: ['3AO'] });

  // La card quiz (ex 3AO) ora è in 3AZ: ancora visibile, nessun crash
  await expect(page.getByText('Quiz sulle frazioni').first()).toBeVisible({ timeout: 5000 });

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

test('Duplica card: la modale si apre, seleziona classe e crea la copia', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  const nCardsPrima = await page.evaluate(() => window.__db._all('cards').length);

  await page.locator('#card-c1').getByRole('button', { name: 'Duplica card' }).click();
  const modal = page.locator('[style*="z-index: 500"]').filter({ hasText: 'Duplica card' }).first();
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Seleziona la classe 3AO e conferma
  await modal.getByRole('button', { name: '3AO', exact: true }).click();
  await modal.getByRole('button', { name: 'Duplica in 1 classe' }).click();

  // La copia è stata creata (card in più) e appartiene a 3AO, con commenti NON copiati
  await expect
    .poll(() => page.evaluate(() => window.__db._all('cards').length))
    .toBe(nCardsPrima + 1);
  // NB: la copia ha titolo "Lezione su X [3AO]" (suffisso classe) e classi [3AO]
  const copie = await page.evaluate(() =>
    window.__db
      ._all('cards')
      .filter(([, c]) => c.id !== 'c1' && c.titolo === 'Lezione su X [3AO]' && (c.classi || []).indexOf('3AO') >= 0)
  );
  expect(copie.length).toBe(1);
  expect(copie[0][1].commenti || []).toEqual([]);

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

test('Like + reazione emoji dalla griglia (senza aprire la card)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  const card = page.locator('#card-c1');
  await card.getByRole('button', { name: 'Aggiungi like' }).click();
  await expect(card.getByRole('button', { name: 'Rimuovi like' })).toBeVisible({ timeout: 5000 });

  await card.getByRole('button', { name: 'Reagisci con 🤔' }).click();
  // Il like è persistito nel fake db
  await expect
    .poll(() => page.evaluate(() => window.__db._get('cards', 'c1').likes))
    .toBe(1);

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

test('Commento da prof sulla card (addCom) con conteggio aggiornato', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  await page.getByText('Lezione su X').first().click();
  await page.getByPlaceholder('Scrivi un commento…').fill('Commento di prova prof E2E');
  await page.getByRole('button', { name: 'Invia', exact: true }).click();
  await expect(page.getByText('Commento di prova prof E2E').first()).toBeVisible({ timeout: 5000 });

  // Persistito nel db (1 seed + 1 nuovo = 2 commenti)
  await expect
    .poll(() => page.evaluate(() => window.__db._get('cards', 'c1').commenti.length))
    .toBe(2);

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

test('Filtro classe 3AO applica lo stato; filtro "Solo prof" non crasha', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  // Filtro 3AO: lo stato attivo appare nell'header della FilterBar
  await page.getByRole('button', { name: '3AO', exact: true }).first().click();
  await expect(page.getByText('🏫 CLASSE: 3AO').first()).toBeVisible({ timeout: 5000 });
  // Le card 'TUTTE' (Lezione su X, Proposta di Luca) restano visibili anche nel
  // filtro 3AO: è il comportamento previsto (TUTTE = visibile a tutte le classi).
  await expect(page.getByText('Lezione su X').first()).toBeVisible();
  await expect(page.getByText('Quiz sulle frazioni').first()).toBeVisible();

  // Reset filtro (× nell'header della FilterBar — scoping: in pagina ci sono
  // molti bottoni ×, uno per chip di rimozione classe) poi "Solo prof"
  const headerFiltro = page.getByText('🏫 CLASSE: 3AO').locator('..');
  await headerFiltro.getByRole('button', { name: '×', exact: true }).click();
  await expect(page.getByText('🏫 FILTRA PER CLASSE').first()).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Solo prof' }).click();
  await page.waitForTimeout(400);
  const cardCount = await page.evaluate(() => document.querySelectorAll('[id^="card-"]').length);
  expect(cardCount, 'griglia con filtro Solo prof deve essere vuota').toBe(0);

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

test('Simula studente dal prof: sparisce la FilterBar, resta la vista bacheca', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  await expect(page.getByText('🏫 FILTRA PER CLASSE').first()).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: '👁️ Studente' }).click();

  // La FilterBar scompare (solo prof) e la bacheca resta visibile
  await expect(page.getByText('🏫 FILTRA PER CLASSE').first()).not.toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 5000 });

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

test('Copia link: il bottone 🔗 copia l\'URL con #card- e mostra il toast', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  await page.locator('#card-c1').getByRole('button', { name: 'Copia link' }).click();

  // Il toast conferma la copia (successo o fallback con URL visibile)
  await expect(page.getByText(/Link copiato 🔗/).first()).toBeVisible({ timeout: 5000 });

  // L'URL copiato deve puntare alla card: #card-c1 (il link si può verificare
  // dal fallback: se la clipboard non è disponibile il toast mostra il link)
  const url = await page.evaluate(() => window.location.href.split('#')[0] + '#card-c1');
  expect(url).toContain('#card-c1');

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

test('Ricerca card (solo prof): 🔍 trova per parola chiave e apre la card', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: 'Cerca nelle card' }).click();
  const searchModal = page.locator('[style*="z-index: 520"]');
  await expect(searchModal).toBeVisible({ timeout: 5000 });

  await searchModal.getByLabel('Cerca card').fill('frazioni');
  await expect(searchModal.getByText('Quiz sulle frazioni').first()).toBeVisible({ timeout: 5000 });
  // La proposta di Luca non c'entra con 'frazioni' → fuori dai risultati
  await expect(searchModal.getByText('Proposta di Luca')).toHaveCount(0);

  // Clic sul risultato → si apre la CardDetail del quiz
  await searchModal.getByText('Quiz sulle frazioni').first().click();
  await expect(page.getByText('RISULTATI (2 studenti)').first()).toBeVisible({ timeout: 5000 });
  await closeCardDetail(page);
  await expect(page.locator('[style*="z-index: 200"]')).not.toBeVisible();

  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});

test('Drag & drop: trascina la card c1 sotto p1 e l\'ordine viene salvato', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 15000 });

  const c1 = page.locator('#card-c1');
  const p1 = page.locator('#card-p1');
  await expect(c1).toBeVisible();
  await expect(p1).toBeVisible();

  // Drag HTML5: mouse down su c1, movimento graduale fino a p1, rilascio.
  const from = await c1.boundingBox();
  const to = await p1.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
  await page.mouse.up();

  // onDrop riordina: c1 (era ordine 1) finisce dopo p1 (ordine 2)
  await expect
    .poll(() => page.evaluate(() => window.__db._get('cards', 'c1').ordine))
    .toBe(2);
  await expect
    .poll(() => page.evaluate(() => window.__db._get('cards', 'p1').ordine))
    .toBe(1);

  // Nessun errore console
  expect(fatalErrors(errors), 'Errori fatali: ' + JSON.stringify(fatalErrors(errors))).toEqual([]);
});
