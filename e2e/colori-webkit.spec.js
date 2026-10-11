// e2e/colori-webkit.spec.js — le variabili CSS negli attributi SVG, su WebKit.
//
// I colori dei componenti sono passati da valori scritti a mano a
// `var(--c-…, valoreDiPrima)`: in tema scuro il risultato è identico per
// costruzione (il fallback è il valore di prima), e in tema chiaro il
// governa il tema. Il punto debole è il resto.
//
// Nello scheletro di caricamento della griglia (src/CardGrid.tsx) i colori
// NON sono in uno stile ma in attributi di presentazione SVG:
// `fill="rgba(var(--c-primary-rgb),.5)"`. Sugli attributi di presentazione la
// specifica li tratta come dichiarazioni CSS di bassa priorità, quindi
// `var()` DOVREBBE funzionare — ma "dovrebbe" non è una verifica.
//
// È stato verificato a mano su Chromium (rendering identico al valore
// precedente). Questo file è la guardia perché sia verificato anche sul motore
// di Safari, che è quello degli iPhone: coprire solo Chromium è già stato un
// buco vero in questo repository (vedi la premessa di allegati-webkit.spec.js).
//
// Locale serve `npx playwright install webkit`; la CI installa chromium + webkit.
import { test, expect } from '@playwright/test';

const PAGINA =
  '/scuolaboard/e2e/colori-var.html';

// Lo stesso valore in tre forme: con il token, scritto a mano (la situazione
// di prima) e con un token inesistente (per controllare il fallback).
const PAGINA_HTML =
  '<!doctype html><html><head><meta charset="utf-8"><title>colori</title><style>' +
  ':root{--c-primary-rgb:99,102,241}' +
  '</style></head><body><svg width="240" height="60">' +
  '<rect id="a" x="0" y="0" width="60" height="50" fill="rgba(var(--c-primary-rgb),.5)"/>' +
  '<rect id="b" x="70" y="0" width="60" height="50" fill="rgba(99,102,241,.5)"/>' +
  '<rect id="c" x="140" y="0" width="60" height="50" fill="var(--non-esiste,#0f0)"/>' +
  '</svg></body></html>';

// Il motore è impostato dal progetto Playwright 'webkit': questo file non
// deve dichiararlo, altrimenti si scontra con il canale ereditato.
test.describe('Colori — WebKit (motore di Safari)', () => {
  test('var() negli attributi SVG rende come il valore scritto a mano', async ({ page }) => {
    await page.route('**/colori-var.html', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: PAGINA_HTML })
    );
    await page.goto(PAGINA, { waitUntil: 'domcontentloaded' });

    const colori = await page.evaluate(() => {
      const leggi = (id) => getComputedStyle(document.getElementById(id)).fill;
      return { colToken: leggi('a'), colManuale: leggi('b'), colFallback: leggi('c') };
    });

    // Il punto: se il motore di Safari ignorasse `var()` negli attributi di
    // presentazione, il fill sarebbe `none` (o il valore di fallback del
    // browser) e lo scheletro della griglia comparirebbe senza colore.
    expect(colori.colToken).toBe(colori.colManuale);
    expect(colori.colToken).not.toBe('none');

    // Il fallback di `var(--token, valore)` è la garanzia che al buio non
    // cambi nulla: se il token non esiste deve comparire il valore di prima.
    expect(colori.colFallback).toBe('rgb(0, 255, 0)');
  });
});