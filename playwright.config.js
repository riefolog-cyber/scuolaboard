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
  use: {
    // In locale usa il Chrome gia installato (nessun download); in CI il
    // Chromium bundle installato con `npx playwright install`.
    channel: process.env.CI ? undefined : 'chrome',
    headless: true,
    viewport: { width: 1280, height: 800 },
    locale: 'it-IT',
    // Necessario per il test "Copia link": senza clipboard-write il Chromium
    // headless di CI rifiuta navigator.clipboard.writeText → il toast di
    // conferma non appare mai (fallisce il test, che in locale passa).
    permissions: ['clipboard-read', 'clipboard-write'],
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
