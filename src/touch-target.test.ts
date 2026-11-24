// touch-target.test.ts — i pulsanti dei filtri devono restare cliccabili col dito.
//
// PERCHÉ: la barra filtri è la zona più densa della bacheca e aveva pulsanti da
// 20-22 px, sotto la soglia WCAG 2.2 "target size" (24x24). Su telefono si
// sbagliava facile a premere "Solo prof" o la × di una classe. La correzione è
// nei sorgenti; qui si congela, perché è un difetto che nessun test visivo vede.
import { describe, it, expect } from 'vitest';
import filterBarRaw from './FilterBar.tsx?raw';
import appLayoutRaw from './AppLayout.tsx?raw';

var FILE: Record<string, string> = {
  'FilterBar.tsx': filterBarRaw,
  'AppLayout.tsx': appLayoutRaw,
};
var PICCOLO = /min(?:Height|Width):\s*(\d+)/g;

function senzaCommenti(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('accessibilità · area minima dei controlli', function () {
  it('nessun minHeight/minWidth sotto 24px (0 = layout flex, non un pulsante)', function () {
    Object.keys(FILE).forEach(function (nome) {
      var trovati: string[] = [];
      var m: RegExpExecArray | null;
      var testo = senzaCommenti(FILE[nome]);
      PICCOLO.lastIndex = 0;
      while ((m = PICCOLO.exec(testo)) !== null) {
        var n = Number(m[1]);
        if (n > 0 && n < 24) trovati.push(m[0]);
      }
      expect(trovati, nome + ': ' + trovati.join(', ')).toEqual([]);
    });
  });

  it('la guardia riconosce davvero un pulsante troppo piccolo', function () {
    expect('minHeight: 22'.match(PICCOLO)).toHaveLength(1);
    expect('minWidth: 18'.match(PICCOLO)).toHaveLength(1);
    expect('minHeight: 24'.match(PICCOLO)).toHaveLength(1);
  });
});
