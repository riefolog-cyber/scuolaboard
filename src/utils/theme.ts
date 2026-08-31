// utils/theme.ts · ScuolaBoard · logica pura del tema chiaro/scuro.
// Condivisa da useTheme.ts (toggle + persistenza) e app-bootstrap.ts
// (applicazione pre-paint per evitare il flash). Funzioni pure e testabili:
// ricevono storage/matchMedia come parametri opzionali, niente side effect
// a import.
export const THEME_KEY = 'sb_theme';
export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

export type Theme = 'light' | 'dark';

export interface ThemeEnv {
  localStorage?: Pick<Storage, 'getItem'>;
  matchMedia?: (_query: string) => { matches: boolean };
}

// Preferenza salvata → preferenza di sistema → default scuro.
export function getInitialTheme(env?: ThemeEnv): Theme {
  try {
    var storage =
      env && env.localStorage ? env.localStorage : typeof localStorage !== 'undefined' ? localStorage : null;
    var saved = storage ? storage.getItem(THEME_KEY) : null;
    if (saved === THEME_LIGHT || saved === THEME_DARK) return saved;
  } catch (e) {}
  try {
    var mq =
      env && env.matchMedia
        ? env.matchMedia('(prefers-color-scheme: light)')
        : typeof window !== 'undefined' && window.matchMedia
          ? window.matchMedia('(prefers-color-scheme: light)')
          : null;
    if (mq && mq.matches) return THEME_LIGHT;
  } catch (e) {}
  return THEME_DARK;
}

// Applica data-theme su <html> e <body> + colorScheme nativo del browser.
// Ogni accesso al DOM è protetto: un errore non deve mai bloccare l'avvio.
export function applyTheme(theme: Theme): void {
  try {
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    try {
      if (document.body) document.body.setAttribute('data-theme', theme);
    } catch (e) {}
  } catch (e) {}
}

export function nextTheme(theme: Theme): Theme {
  return theme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
}
