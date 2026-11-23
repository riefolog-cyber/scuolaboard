// @ts-nocheck — testa la logica del registro; il collegamento a process/React
// vive in `src/test-setup.ts` e non si può testare senza sporcare la suite.
import { describe, it, expect } from 'vitest';
import { creaGuardiaRejection, messaggioDi } from './rejection-guardia.ts';

describe('guardia delle unhandled rejection', function () {
  it('attribuisce la voce al test in corso', function () {
    var g = creaGuardiaRejection();
    g.inizia('apre la card');
    var v = g.registra(new Error('fbSave ha rifiutato'));
    expect(v.test).toBe('apre la card');
    expect(v.messaggio).toBe('fbSave ha rifiutato');
  });

  it('senza test in corso la voce è «fuori da un test»', function () {
    var g = creaGuardiaRejection();
    expect(g.registra('boom').test).toBe('(fuori da un test)');
  });

  it('segnala ogni voce a chi ascolta (`onVoce`)', function () {
    var viste: any[] = [];
    var g = creaGuardiaRejection({
      onVoce: function (v) {
        viste.push(v);
      },
    });
    g.inizia('con ascoltatore');
    g.registra(new Error('ecco'));
    expect(viste).toHaveLength(1);
    expect(viste[0].messaggio).toBe('ecco');
  });

  it('consuma una volta sola: il secondo test non eredita la voce', function () {
    var g = creaGuardiaRejection();
    g.inizia('primo');
    g.registra(new Error('primo errore'));
    expect(g.consuma('primo')).toHaveLength(1);
    expect(g.consuma('primo')).toHaveLength(0);
    expect(g.orfane()).toHaveLength(0);
  });

  it('orfane svuota: il singleton non risegnala le stesse voci nei file successivi', function () {
    var g = creaGuardiaRejection();
    g.inizia('A');
    g.registra('boom');
    expect(g.orfane()).toHaveLength(1);
    expect(g.orfane()).toHaveLength(0);
    g.fine();
    expect(g.corrente()).toBeNull();
  });

  it('le voci non reclamate restano orfane', function () {
    var g = creaGuardiaRejection();
    g.inizia('tardi');
    g.registra('arrivata dopo');
    expect(g.orfane()).toHaveLength(1);
  });

  it('messaggioDi non si rompe su forme diverse di reason', function () {
    expect(messaggioDi(new Error('x'))).toBe('x');
    expect(messaggioDi('stringa')).toBe('stringa');
    expect(messaggioDi(undefined)).toBe('undefined');
    expect(messaggioDi({ code: 403 })).toBe('{"code":403}');
    var circolare: any = {};
    circolare.self = circolare;
    expect(typeof messaggioDi(circolare)).toBe('string');
  });
});
