// utils/search.test.ts — evidenziazione dei risultati di ricerca (utils/search.ts).
// Copre: match accent-insensitive (coerente con norm() usata dalla ricerca),
// case-insensitive, multi-termine e fallback senza match. Logica pura, senza jsdom.
import { describe, it, expect } from 'vitest';
import { norm, hilite } from './search.ts';

// Factory JSX finta: ritorna {type, props, children} per ispezionare i <mark>.
function h(type: any, props: any, ...children: any[]) {
  return { type: type, props: props, children: children };
}

describe('norm', () => {
  it('minuscole e rimozione accenti', () => {
    expect(norm('Vendità ÉLÈ À')).toBe('vendita ele a');
  });

  it('gestisce input vuoti/null', () => {
    expect(norm('')).toBe('');
    expect(norm(null)).toBe('');
    expect(norm(undefined)).toBe('');
  });
});

describe('hilite', () => {
  it('evidenzia il termine anche con accenti diversi nel testo (vendita → Vendità)', () => {
    var res: any = hilite('Vendità del giorno', ['vendita'], h);
    expect(res.length).toBe(2);
    expect(res[0].type).toBe('mark');
    expect(res[0].children[0]).toBe('Vendità'); // slice sul testo ORIGINALE (accentato)
    expect(res[1]).toBe(' del giorno');
  });

  it('evidenzia anche se il termine digitato ha gli accenti (vendità → Vendita)', () => {
    var res: any = hilite('La Vendita', ['vendità'], h);
    expect(res[0]).toBe('La ');
    expect(res[1].type).toBe('mark');
    expect(res[1].children[0]).toBe('Vendita');
  });

  it('case-insensitive', () => {
    var res: any = hilite('La VENDITA di oggi', ['vendita'], h);
    expect(res[1].type).toBe('mark');
    expect(res[1].children[0]).toBe('VENDITA');
  });

  it('evidenzia tutti i termini (multi-termine)', () => {
    var res: any = hilite('compiti matematica', ['compiti', 'matematica'], h);
    var marks = res.filter(function (r: any) {
      return r && r.type === 'mark';
    });
    expect(marks.length).toBe(2);
    expect(marks[0].children[0]).toBe('compiti');
    expect(marks[1].children[0]).toBe('matematica');
  });

  it('senza match restituisce il testo intero (nessun <mark>)', () => {
    var res = hilite('Nessun match qui', ['xyz'], h);
    expect(res).toEqual(['Nessun match qui']);
  });

  it('termini vuoti o testo vuoto → testo invariato', () => {
    expect(hilite('abc', [], h)).toBe('abc');
    expect(hilite('', ['a'], h)).toBe('');
  });
});
