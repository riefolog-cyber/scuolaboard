// useTheme.ts — tema chiaro/scuro con persistenza localStorage.
// La logica pura (risoluzione preferenza + applicazione) vive in
// utils/theme.ts, condivisa con app-bootstrap.ts (pre-paint, anti-flash).
import { useState, useEffect, useCallback } from 'react';
import { THEME_KEY, THEME_LIGHT, getInitialTheme, applyTheme, nextTheme, type Theme } from '../utils/theme.ts';

export function useTheme() {
  var [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(
    function () {
      applyTheme(theme);
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, theme);
      } catch (e) {}
    },
    [theme]
  );

  var toggleTheme = useCallback(function () {
    setTheme(function (prev: Theme) {
      var next = nextTheme(prev);
      applyTheme(next);
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
      return next;
    });
  }, []);

  var isLight = theme === THEME_LIGHT;

  return { theme: theme, isLight: isLight, toggleTheme: toggleTheme, setTheme: setTheme };
}

export default useTheme;
