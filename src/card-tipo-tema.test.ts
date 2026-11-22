// card-tipo-tema.test.ts — colore/icona/etichetta del tipo hanno UNA fonte.
import { describe, it, expect } from 'vitest';
import { temaTipo, etichettaTipo } from './card-tipo-tema.ts';
import { badgeBg, tipoIcon } from './utils/format.ts';

describe('card-tipo-tema · fonte unica', function () {
  it('badgeBg e tipoIcon derivano dal tema (stessi valori di CardItem/CardGrid)', function () {
    (['domanda', 'sondaggio', 'quiz', 'nota', '', 'altro'] as string[]).forEach(function (t) {
      expect(badgeBg(t)).toBe(temaTipo(t).badge);
      expect(tipoIcon(t)).toBe(temaTipo(t).icon);
    });
  });

  it('un tipo sconosciuto cade su nota, senza undefined', function () {
    expect(temaTipo('boh').key).toBe('nota');
    expect(temaTipo(undefined as any).key).toBe('nota');
    expect(temaTipo('QUIZ').icon).toBe('🧩');
  });

  it('etichettaTipo è maiuscola, con NOTA per il vuoto', function () {
    expect(etichettaTipo('domanda')).toBe('DOMANDA');
    expect(etichettaTipo('quiz')).toBe('QUIZ');
    expect(etichettaTipo('')).toBe('NOTA');
  });
});
