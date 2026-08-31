// utils/theme.test.ts — logica pura del tema chiaro/scuro (utils/theme.ts).
// Copre: risoluzione preferenza (salvata → sistema → default), applicazione
// data-theme su html/body + colorScheme, e toggle. Nessuna dipendenza da
// jsdom: getInitialTheme accetta storage/matchMedia come parametri.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { THEME_KEY, THEME_LIGHT, THEME_DARK, getInitialTheme, applyTheme, nextTheme, type Theme } from './theme.ts';

function fakeStorage(initial: Record<string, string>): Pick<Storage, 'getItem'> {
  return { getItem: (k: string) => (k in initial ? initial[k] : null) };
}

function fakeMatchMedia(matches: boolean) {
  return () => ({ matches: matches });
}

describe('getInitialTheme', () => {
  it('usa la preferenza salvata in localStorage', () => {
    expect(getInitialTheme({ localStorage: fakeStorage({ [THEME_KEY]: 'light' }) })).toBe('light');
    expect(getInitialTheme({ localStorage: fakeStorage({ [THEME_KEY]: 'dark' }) })).toBe('dark');
  });

  it('ignora valori non validi in localStorage e ripiega sul sistema', () => {
    expect(
      getInitialTheme({ localStorage: fakeStorage({ [THEME_KEY]: 'blue' }), matchMedia: fakeMatchMedia(true) })
    ).toBe('light');
  });

  it('senza preferenza salvata usa prefers-color-scheme', () => {
    expect(getInitialTheme({ localStorage: fakeStorage({}), matchMedia: fakeMatchMedia(true) })).toBe('light');
    expect(getInitialTheme({ localStorage: fakeStorage({}), matchMedia: fakeMatchMedia(false) })).toBe('dark');
  });

  it('default scuro senza storage né matchMedia', () => {
    expect(getInitialTheme()).toBe('dark');
  });

  it('non crasha se localStorage/matcMedia lanciano (privacy mode)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
    };
    expect(getInitialTheme({ localStorage: throwing, matchMedia: fakeMatchMedia(true) })).toBe('light');
  });
});

describe('applyTheme', () => {
  beforeEach(() => {
    // jsdom: <html> e <body> esistono sempre
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
  });
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
  });

  it('applica data-theme su html e body + colorScheme', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.body.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.body.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});

describe('nextTheme', () => {
  it('alterna dark ↔ light', () => {
    expect(nextTheme('dark' as Theme)).toBe('light');
    expect(nextTheme('light' as Theme)).toBe('dark');
  });
});
