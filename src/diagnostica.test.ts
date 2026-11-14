// @ts-nocheck — test UNITARI di diagnostica.ts (errori non gestiti + tempi di avvio).
import { describe, it, expect, beforeEach } from 'vitest';
import { avviaDiagnostica, segna, durate, elencoErrori, svuotaErrori, azzera, testoDiagnostica, MAX_ERRORI } from './diagnostica.ts';

beforeEach(function () {
  azzera();
  avviaDiagnostica();
});

describe('diagnostica · avvio', function () {
  it('avviaDiagnostica è idempotente: due chiamate non duplicano gli ascoltatori', function () {
    avviaDiagnostica();
    avviaDiagnostica();
    window.dispatchEvent(new ErrorEvent('error', { message: 'once' }));
    expect(elencoErrori()).toHaveLength(1);
  });

  it('segna registra la PRIMA occorrenza di ogni tappa', function () {
    segna('auth');
    segna('primo-snapshot');
    segna('auth'); // seconda, ignorata
    var nomi = durate().map(function (d) { return d.nome; });
    expect(nomi).toEqual(['auth', 'primo-snapshot']);
  });

  it('durate sono ms non negativi e crescenti in ordine di arrivo', function () {
    segna('a');
    segna('b');
    var d = durate();
    expect(d).toHaveLength(2);
    expect(typeof d[0].ms).toBe('number');
    expect(d[0].ms).toBeGreaterThanOrEqual(0);
    expect(d[1].ms).toBeGreaterThanOrEqual(d[0].ms);
  });
});

describe('diagnostica · errori', function () {
  it('un ErrorEvent finisce in elenco come "errore"', function () {
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }));
    var e = elencoErrori();
    expect(e).toHaveLength(1);
    expect(e[0].tipo).toBe('errore');
    expect(e[0].messaggio).toContain('boom');
  });

  it('una promessa rifiutata finisce in elenco come "promessa"', function () {
    var ev: any = new Event('unhandledrejection');
    ev.reason = new Error('nope');
    window.dispatchEvent(ev);
    var e = elencoErrori();
    expect(e.some(function (x) { return x.tipo === 'promessa'; })).toBe(true);
    expect(e.some(function (x) { return x.messaggio.indexOf('nope') >= 0; })).toBe(true);
  });

  it('il buffer circolare tiene le ultime MAX_ERRORI voci', function () {
    for (var i = 0; i < MAX_ERRORI + 5; i++) {
      window.dispatchEvent(new ErrorEvent('error', { message: 'e' + i }));
    }
    var e = elencoErrori();
    expect(e).toHaveLength(MAX_ERRORI);
    // la prima voce conservata è la #5 (0..4 scartate)
    expect(e[0].messaggio).toContain('e5');
  });

  it("svuotaErrori azzera l'elenco", function () {
    window.dispatchEvent(new ErrorEvent('error', { message: 'x' }));
    expect(elencoErrori()).toHaveLength(1);
    svuotaErrori();
    expect(elencoErrori()).toHaveLength(0);
  });
});

describe('diagnostica · testo copiabile', function () {
  it('maschera email e telefono e porta i metadati freddi', function () {
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'scrivi a mario.rossi@scuolaboard.it oppure 333 1234567',
      error: new Error('scrivi a mario.rossi@scuolaboard.it oppure 333 1234567'),
    }));
    segna('auth');
    var t = testoDiagnostica({ versione: '1.2.3', tema: 'scuro' });
    expect(t).toContain('[EMAIL_1]');
    expect(t).toContain('[TEL_1]');
    expect(t).not.toContain('mario.rossi@scuolaboard.it');
    expect(t).not.toContain('333 1234567');
    expect(t).toContain('Versione: 1.2.3');
    expect(t).toContain('Tema: scuro');
    expect(t).toContain('auth:');
  });

  it('senza errori scrive "nessuno"', function () {
    var t = testoDiagnostica({});
    expect(t.indexOf('nessuno')).toBeGreaterThanOrEqual(0);
  });

  it('il messaggio lungo viene troncato a 300 caratteri', function () {
    var lungo = new Array(400).join('a');
    window.dispatchEvent(new ErrorEvent('error', { message: lungo, error: new Error(lungo) }));
    var e = elencoErrori();
    expect(e[0].messaggio.length).toBeLessThanOrEqual(301); // 300 + '…'
  });
});
