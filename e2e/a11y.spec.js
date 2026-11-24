// e2e/a11y.spec.js — audit di accessibilità con axe, nei due temi.
//
// PERCHÉ SOLO SEI REGOLE: l'app è grande e un audit completo produce decine
// di segnalazioni (alcune giuste, molte da valutare). Queste sono quelle che
// hanno già causato bug veri — testi invisibili nel tema chiaro
// (color-contrast), bottoni senza nome accessibile — e devono restare a zero.
// Se serve alzare l'asticella, si aggiungono regole qui, una alla volta.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// `a11y=1` aggiunge alla seed una card con scadenza: i badge urgenza e il
// countdown non comparivano mai nell'audit, quindi i loro colori non erano
// coperti da axe (li copriva solo il test statico dei token).
const URL = '/scuolaboard/e2e/harness.html?css=1&a11y=1';
// `target-size` (WCAG 2.2) è la sesta: controlla che i pulsanti siano almeno
// 24x24. Aggiunta dopo che le prime cinque erano a zero, una alla volta, così
// quando diventa rossa si sa quale causa guardare.
const REGOLE = ['color-contrast', 'button-name', 'link-name', 'label', 'nested-interactive', 'target-size'];

async function violazioni(page) {
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
  // Deve esserci UN solo pulsante tema: è sempre montato, cambia solo il titolo
  // (la destinazione). Se sparisce, il selettore dell'audit non è più affidabile.
  await expect(page.locator('[title^="Tema"]')).toHaveCount(1);
  const toggle = page.locator('[title="' + destinazione + '"]');
  if ((await toggle.count()) > 0) await toggle.first().click();
  // Guardia della guardia: se la seed con scadenza sparisce, l'audit dei badge
  // diventa cieco senza che nessun test lo dica.
  await expect(page.locator('#card-cScad').getByText(/Oggi|Domani|Scaduta|⏰/).first()).toBeVisible();
  await expect(page.locator('.card-wrap').first()).toBeVisible();
}

for (const tema of ['light', 'dark']) {
  test('bacheca e dettaglio senza violazioni nelle regole base (' + tema + ')', async ({ page }) => {
    await apri(page, tema);

    expect(await violazioni(page), 'bacheca (' + tema + ')').toEqual([]);

    // Vista elenco: è dove `content-visibility` è appena entrato, e dove ogni
    // riga è un <button> che contiene altri bottoni (nested-interactive).
    const elenco = page.locator('[title="Elenco"]');
    // Esplicito (non `if count>0`): se il toggle viene rinominato, l'errore è
    // «manca Elenco» e non un `.list-row` invisibile dal messaggio ambiguo.
    await expect(elenco).toHaveCount(1);
    await elenco.first().click();
    await expect(page.locator('.list-row').first()).toBeVisible();
    expect(await violazioni(page), 'elenco (' + tema + ')').toEqual([]);

    // Si torna alla griglia: il dettaglio si apre da `.card-wrap`, che in elenco
    // non esiste.
    const griglia = page.locator('[title="Griglia"]');
    await expect(griglia).toHaveCount(1);
    await griglia.first().click();

    await page.locator('.card-wrap').first().click();
    await expect(page.locator('#cd-commenti')).toBeVisible();
    expect(await violazioni(page), 'dettaglio (' + tema + ')').toEqual([]);
  });

  test('toast e badge scadenza senza violazioni (' + tema + ')', async ({ page }) => {
    // Il badge con scadenza è auditato da `apri()` (che ne verifica la presenza).
    // "Copia link" mostra un toast che si auto-rimuove dopo 2,4s: allunghiamo SOLO
    // quel timer (non page.clock, che blocca axe) così l'audit lo vede davvero.
    await page.addInitScript(function () {
      var reale = window.setTimeout;
      window.setTimeout = function (fn, ms) {
        // Durata letta dalla config dell'app (useToast.ts): se cambia, il patch
        // la segue invece di diventare un numero magico vuoto.
        var durataToast = (window.SB_CONFIG && window.SB_CONFIG.TOAST_TIMEOUT_MS) || 2400;
        var args = Array.prototype.slice.call(arguments, 2);
        return reale.call(window, fn, ms === durataToast ? 60000 : ms, ...args);
      };
    });
    await apri(page, tema);
    await page.locator('#card-c1').getByRole('button', { name: 'Altre azioni' }).click();
    await page.locator('#card-c1').getByRole('button', { name: 'Copia link' }).click();
    await expect(page.locator('.toast').first()).toBeVisible();
    expect(await violazioni(page), 'toast (' + tema + ')').toEqual([]);
    // Il toast deve essere ANCORA lì dopo l'audit: prova che è stato esaminato.
    await expect(page.locator('.toast').first()).toBeVisible();
  });
}
