// @ts-nocheck — legge `styles.css` dal filesystem (node:fs/path), come
// `css-coerenti.test.ts`: vitest tratta i `.css` come fogli e `?raw` restituisce
// stringa vuota. Il tsconfig non carica @types/node per `__dirname`.
//
// Contrasto dei TOKEN nei due temi.
//
// PERCHÉ: `e2e/contrasto-temi.spec.js` misura quattro nodi veri nel browser, ma
// solo quelli che qualcuno ha deciso di cercare. Qui si controllano TUTTE le
// coppie testo/superficie dichiarate dai token: se un giorno `--sb-text-3` viene
// schiarito nel tema chiaro, il test diventa rosso in millisecondi, senza
// browser. Le due cose sono complementari: il test E2E prende gli stili inline
// dimenticati, questo prende i token.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { SELETTORE_TEMA_CHIARO, senzaCommenti, variabiliGlobali, variabiliIn } from './css-utils.ts';

const CSS = senzaCommenti(fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8'));
const SCURO = variabiliGlobali(CSS);
const CHIARO = Object.assign({}, SCURO, variabiliIn(SELETTORE_TEMA_CHIARO, CSS));

// Il fondo dell'app nei due temi: le superfici traslucide si compongono sopra.
const BASE: Record<string, number[]> = {
  dark: [15, 23, 42],
  light: [255, 255, 255],
};
const AA = 4.5;

function parse(valore: string): number[] {
  var v = String(valore || '').trim();
  // `var(--c-danger, #f87171)`: si usa il fallback, che è il colore del tema
  // scuro; quello chiaro lo sovrascrive con un valore diretto.
  var rif = v.match(/var\([^,]+,\s*([^)]+)\)/);
  if (rif) v = rif[1].trim();
  var hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    return [
      parseInt(hex[1].slice(0, 2), 16),
      parseInt(hex[1].slice(2, 4), 16),
      parseInt(hex[1].slice(4, 6), 16),
      1,
    ];
  }
  var rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    var q = rgb[1].split(',').map(function (x) {
      return parseFloat(x);
    });
    return [q[0], q[1], q[2], q.length > 3 ? q[3] : 1];
  }
  throw new Error('colore non riconosciuto: ' + valore);
}

function sopra(top: number[], bottom: number[]): number[] {
  var a = top[3];
  return [0, 1, 2].map(function (i) {
    return Math.round(top[i] * a + bottom[i] * (1 - a));
  });
}

function luminanza(rgb: number[]): number {
  function lin(c: number) {
    var s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

function contrasto(a: number[], b: number[]): number {
  var la = luminanza(a);
  var lb = luminanza(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe.each(['dark', 'light'])('contrasto dei token · tema %s', function (tema) {
  var token = tema === 'dark' ? SCURO : CHIARO;
  var base = BASE[tema];
  // Fondo della card: la superficie traslucida sopra il fondo dell'app.
  var surface = sopra(parse(token['--sb-surface']), base);

  it('i token esistono (il test non è vuoto)', function () {
    expect(token['--sb-surface']).toBeTruthy();
    expect(token['--sb-text-1']).toBeTruthy();
  });

  it.each(['--sb-text-1', '--sb-text-2', '--sb-text-3'])('%s regge AA sulla superficie della card', function (nome) {
    var testo = sopra(parse(token[nome]), surface);
    expect(contrasto(testo, surface), nome + ' su --sb-surface').toBeGreaterThanOrEqual(AA);
  });

  it.each(['--sb-text-1', '--sb-text-2', '--sb-text-3'])('%s regge AA sul fondo del tema', function (nome) {
    var testo = sopra(parse(token[nome]), base);
    expect(contrasto(testo, base), nome + ' sul fondo').toBeGreaterThanOrEqual(AA);
  });
});
