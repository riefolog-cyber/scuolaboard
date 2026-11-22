import { describe, it, expect } from 'vitest';
import { badgeStato } from './stato-card.ts';

describe('stato-card · badge di stato', function () {
  it('l’ordine è la priorità: fissata, poi nascosta, poi nuova', function () {
    var b = badgeStato({ pinned: true, nascosta: true, nuova: true, isProf: true });
    expect(b.map(function (x) { return x.key; })).toEqual(['pin', 'nasc', 'nuovo']);
  });

  it('senza flag non produce badge', function () {
    expect(badgeStato({})).toEqual([]);
  });

  it('lo studente non vede il badge NASCOSTA (la card nascosta non esiste per lui)', function () {
    var b = badgeStato({ nascosta: true, isProf: false });
    expect(b).toEqual([]);
  });

  it('il colore del testo è sempre un token del tema', function () {
    // Nel tema chiaro i fg fissi (#d8b4fe, #4ade80) sparivano sulla card bianca:
    // se qualcuno ne rimette uno, il test lo dice subito.
    var b = badgeStato({ pinned: true, nascosta: true, nuova: true, isProf: true });
    b.forEach(function (x) {
      expect(x.fg).toMatch(/^var\(--sb-/);
    });
  });

  it('l’avviso di annuncio non è uno stato della card', function () {
    var b = badgeStato({ pinned: true, nascosta: true, nuova: true, isProf: true });
    expect(b.some(function (x) { return x.key === 'avviso'; })).toBe(false);
  });
});
