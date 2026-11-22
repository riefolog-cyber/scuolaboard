import { describe, it, expect } from 'vitest';
import { testoSecondario, TESTO_SECONDARIO_CHIARO, TESTO_SECONDARIO_SCURO } from './grafica-testi.ts';

// Contrasto WCAG 2.1: (L1+0.05)/(L2+0.05), con la luminanza relativa sRGB.
function lin(c: number) {
  var s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function lum(rgb: number[]) {
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}
function hex(h: string) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
// Testo traslucido sopra un fondo: compositing alpha, come fa il browser.
function sopra(alpha: number, fondo: number[]) {
  return fondo.map(function (c) {
    return Math.round(255 * alpha + c * (1 - alpha));
  });
}
function contrasto(a: number[], b: number[]) {
  var la = lum(a);
  var lb = lum(b);
  var hi = Math.max(la, lb);
  var lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// Fondi PEGGIORI plausibili: card scura con l'overlay bianco già applicato
// (#1e293b, slate-800) e card chiara non bianca (#e2e8f0, slate-200).
var CARD_SCURA = hex('#1e293b');
var CARD_CHIARA = hex('#e2e8f0');
var AA = 4.5;

describe('grafica · contrasto dei testi secondari', function () {
  it('il difetto di prima: rgba(255,255,255,.42) su card scura era sotto AA', function () {
    var c = contrasto(sopra(0.42, CARD_SCURA), CARD_SCURA);
    expect(c).toBeLessThan(AA); // ≈3,6:1
  });

  it('il testo secondario scuro supera AA anche sul fondo peggiore', function () {
    var c = contrasto(sopra(0.6, CARD_SCURA), CARD_SCURA);
    expect(c).toBeGreaterThanOrEqual(AA);
    expect(TESTO_SECONDARIO_SCURO).toBe('rgba(255,255,255,.6)');
  });

  it('il testo secondario chiaro supera AA su una card non bianca', function () {
    expect(contrasto(hex(TESTO_SECONDARIO_CHIARO), CARD_CHIARA)).toBeGreaterThanOrEqual(AA);
  });

  it('testoSecondario sceglie il valore del tema', function () {
    expect(testoSecondario(false)).toBe(TESTO_SECONDARIO_SCURO);
    expect(testoSecondario(true)).toBe(TESTO_SECONDARIO_CHIARO);
  });
});
