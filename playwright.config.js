// playwright.config.js - E2E smoke test (browser reale con Chrome di sistema)
// Uso: npx playwright test
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [['list']],
  // PROGETTI: il motore conta e non è ridondante. Chromium (Chrome di sistema in
  // locale) copre il comportamento generale; WebKit copre il motore di Safari, cioè
  // quello degli iPhone. È proprio WebKit ad aver mostrato che la preview HTML con
  // srcDoc + sandbox="" restava BIANCA su iOS mentre su Chrome andava
  // (e2e/allegati-webkit.spec.js è la guardia: senza, il difetto torna silenzioso).
  projects: [
    {
      name: 'chromium',
      testIgnore: /webkit\.spec\.js/,
      // In locale usa il Chrome già installato (nessun download); in CI il Chromium
      // bundle installato con `npx playwright install`.
      use: {
        browserName: 'chromium',
        channel: process.env.CI ? undefined : 'chrome',
        // Necessario per il test "Copia link": senza clipboard-write il Chromium
        // headless di CI rifiuta navigator.clipboard.writeText → il toast di
        // conferma non appare mai (fallisce il test, che in locale passa).
        // È un permesso solo di Chromium: WebKit risponde "Unknown permission" e non
        // si avvia, quindi va dichiarato qui e non al livello comune.
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
    {
      name: 'webkit',
      testMatch: /webkit\.spec\.js/,
      // Niente channel: è quello che faceva fallire l'avvio ("Unsupported webkit
      // channel chrome") quando il canale veniva ereditato dal livello superiore.
      // Niente clipboard: WebKit non conosce quei permessi.
      use: { browserName: 'webkit', permissions: [] },
    },
  ],
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    locale: 'it-IT',
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // Dev server per i test harness (Firebase finto via harness.html)
      command: 'npm run dev',
      url: 'http://localhost:5173/scuolaboard/',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      // Preview della build di produzione (test "PROD 4173"). In CI parte
      // dopo il passo `npm run build`; in locale riusa un preview già attivo.
      command: 'npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173/scuolaboard/',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
