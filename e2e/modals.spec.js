// e2e/modals.spec.js — verifica in Chrome reale che le modali sistemate
// (Copia in altro anno, Rifiuta proposta, Timer, Ammonizioni, EditAmm,
// Profilo studente) si aprano DAVVERO e funzionino (vedi TESTING_PLAN.md).
//
// Usa e2e/harness.html: l'app VERA montata nel browser con Firebase finto
// (nessuna credenziale reale necessaria). Il fake db è esposto su window.__db
// per le asserzioni finali sui dati scritti.
import { test, expect } from '@playwright/test';

const HARNESS = '/scuolaboard/e2e/harness.html';

// Helper: raccoglie gli errori console e li verifica a fine test.
function collectConsoleErrors(page) {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
  return consoleErrors;
}

function expectNoFatalErrors(consoleErrors) {
  const fatal = consoleErrors.filter(
    (e) => !e.includes('Download the React DevTools') && !e.includes('favicon')
  );
  expect(fatal, 'Errori console fatali: ' + JSON.stringify(fatal)).toEqual([]);
}

test.describe('Modali (verifica Chrome reale)', () => {
  test('Copia in altro anno: la modale si apre e crea la copia', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    // Attende che la bacheca sia caricata (auth finto + card dal seed)
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 10000 });

    // Apre la modale dal bottone 📅 della card c1 (aria-label "Copia in altro
    // anno"). NB: anche la card p1 (proposta) ha lo stesso bottone → scoping
    // sulla card c1 per evitare ambiguity di Playwright.
    await page.locator('#card-c1').getByRole('button', { name: 'Copia in altro anno' }).click();
    await expect(page.getByText('Copia in altro anno').first()).toBeVisible({ timeout: 5000 });

    // Scoping alla modale: l'overlay fisso ha z-index 500 e contiene il titolo
    const modal = page.locator('[style*="z-index: 500"]').filter({ hasText: 'Copia in altro anno' }).first();

    // Seleziona l'anno e conferma
    await modal.locator('select').selectOption('2027/2028');
    await modal.getByRole('button', { name: 'Copia', exact: true }).click();

    // La copia è stata creata nel fake db (anno 2027/2028, nascosta)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const copie = window.__db._all('cards').filter(([, c]) => c.annoScolastico === '2027/2028');
          return copie.length;
        })
      )
      .toBe(1);
    const stato = await page.evaluate(() => {
      const copia = window.__db._all('cards').find(([, c]) => c.annoScolastico === '2027/2028');
      return copia && copia[1];
    });
    expect(stato.visibile).toBe(false);
    expect(stato.commenti).toEqual([]);

    expectNoFatalErrors(consoleErrors);
  });

  test('Rifiuta proposta: la modale si apre e rifiuta con motivazione', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('⏳ PROPOSTE IN ATTESA').first()).toBeVisible({ timeout: 10000 });

    // Bottone ✕ della proposta in attesa
    await page.getByRole('button', { name: '✕', exact: true }).click();
    await expect(page.getByText('Rifiuta proposta').first()).toBeVisible({ timeout: 5000 });

    // Scoping alla modale Rifiuta (z-index 500)
    const modal = page.locator('[style*="z-index: 500"]').filter({ hasText: 'Rifiuta proposta' }).first();
    await modal.getByPlaceholder('Es. Argomento già trattato, fuori tema…').fill('Fuori programma');
    await modal.getByRole('button', { name: '❌ Rifiuta' }).click();

    // La proposta è stata rifiutata nel fake db con la motivazione
    await expect
      .poll(() =>
        page.evaluate(() => {
          const c = window.__db._get('cards', 'p1');
          return c && c.proposta;
        })
      )
      .toBe('rifiutata');
    const motivazione = await page.evaluate(() => {
      const c = window.__db._get('cards', 'p1');
      return c && c.motivazioneRifiuto;
    });
    expect(motivazione).toBe('Fuori programma');

    expectNoFatalErrors(consoleErrors);
  });

  test('Timer: la modale scadenza si apre dalla CardDetail e salva la scadenza', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 10000 });

    // Apre la CardDetail e clicca "⏰ Timer" (solo prof)
    await page.getByText('Lezione su X').first().click();
    await expect(page.getByRole('button', { name: '⏰ Timer' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '⏰ Timer' }).click();

    // La TimerModal si apre (z-index 400)
    await expect(page.getByText('Imposta scadenza card').first()).toBeVisible({ timeout: 5000 });
    const modal = page.locator('[style*="z-index: 400"]').filter({ hasText: 'Imposta scadenza card' }).first();
    await modal.locator('input[type="datetime-local"]').fill('2026-12-31T23:59');
    await modal.getByRole('button', { name: '⏰ Imposta' }).click();

    // La scadenza è stata salvata sulla card nel fake db
    await expect
      .poll(() =>
        page.evaluate(() => {
          const c = window.__db._get('cards', 'c1');
          return c && c.scadenza;
        })
      )
      .toBeTruthy();

    expectNoFatalErrors(consoleErrors);
  });

  test('Ammonizioni: ammonisce lo studente dal commento della card', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 10000 });

    // Apre la CardDetail: il commento di Luca Bianchi ha il bottone "⚠️ Ammonisci"
    await page.getByText('Lezione su X').first().click();
    await expect(page.getByRole('button', { name: '⚠️ Ammonisci' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '⚠️ Ammonisci' }).click();

    // La AmmModal si apre (z-index 500) con lo studente precompilato
    await expect(page.getByText('Ammonisci studente').first()).toBeVisible({ timeout: 5000 });
    const modal = page.locator('[style*="z-index: 500"]').filter({ hasText: 'Ammonisci studente' }).first();
    await modal.getByPlaceholder('Scrivi la motivazione…').fill('Linguaggio inappropriato');
    await modal.getByRole('button', { name: '⚠️ Invia ammonizione' }).click();

    // L'ammonizione è stata salvata nel fake db (lista di Luca Bianchi)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const amm = window.__db._get('ammonizioni', 'Luca Bianchi');
          return amm && amm.lista && amm.lista.length;
        })
      )
      .toBe(2); // 1 seed + 1 nuova

    expectNoFatalErrors(consoleErrors);
  });

  test('EditAmm: il pannello ammonizioni della card apre la modale di modifica', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 10000 });

    // Apre la CardDetail: il pannello "⚠️ Ammoniti in questa card" ha il bottone ✏️
    await page.getByText('Lezione su X').first().click();
    await expect(page.getByText('⚠️ Ammoniti in questa card').first()).toBeVisible({ timeout: 5000 });
    // Scoping al pannello ammonizioni: ✏️ compare in molti altri bottoni UI
    // (es. ✏️ Modifica card), quindi NON usiamo getByRole globale.
    // (Fase 8b: il bottone ha ora aria-label "Modifica ammonizione di …".)
    const pannelloAmm = page.getByText('Ammoniti in questa card').locator('..');
    await pannelloAmm.getByRole('button', { name: /Modifica ammonizione/ }).click();

    // La EditAmmModal si apre (z-index 600)
    await expect(page.getByText('✏️ Modifica ammonizione').first()).toBeVisible({ timeout: 5000 });
    const modal = page.locator('[style*="z-index: 600"]').filter({ hasText: 'Modifica ammonizione' }).first();
    await modal.locator('#editamm-input').fill('Fuori tema (corretto)');
    await modal.getByRole('button', { name: '✓ Salva modifica' }).click();

    // L'ammonizione è stata modificata nel fake db (modificata: true)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const amm = window.__db._get('ammonizioni', 'Luca Bianchi');
          return amm && amm.lista && amm.lista[0] && amm.lista[0].modificata;
        })
      )
      .toBe(true);

    // FIX bug E2E: dopo il salvataggio la modale si chiude da sola (z-600)
    await expect(page.locator('[style*="z-index: 600"]')).not.toBeVisible({ timeout: 5000 });

    expectNoFatalErrors(consoleErrors);
  });

  test('Vista prof quiz: RISULTATI + classifica + valutazione aperte dalla CardDetail', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Quiz sulle frazioni').first()).toBeVisible({ timeout: 10000 });

    // Apre la CardDetail della card quiz: vista prof (RISULTATI + classifica)
    await page.getByText('Quiz sulle frazioni').first().click();
    await expect(page.getByText('RISULTATI (2 studenti)').first()).toBeVisible({ timeout: 5000 });

    // Scoping alla modale: 'Luca Bianchi' compare anche nel ProposalsPanel
    // (autore della proposta p1, visibile dietro la modale) → niente match globali.
    const modal = page.locator('.modal-inner').filter({ hasText: 'RISULTATI (2 studenti)' }).first();

    // Classifica: Giulia (90%, valutata con AI) prima di Luca (50%, in attesa).
    // Le percentuali sono uniche della classifica (i voti della grid non le usano).
    await expect(modal.getByText('Giulia Verdi')).toBeVisible();
    await expect(modal.getByText('✓ valutato con AI')).toBeVisible();
    await expect(modal.getByText('Luca Bianchi')).toBeVisible();
    await expect(modal.getByText('⏳ attende valutazione AI')).toBeVisible();
    await expect(modal.getByText('90%')).toBeVisible();
    await expect(modal.getByText('50%')).toBeVisible();

    // Bottoni: "Valuta risposte aperte con AI (1)" e "🗑️ Reset"
    await expect(modal.getByRole('button', { name: /Valuta risposte aperte con AI/ })).toBeVisible();
    await expect(modal.getByRole('button', { name: '🗑️ Reset' })).toBeVisible();

    expectNoFatalErrors(consoleErrors);
  });

  test('Profilo studente: la ProfiloModal si apre e mostra le statistiche', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.goto(HARNESS + '?user=studente', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Lezione su X').first()).toBeVisible({ timeout: 10000 });

    // Bottone "📊 Il mio profilo" (solo studente) → apre la ProfiloModal
    await page.getByRole('button', { name: '📊 Il mio profilo' }).click();

    // Scoping alla modale: "Luca Bianchi" appare anche nel pannello proposte
    // (p1 proposta del seed), quindi NON usiamo getByText globale.
    const modal = page.locator('[style*="z-index: 400"]').filter({ hasText: 'Commenti scritti' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText('Commenti scritti')).toBeVisible();
    await modal.getByRole('button', { name: 'Chiudi' }).click();
    // Dopo Chiudi la modale sparisce (scoping alla modale, non al pannello proposte)
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    expectNoFatalErrors(consoleErrors);
  });
});
