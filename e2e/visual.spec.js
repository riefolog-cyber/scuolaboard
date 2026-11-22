// e2e/visual.spec.js — regressione visiva OPZIONALE.
//
// PERCHÉ NON GIRA SEMPRE: le baseline dipendono da font, antialiasing e versione
// del browser. In CI produrrebbero diff rumorosi; qui si attivano a mano:
//
//   VISUAL=1 npx playwright test e2e/visual.spec.js            # confronta
//   VISUAL=1 npx playwright test e2e/visual.spec.js --update-snapshots  # approva
//
// Con VISUAL non impostato il file salta: la CI resta com'era.
import { test, expect } from '@playwright/test';

test.skip(!process.env.VISUAL, 'Regressione visiva: attivare con VISUAL=1');

const URL = '/scuolaboard/e2e/harness.html?css=1';

// Le card entrano con `animation-delay` e il dettaglio con una transizione: uno
// screenshot preso a metà è un diff che non parla del layout. Si chiede al
// browser la riduzione del movimento (che `styles.css` rispetta già) invece di
// un tempo fisso: niente attesa che invecchia quando cambia una durata, e
// nessuna attesa infinita sulla bacheca (che ha un'animazione che non finisce).
async function apri(page, tema) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('style')).some((s) => (s.textContent || '').includes('--sb-text-1'))
  );
  const destinazione = tema === 'light' ? 'Tema chiaro' : 'Tema scuro';
  const toggle = page.locator('[title="' + destinazione + '"]');
  if ((await toggle.count()) > 0) await toggle.first().click();
  await expect(page.locator('.card-wrap').first()).toBeVisible();
}

for (const tema of ['light', 'dark']) {
  test('bacheca e dettaglio (' + tema + ')', async ({ page }) => {
    await apri(page, tema);
    await expect(page).toHaveScreenshot('bacheca-' + tema + '.png', { maxDiffPixelRatio: 0.02 });

    await page.locator('.card-wrap').first().click();
    await expect(page.locator('#cd-commenti')).toBeVisible();
    await expect(page).toHaveScreenshot('dettaglio-' + tema + '.png', { maxDiffPixelRatio: 0.02 });
  });
}
