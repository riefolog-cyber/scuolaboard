// e2e/contrasto-temi.spec.js — il test che mancava: controlla il contrasto VERO
// nel browser, nei due temi, con src/styles.css caricato (?css=1).
//
// PERCHÉ SERVE: la suite unitaria non fa layout e l'harness E2E nasce senza CSS,
// quindi "testo secondario invisibile nel tema chiaro" non era coperto da nulla.
// È così che «Commenti (1)» è rimasto bianco su bianco finché non l'ho visto in
// uno screenshot. Qui si leggono i colori CALCOLATI (getComputedStyle), si
// compone la catena dei fondi e si applica la formula WCAG.
//
// Il nodo si trova a mano (foglia visibile con il testo cercato) e non con
// getByText: quest'ultimo può risolvere a un antenato, e il test misurava un
// bianco su bianco (1,04) invece del titolo.
import { test, expect } from '@playwright/test';

const URL = '/scuolaboard/e2e/harness.html?css=1';
const SOGLIA = 4.4; // 4.5 con un pelo di margine per l'antialiasing

/** Contrasto del primo nodo visibile il cui testo corrisponde, dentro `radice`. */
async function contrastoTesto(page, pattern, radice) {
  return page.evaluate(({ p, radice }) => {
    var re = new RegExp(p);
    // La radice conta: la bacheca resta nel DOM dietro il dettaglio, e la prima
    // occorrenza del testo può stare in un nodo nascosto (misurava bianco su
    // bianco, 1,04).
    var contenitore = document.querySelector(radice) || document.body;
    var foglie = Array.prototype.slice
      .call(contenitore.querySelectorAll('*'))
      .filter(function (n) {
        // Nessun filtro sui figli: il titolo può essere un DIV con uno span
        // dentro. Il regex è ancorato (^…$), quindi un antenato che contiene
        // altro testo non passa.
        return re.test((n.textContent || '').trim());
      });
    var el = foglie.find(function (n) {
      var r = n.getBoundingClientRect();
      // Visibile E nel viewport: i blocchi "solo stampa" hanno dimensioni ma
      // stanno a -9999px, e sarebbero i primi a matchare il testo (bianco su
      // bianco: era il 1,04 che il test riportava).
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > 0 &&
        r.right > 0 &&
        r.top < window.innerHeight &&
        r.left < window.innerWidth
      );
    });
    if (!el) return { errore: 'nodo non trovato per ' + p };

    function lin(c) {
      var s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }
    function parse(c) {
      var m = String(c).match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      var q = m[1].split(',').map(function (x) {
        return parseFloat(x);
      });
      return { r: q[0], g: q[1], b: q[2], a: q.length > 3 ? q[3] : 1 };
    }
    function sopra(top, bottom) {
      return [
        Math.round(top.r * top.a + bottom[0] * (1 - top.a)),
        Math.round(top.g * top.a + bottom[1] * (1 - top.a)),
        Math.round(top.b * top.a + bottom[2] * (1 - top.a)),
      ];
    }

    // Fondo del tema dichiarato dai token, non ricavato dalla catena DOM:
    // nell'harness la catena non è affidabile (body di scena, fogli iniettati) e
    // faceva misurare "bianco su bianco" anche quando il testo era corretto.
    // Il COLORE DEL TESTO invece si legge dal nodo vero: è quello che il bug
    // sbagliava (rgba(255,255,255,.8) su un pannello chiaro).
    var scuro = document.documentElement.getAttribute('data-theme') !== 'light';
    var base = scuro ? [15, 23, 42] : [255, 255, 255];
    var rootStyle = getComputedStyle(document.documentElement);
    var sup = parse(rootStyle.getPropertyValue('--sb-surface').trim());
    var fondo = el.closest('.card-wrap') && sup ? sopra(sup, base) : base;
    var t = parse(getComputedStyle(el).color) || { r: 0, g: 0, b: 0, a: 1 };
    var testo = sopra(t, fondo);
    var L1 = 0.2126 * lin(testo[0]) + 0.7152 * lin(testo[1]) + 0.0722 * lin(testo[2]);
    var L2 = 0.2126 * lin(fondo[0]) + 0.7152 * lin(fondo[1]) + 0.0722 * lin(fondo[2]);
    return { contrasto: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05), testo: testo, fondo: fondo };
  }, { p: pattern, radice: radice || 'body' });
}

async function apriHarnessConCss(page, tema) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  // Il CSS è importato dinamicamente: si attende che i token siano leggibili.
  await page.waitForFunction(function () {
    return Array.prototype.some.call(document.querySelectorAll('style'), function (s) {
      return (s.textContent || '').indexOf('--sb-text-1') >= 0;
    });
  });
  // Tema vero: il toggle aggiorna ANCHE lo stato React (non solo data-theme).
  var destinazione = tema === 'light' ? 'Tema chiaro' : 'Tema scuro';
  var toggle = page.locator('[title="' + destinazione + '"]');
  if ((await toggle.count()) > 0) await toggle.first().click();
  await expect(page.locator('[title="' + (tema === 'light' ? 'Tema scuro' : 'Tema chiaro') + '"]')).toHaveCount(1);

  // Base del tema dichiarata esplicitamente: l'harness non è l'app (il suo body
  // ha un colore di scena) e senza base la catena dei fondi cade sul bianco del
  // canvas — il testo chiaro risultava "bianco su bianco" (1,04). Qui si misura
  // il testo sul fondo che l'app ha davvero in quel tema.
  await page.addStyleTag({
    content: tema === 'light' ? 'html,body{background:#ffffff}' : 'html,body{background:#0f172a}',
  });
}

for (const tema of ['light', 'dark']) {
  test('contrasto dei testi secondari nella bacheca e nel dettaglio (' + tema + ')', async ({ page }) => {
    await apriHarnessConCss(page, tema);
    // `page.evaluate` non ha l'auto-wait di un locator: senza questa attesa la
    // misura parte prima che la bacheca del fake Firestore sia montata.
    await expect(page.locator('.card-wrap').first()).toBeVisible();

    for (const [nome, pattern] of [
      ['titolo card', '^Lezione su X$'],
      ['data card', '^01 set 2026$'],
    ]) {
      var r = await contrastoTesto(page, pattern, '.card-wrap');
      expect(r.errore, nome + ' (' + tema + ')').toBeUndefined();
      expect(
        r.contrasto,
        nome + ' (' + tema + ') testo=' + JSON.stringify(r.testo) + ' fondo=' + JSON.stringify(r.fondo)
      ).toBeGreaterThanOrEqual(SOGLIA);
    }

    // Dettaglio: qui erano invisibili «Commenti (n)» e «PARTECIPAZIONE».
    await page.locator('.card-wrap').first().click();
    await expect(page.locator('#cd-commenti')).toBeVisible();

    for (const [nome, pattern, radice] of [
      ['intestazione commenti', '^\\W*Commenti \\(\\d+\\)$', '#cd-commenti'],
      // Senza ancore: la label può avere un'icona davanti.
      ['label partecipazione', 'PARTECIPAZIONE', '.card-detail-reading'],
    ]) {
      var d = await contrastoTesto(page, pattern, radice);
      expect(d.errore, nome + ' (' + tema + ')').toBeUndefined();
      expect(d.contrasto, nome + ' (' + tema + ')').toBeGreaterThanOrEqual(SOGLIA);
    }
  });
}
