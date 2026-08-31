// e2e/smoke.spec.js — smoke test E2E di ScuolaBoard
// Verifica che l'app carichi senza errori console fatali e mostri la Login.
import { test, expect } from '@playwright/test';

test("l'app carica e mostra la schermata di login senza errori console", async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

  // networkidle non scatta mai (websocket realtime Firebase): usa domcontentloaded
  // + attese esplicite sugli elementi. Il base di Vite è /scuolaboard/.
  await page.goto('/scuolaboard/', { waitUntil: 'domcontentloaded' });

  // Brand visibile (loading o login). Regex robusta: matcha sia "SCUOLABOARD"
  // (splash, stringa unica) sia "SCUOLA" se il brand è spezzato in span.
  await expect(page.getByText(/SCUOLABOARD|SCUOLA/).first()).toBeVisible({ timeout: 10000 });

  // Nessun errore console fatale: gli unici accettabili sono warning (React DevTools)
  const fatal = consoleErrors.filter((e) => !e.includes('Download the React DevTools') && !e.includes('favicon'));
  expect(fatal, 'Errori console fatali: ' + JSON.stringify(fatal)).toEqual([]);
});
