// @ts-nocheck — legge styles.css dal filesystem, come gli altri test statici.
// touch-target.test.ts — i pulsanti dei filtri devono restare cliccabili col dito.
//
// PERCHÉ: la barra filtri è la zona più densa della bacheca e aveva pulsanti da
// 20-22 px, sotto la soglia WCAG 2.2 "target size" (24x24). Su telefono si
// sbagliava facile a premere "Solo prof" o la × di una classe. La correzione è
// nei sorgenti; qui si congela, perché è un difetto che nessun test visivo vede.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { senzaCommenti } from './css-utils.ts';
import filterBarRaw from './FilterBar.tsx?raw';
import appLayoutRaw from './AppLayout.tsx?raw';

const CSS = senzaCommenti(fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8'));

var FILE: Record<string, string> = {
  'FilterBar.tsx': filterBarRaw,
  'AppLayout.tsx': appLayoutRaw,
};
var PICCOLO = /min(?:Height|Width):\s*['"]?(\d+(?:\.\d+)?)/g;

function senzaCommenti(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function piccoli(src: string): string[] {
  var trovati: string[] = [];
  var m: RegExpExecArray | null;
  var testo = senzaCommenti(src);
  PICCOLO.lastIndex = 0;
  while ((m = PICCOLO.exec(testo)) !== null) {
    var n = Number(m[1]);
    if (n > 0 && n < 24) trovati.push(m[1]);
  }
  return trovati;
}

describe('accessibilità · area minima dei controlli', function () {
  it('la lista dei file sorvegliati non si è ristretta', function () {
    expect(Object.keys(FILE).sort()).toEqual(['AppLayout.tsx', 'FilterBar.tsx']);
  });

  it('i pallini accento hanno area 24px nel CSS (non più solo in inline)', function () {
    // La geometria è passata dall'inline a `.accent-dot`: senza questo controllo
    // resterebbe coperta solo da axe, che è un test E2E e non gira sempre.
    var blocco = (CSS.match(/\.accent-dot\{[^}]*\}/) || [])[0] || '';
    expect(blocco, '.accent-dot con area 24px').toMatch(/width\s*:\s*24px/);
    expect(blocco, '.accent-dot con area 24px').toMatch(/height\s*:\s*24px/);
    // Guardia della guardia: una regola solo commentata non deve bastare.
    expect(senzaCommenti('/* .accent-dot{width:24px;height:24px} */')).toBe('');
  });

  it('nessun minHeight/minWidth sotto 24px (0 = layout flex, non un pulsante)', function () {
    Object.keys(FILE).forEach(function (nome) {
      expect(piccoli(FILE[nome]), nome).toEqual([]);
    });
  });

  it('la scansione completa funziona, non solo il regex (commenti e soglie)', function () {
    var finto = '/* minHeight: 10 (commento, va ignorato) */\n' +
      'var a = { minHeight: 22, width: 14 };\n' +
      'var b = { minHeight: 24, minWidth: \'24px\' };\n' +
      'var c = { minHeight: \'22px\' };';
    expect(piccoli(finto)).toEqual(['22', '22']);
  });

  it('la guardia riconosce davvero un pulsante troppo piccolo', function () {
    expect('minHeight: 22'.match(PICCOLO)).toHaveLength(1);
    expect('minWidth: 18'.match(PICCOLO)).toHaveLength(1);
    expect('minHeight: 24'.match(PICCOLO)).toHaveLength(1);
  });
});

// NOTA: `width`/`height` senza `min` non sono in scope qui (il separatore e lo
// span interno dei pallini hanno dimensioni proprie). La classe di difetto è
// coperta da axe `target-size` su browser reale: è lui che ha trovato i pallini
// «Accento» da 14px, che questo test statico non vedeva.
