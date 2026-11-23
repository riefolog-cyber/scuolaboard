import { describe, it, expect, vi, afterEach } from 'vitest';
import { comportamentoScroll, movimentoRidotto, scrollInVista, scrollInCima } from './scroll.ts';

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', function () {
    return { matches: matches, addEventListener: function () {}, removeEventListener: function () {} };
  });
}

afterEach(function () {
  vi.unstubAllGlobals();
});

describe('utils/scroll', function () {
  it('con "riduci movimento" attivo lo scroll è immediato, non animato', function () {
    mockMatchMedia(true);
    expect(movimentoRidotto()).toBe(true);
    expect(comportamentoScroll()).toBe('auto');
  });

  it('senza preferenza lo scroll resta fluido', function () {
    mockMatchMedia(false);
    expect(comportamentoScroll()).toBe('smooth');
  });

  it('scrollInVista passa block start e il comportamento scelto', function () {
    mockMatchMedia(true);
    var el = { scrollIntoView: vi.fn() };
    scrollInVista(el);
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('scrollInVista su un elemento nullo non lancia', function () {
    expect(function () {
      scrollInVista(null);
      scrollInVista({});
    }).not.toThrow();
  });

  it('scrollInCima rispetta reduced-motion', function () {
    mockMatchMedia(true);
    var scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    scrollInCima();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('scrollInCima sul pannello del dettaglio usa il suo scrollTo', function () {
    // Il "Torna su" della card non scorre window ma il div interno della modale.
    mockMatchMedia(true);
    var scrollTo = vi.fn();
    scrollInCima({ scrollTo: scrollTo });
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('scrollInCima sul pannello rispetta reduced-motion anche con scroll fluido', function () {
    mockMatchMedia(false);
    var scrollTo = vi.fn();
    scrollInCima({ scrollTo: scrollTo });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('scrollInCima con ref null non scorre la pagina', function () {
    // Il pulsante del dettaglio può essere cliccato prima che il ref sia attaccato:
    // scorrere window farebbe saltare la bacheca invece del solo pannello.
    var scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    scrollInCima(null);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
