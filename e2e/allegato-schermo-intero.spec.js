// e2e/allegato-schermo-intero.spec.js — l'overlay su CHROMIUM.
//
// Il motore è impostato dal progetto Playwright 'chromium' (vedi
// playwright.config.js): questo file non deve dichiararlo, altrimenti si
// scontra con il canale ereditato. I casi vivono in
// `allegato-schermo-intero-casi.js`, condivisi con il progetto webkit.
import { test, expect } from '@playwright/test';
import { casiAllegatoSchermoIntero } from './allegato-schermo-intero-casi.js';

test.describe('Allegato a schermo intero — Chromium', () => {
  casiAllegatoSchermoIntero(test, expect);
});