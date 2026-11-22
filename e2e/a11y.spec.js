// e2e/a11y.spec.js — audit di accessibilità con axe, nei due temi.
//
// PERCHÉ SOLO CINQUE REGOLE: l'app è grande e un audit completo produce decine
// di segnalazioni (alcune giuste, molte da valutare). Queste sono quelle che
// hanno già causato bug veri — testi invisibili nel tema chiaro
// (color-contrast), bottoni senza nome accessibile — e devono restare a zero.
// Se serve alzare l'asticella, si aggiungono regole qui, una alla volta.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const URL = '/scuolaboard/e2e/harness.html?css=1';
// `nested-interactive` è la quinta: trova i controlli annidati (un bottone dentro
// un altro), che rompono la tastiera e lo screen reader. Aggiunta dopo che le
// prime quattro erano a zero, non insieme: una regola alla volta, così quando
// diventa rossa si sa quale causa guardare.
const REGOLE = ['color-contrast', 'button-name', 'link-name', 'label', 'nested-interactive'];

// Axe legge i colori CALCOLATI: se l'audit parte durante l'animazione di apertura
// del dettaglio, l'opacità intermedia fa sembrare tutto sotto contrasto (falso
// positivo: i colori reali erano 7,4:1 e 10,3:1). Si chiede al browser la
// riduzione del movimento — che `styles.css` rispetta già — invece di aspettare
// "nessuna animazione": la bacheca ne ha una infinita, e quell'attesa non
// arriverebbe mai.
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
  test('bacheca e dettaglio senza violazioni nelle regole base (' + tema + ')', async ({ page }) => {
    await apri(page, tema);

    async function violazioni() {
      const r = await new AxeBuilder({ page }).withRules(REGOLE).analyze();
      return r.violations.map((v) => ({
        regola: v.id,
        impatto: v.impact,
        nodi: v.nodes.slice(0, 3).map((n) => ({
          target: n.target.join(' '),
          // Il riepilogo dice i colori misurati: senza, un rosso axe è
          // indistinguibile da un falso positivo dell'animazione.
          perche: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 220),
        })),
      }));
    }

    expect(await violazioni(), 'bacheca (' + tema + ')').toEqual([]);

    await page.locator('.card-wrap').first().click();
    await expect(page.locator('#cd-commenti')).toBeVisible();
    expect(await violazioni(), 'dettaglio (' + tema + ')').toEqual([]);
  });
}
