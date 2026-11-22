// urgenza.test.ts — stato scadenza per GIORNI di calendario, non per distanza in ore.
import { describe, it, expect } from 'vitest';
import { statoScadenza, labelScadenza, coloreScadenza } from './urgenza.ts';

// Costruisce una data LOCALE: così il test non dipende dal fuso del runner.
function giorno(ore: number, minuti: number, offsetGiorni = 0) {
  var d = new Date();
  d.setDate(d.getDate() + offsetGiorni);
  d.setHours(ore, minuti, 0, 0);
  return d;
}

describe('urgenza · statoScadenza', function () {
  it('senza scadenza o con data invalida → none', function () {
    expect(statoScadenza(null)).toBe('none');
    expect(statoScadenza('')).toBe('none');
    expect(statoScadenza('non-una-data')).toBe('none');
  });

  it('una scadenza passata è expired', function () {
    expect(statoScadenza(giorno(0, 1, -1).getTime())).toBe('expired');
  });

  it('una scadenza nello stesso giorno è today', function () {
    var now = giorno(9, 0).getTime();
    expect(statoScadenza(giorno(18, 30).getTime(), now)).toBe('today');
  });

  it('una scadenza di DOMANI è soon, non today (era il difetto: "Oggi" su domani)', function () {
    var now = giorno(9, 0).getTime();
    expect(statoScadenza(giorno(9, 0, 1).getTime(), now)).toBe('soon');
  });

  it('dopodomani non è più "in scadenza"', function () {
    var now = giorno(9, 0).getTime();
    expect(statoScadenza(giorno(9, 0, 2).getTime(), now)).toBe('ok');
  });

  it('l’ultima ora del giorno resta today, non soon', function () {
    var now = giorno(8, 0).getTime();
    expect(statoScadenza(giorno(23, 59).getTime(), now)).toBe('today');
  });
});

describe('urgenza · etichette e colori', function () {
  it('ogni stato ha l’etichetta che dice davvero', function () {
    expect(labelScadenza('expired')).toBe('Scaduta');
    expect(labelScadenza('today')).toBe('Oggi');
    expect(labelScadenza('soon')).toBe('Domani');
    expect(labelScadenza('ok')).toBe('');
    expect(labelScadenza('none')).toBe('');
  });

  it('i colori sono definiti per tutti gli stati', function () {
    (['expired', 'today', 'soon', 'ok'] as const).forEach(function (s) {
      var c = coloreScadenza(s);
      expect(c.bg).toBeTruthy();
      expect(c.fg).toBeTruthy();
      expect(c.bd).toBeTruthy();
    });
  });
});
